/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
		this.debug = true;

		this.path = null;
		this.loadAsArrayBuffer = true;

		this.materials = null;
		this.container = null;

		this.reInit( true, '', null );
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

	OBJLoader.prototype.reInit = function ( loadAsArrayBuffer, path, materials ) {
		this.setPath( path );
		this.loadAsArrayBuffer = loadAsArrayBuffer;

		this.materials = materials;
		this.container = new THREE.Group();
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
		console.time( 'Parse' );
		var objectStore = new InputObjectStore();
		var overallObjectCount = 0;
		var objectStoreResults = [];

		var processInputObject = function () {
			if ( overallObjectCount < 3 ) {

				objectStoreResults[ objectStoreResults.length ] = objectStore.createReport( this.overallObjectCount );

			}
			overallObjectCount++;

			objectStore = objectStore.newInstance();

		};
		objectStore.setCallbackProcessObject( processInputObject );
//		objectStore.setDebug( this.debug );

		var i;
		var length;
		if ( this.loadAsArrayBuffer ) {

			var view = new Uint8Array( loadedContent );
			for ( i = 0, length = view.byteLength; i < length; i++ ) {

				objectStore.parseCode( view [ i ] );

			}

		} else {

			for ( i = 0, length = loadedContent.length; i < length; i++ ) {

				objectStore.parseCode( loadedContent[ i ].charCodeAt( 0 ) );

			}

		}
		console.timeEnd( 'Parse' );

		if ( this.debug ) {

			var singleResultSet;
			for ( i = 0, length = objectStoreResults.length; i < length; i ++ ) {

				singleResultSet = objectStoreResults[ i ];
				console.log( 'Object number: ' + singleResultSet.index + ' Object name: ' + singleResultSet.name );
				console.log( 'Mtllib: ' + singleResultSet.mtllib );
				console.log( 'Vertex count: ' + singleResultSet.vertexCount );
				console.log( 'Normal count: ' + singleResultSet.normalCount );
				console.log( 'UV count: ' + singleResultSet.uvCount );
				console.log( 'Faces Type counts: ' + singleResultSet.overallFaceTypesCount );
				console.log( 'Faces attr count per type: ' + singleResultSet.overallFacesAttr );
				console.log( 'Object count: ' + singleResultSet.objectCount );
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

		function InputObjectStore() {
			// globals (per InputObjectStore)
			this.store = null;
			this.comments = new BaseStore( '#' );
			this.mtllib = new NameStore( 'mtllib' );
			this.vertices = new VertexStore( 'v' );
			this.normals = new VertexStore( 'vn' );
			this.uvs = new UvsStore( 'vt' );
			this.faces = new FaceStore();
			this.groups = new NameStore( 'g' );
			this.objects = new NameStore( 'o' );
			this.smoothingGroups = new NameStore( 's' );
			this.usemtls = new NameStore( 'usemtl' );

			this.reachedFaces = false;
			this.lineCount = 0;

			// per line
			this.identifiedLine = false;
		}

		InputObjectStore.prototype.newInstance = function () {
			var objectStore = new InputObjectStore();
			objectStore.faces.vertexOffset = this.vertices.buffer.length;
			objectStore.faces.uvOffset = this.uvs.buffer.length;
			objectStore.faces.normalOffset = this.normals.buffer.length;
			objectStore.lineCount = this.lineCount;

			if ( this.store === this.objects ) {
				objectStore.store = this.objects;
				objectStore.identifiedLine = true;
			} else if ( this.store === this.vertices ) {
				objectStore.store = this.vertices;
				objectStore.identifiedLine = true;
			}
			objectStore.setCallbackProcessObject( this.callbackProcessObject );

			return objectStore;
		};

		InputObjectStore.prototype.setCallbackProcessObject = function ( callbackProcessObject ) {
			this.callbackProcessObject = callbackProcessObject;
		};

		InputObjectStore.prototype.setDebug = function ( debug ) {
			this.comments.debug = debug;
			this.mtllib.debug = debug;
			this.vertices.debug = debug;
			this.normals.debug = debug;
			this.uvs.debug = debug;
			this.faces.debug = debug;
			this.groups.debug = debug;
			this.objects.debug = debug;
			this.smoothingGroups.debug = debug;
			this.usemtls.debug = debug;
		};


		/**
		 * Whenever a line type is identified processCode will either delegate code to current store or
		 * detected line a line end and then quit. If not the code will be evaluated in switch block.
		 *
		 * @param code
		 */
		InputObjectStore.prototype.parseCode = function ( code ) {
			// fast fail on CR (=ignore)
			if ( code === 13 ) return;

			if ( this.identifiedLine ) {

				// LF => signal store end of line and reset that line type is known
				if ( code === 10 ) {

					this.store.detectedLF();
					this.store = null;
					this.identifiedLine = false;
					this.lineCount ++;

				} else {

					this.store.parseCode( code );

				}

			} else {

				switch ( code ) {
					case 118: // v
						// Identify with next character, there don't set "identifiedLine"
						this.store = this.vertices;
						break;

					case 110: // n
						this.setActiveStore( this.normals );
						break;

					case 116: // t
						this.setActiveStore( this.uvs );
						break;

					case 102: // f
						this.setActiveStore( this.faces );
						this.reachedFaces = true;
						break;

					case 115: // s
						this.setActiveStore( this.smoothingGroups );
						break;

					case 103: // g
						this.setActiveStore( this.groups );
						break;

					case 111: // o
						this.setActiveStore( this.objects );

						// new instance required, because "o" found and previous vertices exist
						if ( this.vertices.buffer.length > 0 ) this.callbackProcessObject();
						break;

					case 117: // u
						this.setActiveStore( this.usemtls );
						break;

					case 109: // m
						this.setActiveStore( this.mtllib );
						break;

					case 32: // SPACE at start of line: not needed, but after 'v' will start new vertex parsing
						if ( this.store === this.vertices ) {

							this.store.newLine();
							this.identifiedLine = true;

							// new instance required if reached faces already (= reached next block of v)
							if ( this.reachedFaces ) this.callbackProcessObject();

						}
						break;

					case 35: // #
						this.setActiveStore( this.comments );
						break;

					case 10: // LF: Empty line without even a space
						break;

					default:
						console.error( 'Detected unexpected ' + code + '[' + String.fromCharCode( code ) + '] at line: ' + this.lineCount );
						break;
				}
			}
		};

		InputObjectStore.prototype.setActiveStore = function ( store ) {
			this.store = store;
			this.store.newLine();
			this.identifiedLine = true;
		};

		InputObjectStore.prototype.createReport = function ( overallObjectCount ) {
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
				index: overallObjectCount,
				name: this.objects.buffer.length === 1 ? this.objects.buffer[ 0 ] : 'noname',
				mtllib: this.mtllib.buffer.length === 1 ? this.mtllib.buffer[ 0 ] : this.mtllib.buffer.length,
				vertexCount: this.vertices.buffer.length / 3,
				normalCount: this.normals.buffer.length / 3,
				uvCount: this.uvs.buffer.length / 2,
				overallFaceTypesCount: overallFaceTypesCount,
				overallFacesAttr: overallFacesAttr,
				groupCount: this.groups.buffer.length,
				objectCount: this.objects.buffer.length,
				smoothingGroupCount: this.smoothingGroups.buffer.length,
				usemtl: this.usemtls.buffer.length === 1 ? this.usemtls.buffer[ 0 ] : this.usemtls.buffer.length,
				commentCount: this.comments.buffer.length
			};
		};

		return InputObjectStore;
	})();


	var BaseStore = (function () {

		function BaseStore( description, bufferLength ) {
			this.buffer = bufferLength !== undefined ? new Array( bufferLength ) : [];
			this.bufferOffset = 0;

			// variables re-init (newLine) per input line (called by InputObjectStore)
			this.input = '';
			this.description = description ? description : 'noname: ';

			this.debug = false;
		}

		BaseStore.prototype.parseCode = function ( code ) {
			this.input += String.fromCharCode( code );
		};

		/**
		 * Per default all input is taken even empty one like "# "
		 */
		BaseStore.prototype.verify = function () {
			this.buffer.push( this.input );
			this.input = '';
		};

		BaseStore.prototype.detectedLF = function () {
			this.verify();

			if ( this.debug ) {
				console.log( this.description + ': ' + this.buffer.slice( this.bufferOffset, this.buffer.length ) );
			}
		};

		BaseStore.prototype.newLine = function () {
			this.input = '';
			this.bufferOffset = this.buffer.length;
		};

		return BaseStore;
	})();

	var VertexStore = (function () {

		VertexStore.prototype = Object.create( BaseStore.prototype );
		VertexStore.prototype.constructor = VertexStore;

		function VertexStore( type ) {
			BaseStore.call( this, type );
		}

		VertexStore.prototype.parseCode = function ( code ) {
			// "v   1.0 2.0 3.0" or
			// "vn  1.0 2.0 3.0" or

			if ( code === 32) {

				this.verify();

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		VertexStore.prototype.verify = function () {
			if ( this.input.length > 0 ) {

				this.buffer.push( parseFloat( this.input ) );
				this.input = '';

			}
		};

		return VertexStore;
	})();

	var UvsStore = (function () {

		UvsStore.prototype = Object.create( VertexStore.prototype );
		UvsStore.prototype.constructor = UvsStore;

		function UvsStore( type ) {
			VertexStore.call( this, type );

			// variables re-init per input line (called by InputObjectStore)
			this.retrievedFloatCount = 0;
		}

		UvsStore.prototype.parseCode = function ( code ) {
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

				this.buffer.push( parseFloat( this.input ) );
				this.input = '';
				this.retrievedFloatCount++;

			}
		};

		UvsStore.prototype.newLine = function () {
			BaseStore.prototype.newLine.call( this );

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
			this.vertexOffset = 1;
			this.uvOffset = 1;
			this.normalOffset = 1;

			// possible types
			// 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
			// 1: "f vertex/uv			vertex/uv			vertex/uv"
			// 2: "f vertex//normal		vertex//normal		vertex//normal"
			// 3: "f vertex				vertex				vertex"
			this.typesPerLine = [];
			this.typesPerLineIndex = 0;

			// variables re-init per input line (called by InputObjectStore)
			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
		}

		FaceStore.prototype.parseCode = function ( code ) {

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

		FaceStore.prototype.verify = function () {
			if ( this.input.length > 0 ) {

				this.buffer.push( parseInt( this.input, 10 ) );
				this.input = '';

			}
		};

		FaceStore.prototype.detectedLF = function () {
			this.verify();

			var type = this.slashCount === 2 ? ( this.shortestDistance === 1 ? 2 : 0 ) : ( this.slashCount === 1 ? 1 : 3 );
			this.typesPerLine[ this.typesPerLineIndex ] = type;
			this.typesPerLineIndex++;

			if ( this.debug ) {

				console.log( 'Faces type: ' + type + ': ' + this.buffer.slice( this.bufferOffset, this.buffer.length ) );

			}
		};

		FaceStore.prototype.newLine = function () {
			BaseStore.prototype.newLine.call( this );

			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
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
			BaseStore.call( this, description );

			// variables re-init per input line (called by InputObjectStore)
			this.foundFirstSpace = false;
		}

		NameStore.prototype.parseCode = function ( code ) {
			if ( this.foundFirstSpace ) {

				this.input += String.fromCharCode( code );

			} else if ( code === 32 ) {

				this.foundFirstSpace = true;
			}

		};

		NameStore.prototype.newLine = function () {
			BaseStore.prototype.newLine.call( this );

			this.foundFirstSpace = false;
		};

		return NameStore;
	})();

	var OutputObjectStore = (function () {

		function OutputObjectStore() {

		}

		return OutputObjectStore;
	})();

	return OBJLoader;
})();
