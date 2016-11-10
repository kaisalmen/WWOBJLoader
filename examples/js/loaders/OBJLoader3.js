/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = null;
		this.loader = null;
		this.path = '';
		this.loadAsArrayBuffer = true;
		this.parser = null;
		this.debug = false;

		this.reInit( manager );
	}

	OBJLoader.prototype.setPath = function ( path ) {
		this.path = ( path == null ) ? '' : path;
	};

	/**
	 * When this is set the ResponseType of the FileLoader is set to arraybuffer and parseArrayBuffer is used.
	 * Default is true.
	 *
	 * @param loadAsArrayBuffer
	 */
	OBJLoader.prototype.setLoadAsArrayBuffer = function ( loadAsArrayBuffer ) {
		this.loadAsArrayBuffer = ( loadAsArrayBuffer == null ) ? true : false;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * Default is new empty THREE.Group
	 *
	 * @param container
	 */
	OBJLoader.prototype.setContainer = function ( container ) {
		this.parser.extendableMeshCreator.setContainer( container );
	};

	/**
	 * Set materials loaded by MTLLoader.
	 * Default is null.
	 *
	 * @param materials
	 */
	OBJLoader.prototype.setMaterials = function ( materials ) {
		this.parser.extendableMeshCreator.setMaterials( materials );
	};

	/**
	 * If this is set a new object is created for every object + smoothing group
	 * Default is false.
	 *
	 * @param createObjectPerSmoothingGroup
	 */
	OBJLoader.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
		this.parser.rawObjectBuilder.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );
	};

	/**
	 * Convienece method used for init or re-init
	 *
	 * @param manager
	 * @param loadAsArrayBuffer
	 * @param path
	 * @param container
	 * @param materials
	 * @param createObjectPerSmoothingGroup
	 */
	OBJLoader.prototype.reInit = function ( manager, loadAsArrayBuffer, path, container, materials, createObjectPerSmoothingGroup ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;
		this.loader = new THREE.FileLoader( this.manager );
		this.parser = new OBJCodeParser();
		this.setLoadAsArrayBuffer( loadAsArrayBuffer );
		this.setPath( path );
		this.setMaterials( materials );
		this.setContainer( container );
		this.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );
	};

	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {
		var scope = this;
		scope.loader.setPath( this.path );
		scope.loader.setResponseType( scope.loadAsArrayBuffer ? 'arraybuffer' : 'text' );
		scope.loader.load( url, function ( loadedContent ) {

			var container = scope.parse( loadedContent );
			scope.loader = null;
			onLoad( container );

		}, onProgress, onError );
	};

	OBJLoader.prototype.parse = function ( loadedContent ) {

		if ( this.loadAsArrayBuffer ) {

			this.parser.prepareArrayBuffer( loadedContent );

		} else {

			this.parser.prepareText( loadedContent );


		}
		this.parser.parse();

		// do not forget last object
		var container = this.parser.finalize();
		this.parser = null;

		return container;
	};

	// OBJLoader internal static variables
	var VERTEX_AND_NORMAL_VECTOR_LENGTH = 3;
	var UV_VECTOR_LENGTH = 2;
	var MIN_INPUT_LENGTH = 0;

	var FACE_ARRAY_LENGTH = 3;

	var QUAD_INDICES = [ 0, 1, 2, 0, 2, 3 ];
	var QUAD_INDICES_ARRAY_LENGTH = 6;

	var CODE_LF = 10;
	var CODE_CR = 13;
	var CODE_SPACE = 32;
	var CODE_SLASH = 47;
	var CODE_F = 102;
	var CODE_G = 103;
	var CODE_L = 108;
	var CODE_M = 109;
	var CODE_N = 110;
	var CODE_O = 111;
	var CODE_S = 115;
	var CODE_T = 116;
	var CODE_U = 117;
	var CODE_V = 118;

	var OBJCodeParser = (function () {

		function OBJCodeParser() {
			this.rawObjectBuilder = new RawObjectBuilder( false );
			this.extendableMeshCreator = new THREE.OBJLoader.ExtendableMeshCreator();

			// globals (per InputObjectStore)
			this.parsers = {
				void: new LineParserBase(),
				mtllib:  new LineParserStringSpace( 'pushMtllib' ),
				vertices: new LineParserVertex( 'pushVertex' ),
				normals:  new LineParserVertex( 'pushNormal' ),
				uvs:  new LineParserUv( 'pushUv' ),
				objects:  new LineParserString( 'pushObject' ),
				groups: new LineParserString( 'pushGroup' ),
				usemtls:  new LineParserStringSpace( 'pushMtl' ),
				faces:  new LineParserFace(),
 				lines:  new LineParserLine(),
				smoothingGroups:  new LineParserString( 'pushSmoothingGroup' ),
				current: null
			};

			this.reachedFaces = false;
			this.inputObjectCount = 0;

			this.text = null;
			this.view = null;
			this.contentLength = 0;
			this.pointer = 0;

			this.retrieveCodeFunction = this.getCodeFromArrayBuffer;

			this.setDebug( false, false );
		}

		OBJCodeParser.prototype.setDebug = function ( debugObjCodeParser, debugExtendableMeshCreator ) {
			this.debug = debugObjCodeParser;
			this.extendableMeshCreator.debug = debugExtendableMeshCreator;
		};

		OBJCodeParser.prototype.prepareArrayBuffer = function ( arrayBuffer ) {
			this.retrieveCodeFunction = this.getCodeFromArrayBuffer;
			this.view = new Uint8Array( arrayBuffer );
			this.contentLength = this.view.byteLength;
		};

		OBJCodeParser.prototype.getCodeFromArrayBuffer = function () {
			return this.view[ this.pointer++ ];
		};

		OBJCodeParser.prototype.prepareText = function ( text ) {
			this.retrieveCodeFunction = this.getCodeFromText;
			this.text = text;
			this.contentLength = this.text.length;
		};

		OBJCodeParser.prototype.getCodeFromText = function () {
			return this.text[ this.pointer++ ].charCodeAt( 0 );
		};

		OBJCodeParser.prototype.parse = function () {
			console.time( 'Parse' );

			// first will entry will lead to identification of line
			var code = CODE_LF;
			var line = [];
			var index = 0;
			while ( this.pointer < this.contentLength ) {

				if ( code === CODE_LF || code === CODE_CR ) {

					// jump over LF if CR exists
					if ( code === CODE_CR ) {
						this.pointer++;
					}
					if ( this.parsers.current !== null ) {

						// LF => signal store end of line and reset parser to null (re-evaluate starts for next line)
						this.parsers.current.processLine( line, index, this.rawObjectBuilder );
						this.parsers.current = null;

					}
					code = this.identifyLineType();
					index = 0;

				} else {

					line[ index++ ] = code;
					code = this.retrieveCodeFunction();

				}

			}

			console.timeEnd( 'Parse' );
		};

		OBJCodeParser.prototype.identifyLineType = function () {
			// fast-fail for EOL
			if ( this.pointer + 1 >= this.contentLength ) {
				this.pointer++;
				return CODE_LF;
			}

			var first = this.retrieveCodeFunction();
			if ( first === CODE_LF || first === CODE_CR ) {
				// incase of immediate new line, just let the main loop handle it
				return first;

			} else if ( first === CODE_SPACE ) {
				// in case of leading space, restart detection
				return CODE_LF;
			}

			var second = this.retrieveCodeFunction();
			// a possible scenario is an empty comment line '#'
			if ( second === CODE_LF || second === CODE_CR ) return second;

			if ( first === CODE_V && second === CODE_SPACE ) {
				// 'v '
				// object complete instance required if reached faces already (= reached next block of v)
				if ( this.reachedFaces ) this.processCompletedObject( true );

				this.parsers.current = this.parsers.vertices;

			} else if ( first === CODE_V && second === CODE_T ) {
				// 'vt'
				this.parsers.current = this.parsers.uvs;

			} else if ( first === CODE_V && second === CODE_N ) {
				// 'vn'
				this.parsers.current = this.parsers.normals;

			} else if ( first === CODE_F && second === CODE_SPACE ) {
				// 'f '
				this.parsers.current = this.parsers.faces;
				this.reachedFaces = true;

			} else if ( first === CODE_S && second === CODE_SPACE ) {
				// 's '
				this.parsers.current = this.parsers.smoothingGroups;

			} else if ( first === CODE_G && second === CODE_SPACE ) {
				// 'g '
				this.parsers.current = this.parsers.groups;

			} else if ( first === CODE_L && second === CODE_SPACE ) {
				// 'l '
				this.parsers.current = this.parsers.lines;

			} else if ( first === CODE_U && second === CODE_S ) {
				// 'us'emtl
				this.parsers.current = this.parsers.usemtls;

			} else if ( first === CODE_O && second === CODE_SPACE ) {
				// 'o '
				// new instance required, because "o" found and previous vertices exist
				if ( this.rawObjectBuilder.vertices.length > 0 ) {
					this.processCompletedObject( false );
				}
				this.parsers.current = this.parsers.objects;

			} else if ( first === CODE_M && second === CODE_T ) {
				// 'mt'llib
				this.parsers.current = this.parsers.mtllib;

			} else  {
				// '#' or anything else
				this.parsers.current = this.parsers.void;
			}

			return this.retrieveCodeFunction();
		};


		OBJCodeParser.prototype.processCompletedObject = function ( vertexDetection ) {
			if ( this.debug ) this.rawObjectBuilder.createReport( this.inputObjectCount, true );

			this.extendableMeshCreator.buildMesh( this.rawObjectBuilder.retrievedObjectDescriptions, this.inputObjectCount );
			this.inputObjectCount++;

			this.rawObjectBuilder = this.rawObjectBuilder.newInstance( vertexDetection );
			this.reachedFaces = false;
		};

		OBJCodeParser.prototype.finalize = function () {
			if ( this.debug ) this.rawObjectBuilder.createReport( this.inputObjectCount, true );

			this.extendableMeshCreator.buildMesh( this.rawObjectBuilder.retrievedObjectDescriptions, this.inputObjectCount );
			this.inputObjectCount++;

			this.rawObjectBuilder = null;
			this.reachedFaces = false;

			console.log( 'Global output object count: ' + this.extendableMeshCreator.globalObjectCount );

			var container = this.extendableMeshCreator.container;
			this.extendableMeshCreator = null;

			return container;
		};

		var LineParserBase = (function () {

			function LineParserBase( robRefFunction  ) {
				this.robRefFunction = robRefFunction;
			}

			/**
			 * Extensions need to override this method.
			 * End of line is detected. Data needs to be processed and forwarded to RawObjectBuilder
			 */
			LineParserBase.prototype.processLine = function ( line, index, robRef ) {

			};

			return LineParserBase;
		})();

		var LineParserString = (function () {

			LineParserString.prototype = Object.create( LineParserBase.prototype );
			LineParserString.prototype.constructor = LineParserString;

			function LineParserString( robRefFunction ) {
				LineParserBase.call( this, robRefFunction );
			}

			LineParserString.prototype.processLine = function ( line, index, robRef ) {
				var input = '';

				for ( var i = 0; i < index; i++ ) {
					input += String.fromCharCode( line[ i ] );
				}

				robRef[ this.robRefFunction ]( input );
			};

			return LineParserString;
		})();

		var LineParserStringSpace = (function () {

			LineParserStringSpace.prototype = Object.create( LineParserBase.prototype );
			LineParserStringSpace.prototype.constructor = LineParserStringSpace;

			function LineParserStringSpace( robRefFunction ) {
				LineParserBase.call( this, robRefFunction );
			}

			LineParserStringSpace.prototype.processLine = function ( line, index, robRef ) {
				var input = '';
				var foundFirstSpace = false;
				var code;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( foundFirstSpace ) {

						input += String.fromCharCode( code );

					} else if ( code === CODE_SPACE ) {

						foundFirstSpace = true;
					}
				}

				robRef[ this.robRefFunction ]( input );
			};

			return LineParserStringSpace;
		})();


		var LineParserVertex = (function () {

			LineParserVertex.prototype = Object.create( LineParserBase.prototype );
			LineParserVertex.prototype.constructor = LineParserVertex;

			function LineParserVertex( robRefFunction ) {
				LineParserBase.call( this, robRefFunction );
				this.buffer = new Array( 3 );
				this.bufferIndex = 0;
			}

			LineParserVertex.prototype.pushToBuffer = function ( input ) {
				if ( input.length > MIN_INPUT_LENGTH ) {

					this.buffer[ this.bufferIndex++ ] = parseFloat( input );
				}
			};

			LineParserVertex.prototype.processLine = function ( line, index, robRef ) {
				this.bufferIndex = 0;
				var input = '';
				var code;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( code === CODE_SPACE ) {

						this.pushToBuffer( input );
						input = '';

					} else {

						input += String.fromCharCode( code );

					}
				}
				this.pushToBuffer( input );

				robRef[ this.robRefFunction ]( this.buffer );
			};

			return LineParserVertex;
		})();


		var LineParserUv = (function () {

			LineParserUv.prototype = Object.create( LineParserVertex.prototype );
			LineParserUv.prototype.constructor = LineParserUv;

			function LineParserUv( robRefFunction ) {
				LineParserVertex.call( this, robRefFunction );
				this.buffer = new Array( 2 );
			}

			LineParserUv.prototype.pushToBuffer = function ( input ) {
				if ( input.length > MIN_INPUT_LENGTH ) {

					this.buffer[ this.bufferIndex++ ] = parseFloat( input );
					return 1;

				} else {

					return 0;

				}
			};

			LineParserUv.prototype.processLine = function ( line, index, robRef ) {
				this.bufferIndex = 0;
				var retrievedFloatCount = 0;
				var input = '';
				var code;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( code === CODE_SPACE ) {

						retrievedFloatCount += this.pushToBuffer( input );
						if ( retrievedFloatCount == 2 ) break;
						input = '';

					} else {

						input += String.fromCharCode( code );

					}
				}

				robRef.pushUv( this.buffer );
			};

			return LineParserUv;
		})();


		/**
		 * Support for triangle or quads:
		 * 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
		 * 1: "f vertex/uv			vertex/uv			vertex/uv			vertex/uv"
		 * 2: "f vertex//normal		vertex//normal		vertex//normal		vertex//normal"
		 * 3: "f vertex				vertex				vertex				vertex"
		 */
		var LineParserFace = (function () {

			LineParserFace.prototype = Object.create( LineParserVertex.prototype );
			LineParserFace.prototype.constructor = LineParserFace;

			function LineParserFace() {
				LineParserVertex.call( this );
				this.buffer = new Array( 12 );
			}

			LineParserFace.prototype.pushToBuffer = function ( input ) {
				if ( input.length > MIN_INPUT_LENGTH ) {

					this.buffer[ this.bufferIndex++ ] = parseInt( input, 10 );

				}
			};

			LineParserFace.prototype.processLine = function ( line, index, robRef ) {
				this.bufferIndex = 0;
				var code;
				var input = '';
				var slashCount = 0;
				var type = 3;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( code === CODE_SPACE ) {

						if ( slashCount === 1 ) type = 1;
						this.pushToBuffer( input );
						input = '';

					} else if ( code === CODE_SLASH ) {

						if ( slashCount < 2 && type !== 1 ) {

							slashCount ++;
							type = ( input.length === 0 ) ? 2 : 0;

						}
						this.pushToBuffer( input );
						input = '';

					} else {

						input += String.fromCharCode( code );

					}
				}
				this.pushToBuffer( input );


				var haveQuad = this.bufferIndex % 4 === 0;
				if ( haveQuad ) {

					if ( type === 0 ) {

						robRef.pushQuadVVtVn(
							[ this.buffer[0], this.buffer[3], this.buffer[6], this.buffer[9] ],
							[ this.buffer[1], this.buffer[4], this.buffer[7], this.buffer[10] ],
							[ this.buffer[2], this.buffer[5], this.buffer[8], this.buffer[11] ]
						);

					} else if ( type === 1 ) {

						robRef.pushQuadVVt(
							[ this.buffer[0], this.buffer[2], this.buffer[4], this.buffer[6] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5], this.buffer[7] ]
						);

					} else if ( type === 2 ) {

						robRef.pushQuadVVn(
							[ this.buffer[0], this.buffer[2], this.buffer[4], this.buffer[6] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5], this.buffer[7] ]
						);

					} else if ( type === 3 ) {

						robRef.pushQuadV(
							[ this.buffer[0], this.buffer[1], this.buffer[2], this.buffer[3] ]
						);

					}

				} else {

					if ( type === 0 ) {

						robRef.pushFaceVVtVn(
							 [ this.buffer[ 0 ], this.buffer[ 3 ], this.buffer[ 6 ] ],
							 [ this.buffer[ 1 ], this.buffer[ 4 ], this.buffer[ 7 ] ],
							 [ this.buffer[ 2 ], this.buffer[ 5 ], this.buffer[ 8 ] ]
						);

					} else if ( type === 1 ) {

						robRef.pushFaceVVt(
							[ this.buffer[0], this.buffer[2], this.buffer[4] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5] ]
						);

					} else if ( type === 2 ) {

						robRef.pushFaceVVn(
							[ this.buffer[0], this.buffer[2], this.buffer[4] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5] ]
						);

					} else if ( type === 3 ) {

						robRef.pushFaceV(
							[ this.buffer[0], this.buffer[1], this.buffer[2] ]
						);

					}
				}
			};

			return LineParserFace;
		})();

		var LineParserLine = (function () {

			LineParserLine.prototype = Object.create( LineParserBase.prototype );
			LineParserLine.prototype.constructor = LineParserLine;

			function LineParserLine( robRefFunction ) {
				LineParserBase.call( this, robRefFunction );
			}

			LineParserLine.prototype.processLine = function ( line, index, robRef ) {
				var input = '';

				for ( var i = 0; i < index; i++ ) {
					input += String.fromCharCode( line[ i ] );
				}

				robRef.pushLine( input );
			};

			return LineParserLine;
		})();

		return OBJCodeParser;
	})();

	var RawObjectBuilder = (function () {

		function RawObjectBuilder( activeGroupOverride ) {
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

			this.mtllibName = '';

			// faces are store according combined index of groups, material and smoothing group
			this.activeGroup = ( activeGroupOverride === undefined ) ? 'none' : activeGroupOverride;
			this.activeMtlName = 'none';
			this.activeSmoothingGroup = 0;

			this.objectGroupCount = 0;
			this.mtlCount = 0;
			this.smoothingGroupCount = 0;

			this.retrievedObjectDescriptions = [];
			var index = this.buildIndexRegular();
			this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ] = new THREE.OBJLoader.RetrievedObjectDescription(
				this.objectName, this.activeGroup, this.activeMtlName, this.activeSmoothingGroup );
		}

		RawObjectBuilder.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
			this.createObjectPerSmoothingGroup = ( createObjectPerSmoothingGroup == null ) ? false : createObjectPerSmoothingGroup;
		};

		RawObjectBuilder.prototype.newInstance = function ( vertexDetection ) {
			var newOob;
			if ( vertexDetection ) {

				newOob = new RawObjectBuilder( this.createObjectPerSmoothingGroup, this.activeGroup );

			} else {

				newOob = new RawObjectBuilder( this.createObjectPerSmoothingGroup );

			}
			newOob.globalVertexOffset = this.globalVertexOffset + this.verticesIndex / 3;
			newOob.globalUvOffset = this.globalUvOffset + this.uvsIndex / 2;
			newOob.globalNormalOffset = this.globalNormalOffset + this.normalsIndex / 3;

			return newOob;
		};

		RawObjectBuilder.prototype.pushToBuffer = function ( source, target, targetIndex ) {
			for ( var i = 0, length = source.length; i < length; i++ ) {

				target[ targetIndex ] = source[ i ];
				targetIndex++;

			}
			return targetIndex;
		};

		RawObjectBuilder.prototype.pushVertex = function ( vertexArray ) {
			this.verticesIndex = this.pushToBuffer( vertexArray, this.vertices, this.verticesIndex );
		};

		RawObjectBuilder.prototype.pushNormal = function ( normalArray ) {
			this.normalsIndex = this.pushToBuffer( normalArray, this.normals, this.normalsIndex );
		};

		RawObjectBuilder.prototype.pushUv = function ( uvArray ) {
			this.uvsIndex = this.pushToBuffer( uvArray, this.uvs, this.uvsIndex );
		};

		RawObjectBuilder.prototype.pushObject = function ( objectName ) {
			this.objectName = objectName;
		};

		RawObjectBuilder.prototype.pushMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		RawObjectBuilder.prototype.pushGroup = function ( groupName ) {
			if ( this.activeGroup === groupName ) return;
			this.activeGroup = groupName;
			this.objectGroupCount++;

			this.verifyIndex();
		};

		RawObjectBuilder.prototype.pushMtl = function ( mtlName ) {
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
					this.objectName, this.activeGroup, this.activeMtlName, this.activeSmoothingGroup );

			}
			else {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ];

			}
		};

		RawObjectBuilder.prototype.buildIndexRegular = function () {
			return this.objectName + '|' + this.activeGroup + '|' + this.activeMtlName + '|' + this.activeSmoothingGroup;
		};

		RawObjectBuilder.prototype.buildIndexOverride = function ( smoothingGroup ) {
			return this.objectName + '|' + this.activeGroup + '|' + this.activeMtlName + '|' + smoothingGroup;
		};

		RawObjectBuilder.prototype.pushFaceVVtVn = function ( vIndices, vtIndices, vnIndices ) {
			for ( var i = 0; i < FACE_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ i ] );
 				this.attachFaceUv( vtIndices[ i ] );
 				this.attachFaceNormal( vnIndices[ i ] );
			}
		};

		RawObjectBuilder.prototype.pushFaceVVt = function ( vIndices, vtIndices ) {
			for ( var i = 0; i < FACE_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ i ] );
				this.attachFaceUv( vtIndices[ i ] );
			}
		};

		RawObjectBuilder.prototype.pushFaceVVn = function ( vIndices, vnIndices ) {
			for ( var i = 0; i < FACE_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ i ] );
				this.attachFaceNormal( vnIndices[ i ] );
			}
		};

		RawObjectBuilder.prototype.pushFaceV = function ( vIndices ) {

			for ( var i = 0; i < FACE_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ i ] );
			}
		};

		RawObjectBuilder.prototype.pushQuadVVtVn = function ( vIndices, vtIndices, vnIndices ) {
			for ( var i = 0; i < QUAD_INDICES_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ QUAD_INDICES[ i ] ] );
				this.attachFaceUv( vtIndices[ QUAD_INDICES[ i ] ] );
				this.attachFaceNormal( vnIndices[ QUAD_INDICES[ i ] ] );
			}
		};

		RawObjectBuilder.prototype.pushQuadVVt = function ( vIndices, vtIndices ) {
			for ( var i = 0; i < QUAD_INDICES_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ QUAD_INDICES[ i ] ] );
				this.attachFaceUv( vtIndices[ QUAD_INDICES[ i ] ] );
			}
		};

		RawObjectBuilder.prototype.pushQuadVVn = function ( vIndices, vnIndices ) {
			for ( var i = 0; i < QUAD_INDICES_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ QUAD_INDICES[ i ] ] );
				this.attachFaceNormal( vnIndices[ QUAD_INDICES[ i ] ] );
			}
		};

		RawObjectBuilder.prototype.pushQuadV = function ( vIndices ) {
			for ( var i = 0; i < QUAD_INDICES_ARRAY_LENGTH; i++ ) {
				this.attachFaceVertex( vIndices[ QUAD_INDICES[ i ] ] );
			}
		};

		RawObjectBuilder.prototype.attachFaceVertex = function ( faceIndex ) {
			var index = ( faceIndex - this.globalVertexOffset ) * VERTEX_AND_NORMAL_VECTOR_LENGTH;

			this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = this.vertices[ index++ ];
			this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = this.vertices[ index++ ];
			this.retrievedObjectDescriptionInUse.vertexArray[ this.retrievedObjectDescriptionInUse.vertexArrayIndex++ ] = this.vertices[ index ];
		};

		RawObjectBuilder.prototype.attachFaceUv = function ( faceIndex ) {
			var index = ( faceIndex - this.globalUvOffset ) * UV_VECTOR_LENGTH;

			this.retrievedObjectDescriptionInUse.uvArray[ this.retrievedObjectDescriptionInUse.uvArrayIndex++ ] = this.uvs[ index++ ];
			this.retrievedObjectDescriptionInUse.uvArray[ this.retrievedObjectDescriptionInUse.uvArrayIndex++ ] = this.uvs[ index ];
		};

		RawObjectBuilder.prototype.attachFaceNormal = function ( faceIndex ) {
			var index = ( faceIndex - this.globalNormalOffset ) * VERTEX_AND_NORMAL_VECTOR_LENGTH;

			this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = this.normals[ index++ ];
			this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = this.normals[ index++ ];
			this.retrievedObjectDescriptionInUse.normalArray[ this.retrievedObjectDescriptionInUse.normalArrayIndex++ ] = this.normals[ index ];
		};

		RawObjectBuilder.prototype.pushLine = function ( line ) {

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
				mtlCount: this.mtlCount
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
				console.log( '' );
			}

			return report;
		};

		return RawObjectBuilder;
	})();

	return OBJLoader;
})();


