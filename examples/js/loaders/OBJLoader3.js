/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.path = '';
		this.loadAsArrayBuffer = true;

		this.materials = null;
		this.container = null;

		this.createObjectPerSmoothingGroup = false;

		this.reInit( this.loadAsArrayBuffer, this.path, this.materials, this.container, this.createObjectPerSmoothingGroup );
	}

	OBJLoader.prototype.setPath = function ( value ) {
		this.path = value;
	};

	OBJLoader.prototype.setContainer = function ( container ) {
		this.container = container === null ? new THREE.Group() : container;
	};

	OBJLoader.prototype.setMaterials = function ( materials ) {
		this.materials = materials;
	};

	/**
	 * When this is set the ResponseType of the FileLoader is set to arraybuffer and parseArrayBuffer is used.
	 * @param loadAsArrayBuffer
	 */
	OBJLoader.prototype.setLoadAsArrayBuffer = function ( loadAsArrayBuffer ) {
		this.loadAsArrayBuffer = loadAsArrayBuffer;
	};

	OBJLoader.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
		this.createObjectPerSmoothingGroup = createObjectPerSmoothingGroup;
	};

	OBJLoader.prototype.reInit = function ( loadAsArrayBuffer, path, materials, container, createObjectPerSmoothingGroup ) {
		this.setLoadAsArrayBuffer( loadAsArrayBuffer );
		this.setPath( path );
		this.setMaterials( materials );
		// set own or foreign reference
		this.setContainer( container );
		this.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );
	};

	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {
		var scope = this;

		var loader = new THREE.FileLoader( scope.manager );
		loader.setPath( this.path );
		loader.setResponseType( this.loadAsArrayBuffer ? 'arraybuffer' : 'text' );
		loader.load( url, function ( loadedContent ) {

			onLoad( scope.parse( loadedContent ) );

		}, onProgress, onError );
	};

	OBJLoader.prototype.parse = function ( loadedContent ) {
		var inputObjectStore = new InputObjectStore( this.container, this.materials, this.createObjectPerSmoothingGroup );
		inputObjectStore.setDebug( false, false, false );

		if ( this.loadAsArrayBuffer ) {

			inputObjectStore.parseArrayBuffer( loadedContent );

		} else {

			inputObjectStore.parseString( loadedContent );

		}

		// do not forget last object
		inputObjectStore.processCompletedObject();

		console.log( 'Global object count: ' + inputObjectStore.outputObjectBuilder.globalObjectCount);

		return this.container;
	};

	var InputObjectStore = (function () {

		function InputObjectStore( container, materials, createObjectPerSmoothingGroup ) {
			this.container = container;
			this.outputObjectBuilder = new OutputObjectBuilder( createObjectPerSmoothingGroup );
			this.extendableMeshCreator = new ExtendableMeshCreator( container, materials );

			// globals (per InputObjectStore)
			this.comments = new LineParserBase( '#', this.outputObjectBuilder, 'pushComment' );

			this.mtllib = new LineParserString( 'mtllib', this.outputObjectBuilder, 'pushMtllib' );
			this.vertices = new LineParserVertex( 'v', 3, this.outputObjectBuilder, 'pushVertex' );
			this.normals = new LineParserVertex( 'vn', 3, this.outputObjectBuilder, 'pushNormal' );
			this.uvs = new LineParserUv( this.outputObjectBuilder, 'pushUv' );
			this.objects = new LineParserString( 'o', this.outputObjectBuilder, 'pushObject' );
			this.groups = new LineParserString( 'g', this.outputObjectBuilder, 'pushGroup' );
			this.usemtls = new LineParserString( 'usemtl', this.outputObjectBuilder, 'pushMtl' );
			this.faces = new LineParserFace( this.outputObjectBuilder );
			this.smoothingGroups = new LineParserString( 's', this.outputObjectBuilder, 'pushSmoothingGroup' );
/*
			this.mtllib = new LineParserBase( 'mtllib', this.outputObjectBuilder );
			this.vertices = new LineParserBase( 'v', this.outputObjectBuilder );
			this.normals = new LineParserBase( 'vn', this.outputObjectBuilder );
			this.uvs = new LineParserBase( this.outputObjectBuilder );
			this.objects = new LineParserBase( 'o', this.outputObjectBuilder );
			this.groups = new LineParserBase( 'g', this.outputObjectBuilder );
			this.usemtls = new LineParserBase( 'usemtl', this.outputObjectBuilder );
			this.faces = new LineParserBase( this.outputObjectBuilder );
			this.smoothingGroups = new LineParserBase( 's', this.outputObjectBuilder );
 */
			this.parser = null;

			this.reachedFaces = false;
			this.lineCount = 0;
			this.inputObjectCount = 0;

			this.debug = false;
		}

		InputObjectStore.prototype.reset = function () {
			this.outputObjectBuilder = this.outputObjectBuilder.newInstance();

			this.comments.oobRef = this.outputObjectBuilder;
			this.mtllib.oobRef = this.outputObjectBuilder;
			this.vertices.oobRef = this.outputObjectBuilder;
			this.normals.oobRef = this.outputObjectBuilder;
			this.uvs.oobRef = this.outputObjectBuilder;
			this.objects.oobRef = this.outputObjectBuilder;
			this.groups.oobRef = this.outputObjectBuilder;
			this.usemtls.oobRef = this.outputObjectBuilder;
			this.faces.oobRef = this.outputObjectBuilder;
			this.smoothingGroups.oobRef = this.outputObjectBuilder;

			this.reachedFaces = false;
		};

		InputObjectStore.prototype.setDebug = function ( inputObjectStore, extendableMeshCreator , parsers ) {
			this.comments.debug = parsers;
			this.mtllib.debug = parsers;
			this.vertices.debug = parsers;
			this.normals.debug = parsers;
			this.uvs.debug = parsers;
			this.faces.debug = parsers;
			this.groups.debug = parsers;
			this.objects.debug = parsers;
			this.smoothingGroups.debug = parsers;
			this.usemtls.debug = parsers;

			this.debug = inputObjectStore;
			this.extendableMeshCreator.debug = extendableMeshCreator;
		};

		InputObjectStore.prototype.parseArrayBuffer = function ( arrayBuffer ) {
			console.time( 'ParseBytes' );

			var view = new Uint8Array( arrayBuffer );
			for ( var i = 0, length = view.byteLength; i < length; i ++ ) {

				this.parseCode( view [ i ] );

			}

			console.timeEnd( 'ParseBytes' );
		};

		InputObjectStore.prototype.parseString = function ( input ) {
			console.time( 'ParseString' );

			for ( var i = 0, length = input.length; i < length; i++ ) {

				this.parseCode( input[ i ].charCodeAt( 0 ) );

			}

			console.timeEnd( 'ParseString' );
		};

		/**
		 * TODO: new comment
		 *
		 * @param code
		 */
		InputObjectStore.prototype.parseCode = function ( code ) {
			switch ( code ) {
				case 10: // LF
					if ( this.parser === null ) return;

					// LF => signal store end of line and reset parser to null (re-evaluate starts for next line)
					this.parser.detectedLF();
					this.parser = null;
					this.lineCount ++;
					break;

				case 13: // CR
					// ignore CR
					break;

				case 118: // v
					if ( this.parser !== null ) this.parser.parseCode( code );
					break;

				case 110: // n
					this.processIdentifierCharCode( code, this.normals );
					break;

				case 116: // t
					this.processIdentifierCharCode( code, this.uvs );
					break;

				case 102: // f
					if ( this.processIdentifierCharCode( code, this.faces ) ) this.reachedFaces = true;
					break;

				case 115: // s
					this.processIdentifierCharCode( code, this.smoothingGroups );
					break;

				case 103: // g
					this.processIdentifierCharCode( code, this.groups );
					break;

				case 117: // u
					this.processIdentifierCharCode( code, this.usemtls );
					break;

				case 111: // o
					// new instance required, because "o" found and previous vertices exist
					if ( this.processIdentifierCharCode( code, this.objects ) && this.outputObjectBuilder.vertices.length > 0 ) this.processCompletedObject();
					break;

				case 109: // m
					this.processIdentifierCharCode( code, this.mtllib );
					break;

				case 35: // #
					this.processIdentifierCharCode( code, this.comments );
					break;

				case 32: // SPACE
					if ( this.parser === null ) {

						// at start of line: not needed, but after 'v' will start new vertex parsing
						this.parser = this.vertices;

					} else if ( this.parser === this.vertices && this.reachedFaces ) {

						// object complete instance required if reached faces already (= reached next block of v)
						this.processCompletedObject();

					} else {

						this.parser.parseCode( code );

					}
					break;

				default:
					this.parser.parseCode( code );
					break;
			}
		};

		InputObjectStore.prototype.processIdentifierCharCode = function ( code, activeParser ) {
			if ( this.parser === null ) {

				this.parser = activeParser;
				return true;

			} else {

				this.parser.parseCode( code );
				return false;
			}
		};

		InputObjectStore.prototype.processCompletedObject = function () {
			if ( this.debug ) this.outputObjectBuilder.createReport( this.inputObjectCount, true );

			this.extendableMeshCreator.buildRawMeshData( this.outputObjectBuilder.retrievedObjectDescriptions, this.inputObjectCount );

			this.inputObjectCount++;
			this.reset();
		};

		return InputObjectStore;
	})();


	var LineParserBase = (function () {

		function LineParserBase( description, oobRef, oobRefFunction  ) {
			this.oobRef = oobRef;
			this.oobRefFunction = oobRefFunction;

			// variables re-init (newLine) per input line (called by InputObjectStore)
			this.input = '';
			this.description = description ? description : 'noname: ';

			this.debug = false;
		}

		/**
		 * Per default all input is taken.
		 * Extensions behave differently by overriding this method.
		 */
		LineParserBase.prototype.parseCode = function ( code ) {
			this.input += String.fromCharCode( code );
		};

		/**
		 * Per default only the input is passed to the ObjectOutputBuilder.
		 * Extensions behave differently by overriding this method.
		 */
		LineParserBase.prototype.detectedLF = function () {
			if ( this.oobRefFunction) this.oobRef[ this.oobRefFunction ]( this.input );

			if ( this.debug ) console.log( this.description + ': ' + this.input );

			this.input = '';
		};

		return LineParserBase;
	})();


	var LineParserString = (function () {

		LineParserString.prototype = Object.create( LineParserBase.prototype );
		LineParserString.prototype.constructor = LineParserString;

		function LineParserString( description, oobRef, oobRefFunction ) {
			LineParserBase.call( this, description, oobRef, oobRefFunction );
			this.foundFirstSpace = false;
		}

		LineParserString.prototype.parseCode = function ( code ) {
			if ( this.foundFirstSpace ) {

				this.input += String.fromCharCode( code );

			} else if ( code === 32 ) {

				this.foundFirstSpace = true;
			}
		};

		LineParserString.prototype.detectedLF = function () {
			this.oobRef[this.oobRefFunction]( this.input );

			if ( this.debug ) console.log( this.description + ': ' + this.input );

			this.input = '';
			this.foundFirstSpace = false;
		};

		return LineParserString;
	})();


	var LineParserVertex = (function () {

		LineParserVertex.prototype = Object.create( LineParserBase.prototype );
		LineParserVertex.prototype.constructor = LineParserVertex;

		function LineParserVertex( type, bufferLength, oobRef, oobRefFunction ) {
			LineParserBase.call( this, type, oobRef, oobRefFunction );
			this.minInputLength = 0;
			this.buffer = new Array( bufferLength );
			this.bufferIndex = 0;
		}

		LineParserVertex.prototype.parseCode = function ( code ) {
			// "v   1.0 2.0 3.0" or
			// "vn  1.0 2.0 3.0" or

			if ( code === 32) {

				this.pushToBuffer();

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		LineParserVertex.prototype.pushToBuffer = function () {
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = parseFloat( this.input );
				this.bufferIndex++;
				this.input = '';

			}
		};

		LineParserVertex.prototype.detectedLF = function () {
			this.pushToBuffer();

			if ( this.oobRefFunction ) this.oobRef[ this.oobRefFunction ]( this.buffer );
			if ( this.debug ) console.log( this.description + ': ' + this.buffer );

			this.bufferIndex = 0;
		};

		return LineParserVertex;
	})();


	var LineParserUv = (function () {

		LineParserUv.prototype = Object.create( LineParserVertex.prototype );
		LineParserUv.prototype.constructor = LineParserUv;

		function LineParserUv( oobRef, oobRefFunction ) {
			LineParserVertex.call( this, 'vt', 2, oobRef, oobRefFunction );

			// variables re-init per input line
			this.retrievedFloatCount = 0;
		}

		LineParserUv.prototype.parseCode = function ( code ) {
			// "vt  1.0 2.0 0.0" -> do not use "w"

			// w is optional for 2D textures; only required for 3D textures (not implemented)
			if ( this.retrievedFloatCount == 2 ) return;

			LineParserVertex.prototype.parseCode.call( this, code );
		};

		LineParserUv.prototype.pushToBuffer = function () {
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = parseFloat( this.input );
				this.bufferIndex++;
				this.retrievedFloatCount++;
				this.input = '';

			}
		};

		LineParserUv.prototype.detectedLF = function () {
			LineParserVertex.prototype.detectedLF.call( this );
			this.retrievedFloatCount = 0;
		};

		return LineParserUv;
	})();


	var LineParserFace = (function () {

		LineParserFace.prototype = Object.create( LineParserVertex.prototype );
		LineParserFace.prototype.constructor = LineParserFace;

		function LineParserFace( oobRef ) {
			// Important: According to spec there are more than 3 value groups allowed per face desc.
			// This is currently ignored
			LineParserVertex.call( this, 'f', 9, oobRef );

			// possible types
			// 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
			// 1: "f vertex/uv			vertex/uv			vertex/uv"
			// 2: "f vertex//normal		vertex//normal		vertex//normal"
			// 3: "f vertex				vertex				vertex"

			// variables re-init by detectedLF
			this.slashCount = 0;
			this.type = 3;
		}

		LineParserFace.prototype.parseCode = function ( code ) {
			if ( code === 32 ) {

				if ( this.slashCount === 1 ) this.type = 1;
				this.pushToBuffer();

			} else if ( code === 47 ) {

				if ( this.slashCount < 2 ) {

					this.slashCount ++;
					this.type = ( this.input.length === 0 ) ? 2 : 0;

				}
				this.pushToBuffer();

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		LineParserFace.prototype.pushToBuffer = function () {
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = parseInt( this.input, 10 );
				this.bufferIndex++;
				this.input = '';

			}
		};

		LineParserFace.prototype.detectedLF = function () {
			this.pushToBuffer();

			this.oobRef.pushFace( this.type, this.buffer );

			if ( this.debug ) console.log( 'Faces type: ' + this.type + ': ' + this.buffer );

			this.bufferIndex = 0;
			this.slashCount = 0;
			this.type = 3;
		};

		return LineParserFace;
	})();


	var OutputObjectBuilder = (function () {

		function OutputObjectBuilder( createObjectPerSmoothingGroup ) {
			this.createObjectPerSmoothingGroup = createObjectPerSmoothingGroup;
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
			this.comments = [];

			this.mtllibName = '';

			// faces are store according combined index of groups, material and smoothing group
			this.activeGroup = 'none';
			this.activeMtlName = 'none';
			this.activeSmoothingGroup = 0;

			this.objectGroupCount = 0;
			this.mtlCount = 0;
			this.smoothingGroupCount = 0;

			this.retrievedObjectDescriptions = [];
			this.retrievedObjectDescriptionInUse = [];
		}


		OutputObjectBuilder.prototype.newInstance = function () {
			var newOob = new OutputObjectBuilder( this.createObjectPerSmoothingGroup );
			newOob.globalVertexOffset = this.globalVertexOffset + this.verticesIndex / 3;
			newOob.globalUvOffset = this.globalUvOffset + this.uvsIndex / 2;
			newOob.globalNormalOffset = this.globalNormalOffset + this.normalsIndex / 3;

			return newOob;
		};

		OutputObjectBuilder.prototype.pushToBuffer = function ( source, target, targetIndex ) {
			for ( var i = 0, length = source.length; i < length; i++ ) {

				target[ targetIndex ] = source[ i ];
				targetIndex++;

			}
			return targetIndex;
		};

		OutputObjectBuilder.prototype.pushVertex = function ( vertexArray ) {
			this.verticesIndex = this.pushToBuffer( vertexArray, this.vertices, this.verticesIndex );
		};

		OutputObjectBuilder.prototype.pushNormal = function ( normalArray ) {
			this.normalsIndex = this.pushToBuffer( normalArray, this.normals, this.normalsIndex );
		};

		OutputObjectBuilder.prototype.pushUv = function ( uvArray ) {
			this.uvsIndex = this.pushToBuffer( uvArray, this.uvs, this.uvsIndex );
		};

		OutputObjectBuilder.prototype.pushComment = function ( comment ) {
			this.comments.push( comment );
		};

		OutputObjectBuilder.prototype.pushObject = function ( objectName ) {
			this.objectName = objectName;
		};

		OutputObjectBuilder.prototype.pushMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		OutputObjectBuilder.prototype.pushGroup = function ( groupName ) {
			if ( this.activeGroup === groupName ) return;
			this.activeGroup = groupName;
			this.objectGroupCount++;

			this.verifyIndex();
		};

		OutputObjectBuilder.prototype.pushMtl = function ( mtlName ) {
			if ( this.activeMtlName === mtlName ) return;
			this.activeMtlName = mtlName;
			this.mtlCount++;

			this.verifyIndex();
		};

		OutputObjectBuilder.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
			var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
			if ( this.activeSmoothingGroup === normalized ) return;
			this.activeSmoothingGroup = normalized;
			this.smoothingGroupCount++;

			this.verifyIndex();
		};

		OutputObjectBuilder.prototype.verifyIndex = function () {
			var index;

			if ( this.createObjectPerSmoothingGroup ) {

				index = buildIndex( this.activeGroup, this.activeMtlName, this.activeSmoothingGroup );

			} else {

				index = ( this.activeSmoothingGroup === 0 ) ? buildIndex( this.activeGroup, this.activeMtlName, 0 ) : buildIndex( this.activeGroup, this.activeMtlName, 1 );

			}

			if ( this.retrievedObjectDescriptions[ index ] === undefined ) {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ] = new RetrievedObjectDescription( this.activeGroup, this.activeMtlName, this.activeSmoothingGroup );

			}
			else {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ];

			}
		};

		var buildIndex = function ( groupName, mtlName, smoothingGroup ) {
			return groupName + '|' + mtlName + '|' + smoothingGroup;
		};

		var TYPE_0_ARRAY_LENGTH = 9;
		var TYPE_1_2_ARRAY_LENGTH = 6;
		var TYPE_3_ARRAY_LENGTH = 3;
		var VERTEX_AND_NORMAL_VECTOR_LENGTH = 3;
		var UV_VECTOR_LENGTH = 2;

		OutputObjectBuilder.prototype.pushFace = function ( type, facesArray ) {
			// possible types
			// 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
			// 1: "f vertex/uv			vertex/uv			vertex/uv"
			// 2: "f vertex//normal		vertex//normal		vertex//normal"
			// 3: "f vertex				vertex				vertex"

			if ( type === 0 ) {

				for ( var i = 0; i < TYPE_0_ARRAY_LENGTH; i += 3 ) {

					this.attachVertex( facesArray[ i ] );
					this.attachUv( facesArray[ i + 1 ] );
					this.attachNormal( facesArray[ i + 2 ] );
				}

			} else if ( type === 1 ) {

				for ( var i = 0; i < TYPE_1_2_ARRAY_LENGTH; i += 2 ) {

					this.attachVertex( facesArray[ i ] );
					this.attachUv( facesArray[ i + 1 ] );

				}

			} else if ( type === 2 ) {

					for ( var i = 0; i < TYPE_1_2_ARRAY_LENGTH; i += 2 ) {

						this.attachVertex( facesArray[ i ] );
						this.attachNormal( facesArray[ i + 1 ] );
					}

			} else if ( type === 3 ) {

				for ( var i = 0; i < TYPE_3_ARRAY_LENGTH; i ++ ) {

					this.attachVertex( facesArray[ i ] );

				}

			}
		};

		OutputObjectBuilder.prototype.attachVertex = function ( faceIndex ) {
			var index = ( faceIndex - this.globalVertexOffset ) * VERTEX_AND_NORMAL_VECTOR_LENGTH;
			var number;
			var length = index + VERTEX_AND_NORMAL_VECTOR_LENGTH;

			for ( var i = index ; i < length; i++ ) {
				number = this.vertices[ i ];
				if ( isNaN( number ) ) {
					console.error( number );
				}
				this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = number;
			}
		};

		OutputObjectBuilder.prototype.attachUv = function ( faceIndex ) {
			var index = ( faceIndex - this.globalUvOffset ) * UV_VECTOR_LENGTH;
			var number;
			var length = index + UV_VECTOR_LENGTH;

			for ( var i = index ; i < length; i++ ) {
				number = this.uvs[ i ];
				if ( isNaN( number ) ) {
					console.error( number );
				}
				this.retrievedObjectDescriptionInUse.uvArray[ this.retrievedObjectDescriptionInUse.uvArrayIndex++ ] = number;
			}
		};

		OutputObjectBuilder.prototype.attachNormal = function ( faceIndex ) {
			var index = ( faceIndex - this.globalNormalOffset ) * VERTEX_AND_NORMAL_VECTOR_LENGTH;
			var number;
			var length = index + VERTEX_AND_NORMAL_VECTOR_LENGTH;

			for ( var i = index ; i < length; i++ ) {
				number = this.normals[ i ];
				if ( isNaN( number ) ) {
					console.error( number );
				}
				this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = number;
			}
		};

		OutputObjectBuilder.prototype.createReport = function ( inputObjectCount, printDirectly ) {
			var report = {
				name: this.objectName ? this.objectName : 'groups',
				mtllibName: this.mtllibName,
				vertexCount: this.vertices.length / 3,
				normalCount: this.normals.length / 3,
				uvCount: this.uvs.length / 2,
				objectGroupCount: this.objectGroupCount,
				smoothingGroupCount: this.smoothingGroupCount,
				mtlCount: this.mtlCount,
				commentCount: this.comments ? this.comments.length : 0
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
				console.log( 'Comments count: ' + report.commentCount );
				console.log( '' );
			}

			return report;
		};

		return OutputObjectBuilder;
	})();

	var RetrievedObjectDescription = (function () {

		function RetrievedObjectDescription( group, materialName, smoothingGroup ) {
			this.group = group;
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

	var ExtendableMeshCreator = (function () {

		function ExtendableMeshCreator( container, materials, debug ) {
			this.container = container;
			this.materials = materials;
			this.debug = debug;

			this.globalObjectCount = 0;
		}

		ExtendableMeshCreator.prototype.buildRawMeshData = function (  retrievedObjectDescriptions, inputObjectCount ) {
			var triple;

			if ( this.debug ) console.log( 'ExtendableMeshCreator.buildRawMeshData: Processing object no.: ' + inputObjectCount );

			for ( var index in retrievedObjectDescriptions ) {
				triple = retrievedObjectDescriptions[ index ];

				if ( triple.vertexArrayIndex > 0 ) {

					if ( this.debug ) {
						console.log(
							'Object no.: ' + this.globalObjectCount +
							' group: ' + triple.group +
							' materialName: ' + triple.materialName +
							' smoothingGroup: ' + triple.smoothingGroup +
							' # vertices: ' + triple.vertexArrayIndex / 3 +
							' # uvs: ' + + triple.uvArrayIndex / 2 +
							' # normals: ' + + triple.normalArrayIndex / 3
						);
					}

					var bufferGeometry = new THREE.BufferGeometry();
					bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( triple.vertexArray ), 3 ) );
					if ( triple.normalArrayIndex > 0 ) {

						bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( triple.normalArray ), 3 ) );

					}
					else {

						bufferGeometry.computeVertexNormals();

					}
					if ( triple.uvArrayIndex > 0 ) {

						bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( triple.uvArray ), 2 ) );

					}

					var material = this.materials.materials[ triple.materialName ];
					if ( material === undefined ) material =  new THREE.MeshStandardMaterial();

					var mesh = new THREE.Mesh( bufferGeometry, material );
					this.container.add( mesh );

					this.globalObjectCount++;
				}
			}
		};

		return ExtendableMeshCreator;
	})();

	return OBJLoader;
})();
