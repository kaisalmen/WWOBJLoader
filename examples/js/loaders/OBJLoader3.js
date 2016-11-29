/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;

		this.path = '';
		this.fileLoader = new THREE.FileLoader( this.manager );

		this.extendableMeshCreator = new THREE.OBJLoader.ExtendableMeshCreator();
		this.parser = new OBJCodeParser( this.extendableMeshCreator );

		this.extendableMeshCreator.debug = false;
		this.parser.debug = false;

		this.validated = false;
	}

	/**
	 * Base path to use
	 *
	 * @param path
	 */
	OBJLoader.prototype.setPath = function ( path ) {
		this.path = ( path == null ) ? this.path : path;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * Default is new empty THREE.Group
	 *
	 * @param objGroup
	 */
	OBJLoader.prototype.setObjGroup = function ( objGroup ) {
		this.extendableMeshCreator.setObjGroup( objGroup );
	};

	/**
	 * Set materials loaded by MTLLoader.
	 * Default is null.
	 *
	 * @param materials
	 */
	OBJLoader.prototype.setMaterials = function ( materials ) {
		this.extendableMeshCreator.setMaterials( materials );
	};

	/**
	 * Will create multi-materials instead of multiple objects with different material definitions
	 * @param useMultiMaterials
	 */
	OBJLoader.prototype.setUseMultiMaterials = function ( useMultiMaterials ) {
		this.extendableMeshCreator.setUseMultiMaterials( useMultiMaterials );
	};

	/**
	 * Allow to set own ExtendableMeshCreator (e.g. web worker)
	 * @param extendableMeshCreator
	 */
	OBJLoader.prototype.setExtendableMeshCreator = function ( extendableMeshCreator ) {
		if ( extendableMeshCreator != null ) {

			this.extendableMeshCreator = extendableMeshCreator;
			this.parser.extendableMeshCreator = this.extendableMeshCreator;
			console.log( 'Updated ExtendableMeshCreator with own implementation.' );

		}
	};

	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError, useArrayBuffer ) {
		this.validate();
		this.fileLoader.setPath( this.path );
		this.fileLoader.setResponseType( ( useArrayBuffer || useArrayBuffer == null ) ? 'arraybuffer' : 'text' );

		var scope = this;
		scope.fileLoader.load( url, function ( content ) {

			var objGroup = ( useArrayBuffer || useArrayBuffer == null ) ? scope.parse( content ) : scope.parseText( content );
			scope.fileLoader = null;
			onLoad( objGroup );

		}, onProgress, onError );
	};

	/**
	 * Validate status, then parse arrayBuffer, finalize and return objGroup
	 *
	 * @param arrayBuffer
	 */
	OBJLoader.prototype.parse = function ( arrayBuffer ) {
		// fast-fail on bad type
		if ( ! ( arrayBuffer instanceof ArrayBuffer || arrayBuffer instanceof Uint8Array ) ) {
			throw 'Provided input is not of type arraybuffer! Aborting...';
		}

		console.log( 'Parsing arrayBuffer...' );
		console.time( 'parseArrayBuffer' );

		this.validate();
		this.parser.parseArrayBuffer( arrayBuffer );
		var objGroup = this.finalize();

		console.timeEnd( 'parseArrayBuffer' );

		return objGroup;
	};

	/**
	 * Validate status, then parse text, finalize and return objGroup
	 *
	 * @param text
	 */
	OBJLoader.prototype.parseText = function ( text ) {
		// fast-fail on bad type
		if ( ! ( typeof( text ) === 'string' || text instanceof String ) ) throw 'Provided input is not of type String! Aborting...';

		console.log( 'Parsing text...' );
		console.time( 'parseText' );

		this.validate();
		this.parser.parseText( text );
		var objGroup = this.finalize();

		console.timeEnd( 'parseText' );

		return objGroup;
	};

	/**
	 * Check initialization status: Used for init and re-init
	 */
	OBJLoader.prototype.validate = function () {
		if ( this.validated ) return;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.FileLoader( this.manager ) : this.fileLoader;
		this.setPath( null );

		this.parser.validate();
		this.extendableMeshCreator.validate();

		this.validated = true;
	};

	OBJLoader.prototype.finalize = function () {
		this.parser.finalize();

		console.log( 'Global output object count: ' + this.extendableMeshCreator.globalObjectCount );
		var objGroup = this.extendableMeshCreator.objGroup;
		this.extendableMeshCreator.finalize();

		this.validated = false;

		return objGroup;
	};

	var OBJCodeParser = (function () {

		var CODE_LF = 10;
		var CODE_CR = 13;
		var CODE_SPACE = 32;
		var CODE_SLASH = 47;
		var STRING_LF = '\n';
		var STRING_CR = '\r';
		var STRING_SPACE = ' ';
		var STRING_SLASH = '/';
		var LINE_F = 'f';
		var LINE_G = 'g';
		var LINE_L = 'l';
		var LINE_O = 'o';
		var LINE_S = 's';
		var LINE_V = 'v';
		var LINE_VT = 'vt';
		var LINE_VN = 'vn';
		var LINE_MTLLIB = 'mtllib';
		var LINE_USEMTL = 'usemtl';

		function OBJCodeParser( extendableMeshCreator ) {
			this.extendableMeshCreator = extendableMeshCreator;
			this.rawObject = null;
			this.inputObjectCount = 1;
		}

		OBJCodeParser.prototype.validate = function () {
			this.rawObject = new RawObject();
			this.inputObjectCount = 1;
		};

		OBJCodeParser.prototype.parseArrayBuffer = function ( arrayBuffer ) {
			var arrayBufferView = new Uint8Array( arrayBuffer );
			var length = arrayBufferView.byteLength;
			var buffer = new Array( 256 );
			var bufferPointer = 0;
			var slashes = new Array( 256 );
			var slashesPointer = 0;
			var reachedFaces = false;
			var code;
			var word = '';
			for ( var i = 0; i < length; i++ ) {

				code = arrayBufferView[ i ];
				switch ( code ) {
					case CODE_SPACE:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;

					case CODE_SLASH:
						slashes[ slashesPointer++ ] = i;
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;

					case CODE_LF:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						reachedFaces = this.processLine( buffer, bufferPointer, slashes, slashesPointer, reachedFaces );
						slashesPointer = 0;
						bufferPointer = 0;
						break;

					case CODE_CR:
						break;

					default:
						word += String.fromCharCode( code );
						break;
				}
			}
		};

		OBJCodeParser.prototype.parseText = function ( text ) {
			var length = text.length;
			var buffer = new Array( 256 );
			var bufferPointer = 0;
			var slashes = new Array( 256 );
			var slashesPointer = 0;
			var reachedFaces = false;
			var char;
			var word = '';
			for ( var i = 0; i < length; i++ ) {

				char = text[ i ];
				switch ( char ) {
					case STRING_SPACE:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;

					case STRING_SLASH:
						slashes[ slashesPointer++ ] = i;
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;

					case STRING_LF:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						reachedFaces = this.processLine( buffer, bufferPointer, slashes, slashesPointer, reachedFaces );
						slashesPointer = 0;
						bufferPointer = 0;
						break;

					case STRING_CR:
						break;

					default:
						word += char;
				}
			}
		};

		OBJCodeParser.prototype.processLine = function ( buffer, bufferPointer, slashes, slashesPointer, reachedFaces ) {
			if ( bufferPointer < 1 ) return reachedFaces;

			var bufferLength = bufferPointer - 1;
			switch ( buffer[ 0 ] ) {
				case LINE_V:

					// object complete instance required if reached faces already (= reached next block of v)
					if ( reachedFaces ) {

						this.processCompletedObject( true );
						reachedFaces = false;
						this.rawObject.pushVertex( buffer );

					} else {

						this.rawObject.pushVertex( buffer );

					}
					break;

				case LINE_VT:
					this.rawObject.pushUv( buffer );
					break;

				case LINE_VN:
					this.rawObject.pushNormal( buffer );
					break;

				case LINE_F:
					reachedFaces = true;
					/*
					 * 0: "f vertex/uv/normal ..."
					 * 1: "f vertex/uv ..."
					 * 2: "f vertex//normal ..."
					 * 3: "f vertex ..."
					 */
					var haveQuad = bufferLength % 4 === 0;
					if ( slashesPointer > 2 && ( slashes[ 1 ] - slashes[ 0 ] ) === 1 ) {

						if ( haveQuad ) {
							this.rawObject.buildQuadVVn( buffer );
						} else {
							this.rawObject.buildFaceVVn( buffer );
						}

					} else if ( bufferLength === slashesPointer * 2 ) {

						if ( haveQuad ) {
							this.rawObject.buildQuadVVt( buffer );
						} else {
							this.rawObject.buildFaceVVt( buffer );
						}

					} else if ( bufferLength * 2 === slashesPointer * 3 ) {

						if ( haveQuad ) {
							this.rawObject.buildQuadVVtVn( buffer );
						} else {
							this.rawObject.buildFaceVVtVn( buffer );
						}

					} else {

						if ( haveQuad ) {
							this.rawObject.buildQuadV( buffer );
						} else {
							this.rawObject.buildFaceV( buffer );
						}

					}
					break;

				case LINE_L:
					if ( bufferLength === slashesPointer * 2 ) {

						this.rawObject.buildLineVvt( buffer );

					} else {

						this.rawObject.buildLineV( buffer );

					}
					break;

				case LINE_S:
					this.rawObject.pushSmoothingGroup( buffer[ 1 ] );
					break;

				case LINE_G:
					this.rawObject.pushGroup( buffer[ 1 ] );
					break;

				case LINE_O:
					if ( this.rawObject.vertices.length > 0 ) {

						this.processCompletedObject( false );
						reachedFaces = false;
						this.rawObject.pushObject( buffer[ 1 ] );

					} else {

						this.rawObject.pushObject( buffer[ 1 ] );

					}

					break;

				case LINE_MTLLIB:
					this.rawObject.pushMtllib( buffer[ 1 ] );
					break;

				case LINE_USEMTL:
					this.rawObject.pushUsemtl( buffer[ 1 ] );
					break;

				default:
					break;
			}
			return reachedFaces;
		};


		OBJCodeParser.prototype.processCompletedObject = function ( vertexDetection ) {
			this.rawObject.finalize( this.extendableMeshCreator, this.inputObjectCount );
			if ( this.debug ) this.rawObject.createReport( this.inputObjectCount, true );

			this.inputObjectCount++;
			this.rawObject = this.rawObject.newInstance( vertexDetection );
		};

		OBJCodeParser.prototype.finalize = function () {
			this.processCompletedObject( false );
		};

		return OBJCodeParser;
	})();

	var RawObject = (function () {

		function RawObject() {
			this.globalVertexOffset = 1;
			this.globalUvOffset = 1;
			this.globalNormalOffset = 1;

			this.objectName = 'none';
			this.vertices = [];
			this.normals = [];
			this.uvs = [];
			this.mtllibName = '';

			// faces are stored according combined index of object, group, material
			this.activeGroupName = 'none';
			this.activeMtlName = 'none';
			this.activeSmoothingGroup = 0;

			this.objectGroupCount = 0;
			this.mtlCount = 0;
			this.smoothingGroupCount = 0;

			this.retrievedObjectDescriptions = [];
			var index = this.buildIndexRegular();
			this.retrievedObjectDescriptionInUse = new THREE.OBJLoader.RetrievedObjectDescription( this.objectName, this.activeGroupName, this.activeMtlName, this.activeSmoothingGroup );
			this.retrievedObjectDescriptions[ index ] = this.retrievedObjectDescriptionInUse;
		}

		RawObject.prototype.newInstance = function ( vertexDetection ) {
			var newOob = new RawObject();
			if ( vertexDetection ) {
				newOob.activeGroupName = this.activeGroupName;
				newOob.retrievedObjectDescriptionInUse.groupName = this.activeGroupName;
			}
			newOob.globalVertexOffset = this.globalVertexOffset + this.vertices.length / 3;
			newOob.globalUvOffset = this.globalUvOffset + this.uvs.length / 2;
			newOob.globalNormalOffset = this.globalNormalOffset + this.normals.length / 3;

			return newOob;
		};

		RawObject.prototype.pushVertex = function ( buffer ) {
			var vertices = this.vertices;
			vertices.push( parseFloat( buffer[ 1 ] ) );
			vertices.push( parseFloat( buffer[ 2 ] ) );
			vertices.push( parseFloat( buffer[ 3 ] ) );
		};

		RawObject.prototype.pushUv = function ( buffer ) {
			var uvs = this.uvs;
			uvs.push( parseFloat( buffer[ 1 ] ) );
			uvs.push( parseFloat( buffer[ 2 ] ) );
		};

		RawObject.prototype.pushNormal = function ( buffer ) {
			var normals = this.normals;
			normals.push( parseFloat( buffer[ 1 ] ) );
			normals.push( parseFloat( buffer[ 2 ] ) );
			normals.push( parseFloat( buffer[ 3 ] ) );
		};

		RawObject.prototype.pushObject = function ( objectName ) {
			this.objectName = objectName;
		};

		RawObject.prototype.pushMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		RawObject.prototype.pushGroup = function ( groupName ) {
			if ( this.activeGroupName === groupName ) return;
			this.activeGroupName = groupName;
			this.objectGroupCount++;

			this.verifyIndex();
		};

		RawObject.prototype.pushUsemtl = function ( mtlName ) {
			if ( this.activeMtlName === mtlName ) return;
			this.activeMtlName = mtlName;
			this.mtlCount++;

			this.verifyIndex();
		};

		RawObject.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
			var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
			if ( this.activeSmoothingGroup === normalized ) return;
			this.activeSmoothingGroup = normalized;
			this.smoothingGroupCount++;

			this.verifyIndex();
		};

		RawObject.prototype.verifyIndex = function () {
			var index = ( this.activeSmoothingGroup === 0 ) ? this.buildIndexOverride( 0 ) : this.buildIndexOverride( 1 );

			if ( this.retrievedObjectDescriptions[ index ] === undefined ) {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ] = new THREE.OBJLoader.RetrievedObjectDescription(
					this.objectName, this.activeGroupName, this.activeMtlName, this.activeSmoothingGroup );

			} else {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ];

			}
		};

		RawObject.prototype.buildIndexRegular = function () {
			return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + this.activeSmoothingGroup;
		};

		RawObject.prototype.buildIndexOverride = function ( smoothingGroup ) {
			return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + smoothingGroup;
		};

		/*
		 * Build Face/Quad: first element in indexArray is the line identification, therefore offset of one needs to be taken into account
		 * N-Gons are not supported
		 * Quad Faces: FaceA: 0, 1, 2  FaceB: 2, 3, 0
		 *
		 * 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal	(vertex/uv/normal)"
		 * 1: "f vertex/uv          vertex/uv           vertex/uv           (vertex/uv       )"
		 * 2: "f vertex//normal     vertex//normal      vertex//normal      (vertex//normal  )"
		 * 3: "f vertex             vertex              vertex              (vertex          )"
		 *
		 * @param indexArray
		 * @param faceType
		 */
		var QUAD_INDICES_1 = [ 1, 2, 3, 3, 4, 1 ];
		var QUAD_INDICES_2 = [ 1, 3, 5, 5, 7, 1 ];
		var QUAD_INDICES_3 = [ 1, 4, 7, 7, 10, 1 ];

		RawObject.prototype.buildQuadVVtVn = function ( indexArray ) {
			for ( var i = 0; i < 6; i ++ ) {
				this.attachFaceV_( indexArray[ QUAD_INDICES_3[ i ] ] );
				this.attachFaceVt( indexArray[ QUAD_INDICES_3[ i ] + 1 ] );
				this.attachFaceVn( indexArray[ QUAD_INDICES_3[ i ] + 2 ] );
			}
		};

		RawObject.prototype.buildQuadVVt = function ( indexArray ) {
			for ( var i = 0; i < 6; i ++ ) {
				this.attachFaceV_( indexArray[ QUAD_INDICES_2[ i ] ] );
				this.attachFaceVt( indexArray[ QUAD_INDICES_2[ i ] + 1 ] );
			}
		};

		RawObject.prototype.buildQuadVVn = function ( indexArray ) {
			for ( var i = 0; i < 6; i ++ ) {
				this.attachFaceV_( indexArray[ QUAD_INDICES_2[ i ] ] );
				this.attachFaceVn( indexArray[ QUAD_INDICES_2[ i ] + 1 ] );
			}
		};

		RawObject.prototype.buildQuadV = function ( indexArray ) {
			for ( var i = 0; i < 6; i ++ ) {
				this.attachFaceV_( indexArray[ QUAD_INDICES_1[ i ] ] );
			}
		};

		RawObject.prototype.buildFaceVVtVn = function ( indexArray ) {
			for ( var i = 1; i < 10; i += 3 ) {
				this.attachFaceV_( indexArray[ i ] );
				this.attachFaceVt( indexArray[ i + 1 ] );
				this.attachFaceVn( indexArray[ i + 2 ] );
			}
		};

		RawObject.prototype.buildFaceVVt = function ( indexArray ) {
			for ( var i = 1; i < 7; i += 2 ) {
				this.attachFaceV_( indexArray[ i ] );
				this.attachFaceVt( indexArray[ i + 1 ] );
			}
		};

		RawObject.prototype.buildFaceVVn = function ( indexArray ) {
			for ( var i = 1; i < 7; i += 2 ) {
				this.attachFaceV_( indexArray[ i ] );
				this.attachFaceVn( indexArray[ i + 1 ] );
			}
		};

		RawObject.prototype.buildFaceV = function ( indexArray ) {
			for ( var i = 1; i < 4; i ++ ) {
				this.attachFaceV_( indexArray[ i ] );
			}
		};

		RawObject.prototype.attachFaceV_ = function ( faceIndex ) {
			var faceIndexInt =  parseInt( faceIndex );
			var index = ( faceIndexInt - this.globalVertexOffset ) * 3;

			var rodiu = this.retrievedObjectDescriptionInUse;
			var vertices = this.vertices;
			rodiu.vertices.push( vertices[ index++ ] );
			rodiu.vertices.push( vertices[ index++ ] );
			rodiu.vertices.push( vertices[ index ] );
		};

		RawObject.prototype.attachFaceVt = function ( faceIndex ) {
			var faceIndexInt =  parseInt( faceIndex );
			var index = ( faceIndexInt - this.globalUvOffset ) * 2;

			var rodiu = this.retrievedObjectDescriptionInUse;
			var uvs = this.uvs;
			rodiu.uvs.push( uvs[ index++ ] );
			rodiu.uvs.push( uvs[ index ] );
		};

		RawObject.prototype.attachFaceVn = function ( faceIndex ) {
			var faceIndexInt =  parseInt( faceIndex );
			var index = ( faceIndexInt - this.globalNormalOffset ) * 3;

			var rodiu = this.retrievedObjectDescriptionInUse;
			var normals = this.normals;
			rodiu.normals.push( normals[ index++ ] );
			rodiu.normals.push( normals[ index++ ] );
			rodiu.normals.push( normals[ index ] );
		};

		/*
		 * Support for lines with or without texture. irst element in indexArray is the line identification
		 * 0: "f vertex/uv		vertex/uv 		..."
		 * 1: "f vertex			vertex 			..."
		 */
		RawObject.prototype.buildLineVvt = function ( lineArray ) {
			var length = lineArray.length;
			for ( var i = 1; i < length; i ++ ) {
				this.vertices.push( parseInt( lineArray[ i ] ) );
				this.uvs.push( parseInt( lineArray[ i ] ) );
			}
		};

		RawObject.prototype.buildLineV = function ( lineArray ) {
			var length = lineArray.length;
			for ( var i = 1; i < length; i++ ) {
				this.vertices.push( parseInt( lineArray[ i ] ) );
			}
		};

		/**
		 * Clear any empty RetrievedObjectDescription
		 */
		RawObject.prototype.finalize = function ( extendableMeshCreator, inputObjectCount ) {
			var temp = this.retrievedObjectDescriptions;
			this.retrievedObjectDescriptions = [];
			var retrievedObjectDescription;
			var index = 0;
			var absoluteVertexCount = 0;
			var absoluteNormalCount = 0;
			var absoluteUvCount = 0;

			for ( var name in temp ) {

				retrievedObjectDescription = temp[ name ];
				if ( retrievedObjectDescription.vertices.length > 0 ) {

					if ( retrievedObjectDescription.objectName === 'none' ) retrievedObjectDescription.objectName = retrievedObjectDescription.groupName;
					this.retrievedObjectDescriptions[ index++ ] = retrievedObjectDescription;
					absoluteVertexCount += retrievedObjectDescription.vertices.length;
					absoluteUvCount += retrievedObjectDescription.uvs.length;
					absoluteNormalCount += retrievedObjectDescription.normals.length;

				}
			}

			extendableMeshCreator.buildMesh(
				this.retrievedObjectDescriptions,
				inputObjectCount,
				absoluteVertexCount,
				absoluteNormalCount,
				absoluteUvCount
			);
		};

		RawObject.prototype.createReport = function ( inputObjectCount, printDirectly ) {
			var report = {
				name: this.objectName ? this.objectName : 'groups',
				mtllibName: this.mtllibName,
				vertexCount: this.vertices.length / 3,
				normalCount: this.normals.length / 3,
				uvCount: this.uvs.length / 2,
				objectGroupCount: this.objectGroupCount,
				smoothingGroupCount: this.smoothingGroupCount,
				mtlCount: this.mtlCount,
				retrievedObjectDescriptions: this.retrievedObjectDescriptions.length
			};

			if ( printDirectly ) {
				console.log( 'Input Object number: ' + inputObjectCount + ' Object name: ' + report.name );
				console.log( 'Mtllib name: ' + report.mtllibName );
				console.log( 'Vertex count: ' + report.vertexCount );
				console.log( 'Normal count: ' + report.normalCount );
				console.log( 'UV count: ' + report.uvCount );
				console.log( 'Group count: ' + report.objectGroupCount );
				console.log( 'SmoothingGroup count: ' + report.smoothingGroupCount );
				console.log( 'Material count: ' + report.mtlCount );
				console.log( 'Real RetrievedObjectDescription count: ' + report.retrievedObjectDescriptions );
				console.log( '' );
			}

			return report;
		};

		return RawObject;
	})();

	return OBJLoader;
})();