THREE.OBJLoader.RetrievedObjectDescription = (function () {

	function RetrievedObjectDescription( objectName, group, materialName, smoothingGroup ) {
		this.objectName = objectName;
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

THREE.OBJLoader.ExtendableMeshCreator = (function () {

	function ExtendableMeshCreator() {
		this.container = new THREE.Group();
		this.materials = null;
		this.debug = false;

		this.globalObjectCount = 0;
	}

	ExtendableMeshCreator.prototype.setContainer = function ( container ) {
		this.container = ( container == null ) ? new THREE.Group() : container;
	};

	ExtendableMeshCreator.prototype.setMaterials = function ( materials ) {
		this.materials = ( materials == null ) ? null : materials;
	};

	ExtendableMeshCreator.prototype.buildMesh = function ( retrievedObjectDescriptions, inputObjectCount ) {
		var retrievedObjectDescription;

		if ( this.debug ) console.log( 'ExtendableMeshCreator.buildRawMeshData: Processing object no.: ' + inputObjectCount );

		for ( var index in retrievedObjectDescriptions ) {
			retrievedObjectDescription = retrievedObjectDescriptions[ index ];

			if ( retrievedObjectDescription.vertexArrayIndex > 0 ) {

				if ( this.debug ) {
					console.log(
						'Object no.: ' + this.globalObjectCount +
						' objectName: ' + retrievedObjectDescription.objectName +
						' group: ' + retrievedObjectDescription.group +
						' materialName: ' + retrievedObjectDescription.materialName +
						' smoothingGroup: ' + retrievedObjectDescription.smoothingGroup +
						'\nCounts: ' +
						' #vertices: ' + retrievedObjectDescription.vertexArrayIndex / 3 +
						' #uvs: ' + + retrievedObjectDescription.uvArrayIndex / 2 +
						' #normals: ' + + retrievedObjectDescription.normalArrayIndex / 3
					);
				}

				var bufferGeometry = new THREE.BufferGeometry();
				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.vertexArray ), 3 ) );
				if ( retrievedObjectDescription.normalArrayIndex > 0 ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.normalArray ), 3 ) );

				}
				else {

					bufferGeometry.computeVertexNormals();

				}
				if ( retrievedObjectDescription.uvArrayIndex > 0 ) {

					bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( retrievedObjectDescription.uvArray ), 2 ) );

				}

				var material;
				if ( this.materials !== null ) {
					material = this.materials.materials[ retrievedObjectDescription.materialName ];
				}
				if ( material == null ) material = new THREE.MeshStandardMaterial();

				// clone material in case flat shading is needed due to smoothingGroup 0
				if ( retrievedObjectDescription.smoothingGroup === 0 ) {
					material = material.clone();
					material.shading = THREE.FlatShading;
				}

				var mesh = new THREE.Mesh( bufferGeometry, material );
				this.container.add( mesh );

				this.globalObjectCount++;
			}
		}
	};

	return ExtendableMeshCreator;
})();
