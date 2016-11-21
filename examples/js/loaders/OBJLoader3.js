/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;

		this.loadAsArrayBuffer = true;
		this.path = '';
		this.fileLoader = null;

		this.extendableMeshCreator = new THREE.OBJLoader.ExtendableMeshCreator();
		this.parser = new OBJCodeParser( this.extendableMeshCreator );

		this.extendableMeshCreator.debug = false;
		this.parser.debug = false;

		this.validated = false;
	}

	OBJLoader.prototype.setPath = function ( path ) {
		this.path = ( path == null ) ? this.path : path;
	};

	/**
	 * When this is set the ResponseType of the FileLoader is set to arraybuffer and parseArrayBuffer is used.
	 * Default is true.
	 *
	 * @param loadAsArrayBuffer
	 */
	OBJLoader.prototype.setLoadAsArrayBuffer = function ( loadAsArrayBuffer ) {
		this.loadAsArrayBuffer = ( loadAsArrayBuffer == null ) ? this.loadAsArrayBuffer : loadAsArrayBuffer;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * Default is new empty THREE.Group
	 *
	 * @param container
	 */
	OBJLoader.prototype.setContainer = function ( container ) {
		this.extendableMeshCreator.setContainer( container );
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
	 * If this is set a new object is created for every object + smoothing group
	 * Default is false.
	 *
	 * @param createObjectPerSmoothingGroup
	 */
	OBJLoader.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
		this.parser.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );
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
			console.log( 'Updated ExtendableMeshCreator' );

		}
	};

	/**
	 * Check initialization status: Used for init and re-init
	 *
	 * @param loadAsArrayBuffer
	 * @param path
	 * @param container
	 * @param materials
	 * @param createObjectPerSmoothingGroup
	 * @param useMultiMaterials
	 */
	OBJLoader.prototype.validate = function ( loadAsArrayBuffer, path, container, materials,
											createObjectPerSmoothingGroup, useMultiMaterials ) {
		if ( this.validated ) return;

		this.fileLoader = new THREE.FileLoader( this.manager );
		this.setLoadAsArrayBuffer( loadAsArrayBuffer );
		this.setPath( path );
		this.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );

		this.parser.validate();
		this.extendableMeshCreator.validate( container, materials, useMultiMaterials );

		this.validated = true;
	};

	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {
		var scope = this;
		scope.validate();

		scope.fileLoader.setPath( this.path );
		scope.fileLoader.setResponseType( scope.loadAsArrayBuffer ? 'arraybuffer' : 'text' );
		scope.fileLoader.load( url, function ( loadedContent ) {

			var container = scope.parse( loadedContent );
			scope.fileLoader = null;
			onLoad( container );

		}, onProgress, onError );
	};

	OBJLoader.prototype.parse = function ( loadedContent ) {
		console.time( 'Parse' );
		this.validate();

		this.parser.parse( this.loadAsArrayBuffer, loadedContent );

		// do not forget last object
		var container = this.finalize();
		console.timeEnd( 'Parse' );

		return container;
	};

	OBJLoader.prototype.finalize = function () {
		this.parser.finalize();

		console.log( 'Global output object count: ' + this.extendableMeshCreator.globalObjectCount );
		var container = this.extendableMeshCreator.container;
		this.extendableMeshCreator.finalize();

		this.validated = false;

		return container;
	};

	var OBJCodeParser = (function () {

		var CODE_LF = 10;
		var CODE_CR = 13;
		var CODE_SPACE = 32;
		var CODE_SLASH = 47;
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
			this.rawObjectBuilder = new RawObjectBuilder( false );
			this.extendableMeshCreator = extendableMeshCreator;
			this.inputObjectCount = 1;

			this.buffer;
			this.bufferPointer = 0;
			this.slashes;
			this.slashesIndex = 0;
			this.reachedFaces = false;
		}

		OBJCodeParser.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
			this.rawObjectBuilder.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );
		};

		OBJCodeParser.prototype.validate = function () {
			this.rawObjectBuilder = new RawObjectBuilder( false );
			this.inputObjectCount = 1;

			this.buffer = [];
			this.bufferPointer = 0;
			this.slashes = [];
			this.slashesIndex = 0;
			this.reachedFaces = false;
		};

		OBJCodeParser.prototype.parse = function ( loadAsArrayBuffer, loadedContent ) {
			var objData = ( loadAsArrayBuffer ) ? new Uint8Array( loadedContent ) : loadedContent;
			var contentLength = ( loadAsArrayBuffer ) ? objData.byteLength : objData.length;
			var slashesRefIndex = 0;
			var objDataPointer = 0;
			var word = '';

			if ( loadAsArrayBuffer ) {

				var code;
				while ( objDataPointer < contentLength ) {

					code = objData[ objDataPointer++ ];
					if ( code === CODE_LF || code === CODE_CR ) {

						// jump over CR (=ignore and do not look next)
						if ( code === CODE_CR ) objDataPointer++;

						if ( word.length > 0 ) {

							this.buffer[ this.bufferPointer ++ ] = word;
							word = '';

						}
						this.processLine();
						slashesRefIndex = objDataPointer;

					} else if ( code === CODE_SPACE || code === CODE_SLASH ) {

						if ( word.length > 0 ) {

							this.buffer[ this.bufferPointer ++ ] = word;
							word = '';

						}
						if (  code === CODE_SLASH ) this.slashes[ this.slashesIndex ++ ] = objDataPointer - slashesRefIndex;

					} else {

						word += String.fromCharCode( code );

					}
				}

			} else {

				var char;
				while ( objDataPointer < contentLength ) {

					char = objData[ objDataPointer++ ];
					if ( char === '\n' || char === '\r' ) {

						// jump over CR (=ignore and do not look next)
						if ( char === '\r' ) objDataPointer++;

						if ( word.length > 0 ) {

							this.buffer[ this.bufferPointer ++ ] = word;
							word = '';

						}
						this.processLine();
						slashesRefIndex = objDataPointer;

					} else if ( char === ' ' || char === '/' ) {

						if ( word.length > 0 ) {

							this.buffer[ this.bufferPointer ++ ] = word;
							word = '';

						}
						if ( char === '/' ) this.slashes[ this.slashesIndex ++ ] = objDataPointer - slashesRefIndex;

					} else {

						word += char;

					}
				}
			}
		};

		OBJCodeParser.prototype.processLine = function () {
			if ( this.bufferPointer > 0 ) {

				switch ( this.buffer[ 0 ] ) {
					case LINE_V:

						// object complete instance required if reached faces already (= reached next block of v)
						if ( this.reachedFaces ) {
							this.processCompletedObject();
							this.rawObjectBuilder = this.rawObjectBuilder.newInstance( true );
							this.reachedFaces = false;
						}
						this.rawObjectBuilder.pushVertex( this.buffer );
						break;

					case LINE_VT:
						this.rawObjectBuilder.pushUv( this.buffer );
						break;

					case LINE_VN:
						this.rawObjectBuilder.pushNormal( this.buffer );
						break;

					case LINE_F:
						this.reachedFaces = true;
						this.rawObjectBuilder.buildFace( this.buffer, this.bufferPointer - 1, this.slashes[ 1 ] - this.slashes[ 0 ] );
						break;

					case LINE_L:
						this.rawObjectBuilder.buildLine( this.buffer, this.slashesIndex === 1 );
						break;

					case LINE_S:
						this.rawObjectBuilder.pushSmoothingGroup( this.buffer[ 1 ] );
						break;

					case LINE_G:
						this.rawObjectBuilder.pushGroup( this.buffer[ 1 ] );
						break;

					case LINE_O:
						if ( this.rawObjectBuilder.vertices.length > 0 ) {
							this.processCompletedObject();
							this.rawObjectBuilder = this.rawObjectBuilder.newInstance( false );
						}
						this.rawObjectBuilder.pushObject( this.buffer[ 1 ] );
						break;

					case LINE_MTLLIB:
						this.rawObjectBuilder.pushMtllib( this.buffer[ 1 ] );
						break;

					case LINE_USEMTL:
						this.rawObjectBuilder.pushUsemtl( this.buffer[ 1 ] );
						break;

					default:
						break;
				}
				this.bufferPointer = 0;
			}
			this.slashesIndex = 0;
		};

		OBJCodeParser.prototype.processCompletedObject = function () {
			this.rawObjectBuilder.finalize();

			if ( this.debug ) this.rawObjectBuilder.createReport( this.inputObjectCount, true );

			this.extendableMeshCreator.buildMesh(
				this.rawObjectBuilder.retrievedObjectDescriptions,
				this.inputObjectCount,
				this.rawObjectBuilder.absoluteVertexCount,
				this.rawObjectBuilder.absoluteNormalCount,
				this.rawObjectBuilder.absoluteUvCount
			);
			this.inputObjectCount++;
		};

		OBJCodeParser.prototype.finalize = function () {
			this.processCompletedObject( false );
		};

		return OBJCodeParser;
	})();

	var RawObjectBuilder = (function () {

		// OBJLoader internal static variables
		var QUAD_INDICES = [ 0, 1, 2, 2, 3, 0 ];

		function RawObjectBuilder() {
			this.createObjectPerSmoothingGroup = false;
			this.globalVertexOffset = 1;
			this.globalUvOffset = 1;
			this.globalNormalOffset = 1;

			this.objectName = 'none';

			this.vertices = [];
			this.verticesIndex = 0;
			this.normals = [];
			this.normalsIndex = 0;
			this.uvs = [];
			this.uvsIndex = 0;

			this.absoluteVertexCount = 0;
			this.absoluteNormalCount = 0;
			this.absoluteUvCount = 0;
			this.mtllibName = '';

			// faces are stored according combined index of object, group, material
			// and plus smoothing group if createObjectPerSmoothingGroup=true
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

		RawObjectBuilder.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
			this.createObjectPerSmoothingGroup = ( createObjectPerSmoothingGroup == null ) ? false : createObjectPerSmoothingGroup;
		};

		RawObjectBuilder.prototype.newInstance = function ( vertexDetection ) {
			var newOob = new RawObjectBuilder();
			if ( vertexDetection ) newOob.overrideActiveGroupName( this.activeGroupName );

			newOob.globalVertexOffset = this.globalVertexOffset + this.verticesIndex / 3;
			newOob.globalUvOffset = this.globalUvOffset + this.uvsIndex / 2;
			newOob.globalNormalOffset = this.globalNormalOffset + this.normalsIndex / 3;
			newOob.setCreateObjectPerSmoothingGroup( this.createObjectPerSmoothingGroup );

			return newOob;
		};

		/**
		 * Active group name needs to be set if new object was detected by 'v' insterad of 'o'
		 * @param activeGroupName
		 */
		RawObjectBuilder.prototype.overrideActiveGroupName = function ( activeGroupName ) {
			this.activeGroupName = activeGroupName;
			this.retrievedObjectDescriptionInUse.groupName = activeGroupName;
		};

		RawObjectBuilder.prototype.pushVertex = function ( buffer ) {
			this.vertices[ this.verticesIndex++ ] = parseFloat( buffer[ 1 ] );
			this.vertices[ this.verticesIndex++ ] = parseFloat( buffer[ 2 ] );
			this.vertices[ this.verticesIndex++ ] = parseFloat( buffer[ 3 ] );
		};

		RawObjectBuilder.prototype.pushUv = function ( buffer ) {
			this.uvs[ this.uvsIndex++ ] = parseFloat( buffer[ 1 ] );
			this.uvs[ this.uvsIndex++ ] = parseFloat( buffer[ 2 ] );
		};

		RawObjectBuilder.prototype.pushNormal = function ( buffer ) {
			this.normals[ this.normalsIndex++ ] = parseFloat( buffer[ 1 ] );
			this.normals[ this.normalsIndex++ ] = parseFloat( buffer[ 2 ] );
			this.normals[ this.normalsIndex++ ] = parseFloat( buffer[ 3 ] );
		};

		RawObjectBuilder.prototype.pushObject = function ( objectName ) {
			this.objectName = objectName;
		};

		RawObjectBuilder.prototype.pushMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		RawObjectBuilder.prototype.pushGroup = function ( groupName ) {
			if ( this.activeGroupName === groupName ) return;
			this.activeGroupName = groupName;
			this.objectGroupCount++;

			this.verifyIndex();
		};

		RawObjectBuilder.prototype.pushUsemtl = function ( mtlName ) {
			if ( this.activeMtlName === mtlName ) return;
			this.activeMtlName = mtlName;
			this.mtlCount++;

			this.verifyIndex();
		};

		RawObjectBuilder.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
			var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
			if ( this.activeSmoothingGroup === normalized ) return;
			this.activeSmoothingGroup = normalized;
			this.smoothingGroupCount++;

			this.verifyIndex();
		};

		RawObjectBuilder.prototype.verifyIndex = function () {
			var index;

			if ( this.createObjectPerSmoothingGroup ) {

				index = this.buildIndexRegular();

			} else {

				index = ( this.activeSmoothingGroup === 0 ) ? this.buildIndexOverride( 0 ) : this.buildIndexOverride( 1 );

			}
			if ( this.retrievedObjectDescriptions[ index ] === undefined ) {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ] = new THREE.OBJLoader.RetrievedObjectDescription(
					this.objectName, this.activeGroupName, this.activeMtlName, this.activeSmoothingGroup );

			} else {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ];

			}
		};

		RawObjectBuilder.prototype.buildIndexRegular = function () {
			return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + this.activeSmoothingGroup;
		};

		RawObjectBuilder.prototype.buildIndexOverride = function ( smoothingGroup ) {
			return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + smoothingGroup;
		};

		/**
		 * Support for triangle and quads:
		 * 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
		 * 1: "f vertex/uv          vertex/uv           vertex/uv           vertex/uv"
		 * 2: "f vertex//normal     vertex//normal      vertex//normal      vertex//normal"
		 * 3: "f vertex             vertex              vertex              vertex"
		 *
		 * @param indexArray
		 * @param indexArrayEnd
		 * @param slashMinDistance
		 */
		RawObjectBuilder.prototype.buildFace = function ( indexArray, elementCount, slashMinDistance ) {

			var haveQuad = ( elementCount ) % 4 === 0;
			var idFaceType0 = haveQuad ? 12 : 9;
			var idFaceType3 = haveQuad ? 4 : 3;

			var faceType = 1;
			if ( elementCount === idFaceType0 ) {
				faceType = 0;
			}
			else if ( elementCount === idFaceType3 ) {
				faceType = 3;
			}
			else if ( slashMinDistance === 1 ) {
				faceType = 2;
			}

			// first element in indexArray is the line identification,
			// therefore offset of one needs to be taken into account
			if ( haveQuad ) {
				var q = 0;
				if ( faceType === 0 ) {

					// FaceA: 0, 1, 2  FaceB: 2, 3, 0
					for ( ; q < 6; q++ ) {
						this.attachFaceV_( indexArray[ QUAD_INDICES[ q ] * 3 + 1 ] );
						this.attachFaceVt( indexArray[ QUAD_INDICES[ q ] * 3 + 2 ] );
						this.attachFaceVn( indexArray[ QUAD_INDICES[ q ] * 3 + 3 ] );
					}
				}
				else if ( faceType === 1 ) {

					for ( ; q < 6; q++ ) {
						this.attachFaceV_( indexArray[ QUAD_INDICES[ q ] * 2 + 1 ] );
						this.attachFaceVt( indexArray[ QUAD_INDICES[ q ] * 2 + 2 ] );
					}
				}
				else if ( faceType === 2 ) {

					for ( ; q < 6; q++ ) {
						this.attachFaceV_( indexArray[ QUAD_INDICES[ q ] * 2 + 1 ] );
						this.attachFaceVn( indexArray[ QUAD_INDICES[ q ] * 2 + 2 ] );
					}
				}
				else if ( faceType === 3 ) {

					for ( ; q < 6; q++ ) {
						this.attachFaceV_( indexArray[ QUAD_INDICES[ q ] + 1 ] );
					}
				}
			} else {

				var i = 1;
				if ( faceType === 0 ) {

					for ( ; i < 10; i += 3 ) {
						this.attachFaceV_( indexArray[ i ] );
						this.attachFaceVt( indexArray[ i + 1 ] );
						this.attachFaceVn( indexArray[ i + 2 ] );
					}
				}
				else if ( faceType === 1 ) {

					for ( ; i < 7; i += 2 ) {
						this.attachFaceV_( indexArray[ i ] );
						this.attachFaceVt( indexArray[ i + 1 ] );
					}
				}
				else if ( faceType === 2 ) {

					for ( ; i < 7; i += 2 ) {
						this.attachFaceV_( indexArray[ i ] );
						this.attachFaceVn( indexArray[ i + 1 ] );
					}
				}
				else if ( faceType === 3 ) {

					for ( ; i < 4; i ++ ) {
						this.attachFaceV_( indexArray[ i ] );
					}
				}
			}
		};

		RawObjectBuilder.prototype.attachFaceV_ = function ( faceIndex ) {
			var faceIndexInt =  parseInt( faceIndex );
			var index = ( faceIndexInt - this.globalVertexOffset ) * 3;

			this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = this.vertices[ index++ ];
			this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = this.vertices[ index++ ];
			this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = this.vertices[ index ];
/*
			if ( isNaN( this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex - 3 ] ) ) {
				console.error( 'NAN' );
			}
			if ( isNaN( this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex - 2 ] ) ) {
				console.error( 'NAN' );
			}
			if ( isNaN( this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex - 1 ] ) ) {
				console.error( 'NAN' );
			}
*/
		};

		RawObjectBuilder.prototype.attachFaceVt = function ( faceIndex ) {
			var faceIndexInt =  parseInt( faceIndex );
			var index = ( faceIndexInt - this.globalUvOffset ) * 2;

			this.retrievedObjectDescriptionInUse.uvArray[ this.retrievedObjectDescriptionInUse.uvArrayIndex++ ] = this.uvs[ index++ ];
			this.retrievedObjectDescriptionInUse.uvArray[ this.retrievedObjectDescriptionInUse.uvArrayIndex++ ] = this.uvs[ index ];
		};

		RawObjectBuilder.prototype.attachFaceVn = function ( faceIndex ) {
			var faceIndexInt =  parseInt( faceIndex );
			var index = ( faceIndexInt - this.globalNormalOffset ) * 3;

			this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = this.normals[ index++ ];
			this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = this.normals[ index++ ];
			this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = this.normals[ index ];
		};

		/**
		 * Support for lines with or without texture
		 * 0: "f vertex/uv		vertex/uv 		..."
		 * 1: "f vertex			vertex 			..."
		 *
		 * @param lineArray
		 * @param haveSlash
		 */
		RawObjectBuilder.prototype.buildLine = function ( lineArray, haveSlash ) {
			// first element in indexArray is the line identification
			var i = 1;
			var length = lineArray.length;
			if ( haveSlash ) {

				for ( ; i < length; i++ ) {
					this.vertices[ this.verticesIndex++ ] = parseInt( lineArray[ i ] );
					this.uvs[ this.uvsIndex++ ] = parseInt( lineArray[ i ] );
				}
			} else {

				for ( ; i < length; i++ ) {
					this.vertices[ this.verticesIndex++ ] = parseInt( lineArray[ i ] );
				}
			}
		};

		/**
		 * Clear any empty RetrievedObjectDescription
		 */
		RawObjectBuilder.prototype.finalize = function () {
			var temp = this.retrievedObjectDescriptions;
			this.retrievedObjectDescriptions = [];
			var retrievedObjectDescription;
			var index = 0;

			for ( var name in temp ) {
				retrievedObjectDescription = temp[ name ];
				if ( retrievedObjectDescription.vertexArrayIndex > 0 ) {

					if ( retrievedObjectDescription.objectName === 'none' ) retrievedObjectDescription.objectName = retrievedObjectDescription.groupName;

					this.retrievedObjectDescriptions[ index++ ] = retrievedObjectDescription;
					this.absoluteVertexCount += retrievedObjectDescription.vertexArrayIndex;
					this.absoluteNormalCount += retrievedObjectDescription.normalArrayIndex;
					this.absoluteUvCount += retrievedObjectDescription.uvArrayIndex;

				}
			}
		};

		RawObjectBuilder.prototype.createReport = function ( inputObjectCount, printDirectly ) {
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

		return RawObjectBuilder;
	})();

	return OBJLoader;
})();


