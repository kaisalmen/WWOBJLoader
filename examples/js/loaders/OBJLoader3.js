/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	var DEFAULT_ARRAY_SIZE = 30000;

	function OBJLoader( manager ) {
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.materials = null;
		this.group = null;
		this.loadAsArrayBuffer = true;
		this.trimFunction = null;
		this.path = null;

		this.input = null;
		this.debug = true;

		this.reInit( true );
	}

	OBJLoader.prototype.setPath = function ( value ) {
		this.path = value;
	};

	OBJLoader.prototype.setMaterials = function ( materials ) {
		this.materials = materials;
	};

	/**
	 * When this is set the ResponseType of the XHRLoader is set to arraybuffer
	 * and parseArrayBuffer is used.
	 * @param loadAsArrayBuffer
	 */
	OBJLoader.prototype.setLoadAsArrayBuffer = function ( loadAsArrayBuffer ) {
		this.loadAsArrayBuffer = loadAsArrayBuffer;
	};

	OBJLoader.prototype.reInit = function ( loadAsArrayBuffer, path ) {
		this.materials = null;
		this.container = new THREE.Group();
		this.loadAsArrayBuffer = loadAsArrayBuffer;

		// Define trim function to use once
		// Faster to just trim left side of the line. Use if available.
		var trimLeft = function ( line ) { return line.trimLeft(); };
		var trimNormal = function ( line ) { return line.trim(); };
		this.trimFunction = typeof ''.trimLeft === 'function' ?  trimLeft : trimNormal;

		this.setPath( path );
	};

	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {
		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setPath( this.path );
		loader.setResponseType( this.loadAsArrayBuffer ? 'arraybuffer' : 'text' );
		loader.load( url, function ( loadedContent ) {

			onLoad( scope.parse( loadedContent ) );

		}, onProgress, onError );
	};

	OBJLoader.prototype.parse = function ( loadedContent ) {

		var objectStore = new InputObjectStore( false );

		var callbackObjectStoreComplete = function ( objectStore ) {

		};

		var parseResults = [];
		var callbackReportStatistics = function ( singleResultSet ) {
			parseResults[ parseResults.length ] = singleResultSet;
		};

		objectStore.registerCallbackObjectComplete( callbackObjectStoreComplete );
//		objectStore.registerCallbackReportStatistics( callbackReportStatistics );


		console.time( 'Parse' );
		var i;
		if ( this.loadAsArrayBuffer ) {

			var view = new Uint8Array( loadedContent );
			for ( i = 0, length = view.byteLength; i < length; i++ ) {

				objectStore.processByte( view [ i ] );

			}

		} else {

			for ( i = 0, length = loadedContent.length; i < length; i++ ) {

				objectStore.processByte( loadedContent[ i ].charCodeAt( 0 ) );

			}

		}
		console.timeEnd( 'Parse' );


		if ( this.debug ) {

			var singleResultSet;
			for ( var i = 0, length = parseResults.length; i < length; i ++ ) {

				singleResultSet = parseResults[ i ];
				console.log( 'Object number: ' + singleResultSet.index + ' Object name: ' + singleResultSet.name );
				console.log( 'Mtllib: ' + singleResultSet.mtllib );
				console.log( 'Vertex count: ' + singleResultSet.vertexCount );
				console.log( 'Normal count: ' + singleResultSet.normalCount );
				console.log( 'UV count: ' + singleResultSet.uvCount );
				console.log( 'Faces Type counts: ' + singleResultSet.overallFaceTypesCount );
				console.log( 'Faces attr count per type: ' + singleResultSet.overallFacesAttr );
				console.log( 'Group count: ' + singleResultSet.groupCount );
				console.log( 'Smoothing group count: ' + singleResultSet.smoothingGroupCount );
				console.log( 'Usemtl: ' + singleResultSet.usemtl );
				console.log( 'Comments count: ' + singleResultSet.commentCount );
				console.log( '' );
			}
		}

		return this.container;
	};

	var InputObjectStore = (function () {

		function InputObjectStore( debug ) {

			// will not be reset after object is complete
			this.overallObjectCount = 0;
			this.lineCount = 0;
			this.callbackObjectComplete = null;
			this.callbackReportStatistics = null;

			// will be reset after object is complete
			this.currentInput = null;
			this.comments = new CommentStore( '#' );
			this.mtllib = new NameStore( 'mtllib' );
			this.vertices = new VertexStore( 'v' );
			this.normals = new VertexStore( 'vn' );
			this.uvs = new UvsStore( 'vt' );
			this.faces = new FaceStore();
			this.groups = new NameStore( 'g' );
			this.smoothingGroups = new NameStore( 's' );
			this.usemtls = new NameStore( 'usemtl' );

			this.afterVertex = false;
			this.haveV = false;

			this.reset( debug );
 		}

		InputObjectStore.prototype.reset = function ( debug ) {
			this.currentInput = null;
			this.comments.reset();
			this.mtllib.reset();
			this.vertices.reset();
			this.normals.reset();
			this.uvs.reset();
			this.faces.reset();
			this.groups.reset();
			this.smoothingGroups.reset();
			this.usemtls.reset();

			this.afterVertex = false;
			this.haveV = false;

			this.comments.debug = debug;
			this.mtllib.debug = debug;
			this.vertices.debug = debug;
			this.normals.debug = debug;
			this.uvs.debug = debug;
			this.faces.debug = debug;
			this.groups.debug = debug;
			this.smoothingGroups.debug = debug;
			this.usemtls.debug = debug;
		};

		InputObjectStore.prototype.registerCallbackReportStatistics = function ( callbackReportStatistics ) {
			this.callbackReportStatistics = callbackReportStatistics;
		};

		InputObjectStore.prototype.registerCallbackObjectComplete = function ( callbackObjectComplete ) {
			this.callbackObjectComplete = callbackObjectComplete;
		};

		InputObjectStore.prototype.processByte = function ( code ) {

			// detect end of line
			if ( code === 10 || code === 13 ) {

				// if CR exists this.currentInput will be null afterwards
				// LF with CR will then do nothing
				// LF without CR will have this.currentInput != null or null beacause of empty line
				if ( this.currentInput !== null ) {

					this.currentInput.detectedLF();
					this.currentInput = null;

				}

				if ( code === 10 ) {
					this.lineCount ++;
				}

			} else if ( this.currentInput !== null ) {

				this.currentInput.parseObjInput( code );

			// It can be of type 'v', 'vn' and 'vt' in the end
			} else  if ( this.haveV ) {

				if ( code === 110 ) {

					this.afterVertex = true;
					this.currentInput = this.normals;

				} else if ( code === 116 ) {

					this.currentInput = this.uvs;

				} else if ( code === 32 ) {

					// when afterVertex is true a new vertex is added, then this storage has to re-init
					// and provide its data
					if ( this.afterVertex ) {

						if ( this.callbackObjectComplete !== null ) {
							this.callbackObjectComplete( this );
						}

						if ( this.callbackReportStatistics !== null ) {
							this.callbackReportStatistics( this.createReport() );
						}

						this.reset( false );
						this.overallObjectCount++;

					} else {

						this.currentInput = this.vertices;

					}

				} else {

					console.error( 'No space after v: ' + code + ' line: ' + this.lineCount );
				}

				if ( this.currentInput !== null ) {

					this.currentInput.newLine();

				}
				this.haveV = false;

			} else {

				switch ( code ) {
					// v
					case 118:
						// Identify with next character
						this.haveV = true;
						break;

					// f
					case 102:
						this.currentInput = this.faces;
						break;

					// s
					case 115:
						this.currentInput = this.smoothingGroups;
						break;

					// g
					case 103:
						this.currentInput = this.groups;
						break;

					// u
					case 117:
						this.currentInput = this.usemtls;
						break;

					// #
					case 35:
						this.currentInput = this.comments;
						break;

					// m
					case 109:
						this.currentInput = this.mtllib;
						break;

					// SPACE at start of line : mark as not usable so far
					case 32:
					default:
						break;
				}

				if ( ! this.haveV && this.currentInput !== null ) {

					this.currentInput.newLine();

				}
			}
		};

		InputObjectStore.prototype.createReport = function () {
			var overallFaceTypesCount = [ 0, 0, 0, 0 ];
			var type;

			for ( var i = 0, typesLength = this.faces.typesPerLineIndex; i < typesLength; i++ ) {
				type = this.faces.typesPerLine[ i ];
				overallFaceTypesCount[ type ] = overallFaceTypesCount[ type ] + 1;
			}
			var typeLookup = this.faces.getTypeArrayLengthLookup();
			var length = typeLookup.length;
			var overallFacesAttr = [];
			for ( type = 0; type < length; type++ ) {
				overallFacesAttr[ type ] = overallFaceTypesCount[ type ] * typeLookup[ type ];
			}

			return {
				index: this.overallObjectCount,
				name: this.groups.bufferIndex === 1 ? this.groups.buffer[ 0 ] : 'noname',
				mtllib: this.mtllib.bufferIndex === 1 ? this.mtllib.buffer[ 0 ] : this.mtllib.bufferIndex,
				vertexCount: this.vertices.bufferIndex / 3,
				normalCount: this.normals.bufferIndex / 3,
				uvCount: this.uvs.bufferIndex / 2,
				overallFaceTypesCount: overallFaceTypesCount,
				overallFacesAttr: overallFacesAttr,
				groupCount: this.groups.bufferIndex,
				smoothingGroupCount: this.smoothingGroups.bufferIndex,
				usemtl: this.usemtls.bufferIndex === 1 ? this.usemtls.buffer[ 0 ] : this.usemtls.bufferIndex,
				commentCount: this.comments.bufferIndex
			};
		};

		return InputObjectStore;
	})();


	var BaseStore = (function () {

		function BaseStore( description, inputBufferLength ) {
			this.buffer = new Array( DEFAULT_ARRAY_SIZE );
//			this.buffer = [];
			this.bufferIndex = 0;
			this.debug = false;
			this.description = description ? description : 'noname: ';

			// Always re-use input array
			this.inputBuffer = new Array( inputBufferLength );
//			this.inputBuffer = [];
			this.inputBufferIndex = 0;

			// variables re-init per input line (called by InputObjectStore)
			this.input = '';
		}

		BaseStore.prototype.parseObjInput = function ( code ) {
			this.input += String.fromCharCode( code );
		};

		BaseStore.prototype.verify = function () {
			if ( this.input.length > 0 ) {

				this.inputBuffer[ this.inputBufferIndex ] = this.input;
				this.inputBufferIndex++;
				this.input = '';

			}
		};

		BaseStore.prototype.attachInputBuffer = function () {
			// Both Chrome and Firefox perform equally
			for ( var i = 0; i < this.inputBufferIndex; i++ ) {
				this.buffer[ this.bufferIndex ] = this.inputBuffer[ i ];
				this.bufferIndex++;
			}
		};

		BaseStore.prototype.detectedLF = function () {
			this.verify();
			this.attachInputBuffer();

			if ( this.debug ) {
				console.log( this.description + ': ' + this.inputBuffer.slice( 0, this.inputBufferIndex ) );
			}
		};

		BaseStore.prototype.newLine = function () {
			this.input = '';
			this.inputBufferIndex = 0;
		};

		BaseStore.prototype.reset = function () {
			// this.buffer is not shrinked on reset for now
			this.bufferIndex = 0;
			this.newLine();
		};

		return BaseStore;
	})();

	var CommentStore = (function () {

		CommentStore.prototype = Object.create( BaseStore.prototype );
		CommentStore.prototype.constructor = BaseStore;

		function CommentStore( description ) {
			BaseStore.call( this, description, 1 );
		}

		/**
		 * all comments are taken even empty ones "# "
		 */
		CommentStore.prototype.verify = function () {
			this.inputBuffer[ this.inputBufferIndex ] = this.input;
			this.inputBufferIndex++;
			this.input = '';
		};

		return CommentStore;
	})();

	var VertexStore = (function () {

		VertexStore.prototype = Object.create( BaseStore.prototype );
		VertexStore.prototype.constructor = VertexStore;

		function VertexStore( type ) {
			BaseStore.call( this, type, 3 );
		}

		VertexStore.prototype.parseObjInput = function ( code ) {
			// "v   1.0 2.0 3.0" or
			// "vn  1.0 2.0 3.0" or

			if ( code === 32) {

				this.verify();

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		return VertexStore;
	})();

	var UvsStore = (function () {

		UvsStore.prototype = Object.create( VertexStore.prototype );
		UvsStore.prototype.constructor = UvsStore;

		function UvsStore( type ) {
			VertexStore.call( this, type, 2 );

			// variables re-init per input line (called by InputObjectStore)
			this.retrievedFloatCount = 0;
		}

		UvsStore.prototype.parseObjInput = function ( code ) {
			// "vt  1.0 2.0 0.0" -> do not use "w"

			// w is optional for 2D textures; only required for 3D textures (not implemented)
			if ( this.retrievedFloatCount < 2 ) {

				if ( code === 32 ) {

					this.verify();

				} else {

					this.input += String.fromCharCode( code );

				}
			}
		};

		UvsStore.prototype.verify = function () {
			if ( this.input.length > 0 ) {

				this.inputBuffer[ this.inputBufferIndex ] = this.input;
				this.inputBufferIndex++;
				this.input = '';

				this.retrievedFloatCount++;

			}
		};

		UvsStore.prototype.newLine = function () {
			this.input = '';
			this.inputBufferIndex = 0;

			this.retrievedFloatCount = 0;
		};

		return UvsStore;
	})();

	var FaceStore = (function () {

		var DEFAULT_SHORTEST_SLASH_DISTANCE = 100;
		var TYPE_ARRAY_LENGTH_LOOKUP = [ 9, 6, 6, 3 ];

		FaceStore.prototype = Object.create( BaseStore.prototype );
		FaceStore.prototype.constructor = FaceStore;

		function FaceStore() {
			// Important: According to spec there are more than 3 value groups allowed per face desc.
			// This is currently ignored
			BaseStore.call( this, 'Face', 9 );

			// possible types
			// 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
			// 1: "f vertex/uv			vertex/uv			vertex/uv"
			// 2: "f vertex//normal		vertex//normal		vertex//normal"
			// 3: "f vertex				vertex				vertex"
			this.typesPerLine = new Array( DEFAULT_ARRAY_SIZE );
//			this.typesPerLine = [];
			this.typesPerLineIndex = 0;

			// variables re-init per input line (called by InputObjectStore)
			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
		}

		FaceStore.prototype.parseObjInput = function ( code ) {

			if ( code === 32 ) {

				this.verify();

			} else if ( code === 47 ) {

				if ( this.slashCount < 2 ) {

					var distance = this.lineIndex - this.slashLast;
					if ( distance < this.shortestDistance ) {
						this.shortestDistance = distance;
					}
					this.slashLast = this.lineIndex;
					this.slashCount++;

				}

				this.verify();

			} else {

				this.input += String.fromCharCode( code );

			}
			this.lineIndex++;
		};

		FaceStore.prototype.detectedLF = function () {
			this.verify();
			this.attachInputBuffer();

			var type = this.slashCount === 2 ? ( this.shortestDistance === 1 ? 2 : 0 ) : ( this.slashCount === 1 ? 1 : 3 );
			this.typesPerLine[ this.typesPerLineIndex ] = type;
			this.typesPerLineIndex++;

			if ( this.debug ) {

				console.log( 'Faces type: ' + type + ': ' + this.inputBuffer.slice( 0, TYPE_ARRAY_LENGTH_LOOKUP[ type ] ) );

			}
		};

		FaceStore.prototype.newLine = function () {
			this.input = '';
			this.inputBufferIndex = 0;

			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
		};

		FaceStore.prototype.reset = function () {
			// this.buffer is not shrinked on reset for now
			this.bufferIndex = 0;
			// this.typesPerLine is not shrinked on reset for now
			this.typesPerLineIndex = 0;

			this.newLine();
		};

		FaceStore.prototype.getTypeArrayLengthLookup = function () {
			return TYPE_ARRAY_LENGTH_LOOKUP;
		};

		return FaceStore;
	})();

	var NameStore = (function () {

		NameStore.prototype = Object.create( BaseStore.prototype );
		NameStore.prototype.constructor = NameStore;

		function NameStore( description ) {
			BaseStore.call( this, description, 1 );

			// variables re-init per input line (called by InputObjectStore)
			this.foundFirstSpace = false;
		}

		NameStore.prototype.parseObjInput = function ( code ) {
			if ( this.foundFirstSpace ) {

				this.input += String.fromCharCode( code );

			} else if ( code === 32 ) {

				this.foundFirstSpace = true;
			}

		};

		NameStore.prototype.newLine = function () {
			this.input = '';
			this.inputBufferIndex = 0;

			this.foundFirstSpace = false;
		};

		return NameStore;
	})();

	return OBJLoader;
})();
