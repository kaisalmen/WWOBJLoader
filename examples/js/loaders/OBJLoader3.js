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

		var scope = this;
		var processInputObject = function () {
			if ( scope.debug && overallObjectCount < 4 ) {

				objectStore.outputObjectBuilder.buildRawMeshData();
				objectStoreResults[ objectStoreResults.length ] = createReport( objectStore.outputObjectBuilder );
				overallObjectCount++;

			}

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

			for ( i = 0, length = objectStoreResults.length; i < length; i ++ ) {
				printSingleReport( i, objectStoreResults[ i ] );
			}
		}

		return this.container;
	};

	var createReport = function ( oobRef ) {
		return {
			name: oobRef.objectName ? oobRef.objectName : 'groups',
			mtllibName: oobRef.mtllibName,
			vertexCount: oobRef.vertices.buffer.length / 3,
			normalCount: oobRef.normals.buffer.length / 3,
			uvCount: oobRef.uvs.buffer.length / 2,
//				overallFaceTypesCount: overallFaceTypesCount,
//				overallFacesAttr: overallFacesAttr,
			objectGroupCount: oobRef.objectGroupCount,
			smoothingGroupCount: oobRef.smoothingGroupCount,
			mtlCount: oobRef.mtlCount,
			commentCount: oobRef.comments ? oobRef.comments.length : 0
		};
	};

	var printSingleReport = function ( index, singleResultSet ) {
		console.log( 'Object number: ' + index + ' Object name: ' + singleResultSet.name );
		console.log( 'Mtllib name: ' + singleResultSet.mtllibName );
		console.log( 'Vertex count: ' + singleResultSet.vertexCount );
		console.log( 'Normal count: ' + singleResultSet.normalCount );
		console.log( 'UV count: ' + singleResultSet.uvCount );
//				console.log( 'Faces Type counts: ' + singleResultSet.overallFaceTypesCount );
//				console.log( 'Faces attr count per type: ' + singleResultSet.overallFacesAttr );
		console.log( 'Group count: ' + singleResultSet.objectGroupCount );
		console.log( 'SmoothingGroup count: ' + singleResultSet.smoothingGroupCount );
		console.log( 'Material count: ' + singleResultSet.mtlCount );
		console.log( 'Comments count: ' + singleResultSet.commentCount );
		console.log( '' );
	};

	var InputObjectStore = (function () {

		function InputObjectStore() {
			// globals (per InputObjectStore)
			this.store = null;
			this.comments = new BaseStore( '#' );
			this.mtllib = new NameStore( 'mtllib', 'updateMtllib' );
			this.vertices = new VertexStore( 'v' );
			this.normals = new VertexStore( 'vn' );
			this.uvs = new UvsStore();

			this.outputObjectBuilder = new OutputObjectBuilder( this.vertices, this.normals, this.uvs );
			this.objects = new NameStore( 'o', 'updateObject' );
			this.groups = new NameStore( 'g', 'updateGroup' );
			this.usemtls = new NameStore( 'usemtl', 'updateMtl' );
			this.faces = new FaceStore();
			this.smoothingGroups = new NameStore( 's', 'updateSmoothingGroup' );

			this.reachedFaces = false;
			this.lineCount = 0;

			// per line
			this.identifiedLine = false;
		}

		InputObjectStore.prototype.newInstance = function () {
			var objectStore = new InputObjectStore();
			objectStore.lineCount = this.lineCount;

			if ( this.store === this.objects ) {
				objectStore.store = objectStore.objects;
				objectStore.identifiedLine = true;
			} else if ( this.store === this.vertices ) {
				objectStore.store = objectStore.vertices;
				objectStore.identifiedLine = false;
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

					this.store.detectedLF( this.outputObjectBuilder );
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
						if ( this.vertices.buffer.length > 0 ) {
							this.callbackProcessObject();
						}
						break;

					case 117: // u
						this.setActiveStore( this.usemtls );
						break;

					case 109: // m
						this.setActiveStore( this.mtllib );
						break;

					case 32: // SPACE at start of line: not needed, but after 'v' will start new vertex parsing
						if ( this.store === this.vertices ) {

							this.identifiedLine = true;
							// new instance required if reached faces already (= reached next block of v)
							if ( this.reachedFaces ) {
								this.callbackProcessObject();
							}

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
			this.identifiedLine = true;
		};

		return InputObjectStore;
	})();

	// Define trim function to use once
	// Faster to just trim left side of the line. Use if available.
	var trimLeft = function ( line ) { return line.trimLeft(); };
	var trimNormal = function ( line ) { return line.trim(); };
	var trimFunction = typeof ''.trimLeft === 'function' ?  trimLeft : trimNormal;

	var BaseStore = (function () {

		function BaseStore( description, minInputLength ) {
			this.buffer = [];
			this.bufferOffset = 0;
			this.bufferIndex = 0;

			// variables re-init (newLine) per input line (called by InputObjectStore)
			this.input = '';
			this.minInputLength = minInputLength !== undefined ? minInputLength : -1;
			this.description = description ? description : 'noname: ';

			this.debug = false;
		}


		BaseStore.prototype.parseCode = function ( code ) {
			this.input += String.fromCharCode( code );
		};

		/**
		 * Per default all input is taken even empty ones like "# "
		 */
		BaseStore.prototype.pushToBuffer = function ( transformedInput ) {
			var success = false;
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = transformedInput;
				this.bufferIndex ++;
				success = true;

			}
			return success;
		};

		BaseStore.prototype.getSingleLineBuffer = function () {
			var output = [];
			for ( var i = this.bufferOffset, j = 0; i < this.bufferIndex; i++ ) {

				output[ j ] = this.buffer[ i ];
				j++;

			}
			return output;
		};

		BaseStore.prototype.detectedLF = function ( oobRef ) {
			this.pushToBuffer( this.input );

			if ( this.debug ) console.log( this.description + ': ' + this.getSingleLineBuffer() );

			this.input = '';
			this.bufferOffset = this.bufferIndex;
		};

		return BaseStore;
	})();

	var VertexStore = (function () {

		VertexStore.prototype = Object.create( BaseStore.prototype );
		VertexStore.prototype.constructor = VertexStore;

		function VertexStore( type ) {
			BaseStore.call( this, type, 0 );
		}

		VertexStore.prototype.parseCode = function ( code ) {
			// "v   1.0 2.0 3.0" or
			// "vn  1.0 2.0 3.0" or

			if ( code === 32) {

				this.pushToBuffer( parseFloat( this.input ) );
				this.input = '';

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		VertexStore.prototype.detectedLF = function ( oobRef ) {
			this.pushToBuffer( parseFloat( this.input ) );

			if ( this.debug ) console.log( this.description + ': ' + this.getSingleLineBuffer() );

			this.input = '';
			this.bufferOffset = this.bufferIndex;
		};

		return VertexStore;
	})();

	var UvsStore = (function () {

		UvsStore.prototype = Object.create( VertexStore.prototype );
		UvsStore.prototype.constructor = UvsStore;

		function UvsStore() {
			VertexStore.call( this, 'vt' );

			// variables re-init per input line
			this.retrievedFloatCount = 0;
		}

		UvsStore.prototype.parseCode = function ( code ) {
			// "vt  1.0 2.0 0.0" -> do not use "w"

			// w is optional for 2D textures; only required for 3D textures (not implemented)
			if ( this.retrievedFloatCount == 2 ) return;

			if ( code === 32 ) {

				if ( this.pushToBuffer( parseFloat( this.input ) ) ) {

					this.retrievedFloatCount++;
					this.input = '';

				}

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		UvsStore.prototype.detectedLF = function ( oobRef ) {
			VertexStore.prototype.detectedLF.call( this, oobRef );
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
			BaseStore.call( this, 'f', 0 );

			// possible types
			// 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
			// 1: "f vertex/uv			vertex/uv			vertex/uv"
			// 2: "f vertex//normal		vertex//normal		vertex//normal"
			// 3: "f vertex				vertex				vertex"

			// variables re-init per input line (called by InputObjectStore)
			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
		}

		FaceStore.prototype.parseCode = function ( code ) {

			if ( code === 32 ) {

				this.pushToBuffer( parseInt( this.input, 10 ) );
				this.input = '';

			} else if ( code === 47 ) {

				if ( this.slashCount < 2 ) {

					var distance = this.lineIndex - this.slashLast;
					if ( distance < this.shortestDistance ) {
						this.shortestDistance = distance;
					}
					this.slashLast = this.lineIndex;
					this.slashCount++;

				}

				this.pushToBuffer( parseInt( this.input, 10 ) );
				this.input = '';

			} else {

				this.input += String.fromCharCode( code );

			}
			this.lineIndex++;
		};

		FaceStore.prototype.detectedLF = function ( oobRef ) {
			this.pushToBuffer( parseInt( this.input, 10 ) );

			var type = this.slashCount === 2 ? ( this.shortestDistance === 1 ? 2 : 0 ) : ( this.slashCount === 1 ? 1 : 3 );
			oobRef.updateFace( type, this.bufferIndex, this.buffer );

			if ( this.debug ) console.log( 'Faces type: ' + type + ': ' + this.buffer );

			// rewrite buffer every line
			this.input = '';
			this.buffer = [];
			this.bufferIndex = 0;
			this.bufferOffset = 0;

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

		function NameStore( description, oobRefFunction ) {
			BaseStore.call( this, description, 0 );
			this.oobRefFunction = oobRefFunction;
			this.foundFirstSpace = false;
		}

		NameStore.prototype.parseCode = function ( code ) {
			if ( this.foundFirstSpace ) {

				this.input += String.fromCharCode( code );

			} else if ( code === 32 ) {

				this.foundFirstSpace = true;
			}
		};

		NameStore.prototype.detectedLF = function ( oobRef ) {
			this.pushToBuffer( this.input );

			oobRef[this.oobRefFunction]( this.input );

			if ( this.debug ) console.log( this.description + ': ' + this.input );

			this.input = '';
			this.bufferOffset = this.bufferIndex;
			this.foundFirstSpace = false;
		};

		return NameStore;
	})();

	var OutputObjectBuilder = (function () {

		function OutputObjectBuilder( vertices, normals, uvs, comments ) {
			this.objectName;

			this.vertices = vertices;
			this.normals = normals;
			this.uvs = uvs;
			this.comments = comments;

			this.mtllibName = '';

			// faces are stored according groups and then according smoothing groups
			this.activeGroup = '';
			this.objectGroupBuffers = [];
			this.objectGroupBufferInUse = null;
			this.objectGroupCount = 0;

			this.activeMtlName = '';
			this.mtlBufferInUse = null;
			this.mtlCount = 0;

			this.activeSmoothingGroup = 0;
			this.smoothingGroupBufferInUse = [];
			this.smoothingGroupBufferInUseIndex = 0;
			this.smoothingGroupCount = 0;
		}

		OutputObjectBuilder.prototype.updateObject = function ( objectName ) {
			this.objectName = objectName;
		};

		OutputObjectBuilder.prototype.updateMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		OutputObjectBuilder.prototype.updateGroup = function ( groupName ) {
			if ( this.activeGroup === groupName ) return;

			this.activeGroup = groupName;
			if ( this.objectGroupBuffers[ this.activeGroup ] === undefined ) {

				this.objectGroupBufferInUse = this.objectGroupBuffers[ this.activeGroup ] = [];
				this.objectGroupCount++;

			} else {

				this.objectGroupBufferInUse = this.objectGroupBuffers[ this.activeGroup ];

			}
		};

		OutputObjectBuilder.prototype.updateMtl = function ( mtlName ) {
			if ( this.activeMtlName === mtlName ) return;

			this.activeMtlName = mtlName;
			if ( this.objectGroupBufferInUse[ this.activeMtlName ] === undefined ) {

				this.mtlBufferInUse = this.objectGroupBufferInUse[ this.activeMtlName ] = [];
				this.mtlCount++;

			} else {

				this.mtlBufferInUse = this.objectGroupBufferInUse[ this.activeMtlName ];

			}
		};

		OutputObjectBuilder.prototype.updateSmoothingGroup = function ( activeSmoothingGroup ) {
			var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
			if ( this.activeSmoothingGroup === normalized ) return;

			this.activeSmoothingGroup = normalized;
			if ( this.mtlBufferInUse[ this.activeSmoothingGroup ] === undefined ) {

				this.smoothingGroupBufferInUse = this.mtlBufferInUse[ this.activeSmoothingGroup ] = [];
				this.smoothingGroupCount++;

			} else {

				this.smoothingGroupBufferInUse = this.mtlBufferInUse[ this.activeSmoothingGroup ];

			}
		};

		OutputObjectBuilder.prototype.updateFace = function ( type, count, lineBuffer ) {
			this.smoothingGroupBufferInUse[ this.smoothingGroupBufferInUseIndex ] = type;
			this.smoothingGroupBufferInUseIndex++;

			for ( var i = 0; i < count; i++ ) {
				this.smoothingGroupBufferInUse[ this.smoothingGroupBufferInUseIndex ] = lineBuffer[ i ];
				this.smoothingGroupBufferInUseIndex++;
			}
		};


		OutputObjectBuilder.prototype.buildRawMeshData = function () {
			var materialGroups;
			var smooothingGroups;
			var facesInfo;

			for ( var groupName in this.objectGroupBuffers ) {

				materialGroups = this.objectGroupBuffers[ groupName ];
				console.log( groupName + ': ' +  materialGroups );
				for ( var materialName in materialGroups ) {

					smooothingGroups = materialGroups[ materialName ];
					console.log( 'Smoothing groups for material: ' + materialName );
					for ( var smooothingGroupName in smooothingGroups ) {

						facesInfo = smooothingGroups[ smooothingGroupName ];
						console.log( 'Smoothing group ' + smooothingGroupName + ' face info count stored: ' + facesInfo.length );

					}
				}
			}
		};

		return OutputObjectBuilder;
	})();

	return OBJLoader;
})();
