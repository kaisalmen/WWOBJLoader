if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }

/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader2 = (function () {

	var OBJLOADER2_VERSION = '2.0.0-dev';
	var Validator = THREE.LoaderSupport.Validator;
	var Commons = THREE.LoaderSupport.Commons;

	OBJLoader2.prototype = Object.create( THREE.LoaderSupport.Commons.prototype );
	OBJLoader2.prototype.constructor = OBJLoader2;

	function OBJLoader2( manager ) {
		THREE.LoaderSupport.Commons.call( this, manager );
	}

	OBJLoader2.prototype.init = function ( manager ) {
		THREE.LoaderSupport.Commons.prototype.init.call( this, manager );
		console.log( "Using THREE.OBJLoader2 version: " + OBJLOADER2_VERSION );

		this.materialPerSmoothingGroup = false;
		this.fileLoader = Validator.verifyInput( this.fileLoader, new THREE.FileLoader( this.manager ) );
		this.path = '';

		this.parser = new Parser();

		this.workerSupport = Validator.verifyInput( this.workerSupport, new THREE.LoaderSupport.WorkerSupport() );
		this.workerSupport.reInit( false, this._buildWebWorkerCode, 'Parser' );
	};

	/**
	 * Tells whether a material shall be created per smoothing group
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} materialPerSmoothingGroup=false Default is false
	 */
	OBJLoader2.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup === true;
	};

	/**
	 * Sets debug mode for the parser
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} enabled
	 */
	OBJLoader2.prototype.setDebug = function ( enabled ) {
		THREE.LoaderSupport.Commons.prototype.setDebug.call( this, enabled );
	};

	OBJLoader2.prototype.setTerminateRequested = function ( terminateRequested ) {
		this.workerSupport.setTerminateRequested( terminateRequested );
	};

	OBJLoader2.prototype.setPath = function ( path ) {
		this.path = Validator.verifyInput( path, this.path );
	};

	/**
	 * Use this convenient method to load an OBJ file at the given URL. Per default the fileLoader uses an arraybuffer
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} url URL of the file to load
	 * @param {callback} onLoad Called after loading was successfully completed
	 * @param {callback} onProgress Called to report progress of loading. The argument will be the XMLHttpRequest instance, which contains {integer total} and {integer loaded} bytes.
	 * @param {callback} onError Called after an error occurred during loading
	 * @param {callback} onMeshAlter Called after a new mesh raw data becomes available
	 * @param {boolean} useAsync Set this to use async loading
	 */
	OBJLoader2.prototype.load = function ( url, onLoad, onProgress, onError, onMeshAlter, useAsync ) {
		var scope = this;
		if ( ! Validator.isValid( onProgress ) ) {
			var refPercentComplete = 0;
			var percentComplete = 0;
			onProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				percentComplete = Math.round( event.loaded / event.total * 100 );
				if ( percentComplete > refPercentComplete ) {

					refPercentComplete = percentComplete;
					var output = 'Download of "' + url + '": ' + percentComplete + '%';
					console.log( output );
					scope.onProgress( output );

				}
			};
		}

		if ( ! Validator.isValid( onError ) ) {
			onError = function ( event ) {
				var output = 'Error occurred while downloading "' + url + '"';
				console.error( output + ': ' + event );
				scope.onProgress( output );
			};
		}

		this.fileLoader.setPath( this.path );
		this.fileLoader.setResponseType( 'arraybuffer' );
		this.fileLoader.load( url, function ( content ) {
			if ( useAsync ) {

				scope.parseAsync( content, onLoad );

			} else {

				scope._setCallbacks( null, onMeshAlter, null );
				onLoad( scope.parse( content ), scope.modelName, scope.instanceNo );

			}

		}, onProgress, onError );

	};

	/**
	 * Run the loader according the provided instructions.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.LoaderSupport.PrepData} prepData All parameters and resources required for execution
	 */
	OBJLoader2.prototype.run = function ( prepData ) {
		this._applyPrepData( prepData );
		var available = this._checkFiles( prepData.resources );

		var scope = this;
		var onMaterialsLoaded = function ( materials ) {
			scope.setMaterials( materials );

			if ( Validator.isValid( available.obj.content ) ) {

				if ( prepData.useAsync ) {

					scope.parseAsync( available.obj.content, scope.callbacks.onLoad );

				} else {

					scope.parse( available.obj.content );

				}
			} else {

				scope.setPath( available.obj.path );
				scope.load( available.obj.name, scope.callbacks.onLoad, null, null, scope.callbacks.onMeshAlter, prepData.useAsync );

			}
		};

		this.loadMtl( available.mtl, onMaterialsLoaded, prepData.crossOrigin );
	};

	OBJLoader2.prototype._applyPrepData = function ( prepData ) {
		THREE.LoaderSupport.Commons.prototype._applyPrepData.call( this, prepData );

		if ( Validator.isValid( prepData ) ) {

			this.setMaterialPerSmoothingGroup( prepData.materialPerSmoothingGroup );

		}
	};

	/**
	 * Parses OBJ file according instructions in resource descriptor
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor}
	 */
	OBJLoader2.prototype.parse = function ( content ) {
		console.time( 'OBJLoader2: ' + this.modelName );

		this.parser.init();
		this.parser.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
		this.parser.setMaterialNames( this.materialNames );
		this.parser.setDebug( this.debug );

		var scope = this;
		var onMeshLoaded = function ( payload ) {
			var meshes = scope.builder.buildMeshes( payload );
			var mesh;
			for ( var i in meshes ) {
				mesh = meshes[ i ];
				scope.loaderRootNode.add( mesh );
			}
		};
		this.parser.setCallbackBuilder( onMeshLoaded );
		var onProgressScoped = function ( message ) {
			scope.onProgress( message );
		};
		this.parser.setCallbackProgress( onProgressScoped );

		if ( content instanceof ArrayBuffer || content instanceof Uint8Array ) {

			console.log( 'Parsing arrayBuffer...' );
			this.parser.parse( content );

		} else {

			throw 'Provided content was nor Uint8Array! Aborting...';

		}
		console.timeEnd( 'OBJLoader2: ' + this.modelName );

		return this.loaderRootNode;
	};

	OBJLoader2.prototype.parseAsync = function ( content, onLoad ) {
		console.time( 'OBJLoader2: ' + this.modelName);

		var scope = this;
		var scopedOnLoad = function ( message ) {
			onLoad( scope.loaderRootNode, scope.modelName, scope.instanceNo, message );
			console.timeEnd( 'OBJLoader2: ' + scope.modelName );
		};
		var scopedOnMeshLoaded = function ( payload ) {
			var meshes = scope.builder.buildMeshes( payload );
			var mesh;
			for ( var i in meshes ) {
				mesh = meshes[ i ];
				scope.loaderRootNode.add( mesh );
			}
		};

		this.workerSupport.setCallbacks( scopedOnMeshLoaded, scopedOnLoad );
		this.workerSupport.run(
			{
				cmd: 'run',
				params: {
					debug: this.debug,
					materialPerSmoothingGroup: this.materialPerSmoothingGroup
				},
				materials: {
					materialNames: this.materialNames
				},
				buffers: {
					objAsArrayBuffer: content
				}
			},
			[ content.buffer ]
		);
	};

	/**
	 * Constants used by THREE.OBJLoader2
	 */
	var Consts = {
		CODE_LF: 10,
		CODE_CR: 13,
		CODE_SPACE: 32,
		CODE_SLASH: 47,
		STRING_LF: '\n',
		STRING_CR: '\r',
		STRING_SPACE: ' ',
		STRING_SLASH: '/',
		LINE_F: 'f',
		LINE_G: 'g',
		LINE_L: 'l',
		LINE_O: 'o',
		LINE_S: 's',
		LINE_V: 'v',
		LINE_VT: 'vt',
		LINE_VN: 'vn',
		LINE_MTLLIB: 'mtllib',
		LINE_USEMTL: 'usemtl'
	};

	/**
	 * Parse OBJ data either from ArrayBuffer or string
	 * @class
	 */
	var Parser = (function () {

		function Parser() {
		}

		Parser.prototype.init = function () {
			this.callbackProgress = null;
			this.inputObjectCount = 1;
			this.debug = false;
			this.materialPerSmoothingGroup = false;
			this.rawObject = new RawObject( this.materialPerSmoothingGroup );

			// build mesh related
			this.callbackBuilder = null;
			this.materialNames = [];
			this.outputObjectCount = 1;
		};

		Parser.prototype.setDebug = function ( debug ) {
			if ( debug === true || debug === false ) this.debug = debug;
		};

		Parser.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
			this.materialPerSmoothingGroup = materialPerSmoothingGroup;
			this.rawObject.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
		};

		Parser.prototype.setMaterialNames = function ( materialNames ) {
			this.materialNames = Validator.verifyInput( materialNames, this.materialNames );
			this.materialNames = Validator.verifyInput( this.materialNames, [] );
		};

		Parser.prototype.setCallbackBuilder = function ( callbackBuilder ) {
			this.callbackBuilder = callbackBuilder;
			if ( ! Validator.isValid( this.callbackBuilder ) ) throw 'Unable to run as no "builder" callback is set.';
		};

		Parser.prototype.setCallbackProgress = function ( callbackProgress ) {
			this.callbackProgress = callbackProgress;
		};

		/**
		 * Parse the provided arraybuffer
		 * @memberOf Parser
		 *
		 * @param {Uint8Array} arrayBuffer OBJ data as Uint8Array
		 */
		Parser.prototype.parse = function ( arrayBuffer ) {
			console.time( 'OBJLoader2.Parser.parse' );
			var arrayBufferView = new Uint8Array( arrayBuffer );
			var length = arrayBufferView.byteLength;
			var buffer = new Array( 128 );
			var bufferPointer = 0;
			var slashesLast = 0;
			var slashesDistance = 0;
			var slashesCount = 0;
			var faceDescType = -1;
			var reachedFaces = false;
			var code;
			var word = '';
			for ( var i = 0; i < length; i++ ) {

				code = arrayBufferView[ i ];
				switch ( code ) {
					case Consts.CODE_SPACE:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;

						//Whenever space is reached after first block (f v/vn" ") and no face type has been calculated, it will be performed once
						if ( faceDescType === -1 && bufferPointer > 1 ) {
							faceDescType = ( slashesCount === 0 ) ? 3 : ( slashesCount === 1 ) ? 1 : ( slashesCount === 2 && slashesDistance === 1 ) ? 2 : 0;
						}
						word = '';
						break;

					case Consts.CODE_SLASH:
						if ( faceDescType === -1 ) {

							slashesCount++;
							slashesDistance = i - slashesLast;
							slashesLast = i;

						}

						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';
						break;

					case Consts.CODE_LF:
						if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
						word = '';

						reachedFaces = this.processLine( buffer, bufferPointer, faceDescType, reachedFaces );
						bufferPointer = 0;
						slashesLast = 0;
						slashesDistance = 0;
						slashesCount = 0;
						faceDescType = -1;
						break;

					case Consts.CODE_CR:
						break;

					default:
						word += String.fromCharCode( code );
						break;
				}
			}
			this.finalize();
			console.timeEnd( 'OBJLoader2.Parser.parse' );
		};

		Parser.prototype.processLine = function ( buffer, bufferPointer, faceDescType, reachedFaces ) {
			if ( bufferPointer < 1 ) return reachedFaces;

			var bufferLength = bufferPointer - 1;
			var concatBuffer;
			switch ( buffer[ 0 ] ) {
				case Consts.LINE_V:

					// object complete instance required if reached faces already (= reached next block of v)
					if ( reachedFaces ) {

						if ( this.rawObject.colors.length > 0 && this.rawObject.colors.length !== this.rawObject.vertices.length ) {

							throw 'Vertex Colors were detected, but vertex count and color count do not match!';

						}
						this.processCompletedObject( null, this.rawObject.groupName );
						reachedFaces = false;

					}
					if ( bufferLength === 3 ) {

						this.rawObject.pushVertex( buffer )

					} else {

						this.rawObject.pushVertexAndVertextColors( buffer );

					}
					break;

				case Consts.LINE_VT:
					this.rawObject.pushUv( buffer );
					break;

				case Consts.LINE_VN:
					this.rawObject.pushNormal( buffer );
					break;

				case Consts.LINE_F:
					reachedFaces = true;
					this.rawObject.processFaces( buffer, bufferPointer, faceDescType );
					break;

				case Consts.LINE_L:
					if ( faceDescType === 1 ) {

						this.rawObject.buildLineVvt( buffer );

					} else {

						this.rawObject.buildLineV( buffer );

					}
					break;

				case Consts.LINE_S:
					this.rawObject.pushSmoothingGroup( buffer[ 1 ] );
					this.flushStringBuffer( buffer, bufferPointer );
					break;

				case Consts.LINE_G:
					concatBuffer = bufferLength > 1 ? buffer.slice( 1, bufferPointer ).join( ' ' ) : buffer[ 1 ];
					this.processCompletedGroup( concatBuffer );
					this.flushStringBuffer( buffer, bufferPointer );
					break;

				case Consts.LINE_O:
					concatBuffer = bufferLength > 1 ? buffer.slice( 1, bufferPointer ).join( ' ' ) : buffer[ 1 ];
					if ( this.rawObject.vertices.length > 0 ) {

						this.processCompletedObject( concatBuffer, null );
						reachedFaces = false;

					} else {

						this.rawObject.pushObject( concatBuffer );

					}
					this.flushStringBuffer( buffer, bufferPointer );
					break;

				case Consts.LINE_MTLLIB:
					concatBuffer = bufferLength > 1 ? buffer.slice( 1, bufferPointer ).join( ' ' ) : buffer[ 1 ];
					this.rawObject.pushMtllib( concatBuffer );
					this.flushStringBuffer( buffer, bufferPointer );
					break;

				case Consts.LINE_USEMTL:
					concatBuffer = bufferLength > 1 ? buffer.slice( 1, bufferPointer ).join( ' ' ) : buffer[ 1 ];
					this.rawObject.pushUsemtl( concatBuffer );
					this.flushStringBuffer( buffer, bufferPointer );
					break;

				default:
					break;
			}
			return reachedFaces;
		};

		Parser.prototype.flushStringBuffer = function ( buffer, bufferLength ) {
			for ( var i = 0; i < bufferLength; i++ ) {
				buffer[ i ] = '';
			}
		};

		Parser.prototype.processCompletedObject = function ( objectName, groupName ) {
			var result = this.rawObject.finalize( this.debug );
			if ( Validator.isValid( result ) ) {

				this.inputObjectCount++;
				if ( this.debug ) this.createReport( this.inputObjectCount, true );
				var message = this.buildMesh( result.rawObjectDescriptions, this.inputObjectCount, result.absoluteVertexCount,
					result.absoluteColorCount, result.absoluteNormalCount, result.absoluteUvCount );
				this.onProgress( message );

			}
			this.rawObject = this.rawObject.newInstanceFromObject( objectName, groupName );
		};

		Parser.prototype.processCompletedGroup = function ( groupName ) {
			var result = this.rawObject.finalize();
			if ( Validator.isValid( result ) ) {

				this.inputObjectCount++;
				if ( this.debug ) this.createReport( this.inputObjectCount, true );
				var message = this.buildMesh( result.rawObjectDescriptions, this.inputObjectCount, result.absoluteVertexCount,
					result.absoluteColorCount, result.absoluteNormalCount, result.absoluteUvCount );
				this.onProgress( message );
				this.rawObject = this.rawObject.newInstanceFromGroup( groupName );

			} else {

				// if a group was set that did not lead to object creation in finalize, then the group name has to be updated
				this.rawObject.pushGroup( groupName );

			}
		};

		Parser.prototype.finalize = function () {
			console.log( 'Global output object count: ' + this.outputObjectCount );
			var result = Validator.isValid( this.rawObject ) ? this.rawObject.finalize() : null;
			if ( Validator.isValid( result ) ) {

				this.inputObjectCount++;
				if ( this.debug ) this.createReport( this.inputObjectCount, true );
				var message = this.buildMesh( result.rawObjectDescriptions, this.inputObjectCount, result.absoluteVertexCount,
					result.absoluteColorCount, result.absoluteNormalCount, result.absoluteUvCount );
				this.onProgress( message );

			}
		};

		Parser.prototype.onProgress = function ( text ) {
			if ( Validator.isValid( text ) && Validator.isValid( this.callbackProgress) ) this.callbackProgress( text );
		};


		/**
		 * This is an internal function, but due to its importance to Parser it is documented.
		 * RawObjectDescriptions are transformed to THREE.Mesh.
		 * It is ensured that rawObjectDescriptions only contain objects with vertices (no need to check).
		 * This method shall be overridden by the web worker implementation
		 *
		 * @param {RawObjectDescription[]} rawObjectDescriptions Array of descriptive information and data (vertices, normals, uvs) about the parsed object(s)
		 * @param {number} inputObjectCount Number of objects already retrieved from OBJ
		 * @param {number} absoluteVertexCount Sum of all vertices of all rawObjectDescriptions
		 * @param {number} absoluteColorCount Sum of all vertex colors of all rawObjectDescriptions
		 * @param {number} absoluteNormalCount Sum of all normals of all rawObjectDescriptions
		 * @param {number} absoluteUvCount Sum of all uvs of all rawObjectDescriptions
		 */
		Parser.prototype.buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount,
													 absoluteColorCount, absoluteNormalCount, absoluteUvCount ) {
			if ( this.debug ) console.log( 'OBJLoader.buildMesh:\nInput object no.: ' + inputObjectCount );

			var vertexFA = new Float32Array( absoluteVertexCount );
			var colorFA = ( absoluteColorCount > 0 ) ? new Float32Array( absoluteColorCount ) : null;
			var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
			var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

			var rawObjectDescription;
			var materialDescription;
			var materialDescriptions = [];

			var createMultiMaterial = ( rawObjectDescriptions.length > 1 );
			var materialIndex = 0;
			var materialIndexMapping = [];
			var selectedMaterialIndex;
			var materialGroup;
			var materialGroups = [];

			var vertexFAOffset = 0;
			var vertexGroupOffset = 0;
			var vertexLength;
			var colorFAOffset = 0;
			var normalFAOffset = 0;
			var uvFAOffset = 0;

			for ( var oodIndex in rawObjectDescriptions ) {
				if ( ! rawObjectDescriptions.hasOwnProperty( oodIndex ) ) continue;
				rawObjectDescription = rawObjectDescriptions[ oodIndex ];

				materialDescription = {
					name: rawObjectDescription.materialName,
					flat: false,
					vertexColors: false,
					default: false
				};
				if ( this.materialNames[ materialDescription.name ] === null ) {

					materialDescription.default = true;
					console.warn( 'object_group "' + rawObjectDescription.objectName + '_' + rawObjectDescription.groupName + '" was defined without material! Assigning "defaultMaterial".' );

				}
				// Attach '_flat' to materialName in case flat shading is needed due to smoothingGroup 0
				if ( rawObjectDescription.smoothingGroup === 0 ) materialDescription.flat = true;

				vertexLength = rawObjectDescription.vertices.length;
				if ( createMultiMaterial ) {

					// re-use material if already used before. Reduces materials array size and eliminates duplicates

					selectedMaterialIndex = materialIndexMapping[ materialDescription.name ];
					if ( ! selectedMaterialIndex ) {

						selectedMaterialIndex = materialIndex;
						materialIndexMapping[ materialDescription.name ] = materialIndex;
						materialDescriptions.push( materialDescription );
						materialIndex++;

					}
					materialGroup = {
						start: vertexGroupOffset,
						count: vertexLength / 3,
						index: selectedMaterialIndex
					};
					materialGroups.push( materialGroup );
					vertexGroupOffset += vertexLength / 3;

				} else {

					materialDescriptions.push( materialDescription );

				}

				vertexFA.set( rawObjectDescription.vertices, vertexFAOffset );
				vertexFAOffset += vertexLength;

				if ( colorFA ) {

					colorFA.set( rawObjectDescription.colors, colorFAOffset );
					colorFAOffset += rawObjectDescription.colors.length;
					materialDescription.vertexColors = true;

				}

				if ( normalFA ) {

					normalFA.set( rawObjectDescription.normals, normalFAOffset );
					normalFAOffset += rawObjectDescription.normals.length;

				}
				if ( uvFA ) {

					uvFA.set( rawObjectDescription.uvs, uvFAOffset );
					uvFAOffset += rawObjectDescription.uvs.length;

				}
				if ( this.debug ) this.printReport( rawObjectDescription, selectedMaterialIndex );

			}

			this.outputObjectCount++;
			this.callbackBuilder(
				{
					cmd: 'meshData',
					params: {
						meshName: rawObjectDescription.groupName !== '' ? rawObjectDescription.groupName : rawObjectDescription.objectName
					},
					materials: {
						multiMaterial: createMultiMaterial,
						materialDescriptions: materialDescriptions,
						materialGroups: materialGroups
					},
					buffers: {
						vertices: vertexFA,
						colors: colorFA,
						normals: normalFA,
						uvs: uvFA
					}
				},
				[ vertexFA.buffer ],
				colorFA !== null ? [ colorFA.buffer ] : null,
				normalFA !== null ? [ normalFA.buffer ] : null,
				uvFA !== null ? [ uvFA.buffer ] : null
			);
		};

		Parser.prototype.printReport = function ( rawObjectDescription, selectedMaterialIndex ) {
			var materialIndexLine = Validator.isValid( selectedMaterialIndex ) ? '\n materialIndex: ' + selectedMaterialIndex : '';
			console.log(
				' Output Object no.: ' + this.outputObjectCount +
				'\n objectName: ' + rawObjectDescription.objectName +
				'\n groupName: ' + rawObjectDescription.groupName +
				'\n materialName: ' + rawObjectDescription.materialName +
				materialIndexLine +
				'\n smoothingGroup: ' + rawObjectDescription.smoothingGroup +
				'\n #vertices: ' + rawObjectDescription.vertices.length / 3 +
				'\n #colors: ' + rawObjectDescription.colors.length / 3 +
				'\n #uvs: ' + rawObjectDescription.uvs.length / 2 +
				'\n #normals: ' + rawObjectDescription.normals.length / 3
			);
		};

		return Parser;
	})();

	/**
	 * {@link RawObject} is only used by {@link Parser}.
	 * The user of OBJLoader2 does not need to care about this class.
	 * It is defined publicly for inclusion in web worker based OBJ loader ({@link THREE.OBJLoader2.WWOBJLoader2})
	 */
	var RawObject = (function () {

		function RawObject( materialPerSmoothingGroup, objectName, groupName, mtllibName ) {
			this.globalVertexOffset = 1;
			this.globalUvOffset = 1;
			this.globalNormalOffset = 1;

			this.vertices = [];
			this.colors = [];
			this.normals = [];
			this.uvs = [];

			// faces are stored according combined index of group, material and smoothingGroup (0 or not)
			this.mtllibName = Validator.verifyInput( mtllibName, '' );
			this.objectName = Validator.verifyInput( objectName, '' );
			this.groupName = Validator.verifyInput( groupName, '' );
			this.activeMtlName = '';
			this.activeSmoothingGroup = 1;
			this.materialPerSmoothingGroup = materialPerSmoothingGroup;

			this.mtlCount = 0;
			this.smoothingGroupCount = 0;

			this.rawObjectDescriptions = [];
			// this default index is required as it is possible to define faces without 'g' or 'usemtl'
			var index = this.buildIndex( this.activeMtlName, this.activeSmoothingGroup );
			this.rawObjectDescriptionInUse = new RawObjectDescription( this.objectName, this.groupName, this.activeMtlName, this.activeSmoothingGroup );
			this.rawObjectDescriptions[ index ] = this.rawObjectDescriptionInUse;
		}

		RawObject.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
			this.materialPerSmoothingGroup = materialPerSmoothingGroup;
		};

		RawObject.prototype.buildIndex = function ( materialName, smoothingGroup ) {
			var normalizedSmoothingGroup = this.materialPerSmoothingGroup ? smoothingGroup : ( smoothingGroup === 0 ) ? 0 : 1;
			return materialName + '|' + normalizedSmoothingGroup;
		};

		RawObject.prototype.newInstanceFromObject = function ( objectName, groupName ) {
			var newRawObject = new RawObject( this.materialPerSmoothingGroup, objectName, groupName, this.mtllibName );

			// move indices forward
			newRawObject.globalVertexOffset = this.globalVertexOffset + this.vertices.length / 3;
			newRawObject.globalUvOffset = this.globalUvOffset + this.uvs.length / 2;
			newRawObject.globalNormalOffset = this.globalNormalOffset + this.normals.length / 3;

			return newRawObject;
		};

		RawObject.prototype.newInstanceFromGroup = function ( groupName ) {
			var newRawObject = new RawObject( this.materialPerSmoothingGroup, this.objectName, groupName, this.mtllibName );

			// keep current buffers and indices forward
			newRawObject.vertices = this.vertices;
			newRawObject.colors = this.colors;
			newRawObject.uvs = this.uvs;
			newRawObject.normals = this.normals;
			newRawObject.globalVertexOffset = this.globalVertexOffset;
			newRawObject.globalUvOffset = this.globalUvOffset;
			newRawObject.globalNormalOffset = this.globalNormalOffset;

			return newRawObject;
		};

		RawObject.prototype.pushVertex = function ( buffer ) {
			this.vertices.push( parseFloat( buffer[ 1 ] ) );
			this.vertices.push( parseFloat( buffer[ 2 ] ) );
			this.vertices.push( parseFloat( buffer[ 3 ] ) );
		};

		RawObject.prototype.pushVertexAndVertextColors = function ( buffer ) {
			this.vertices.push( parseFloat( buffer[ 1 ] ) );
			this.vertices.push( parseFloat( buffer[ 2 ] ) );
			this.vertices.push( parseFloat( buffer[ 3 ] ) );
			this.colors.push( parseFloat( buffer[ 4 ] ) );
			this.colors.push( parseFloat( buffer[ 5 ] ) );
			this.colors.push( parseFloat( buffer[ 6 ] ) );
		};

		RawObject.prototype.pushUv = function ( buffer ) {
			this.uvs.push( parseFloat( buffer[ 1 ] ) );
			this.uvs.push( parseFloat( buffer[ 2 ] ) );
		};

		RawObject.prototype.pushNormal = function ( buffer ) {
			this.normals.push( parseFloat( buffer[ 1 ] ) );
			this.normals.push( parseFloat( buffer[ 2 ] ) );
			this.normals.push( parseFloat( buffer[ 3 ] ) );
		};

		RawObject.prototype.pushObject = function ( objectName ) {
			this.objectName = objectName;
		};

		RawObject.prototype.pushMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		RawObject.prototype.pushGroup = function ( groupName ) {
			this.groupName = groupName;
			this.verifyIndex();
		};

		RawObject.prototype.pushUsemtl = function ( mtlName ) {
			if ( this.activeMtlName === mtlName || ! Validator.isValid( mtlName ) ) return;
			this.activeMtlName = mtlName;
			this.mtlCount++;

			this.verifyIndex();
		};

		RawObject.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
			var normalized = parseInt( activeSmoothingGroup );
			if ( isNaN( normalized ) ) {
				normalized = activeSmoothingGroup === "off" ? 0 : 1;
			}
			if ( this.activeSmoothingGroup === normalized ) return;
			this.activeSmoothingGroup = normalized;
			this.smoothingGroupCount++;

			this.verifyIndex();
		};

		RawObject.prototype.verifyIndex = function () {
			var index = this.buildIndex( this.activeMtlName, this.activeSmoothingGroup );
			this.rawObjectDescriptionInUse = this.rawObjectDescriptions[ index ];
			if ( ! Validator.isValid( this.rawObjectDescriptionInUse ) ) {

				this.rawObjectDescriptionInUse = new RawObjectDescription( this.objectName, this.groupName, this.activeMtlName, this.activeSmoothingGroup );
				this.rawObjectDescriptions[ index ] = this.rawObjectDescriptionInUse;

			}
		};

		RawObject.prototype.processFaces = function ( buffer, bufferPointer, faceDescType ) {
			var bufferLength = bufferPointer - 1;
			var i;

			switch ( faceDescType ) {
				// "f vertex/uv/normal ..."
				case 0:
					for ( i = 4; i < bufferLength - 3; i += 3 ) {

						this.attachFace( buffer[ 1     ], buffer[ 2     ], buffer[ 3     ] );
						this.attachFace( buffer[ i     ], buffer[ i + 1 ], buffer[ i + 2 ] );
						this.attachFace( buffer[ i + 3 ], buffer[ i + 4 ], buffer[ i + 5 ] );

					}
					break;

				// "f vertex/uv ..."
				case 1:
					for ( i = 3; i < bufferLength - 2; i += 2 ) {

						this.attachFace( buffer[ 1     ], buffer[ 2     ] );
						this.attachFace( buffer[ i     ], buffer[ i + 1 ] );
						this.attachFace( buffer[ i + 2 ], buffer[ i + 3 ] );

					}
					break;

				// "f vertex//normal ..."
				case 2:
					for ( i = 3; i < bufferLength - 2; i += 2 ) {

						this.attachFace( buffer[ 1     ], undefined, buffer[ 2     ] );
						this.attachFace( buffer[ i     ], undefined, buffer[ i + 1 ] );
						this.attachFace( buffer[ i + 2 ], undefined, buffer[ i + 3 ] );

					}
					break;

				// "f vertex ..."
				case 3:
					for ( i = 2; i < bufferLength - 1; i ++ ) {

						this.attachFace( buffer[ 1     ] );
						this.attachFace( buffer[ i     ] );
						this.attachFace( buffer[ i + 1 ] );

					}
					break;

				default:
					break;

			}
		};

		RawObject.prototype.attachFace = function ( faceIndexV, faceIndexU, faceIndexN ) {
			var indexV = ( parseInt( faceIndexV ) - this.globalVertexOffset ) * 3;
			var vertices = this.rawObjectDescriptionInUse.vertices;
			vertices.push( this.vertices[ indexV ++ ] );
			vertices.push( this.vertices[ indexV ++ ] );
			vertices.push( this.vertices[ indexV ] );

			if ( this.colors.length > 0 ) {

				indexV -= 2;
				var colors = this.rawObjectDescriptionInUse.colors;
				colors.push( this.colors[ indexV ++ ] );
				colors.push( this.colors[ indexV ++ ] );
				colors.push( this.colors[ indexV ] );

			}

			if ( faceIndexU ) {

				var indexU = ( parseInt( faceIndexU ) - this.globalUvOffset ) * 2;
				var uvs = this.rawObjectDescriptionInUse.uvs;
				uvs.push( this.uvs[ indexU ++ ] );
				uvs.push( this.uvs[ indexU ] );

			}

			if ( faceIndexN ) {

				var indexN = ( parseInt( faceIndexN ) - this.globalNormalOffset ) * 3;
				var normals = this.rawObjectDescriptionInUse.normals;
				normals.push( this.normals[ indexN ++ ] );
				normals.push( this.normals[ indexN ++ ] );
				normals.push( this.normals[ indexN ] );

			}
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
		 * Clear any empty rawObjectDescription and calculate absolute vertex, normal and uv counts
		 */
		RawObject.prototype.finalize = function () {
			var temp = this.rawObjectDescriptions;
			this.rawObjectDescriptions = [];
			var rawObjectDescription;
			var index = 0;
			var absoluteVertexCount = 0;
			var absoluteColorCount = 0;
			var absoluteNormalCount = 0;
			var absoluteUvCount = 0;

			for ( var name in temp ) {

				rawObjectDescription = temp[ name ];
				if ( rawObjectDescription.vertices.length > 0 ) {

					this.rawObjectDescriptions[ index++ ] = rawObjectDescription;
					absoluteVertexCount += rawObjectDescription.vertices.length;
					absoluteColorCount += rawObjectDescription.colors.length;
					absoluteUvCount += rawObjectDescription.uvs.length;
					absoluteNormalCount += rawObjectDescription.normals.length;

				}
			}

			// don not continue if no result
			var result = null;
			if ( index > 0 ) {

				result = {
					rawObjectDescriptions: this.rawObjectDescriptions,
					absoluteVertexCount: absoluteVertexCount,
					absoluteColorCount: absoluteColorCount,
					absoluteNormalCount: absoluteNormalCount,
					absoluteUvCount: absoluteUvCount
				};

			}
			return result;
		};

		RawObject.prototype.createReport = function ( inputObjectCount, printDirectly ) {
			var report = {
				name: this.objectName ? this.objectName : 'groups',
				mtllibName: this.mtllibName,
				vertexCount: this.vertices.length / 3,
				normalCount: this.normals.length / 3,
				uvCount: this.uvs.length / 2,
				smoothingGroupCount: this.smoothingGroupCount,
				mtlCount: this.mtlCount,
				rawObjectDescriptions: this.rawObjectDescriptions.length
			};

			if ( printDirectly ) {
				console.log( 'Input Object number: ' + inputObjectCount + ' Object name: ' + report.name );
				console.log( 'Mtllib name: ' + report.mtllibName );
				console.log( 'Vertex count: ' + report.vertexCount );
				console.log( 'Normal count: ' + report.normalCount );
				console.log( 'UV count: ' + report.uvCount );
				console.log( 'SmoothingGroup count: ' + report.smoothingGroupCount );
				console.log( 'Material count: ' + report.mtlCount );
				console.log( 'Real RawObjectDescription count: ' + report.rawObjectDescriptions );
				console.log( '' );
			}

			return report;
		};

		return RawObject;
	})();

	/**
	 * Descriptive information and data (vertices, normals, uvs) to passed on to mesh building function.
	 * @class
	 *
	 * @param {string} objectName Name of the mesh
	 * @param {string} groupName Name of the group
	 * @param {string} materialName Name of the material
	 * @param {number} smoothingGroup Normalized smoothingGroup (0: THREE.FlatShading, 1: THREE.SmoothShading)
	 */
	var RawObjectDescription = (function () {

		function RawObjectDescription( objectName, groupName, materialName, smoothingGroup ) {
			this.objectName = objectName;
			this.groupName = groupName;
			this.materialName = materialName;
			this.smoothingGroup = smoothingGroup;
			this.vertices = [];
			this.colors = [];
			this.uvs = [];
			this.normals = [];
		}

		return RawObjectDescription;
	})();

	OBJLoader2.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton ) {
		var workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by WWOBJLoader2._buildWebWorkerCode\n';
		workerCode += '  */\n\n';
		workerCode += funcBuildSingelton( 'Commons', 'Commons', Commons );
		workerCode += funcBuildObject( 'Consts', Consts );
		workerCode += funcBuildObject( 'Validator', Validator );
		workerCode += funcBuildSingelton( 'Parser', 'Parser', Parser );
		workerCode += funcBuildSingelton( 'RawObject', 'RawObject', RawObject );
		workerCode += funcBuildSingelton( 'RawObjectDescription', 'RawObjectDescription', RawObjectDescription );

		return workerCode;
	};

	OBJLoader2.prototype._checkFiles = function ( resources ) {
		var resource;
		var result = {
			mtl: null,
			obj: null
		};
		for ( var index in resources ) {

			resource = resources[ index ];
			if ( ! Validator.isValid( resource.name ) ) continue;
			if ( Validator.isValid( resource.content ) ) {

				if ( resource.extension === 'OBJ' ) {

					// fast-fail on bad type
					if ( ! ( resource.content instanceof Uint8Array ) ) throw 'Provided content is not of type arraybuffer! Aborting...';
					result.obj = resource;

				} else if ( resource.extension === 'MTL' && Validator.isValid( resource.name ) ) {

					if ( ! ( typeof( resource.content ) === 'string' || resource.content instanceof String ) ) throw 'Provided  content is not of type String! Aborting...';
					result.mtl = resource;

				} else if ( resource.extension === "ZIP" ) {
					// ignore

				} else {

					throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

				}

			} else {

				// fast-fail on bad type
				if ( ! ( typeof( resource.name ) === 'string' || resource.name instanceof String ) ) throw 'Provided file is not properly defined! Aborting...';
				if ( resource.extension === 'OBJ' ) {

					result.obj = resource;

				} else if ( resource.extension === 'MTL' ) {

					result.mtl = resource;

				} else if ( resource.extension === "ZIP" ) {
					// ignore

				} else {

					throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

				}
			}
		}

		return result;
	};

	/**
	 * Utility method for loading an mtl file according resource description.
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor} resource
	 * @param {function} callbackOnLoad
	 * @param {string} crossOrigin CORS value
	 */
	OBJLoader2.prototype.loadMtl = function ( resource, callbackOnLoad, crossOrigin ) {
		if ( Validator.isValid( resource ) ) console.time( 'Loading MTL: ' + resource.name );

		var materials = [];
		var processMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			if ( Validator.isValid( materialCreator ) ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}
				}
			}

			if ( Validator.isValid( resource ) ) console.timeEnd( 'Loading MTL: ' + resource.name );
			callbackOnLoad( materials );
		};

		var mtlLoader = new THREE.MTLLoader();
		if ( Validator.isValid( crossOrigin ) ) mtlLoader.setCrossOrigin( crossOrigin );

		// fast-fail
		if ( ! Validator.isValid( resource ) || ( ! Validator.isValid( resource.content ) && ! Validator.isValid( resource.url ) ) ) {

			processMaterials();

		} else {

			mtlLoader.setPath( resource.path );
			if ( Validator.isValid( resource.content ) ) {

				processMaterials( Validator.isValid( resource.content ) ? mtlLoader.parse( resource.content ) : null );

			} else if ( Validator.isValid( resource.url ) ) {

				var onError = function ( event ) {
					var output = 'Error occurred while downloading "' + resource.url + '"';
					console.error( output + ': ' + event );
					throw output;
				};

				mtlLoader.load( resource.name, processMaterials, undefined, onError );

			}
		}
	};

	return OBJLoader2;
})();
