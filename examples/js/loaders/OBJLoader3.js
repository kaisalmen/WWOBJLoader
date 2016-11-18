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

		this.extendableMeshCreator.debug = true;
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

		if ( this.loadAsArrayBuffer ) {

			this.parser.prepareArrayBuffer( loadedContent );

		} else {

			this.parser.prepareText( loadedContent );

		}
		this.parser.parse();

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

		function OBJCodeParser( extendableMeshCreator ) {
			this.rawObjectBuilder = new RawObjectBuilder( false );
			this.extendableMeshCreator = extendableMeshCreator;
			this.inputObjectCount = 1;

			this.objData = null;
			this.contentLength = 0;

			this.pointer = 0;
			this.retrieveCodeFunction = this.getCodeFromArrayBuffer;
			this.reachedFaces = false;
		}

		OBJCodeParser.prototype.setCreateObjectPerSmoothingGroup = function ( createObjectPerSmoothingGroup ) {
			this.rawObjectBuilder.setCreateObjectPerSmoothingGroup( createObjectPerSmoothingGroup );
		};

		OBJCodeParser.prototype.prepareArrayBuffer = function ( arrayBuffer ) {
			this.retrieveCodeFunction = this.getCodeFromArrayBuffer;
			this.objData = new Uint8Array( arrayBuffer );
			this.contentLength = this.objData.byteLength;
		};

		OBJCodeParser.prototype.getCodeFromArrayBuffer = function () {
			return this.objData[ this.pointer++ ];
		};

		OBJCodeParser.prototype.prepareText = function ( text ) {
			this.retrieveCodeFunction = this.getCodeFromText;
			this.objData = text;
			this.contentLength = this.objData.length;
		};

		OBJCodeParser.prototype.getCodeFromText = function () {
			return this.objData[ this.pointer++ ].charCodeAt( 0 );
		};

		OBJCodeParser.prototype.parse = function () {
			var parsers = {
				void: new LineParserBase( 'void' ),
				mtllib:  new LineParserStringSpace( 'mtllib', 'pushMtllib' ),
				vertices: new LineParserVertex( 'v', 'pushVertex' ),
				normals:  new LineParserVertex( 'vn', 'pushNormal' ),
				uvs:  new LineParserUv(),
				objects:  new LineParserStringSpace( 'o', 'pushObject' ),
				groups: new LineParserStringSpace( 'g', 'pushGroup' ),
				usemtls:  new LineParserStringSpace( 'usemtl', 'pushMtl' ),
				faces:  new LineParserFace(),
				lines:  new LineParserLine(),
				smoothingGroups:  new LineParserStringSpace( 's', 'pushSmoothingGroup' ),
				current: null
			};

			var line = [];
			var index = 0;
			var code;
			var haveV = false;

			while ( this.pointer < this.contentLength ) {

				code = this.retrieveCodeFunction();
				if ( code === CODE_LF || code === CODE_CR ) {
					if ( parsers.current !== null ) {

						parsers.current.processLine( line, index, this.rawObjectBuilder );
						parsers.current = null;

					}
					index = 0;

				} else if ( parsers.current === null ) {

					switch ( code ) {

						case CODE_V:
							haveV = true;
							break;

						case CODE_N:
							parsers.current = parsers.normals;
							break;

						case CODE_T:
							parsers.current = parsers.uvs;
							break;

						case CODE_F:
							parsers.current = parsers.faces;
							this.reachedFaces = true;
							break;

						case CODE_L:
							parsers.current = parsers.usemtls;
							break;

						case CODE_S:
							parsers.current = parsers.smoothingGroups;
							break;

						case CODE_G:
							parsers.current = parsers.groups;
							break;

						case CODE_U: // usemtl
							parsers.current = parsers.usemtls;
							break;

						case CODE_O:
							// new instance required, because "o" found and previous vertices exist
							parsers.current = parsers.objects;
							if ( this.rawObjectBuilder.vertices.length > 0 ) {
								this.processCompletedObject();
								this.rawObjectBuilder = this.rawObjectBuilder.newInstance( false );
							}
							break;

						case CODE_M: // mtllib
							parsers.current = parsers.mtllib;
							break;

						case CODE_SPACE:
							if ( haveV ) {
								// at start of line: not needed, but after 'v' will start new vertex parsing
								parsers.current = parsers.vertices;

								// object complete instance required if reached faces already (= reached next block of v)
								if ( this.reachedFaces ) {
									this.processCompletedObject();
									this.rawObjectBuilder = this.rawObjectBuilder.newInstance( true );
								}
								haveV = false;
							}
							break;

						default:
							// # (comments), other non-identified empty lines
							parsers.current = parsers.void;
							break;
					}

				} else {

					line[ index ++ ] = code;

				}
			}
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
			this.reachedFaces = false;
		};

		OBJCodeParser.prototype.finalize = function () {
			this.processCompletedObject( false );
			this.rawObjectBuilder = new RawObjectBuilder( false );
			this.inputObjectCount = 1;
			this.pointer = 0;
		};

		var LineParserBase = (function () {

			function LineParserBase( name, robRefFunction  ) {
				this.name = name;
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

		var LineParserStringSpace = (function () {

			LineParserStringSpace.prototype = Object.create( LineParserBase.prototype );
			LineParserStringSpace.prototype.constructor = LineParserStringSpace;

			function LineParserStringSpace( name, robRefFunction ) {
				LineParserBase.call( this, name, robRefFunction );
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

			function LineParserVertex( name, robRefFunction ) {
				LineParserBase.call( this, name, robRefFunction );
				this.buffer = new Array( 3 );
				this.bufferIndex = 0;
			}

			LineParserVertex.prototype.processLine = function ( line, index, robRef ) {
				this.bufferIndex = 0;
				var input = '';
				var code;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( code === CODE_SPACE ) {

						if ( input.length > MIN_INPUT_LENGTH ) this.buffer[ this.bufferIndex++ ] = parseFloat( input );
						input = '';

					} else {

						input += String.fromCharCode( code );

					}
				}
				if ( input.length > MIN_INPUT_LENGTH ) this.buffer[ this.bufferIndex++ ] = parseFloat( input );

				robRef[ this.robRefFunction ]( this.buffer );
			};

			return LineParserVertex;
		})();


		var LineParserUv = (function () {

			LineParserUv.prototype = Object.create( LineParserVertex.prototype );
			LineParserUv.prototype.constructor = LineParserUv;

			function LineParserUv() {
				LineParserVertex.call( this, 'uv' );
				this.buffer = new Array( 2 );
			}

			LineParserUv.prototype.processLine = function ( line, index, robRef ) {
				this.bufferIndex = 0;
				var input = '';
				var code;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( code === CODE_SPACE ) {

						if ( input.length > MIN_INPUT_LENGTH ) {

							this.buffer[ this.bufferIndex ++ ] = parseFloat( input );

						}
						input = '';
						if ( this.bufferIndex === 2 ) break;

					} else {

						input += String.fromCharCode( code );

					}
				}
				if ( input.length > MIN_INPUT_LENGTH ) this.buffer[ this.bufferIndex ] = parseFloat( input );

				robRef.pushUv( this.buffer );
			};

			return LineParserUv;
		})();


		/**
		 * Support for triangle and quads:
		 * 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
		 * 1: "f vertex/uv			vertex/uv			vertex/uv			vertex/uv"
		 * 2: "f vertex//normal		vertex//normal		vertex//normal		vertex//normal"
		 * 3: "f vertex				vertex				vertex				vertex"
		 */
		var LineParserFace = (function () {

			LineParserFace.prototype = Object.create( LineParserVertex.prototype );
			LineParserFace.prototype.constructor = LineParserFace;

			function LineParserFace() {
				LineParserVertex.call( this, 'f' );
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

		/**
		 * Support for lines with or without texture
		 * 0: "f vertex/uv		vertex/uv 		..."
		 * 1: "f vertex			vertex 			..."
		 */
		var LineParserLine = (function () {

			LineParserLine.prototype = Object.create( LineParserVertex.prototype );
			LineParserLine.prototype.constructor = LineParserLine;

			function LineParserLine() {
				LineParserVertex.call( this, 'l' );
				this.bufferVt = [];
				this.bufferVtIndex = 0;
				this.type = 1;
			}

			LineParserLine.prototype.pushToBuffer = function ( input, slash ) {
				if ( input.length > MIN_INPUT_LENGTH ) {

					if ( this.type === 0 && slash ) {

						this.buffer[ this.bufferIndex ++ ] = parseInt( input, 10 );

					} else if ( this.type === 0 && ! slash ) {

						this.bufferVt[ this.bufferVtIndex ++ ] = parseInt( input, 10 );

					} else {

						this.buffer[ this.bufferIndex ++ ] = parseInt( input, 10 );

					}

				}
			};

			LineParserLine.prototype.processLine = function ( line, index, robRef ) {
				var input = '';
				var code;
				this.bufferIndex = 0;
				this.bufferVtIndex = 0;

				for ( var i = 0; i < index; i++ ) {
					code = line[ i ];
					if ( code === CODE_SPACE ) {

						this.pushToBuffer( input, false );
						input = '';

					} else if ( code === CODE_SLASH ) {

						this.type = 0;
						this.pushToBuffer( input, true );
						input = '';

					} else {

						input += String.fromCharCode( code );

					}
				}
				this.pushToBuffer( input, false );

				if ( this.type === 0 ) {

					robRef.pushLineV( this.buffer, this.bufferVtIndex );

				} else {

					robRef.pushLineVVt( this.buffer, this.bufferIndex, this.bufferVt, this.bufferVtIndex );

				}
			};

			return LineParserLine;
		})();

		return OBJCodeParser;
	})();

	var RawObjectBuilder = (function () {

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

		RawObjectBuilder.prototype.pushToBuffer = function ( source, sourceLength, target, targetIndex ) {
			for ( var i = 0, length = sourceLength; i < length; i++ ) {

				target[ targetIndex ] = source[ i ];
				targetIndex++;

			}
			return targetIndex;
		};

		RawObjectBuilder.prototype.pushVertex = function ( vertexArray ) {
			this.verticesIndex = this.pushToBuffer( vertexArray, vertexArray.length, this.vertices, this.verticesIndex );
		};

		RawObjectBuilder.prototype.pushNormal = function ( normalArray ) {
			this.normalsIndex = this.pushToBuffer( normalArray, normalArray.length, this.normals, this.normalsIndex );
		};

		RawObjectBuilder.prototype.pushUv = function ( uvArray ) {
			this.uvsIndex = this.pushToBuffer( uvArray, uvArray.length, this.uvs, this.uvsIndex );
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
					this.objectName, this.activeGroupName, this.activeMtlName, this.activeSmoothingGroup );

			}
			else {

				this.retrievedObjectDescriptionInUse = this.retrievedObjectDescriptions[ index ];

			}
		};

		RawObjectBuilder.prototype.buildIndexRegular = function () {
			return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + this.activeSmoothingGroup;
		};

		RawObjectBuilder.prototype.buildIndexOverride = function ( smoothingGroup ) {
			return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + smoothingGroup;
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

		RawObjectBuilder.prototype.pushLineV = function ( lineArray, lineArrayLength ) {
			this.verticesIndex = this.pushToBuffer( lineArray, lineArrayLength, this.vertices, this.verticesIndex );
		};

		RawObjectBuilder.prototype.pushLineVVt = function ( lineArray, lineArrayLength, lineVtArray, lineVtArrayLength ) {
			this.verticesIndex = this.pushToBuffer( lineArray, lineArrayLength, this.vertices, this.verticesIndex );
			this.uvsIndex = this.pushToBuffer( lineVtArray, lineVtArrayLength, this.uvs, this.uvsIndex );
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