THREE.OBJLoader.RetrievedObjectDescription = (function () {

	function RetrievedObjectDescription( objectName, groupName, materialName, smoothingGroup ) {
		this.objectName = objectName;
		this.groupName = groupName;
		this.materialName = materialName;
		this.smoothingGroup = smoothingGroup;
		this.vertices = [];
		this.uvs = [];
		this.normals = [];
	}

	return RetrievedObjectDescription;
})();

THREE.OBJLoader.ExtendableMeshCreator = (function () {

	function ExtendableMeshCreator() {
		this.objGroup = null;
		this.materials = null;
		this.debug = false;
		this.useMultiMaterials = false;
		this.globalObjectCount = 1;

		this.validated = false;
}

	ExtendableMeshCreator.prototype.setObjGroup = function ( objGroup ) {
		this.objGroup = ( objGroup == null ) ? ( this.objGroup == null ? new THREE.Group() : this.objGroup )  : objGroup;
	};

	ExtendableMeshCreator.prototype.setMaterials = function ( materials ) {
		this.materials = ( materials == null ) ? ( this.materials == null ? { materials: [] } : this.materials ) : materials;
	};

	ExtendableMeshCreator.prototype.setUseMultiMaterials = function ( useMultiMaterials ) {
		this.useMultiMaterials = ( useMultiMaterials == null ) ? this.useMultiMaterials : useMultiMaterials;
	};

	ExtendableMeshCreator.prototype.setDebug = function ( debug ) {
		this.debug = ( debug == null ) ? this.debug : debug;
	};

	ExtendableMeshCreator.prototype.validate = function () {
		if ( this.validated ) return;

		this.setObjGroup( null );
		this.setMaterials( null );
		this.setUseMultiMaterials( null );
		this.setDebug( null );
		this.globalObjectCount = 1;
	};

	ExtendableMeshCreator.prototype.finalize = function () {
		this.objGroup = null;
		this.materials = null;
		this.validated = false;
	};

	/**
	 * It is ensured that retrievedObjectDescriptions only contain objects with vertices (no need to check)
	 * @param retrievedObjectDescriptions
	 * @param inputObjectCount
	 * @param absoluteVertexCount
	 * @param absoluteNormalCount
	 * @param absoluteUvCount
	 */
	ExtendableMeshCreator.prototype.buildMesh = function ( retrievedObjectDescriptions, inputObjectCount,
														   absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {
		var retrievedObjectDescription;
		var index;
		if ( this.debug ) console.log( 'ExtendableMeshCreator.buildRawMeshData:\nInput object no.: ' + inputObjectCount );

		if ( this.useMultiMaterials ) {

			if ( retrievedObjectDescriptions.length === 1 ) {

				this.buildSingleMaterialMesh( retrievedObjectDescriptions[ 0 ] );

			} else {

				var bufferGeometry = new THREE.BufferGeometry();
				var vertexBA = new THREE.BufferAttribute( new Float32Array( absoluteVertexCount ), 3 );
				bufferGeometry.addAttribute( 'position', vertexBA );

				var normalBA;
				if ( absoluteNormalCount > 0 ) {

					normalBA = new THREE.BufferAttribute( new Float32Array( absoluteNormalCount ), 3 );
					bufferGeometry.addAttribute( 'normal', normalBA );

				}
				var uvBA;
				if ( absoluteUvCount > 0 ) {

					uvBA = new THREE.BufferAttribute( new Float32Array( absoluteUvCount ), 2 );
					bufferGeometry.addAttribute( 'uv', uvBA );

				}

				var vertexOffset = 0;
				var normalOffset = 0;
				var uvOffset = 0;

				var materials = [];
				var material;
				var materialName;
				var materialIndex = 0;
				var materialIndexMapping = [];
				var selectedMaterialIndex;

				if ( this.debug ) console.log( 'Creating Multi-Material for object no.: ' + this.globalObjectCount );

				for ( index in retrievedObjectDescriptions ) {
					retrievedObjectDescription = retrievedObjectDescriptions[ index ];

					materialName = retrievedObjectDescription.materialName;
					if ( this.materials !== null && this.materials instanceof THREE.MTLLoader.MaterialCreator ) material = this.materials.create( materialName );

					if ( ! material ) {

						material = new THREE.MeshStandardMaterial();
						material.name = materialName;
						console.error( 'Material "' + materialName + '" defined in OBJ file was defined in MTL file!' );

					}
					// clone material in case flat shading is needed due to smoothingGroup 0
					if ( retrievedObjectDescription.smoothingGroup === 0 ) {

						material = material.clone();
						materialName = materialName + '_clone';
						material.name = materialName;
						material.shading = THREE.FlatShading;

					}

					// re-use material if already used before. Reduces materials array size and eliminates duplicates
					selectedMaterialIndex = materialIndexMapping[ materialName ];
					if ( ! selectedMaterialIndex ) {

						selectedMaterialIndex = materialIndex;
						materialIndexMapping[ materialName ] = materialIndex;
						materials.push( material );
						materialIndex++;

					}

					vertexBA.set( retrievedObjectDescription.vertices, vertexOffset );
					bufferGeometry.addGroup( vertexOffset, retrievedObjectDescription.vertices.length, selectedMaterialIndex );
					vertexOffset += retrievedObjectDescription.vertices.length;

					if ( normalBA ) {
						normalBA.set( retrievedObjectDescription.normals, normalOffset );
						normalOffset += retrievedObjectDescription.normals.length;
					}
					if ( uvBA ) {
						uvBA.set( retrievedObjectDescription.uvs, uvOffset );
						uvOffset += retrievedObjectDescription.uvs.length;
					}

					if ( this.debug ) this.printReport( retrievedObjectDescription, selectedMaterialIndex );

				}
				var multiMaterial = new THREE.MultiMaterial( materials );

				if ( ! normalBA ) bufferGeometry.computeVertexNormals();

				var mesh = new THREE.Mesh( bufferGeometry, multiMaterial );
				this.objGroup.add( mesh );

				this.globalObjectCount++;
			}

		} else {

			for ( index in retrievedObjectDescriptions ) {
				retrievedObjectDescription = retrievedObjectDescriptions[ index ];
				this.buildSingleMaterialMesh( retrievedObjectDescription );
			}
		}
	};

	ExtendableMeshCreator.prototype.buildSingleMaterialMesh = function ( retrievedObjectDescription ) {

		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.vertices ), 3 ) );
		if ( retrievedObjectDescription.normals.length > 0 ) {

			bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( retrievedObjectDescription.uvs.length > 0 ) {

			bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.uvs ), 2 ) );

		}

		var material;
		var materialName = retrievedObjectDescription.materialName;
		if ( this.materials !== null && this.materials instanceof THREE.MTLLoader.MaterialCreator ) material = this.materials.create( materialName );

		if ( ! material ) {

			material = new THREE.MeshStandardMaterial();
			material.name = materialName;

		}

		// clone material in case flat shading is needed due to smoothingGroup 0
		if ( retrievedObjectDescription.smoothingGroup === 0 ) {

			material = material.clone();
			materialName = materialName + '_clone';
			material.name = materialName;
			material.shading = THREE.FlatShading;

		}

		var mesh = new THREE.Mesh( bufferGeometry, material );
		this.objGroup.add( mesh );

		if ( this.debug ) this.printReport( retrievedObjectDescription, 0 );

		this.globalObjectCount++;
	};

	ExtendableMeshCreator.prototype.printReport = function ( retrievedObjectDescription, selectedMaterialIndex ) {
		console.log(
			' Output Object no.: ' + this.globalObjectCount +
			'\n objectName: ' + retrievedObjectDescription.objectName +
			'\n groupName: ' + retrievedObjectDescription.groupName +
			'\n materialName: ' + retrievedObjectDescription.materialName +
			'\n materialIndex: ' + selectedMaterialIndex +
			'\n smoothingGroup: ' + retrievedObjectDescription.smoothingGroup +
			'\n #vertices: ' + retrievedObjectDescription.vertices.length / 3 +
			'\n #uvs: ' + retrievedObjectDescription.uvs.length / 2 +
			'\n #normals: ' + retrievedObjectDescription.normals.length / 3
		);
	};

	return ExtendableMeshCreator;
})();
