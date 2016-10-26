/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.materials = null;
		this.group = null;

		this.loadAsArrayBuffer = true;
		this.path = null;

		this.debug = true;

		this.objectStore = null;
		this.overallObjectCount = 0;
		this.lineCount = 0;
		this.objectStoreResults = null;

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

	OBJLoader.prototype.reInit = function ( loadAsArrayBuffer, path, materials ) {
		this.materials = materials;
		this.container = new THREE.Group();
		this.loadAsArrayBuffer = loadAsArrayBuffer;

		this.objectStore = new InputObjectStore();
		this.overallObjectCount = 0;
		this.lineCount = 0;
		this.objectStoreResults = [];

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
		console.time( 'Parse' );
		var i;
		var length;
		if ( this.loadAsArrayBuffer ) {

			var view = new Uint8Array( loadedContent );
			for ( i = 0, length = view.byteLength; i < length; i++ ) {

				this.processCode( view [ i ] );

			}

		} else {

			for ( i = 0, length = loadedContent.length; i < length; i++ ) {

				this.processCode( loadedContent[ i ].charCodeAt( 0 ) );

			}

		}
		console.timeEnd( 'Parse' );

		if ( this.debug ) {

			var singleResultSet;
			for ( i = 0, length = this.objectStoreResults.length; i < length; i ++ ) {

				singleResultSet = this.objectStoreResults[ i ];
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

	OBJLoader.prototype.processCode = function ( code ) {
		// detect end of line
		if ( code === 10 || code === 13 ) {

			this.objectStore.detectCRLF();
			if ( code === 10 ) this.lineCount ++;

		// parsing will return false if currentInput is null
		} else if ( ! this.objectStore.parseCode( code ) ) {

			switch ( code ) {
				case 118: // v
					this.objectStore.detectV();
					break;

				case 110: // n
					this.objectStore.newVn();
					break;

				case 116: // t
					this.objectStore.newVt();
					break;

				case 102: // f
					this.objectStore.newF();
					break;

				case 115: // s
					this.objectStore.newS();
					break;

				case 103: // g
					this.objectStore.newG();
					break;

				case 111: // o
					var newInstanceRequired = this.objectStore.newO();
					if ( newInstanceRequired ) this.processObject();
					break;

				case 117: // u
					this.objectStore.newU();
					break;

				case 109: // m
					this.objectStore.newM();
					break;

				case 32: // SPACE at start of line: not needed, but after 'v' will start new vertex parsing
					var newInstanceRequired = this.objectStore.detectSpace();
					if ( newInstanceRequired ) this.processObject();
					break;

				case 35: // #
					this.objectStore.newSharp();
					break;

				default:
					console.error( 'Detected unexpected ' + code + '[' + String.fromCharCode( code ) + '] at line: ' + this.lineCount );
					break;
			}
		}
	};


	OBJLoader.prototype.processObject = function ( ) {
		if ( this.overallObjectCount < 20 ) {

			this.objectStoreResults[ this.objectStoreResults.length ] = this.objectStore.createReport( this.overallObjectCount );

		}
		this.overallObjectCount++;

		this.objectStore = this.objectStore.newInstance();

	};

	var InputObjectStore = (function () {

		function InputObjectStore() {
			// will be reset after object is complete
			this.currentInput = null;
			this.comments = new CommentStore( '#' );
			this.mtllib = new NameStore( 'mtllib' );
			this.vertices = new VertexStore( 'v' );
			this.normals = new VertexStore( 'vn' );
			this.uvs = new UvsStore( 'vt' );
			this.faces = new FaceStore();
			this.groups = new NameStore( 'g' );
			this.objects = new NameStore( 'o' );
			this.smoothingGroups = new NameStore( 's' );
			this.usemtls = new NameStore( 'usemtl' );

			// per object
			this.reachedFaces = false;

			// per line
			this.identifiedLine = false;

			var debug = false;
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
		}

		InputObjectStore.prototype.newInstance = function () {
			var objectStore = new InputObjectStore();
			objectStore.faces.vertexOffset = this.vertices.buffer.length;
			objectStore.faces.uvOffset = this.uvs.buffer.length;
			objectStore.faces.normalOffset = this.normals.buffer.length;

			if ( this.currentInput === this.objects ) {
				objectStore.currentInput = this.objects;
				objectStore.identifiedLine = true;
			} else if ( this.currentInput === this.vertices ) {
				objectStore.currentInput = this.vertices;
				objectStore.identifiedLine = true;
			}
			return objectStore;
		};

		InputObjectStore.prototype.parseCode = function ( code ) {
			if ( this.identifiedLine ) {

				this.currentInput.parseCode( code );

			}
			return this.identifiedLine;
		};

		/**
		 * It can be of type 'v', 'vn' and 'vt' in the end
		 */
		InputObjectStore.prototype.detectV = function () {
			// Identify with next character
			this.currentInput = this.vertices;
			this.identifiedLine = false;
		};

		InputObjectStore.prototype.detectSpace = function () {
			return ( this.currentInput === this.vertices ) ? this.newV() : false;
		};

		InputObjectStore.prototype.newV = function () {
			// when reachedFaces is true a complete object must have been parsed as
			// we reached vertices again and no "o" was seen before
			// ObjLoader will re-init this storage
			this.currentInput.newLine();
			this.identifiedLine = true;

			return this.reachedFaces;
		};

		InputObjectStore.prototype.newVn = function () {
			if ( ! this.identifiedLine )  {

				this.currentInput = this.normals;
				this.currentInput.newLine();
				this.identifiedLine = true;

			}
		};

		InputObjectStore.prototype.newVt = function () {
			if ( ! this.identifiedLine )  {

				this.currentInput = this.uvs;
				this.currentInput.newLine();
				this.identifiedLine = true;

			}
		};

		InputObjectStore.prototype.newF = function () {
			this.currentInput = this.faces;
			this.currentInput.newLine();
			this.identifiedLine = true;
			this.reachedFaces = true;
		};

		InputObjectStore.prototype.newS = function () {
			this.currentInput = this.smoothingGroups;
			this.currentInput.newLine();
			this.identifiedLine = true;
		};

		InputObjectStore.prototype.newG = function () {
			this.currentInput = this.groups;
			this.currentInput.newLine();
			this.identifiedLine = true;
		};

		InputObjectStore.prototype.newO = function () {
			this.currentInput = this.objects;
			this.currentInput.newLine();
			this.identifiedLine = true;

			return this.vertices.buffer.length > 0;
		};

		InputObjectStore.prototype.newU = function () {
			this.currentInput = this.usemtls;
			this.currentInput.newLine();
			this.identifiedLine = true;
		};

		InputObjectStore.prototype.newM = function () {
			this.currentInput = this.mtllib;
			this.currentInput.newLine();
			this.identifiedLine = true;
		};

		InputObjectStore.prototype.newSharp = function () {
			this.currentInput = this.comments;
			this.currentInput.newLine();
			this.identifiedLine = true;
		};

		InputObjectStore.prototype.detectCRLF = function () {
			// if CR exists currentInput will be null afterwards
			// LF with CR will then do nothing
			// LF without CR will have currentInput != null or null because of empty line
			if ( this.identifiedLine ) {

				this.currentInput.detectedLF();
				this.currentInput = null;
				this.identifiedLine = false;

			}
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
				name: this.objects.bufferIndex === 1 ? this.objects.buffer[ 0 ] : 'noname',
				mtllib: this.mtllib.bufferIndex === 1 ? this.mtllib.buffer[ 0 ] : this.mtllib.bufferIndex,
				vertexCount: this.vertices.bufferIndex / 3,
				normalCount: this.normals.bufferIndex / 3,
				uvCount: this.uvs.bufferIndex / 2,
				overallFaceTypesCount: overallFaceTypesCount,
				overallFacesAttr: overallFacesAttr,
				groupCount: this.groups.bufferIndex,
				objectCount: this.objects.bufferIndex,
				smoothingGroupCount: this.smoothingGroups.bufferIndex,
				usemtl: this.usemtls.bufferIndex === 1 ? this.usemtls.buffer[ 0 ] : this.usemtls.bufferIndex,
				commentCount: this.comments.bufferIndex
			};
		};

		return InputObjectStore;
	})();


	var BaseStore = (function () {

		function BaseStore( description, bufferLength ) {
			this.buffer = bufferLength !== undefined ? new Array( bufferLength ) : [];
			this.bufferIndex = 0;
			this.bufferOffset = this.bufferIndex;
			this.debug = false;
			this.description = description ? description : 'noname: ';

			// variables re-init per input line (called by InputObjectStore)
			this.input = '';
		}

		BaseStore.prototype.parseCode = function ( code ) {
			this.input += String.fromCharCode( code );
		};

		BaseStore.prototype.verify = function () {
			if ( this.input.length > 0 ) {

				this.buffer[ this.bufferIndex ] = this.input;
				this.bufferIndex++;
				this.input = '';

			}
		};

		BaseStore.prototype.detectedLF = function () {
			this.verify();

			if ( this.debug ) {
				console.log( this.description + ': ' + this.buffer.slice( this.bufferOffset, this.bufferIndex ) );
			}
		};

		BaseStore.prototype.newLine = function () {
			this.input = '';
			this.bufferOffset = this.bufferIndex;
		};

		return BaseStore;
	})();

	var CommentStore = (function () {

		CommentStore.prototype = Object.create( BaseStore.prototype );
		CommentStore.prototype.constructor = BaseStore;

		function CommentStore( description ) {
			BaseStore.call( this, description );
		}

		/**
		 * all comments are taken even empty ones "# "
		 */
		CommentStore.prototype.verify = function () {
			this.buffer[ this.bufferIndex ] = this.input;
			this.bufferIndex++;
			this.input = '';
		};

		return CommentStore;
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

				this.buffer[ this.bufferIndex ] = parseFloat( this.input );
				this.bufferIndex++;
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

				this.buffer[ this.bufferIndex ] = parseFloat( this.input );
				this.bufferIndex++;
				this.input = '';

				this.retrievedFloatCount++;

			}
		};

		UvsStore.prototype.newLine = function () {
			this.input = '';
			this.bufferOffset = this.bufferIndex;

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

				this.buffer[ this.bufferIndex ] = parseInt( this.input, 10 );
				this.bufferIndex++;
				this.input = '';

			}
		};

		FaceStore.prototype.detectedLF = function () {
			this.verify();

			var type = this.slashCount === 2 ? ( this.shortestDistance === 1 ? 2 : 0 ) : ( this.slashCount === 1 ? 1 : 3 );
			this.typesPerLine[ this.typesPerLineIndex ] = type;
			this.typesPerLineIndex++;

			if ( this.debug ) {

				console.log( 'Faces type: ' + type + ': ' + this.buffer.slice( this.bufferOffset, this.bufferIndex ) );

			}
		};

		FaceStore.prototype.newLine = function () {
			this.input = '';
			this.bufferOffset = this.bufferIndex;

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
			this.input = '';
			this.bufferOffset = this.bufferIndex;

			this.foundFirstSpace = false;
		};

		return NameStore;
	})();

	return OBJLoader;
})();
