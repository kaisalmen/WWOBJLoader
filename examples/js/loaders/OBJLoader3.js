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

			var container = scope.parse( loadedContent )
			scope.loader = null;
			onLoad( container );

		}, onProgress, onError );
	};

	OBJLoader.prototype.parse = function ( loadedContent ) {
		if ( this.loadAsArrayBuffer ) {

			this.parser.parseArrayBuffer( loadedContent );

		} else {

			this.parser.parseText( loadedContent );

		}

		// do not forget last object
		var container = this.parser.finalize();
		this.parser = null;

		return container;
	};

	// OBJLoader internal static variables
	var VERTEX_AND_NORMAL_VECTOR_LENGTH = 3;
	var UV_VECTOR_LENGTH = 2;

	var FACE_ARRAY_LENGTH = 3;

	var QUAD_INDICES = [ 0, 1, 2, 0, 2, 3 ];
	var QUAD_INDICES_ARRAY_LENGTH = 6;

	var OBJCodeParser = (function () {

		function OBJCodeParser() {
			this.rawObjectBuilder = new RawObjectBuilder( false );
			this.extendableMeshCreator = new THREE.OBJLoader.ExtendableMeshCreator();

			// globals (per InputObjectStore)
			this.parsers = {
				comments: new LineParserBase( '#', 'pushComment' ),
				mtllib:  new LineParserString( 'mtllib', 'pushMtllib' ),
				vertices: new LineParserVertex( 'v', 'pushVertex' ),
				normals:  new LineParserVertex( 'vn', 'pushNormal' ),
				uvs:  new LineParserUv( 'pushUv' ),
				objects:  new LineParserString( 'o', 'pushObject' ),
				groups: new LineParserString( 'g', 'pushGroup' ),
				usemtls:  new LineParserString( 'usemtl', 'pushMtl' ),
				faces:  new LineParserFace(),
				smoothingGroups:  new LineParserString( 's', 'pushSmoothingGroup' ),
				current: null
			};
			this.reachedFaces = false;
			this.inputObjectCount = 0;

			this.text = null;
			this.view = null;
			this.pointer = 0;
			this.one = 0;
			this.two = 0;

			this.setDebug( false, false, false );
		}

		OBJCodeParser.prototype.setDebug = function ( self, parsers, extendableMeshCreator ) {
			this.debug = self;

			var singleParser;
			for ( var propName in this.parsers ) {
				if ( this.parsers.hasOwnProperty( propName ) ) {
					singleParser = this.parsers[ propName ];
					if ( singleParser !== null) singleParser.debug = parsers;
				}
			}
			this.extendableMeshCreator.debug = extendableMeshCreator;
		};

		OBJCodeParser.prototype.parseArrayBuffer = function ( arrayBuffer ) {
			console.time( 'ParseBytes' );

			this.view = new Uint8Array( arrayBuffer );
			this.retrieveFirstTwoLineCodesAB();
			this.selectParser();

			var code = 0;
			for ( var length = this.view.byteLength; this.pointer < length; this.pointer++ ) {
				code = this.view [ this.pointer ];

				if ( code === 10 || code === 13 ) {

					// jump over LF if CR exists
					if ( code === 13 ) {
						this.pointer++;
					}
					if ( this.parsers.current !== null ) {

						// LF => signal store end of line and reset parser to null (re-evaluate starts for next line)
						this.parsers.current.detectedLF( this.rawObjectBuilder );
						this.parsers.current = null;

					}
					this.retrieveFirstTwoLineCodesAB();
					this.selectParser();

				} else  {

					this.parsers.current.parseCode( code );

				}
			}

			console.timeEnd( 'ParseBytes' );
		};

		OBJCodeParser.prototype.retrieveFirstTwoLineCodesAB = function () {
			var code = this.view [ this.pointer ];
			this.pointer++;

			while ( code === 10 || code === 13 || code === 32 ) {
				code = this.view [ this.pointer ];
				this.pointer++;
			}

			this.one = code;
			this.two = this.view [ this.pointer ];
		};

		OBJCodeParser.prototype.parseText = function ( text ) {
			console.time( 'ParseString' );

			this.text = text;
			this.retrieveFirstTwoLineCodesText();
			this.selectParser();

			var code = 0;
			for ( var length = this.text.length; this.pointer < length; this.pointer++ ) {
				code = this.text[ this.pointer ].charCodeAt( 0 );

				if ( code === 10 || code === 13 ) {

					// jump over LF if CR exists
					if ( code === 13 ) {
						this.pointer++;
					}

					if ( this.parsers.current !== null ) {

						// LF => signal store end of line and reset parser to null (re-evaluate starts for next line)
						this.parsers.current.detectedLF( this.rawObjectBuilder );
						this.parsers.current = null;

					}

					this.retrieveFirstTwoLineCodesText();
					this.selectParser();

				} else  {

					this.parsers.current.parseCode( code );

				}
			}

			console.timeEnd( 'ParseString' );
		};

		OBJCodeParser.prototype.retrieveFirstTwoLineCodesText = function () {
			var code = this.pointer < this.text.length ? this.text[ this.pointer ].charCodeAt( 0 ) : -1;
			if ( code === -1 ) return;
			this.pointer++;

			while ( ( code === 10 || code === 13 || code === 32 ) && this.pointer < this.text.length) {
				code = this.text[ this.pointer ].charCodeAt( 0 );
				this.pointer++;
			}

			this.one = code;
			this.two = this.pointer < this.text.length ? this.text[ this.pointer ].charCodeAt( 0 ) : -1;
			if ( code === -1 ) return;
		};

		OBJCodeParser.prototype.selectParser = function () {
			if ( this.one === 118 && this.two === 32 ) {
				// 'v '
				// object complete instance required if reached faces already (= reached next block of v)
				if ( this.reachedFaces ) this.processCompletedObject( true );

				this.parsers.current = this.parsers.vertices;

			} else if ( this.one === 118 && this.two === 116 ) {
				// 'vt'
				this.parsers.current = this.parsers.uvs;

			} else if ( this.one === 118 && this.two === 110 ) {
				// 'vn'
				this.parsers.current = this.parsers.normals;

			} else if ( this.one === 102 && this.two === 32 ) {
				// 'f '
				this.parsers.current = this.parsers.faces;
				this.reachedFaces = true;

			} else if ( this.one === 115 && this.two === 32 ) {
				// 's '
				this.parsers.current = this.parsers.smoothingGroups;
				this.parsers.current.foundFirstSpace = true;

			} else if ( this.one === 103 && this.two === 32 ) {
				// 'g '
				this.parsers.current = this.parsers.groups;
				this.parsers.current.foundFirstSpace = true;

			} else if ( this.one === 117 && this.two === 115 ) {
				// 'us'emtl
				this.parsers.current = this.parsers.usemtls;

			} else if ( this.one === 111 && this.two === 32 ) {
				// 'o '
				// new instance required, because "o" found and previous vertices exist
				if ( this.rawObjectBuilder.vertices.length > 0 ) {
					this.processCompletedObject( false );
				}
				this.parsers.current = this.parsers.objects;
				this.parsers.current.foundFirstSpace = true;

			} else if ( this.one === 109 && this.two === 116 ) {
				// 'mt'llib
				this.parsers.current = this.parsers.mtllib;

			} else if ( this.one === 35 ) {
				// '#'
				this.parsers.current = this.parsers.comments;

			}
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

			function LineParserBase( description, robRefFunction  ) {
				this.robRefFunction = robRefFunction;

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
			LineParserBase.prototype.detectedLF = function ( robRef ) {
				if ( this.robRefFunction) robRef[ this.robRefFunction ]( this.input );

				if ( this.debug ) console.log( this.description + ': ' + this.input );

				this.input = '';
			};

			return LineParserBase;
		})();


		var LineParserString = (function () {

			LineParserString.prototype = Object.create( LineParserBase.prototype );
			LineParserString.prototype.constructor = LineParserString;

			function LineParserString( description, robRefFunction ) {
				LineParserBase.call( this, description, robRefFunction );
				this.foundFirstSpace = false;
			}

			LineParserString.prototype.parseCode = function ( code ) {
				if ( this.foundFirstSpace ) {

					this.input += String.fromCharCode( code );

				} else if ( code === 32 ) {

					this.foundFirstSpace = true;
				}
			};

			LineParserString.prototype.detectedLF = function ( robRef ) {
				robRef[this.robRefFunction]( this.input );

				if ( this.debug ) console.log( this.description + ': ' + this.input );

				this.input = '';
				this.foundFirstSpace = false;
			};

			return LineParserString;
		})();


		var LineParserVertex = (function () {

			LineParserVertex.prototype = Object.create( LineParserBase.prototype );
			LineParserVertex.prototype.constructor = LineParserVertex;

			function LineParserVertex( type, robRefFunction ) {
				LineParserBase.call( this, type, robRefFunction );
				this.minInputLength = 0;
				this.buffer = new Array( 3 );
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

			LineParserVertex.prototype.detectedLF = function ( robRef ) {
				this.pushToBuffer();

				if ( this.robRefFunction ) robRef[ this.robRefFunction ]( this.buffer );
				if ( this.debug ) console.log( this.description + ': ' + this.buffer );

				this.bufferIndex = 0;
			};

			return LineParserVertex;
		})();


		var LineParserUv = (function () {

			LineParserUv.prototype = Object.create( LineParserVertex.prototype );
			LineParserUv.prototype.constructor = LineParserUv;

			function LineParserUv( robRefFunction ) {
				LineParserVertex.call( this, 'vt', robRefFunction );

				this.buffer = new Array( 2 );
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

			LineParserUv.prototype.detectedLF = function ( robRef ) {
				LineParserVertex.prototype.detectedLF.call( this, robRef );
				this.retrievedFloatCount = 0;
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


				LineParserVertex.call( this, 'f', 12 );

				// variables re-init by detectedLF
				this.slashCount = 0;
				this.type = 3;
			}

			LineParserFace.prototype.parseCode = function ( code ) {
				if ( code === 32 ) {

					if ( this.slashCount === 1 ) this.type = 1;
					this.pushToBuffer();

				} else if ( code === 47 ) {

					if ( this.slashCount < 2 && this.type !== 1 ) {

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

			LineParserFace.prototype.detectedLF = function ( robRef ) {
				this.pushToBuffer();

				var haveQuad = this.bufferIndex % 4 === 0;
				if ( haveQuad ) {

					if ( this.type === 0 ) {

						robRef.pushQuadVVtVn(
							[ this.buffer[0], this.buffer[3], this.buffer[6], this.buffer[9] ],
							[ this.buffer[1], this.buffer[4], this.buffer[7], this.buffer[10] ],
							[ this.buffer[2], this.buffer[5], this.buffer[8], this.buffer[11] ]
						);

					} else if ( this.type === 1 ) {

						robRef.pushQuadVVt(
							[ this.buffer[0], this.buffer[2], this.buffer[4], this.buffer[6] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5], this.buffer[7] ]
						);

					} else if ( this.type === 2 ) {

						robRef.pushQuadVVn(
							[ this.buffer[0], this.buffer[2], this.buffer[4], this.buffer[6] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5], this.buffer[7] ]
						);

					} else if ( this.type === 3 ) {

						robRef.pushQuadV(
							[ this.buffer[0], this.buffer[1], this.buffer[2], this.buffer[3] ]
						);

					}

				} else {

					if ( this.type === 0 ) {

						robRef.pushFaceVVtVn(
							 [ this.buffer[ 0 ], this.buffer[ 3 ], this.buffer[ 6 ] ],
							 [ this.buffer[ 1 ], this.buffer[ 4 ], this.buffer[ 7 ] ],
							 [ this.buffer[ 2 ], this.buffer[ 5 ], this.buffer[ 8 ] ]
						);

					} else if ( this.type === 1 ) {

						robRef.pushFaceVVt(
							[ this.buffer[0], this.buffer[2], this.buffer[4] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5] ]
						);

					} else if ( this.type === 2 ) {

						robRef.pushFaceVVn(
							[ this.buffer[0], this.buffer[2], this.buffer[4] ],
							[ this.buffer[1], this.buffer[3], this.buffer[5] ]
						);

					} else if ( this.type === 3 ) {

						robRef.pushFaceV(
							[ this.buffer[0], this.buffer[1], this.buffer[2] ]
						);

					}

				}

				if ( this.debug ) console.log( 'Faces type: ' + this.type + ': ' + this.buffer );

				this.bufferIndex = 0;
				this.slashCount = 0;
				this.type = 3;
			};

			return LineParserFace;
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
			this.comments = [];

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

		RawObjectBuilder.prototype.pushComment = function ( comment ) {
			this.comments.push( comment );
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