THREE.OBJLoader.RetrievedObjectDescription = (function () {

	function RetrievedObjectDescription( objectName, groupName, materialName, smoothingGroup ) {
		this.objectName = objectName;
		this.groupName = groupName;
		this.materialName = materialName;
		this.smoothingGroup = smoothingGroup;

		this.vertexArray = [];
		this.vertexArrayIndex = 0;
		this.uvArray = [];
		this.uvArrayIndex = 0;
		this.normalArray = [];
		this.normalArrayIndex = 0;
	}

	return RetrievedObjectDescription;
})();

THREE.OBJLoader.ExtendableMeshCreator = (function () {

	function ExtendableMeshCreator() {
		this.container = new THREE.Group();
		this.materials = { materials: [] };
		this.debug = false;
		this.useMultiMaterials = false;
		this.globalObjectCount = 1;

		this.validated = false;
}

	ExtendableMeshCreator.prototype.setContainer = function ( container ) {
		this.container = ( container == null ) ? this.container : container;
	};

	ExtendableMeshCreator.prototype.setMaterials = function ( materials ) {
		this.materials = ( materials == null ) ? this.materials : materials;
	};

	ExtendableMeshCreator.prototype.setUseMultiMaterials = function ( useMultiMaterials ) {
		this.useMultiMaterials = ( useMultiMaterials == null ) ? this.useMultiMaterials : useMultiMaterials;
	};

	ExtendableMeshCreator.prototype.setDebug = function ( debug ) {
		this.debug = ( debug == null ) ? this.debug : debug;
	};

	ExtendableMeshCreator.prototype.validate = function ( container, materials, useMultiMaterials, debug ) {
		if ( this.validated ) return;

		this.setContainer( container );
		this.setMaterials( materials );
		this.setUseMultiMaterials( useMultiMaterials );
		this.setDebug( debug );
		this.globalObjectCount = 1;
	};

	ExtendableMeshCreator.prototype.finalize = function () {
		this.container = new THREE.Group();
		this.materials = { materials: [] };
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

				for ( var index in retrievedObjectDescriptions ) {
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

					vertexBA.set( retrievedObjectDescription.vertexArray, vertexOffset );
					bufferGeometry.addGroup( vertexOffset, retrievedObjectDescription.vertexArrayIndex, selectedMaterialIndex );
					vertexOffset += retrievedObjectDescription.vertexArrayIndex;

					if ( normalBA ) {
						normalBA.set( retrievedObjectDescription.normalArray, normalOffset );
						normalOffset += retrievedObjectDescription.normalArrayIndex;
					}
					if ( uvBA ) {
						uvBA.set( retrievedObjectDescription.uvArray, uvOffset );
						uvOffset += retrievedObjectDescription.uvArrayIndex;
					}

					if ( this.debug ) this.printReport( retrievedObjectDescription, selectedMaterialIndex );

				}
				var multiMaterial = new THREE.MultiMaterial( materials );

				if ( ! normalBA ) bufferGeometry.computeVertexNormals();

				var mesh = new THREE.Mesh( bufferGeometry, multiMaterial );
				this.container.add( mesh );

				this.globalObjectCount++;
			}

		} else {

			for ( var index in retrievedObjectDescriptions ) {
				retrievedObjectDescription = retrievedObjectDescriptions[ index ];
				this.buildSingleMaterialMesh( retrievedObjectDescription );
			}
		}
	};

	ExtendableMeshCreator.prototype.buildSingleMaterialMesh = function ( retrievedObjectDescription ) {

		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.vertexArray ), 3 ) );
		if ( retrievedObjectDescription.normalArrayIndex > 0 ) {

			bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.normalArray ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( retrievedObjectDescription.uvArrayIndex > 0 ) {

			bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.uvArray ), 2 ) );

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
		this.container.add( mesh );

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
			'\n #vertices: ' + retrievedObjectDescription.vertexArrayIndex / 3 +
			'\n #uvs: ' + retrievedObjectDescription.uvArrayIndex / 2 +
			'\n #normals: ' + retrievedObjectDescription.normalArrayIndex / 3
		);
	};

	return ExtendableMeshCreator;
})();
