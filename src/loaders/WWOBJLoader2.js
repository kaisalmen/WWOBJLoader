if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }
THREE.OBJLoader2.version = 'dev';

/**
 * OBJ data will be loaded by dynamically created web worker.
 * First feed instructions with: prepareRun
 * Then: Execute with: run
 * @class
 */
THREE.OBJLoader2.WWOBJLoader2 = (function () {

	function WWOBJLoader2() {
		this._init();
	}

	WWOBJLoader2.prototype._init = function () {
		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";
		if ( window.Blob === undefined  ) throw "This browser does not support Blob!";
		if ( ! typeof window.URL.createObjectURL === 'function'  ) throw "This browser does not support Object creation from URL!";

		this.instanceNo = 0;
		this.worker = null;
		this.workerCode = null;
		this.debug = false;

		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.meshStore = null;
		this.modelName = 'none';
		this.validated = false;
		this.running = false;
		this.requestTerminate = false;

		this.clearAllCallbacks();

		this.manager = THREE.DefaultLoadingManager;
		this.fileLoader = new THREE.FileLoader( this.manager );
		this.mtlLoader = null;
		this.crossOrigin = null;

		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
		this.fileObj = null;
		this.pathObj = null;

		this.fileMtl = null;
		this.mtlAsString = null;
		this.texturePath = null;

		this.materials = [];
		this.counter = 0;
	};

	/**
	 * Set enable or disable debug logging
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {boolean} enabled
	 */
	WWOBJLoader2.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {string} crossOrigin CORS value
	 */
	WWOBJLoader2.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Register callback function that is invoked by internal function "_announceProgress" to print feedback
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {callback} callbackProgress Callback function for described functionality
	 */
	WWOBJLoader2.prototype.registerCallbackProgress = function ( callbackProgress ) {
		if ( Boolean( callbackProgress ) ) this.callbacks.progress.push( callbackProgress );
	};

	/**
	 * Register callback function that is called once loading of the complete model is completed
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {callback} callbackCompletedLoading Callback function for described functionality
	 */
	WWOBJLoader2.prototype.registerCallbackCompletedLoading = function ( callbackCompletedLoading ) {
		if ( Boolean( callbackCompletedLoading ) ) this.callbacks.completedLoading.push( callbackCompletedLoading );
	};

	/**
	 * Register callback function that is called once materials have been loaded. It allows to alter and return materials
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {callback} callbackMaterialsLoaded Callback function for described functionality
	 */
	WWOBJLoader2.prototype.registerCallbackMaterialsLoaded = function ( callbackMaterialsLoaded ) {
		if ( Boolean( callbackMaterialsLoaded ) ) this.callbacks.materialsLoaded.push( callbackMaterialsLoaded );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.OBJLoader2.WWOBJLoader2.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {callback} callbackMeshLoaded Callback function for described functionality
	 */
	WWOBJLoader2.prototype.registerCallbackMeshLoaded = function ( callbackMeshLoaded ) {
		if ( Boolean( callbackMeshLoaded ) ) this.callbacks.meshLoaded.push( callbackMeshLoaded );
	};

	/**
	 * Report if an error prevented loading
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {callback} callbackErrorWhileLoading Callback function for described functionality
	 */
	WWOBJLoader2.prototype.registerCallbackErrorWhileLoading = function ( callbackErrorWhileLoading ) {
		if ( Boolean( callbackErrorWhileLoading ) ) this.callbacks.errorWhileLoading.push( callbackErrorWhileLoading );
	};


	WWOBJLoader2.prototype.clearAllCallbacks = function () {
		this.callbacks = {
			progress: [],
			completedLoading: [],
			errorWhileLoading: [],
			materialsLoaded: [],
			meshLoaded: []
		};
	};

	/**
	 * Call requestTerminate to terminate the web worker and free local resource after execution
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {boolean} requestTerminate
	 */
	WWOBJLoader2.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = Boolean( requestTerminate );
	};

	WWOBJLoader2.prototype._validate = function () {
		if ( this.validated ) return;
		if ( ! Boolean( this.worker ) ) {

			this._buildWebWorkerCode();
			var blob = new Blob( [ this.workerCode ], { type: 'text/plain' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );

			var scope = this;
			var scopeFunction = function ( e ) {
				scope._receiveWorkerMessage( e );
			};
			this.worker.addEventListener( 'message', scopeFunction, false );

		}

		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.meshStore = [];
		this.modelName = 'none';
		this.validated = true;
		this.running = true;
		this.requestTerminate = false;

		this.fileLoader = ( ! Boolean( this.fileLoader ) ) ? new THREE.FileLoader( this.manager ) : this.fileLoader;
		this.mtlLoader = ( ! Boolean( this.mtlLoader ) ) ?  new THREE.MTLLoader() : this.mtlLoader;
		if ( Boolean( this.crossOrigin ) ) this.mtlLoader.setCrossOrigin( this.crossOrigin );

		this.dataAvailable = false;
		this.fileObj = null;
		this.pathObj = null;
		this.fileMtl = null;
		this.texturePath = null;

		this.objAsArrayBuffer = null;
		this.mtlAsString = null;

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		this.counter = 0;
	};

	/**
	 * Set all parameters for required for execution of "run".
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {Object} params Either {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer} or {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataFile}
	 */
	WWOBJLoader2.prototype.prepareRun = function ( params ) {
		this._validate();
		this.dataAvailable = params.dataAvailable;
		this.modelName = params.modelName;
		console.time( 'WWOBJLoader2' );
		if ( this.dataAvailable ) {

			// fast-fail on bad type
			if ( ! params.objAsArrayBuffer instanceof Uint8Array ) {
				throw 'Provided input is not of type arraybuffer! Aborting...';
			}

			this.worker.postMessage( {
				cmd: 'init',
				debug: this.debug
			} );

			this.objAsArrayBuffer = params.objAsArrayBuffer;
			this.mtlAsString = params.mtlAsString;

		} else {

			// fast-fail on bad type
			if ( ! ( typeof( params.fileObj ) === 'string' || params.fileObj instanceof String ) ) {
				throw 'Provided file is not properly defined! Aborting...';
			}

			this.worker.postMessage( {
				cmd: 'init',
				debug: this.debug
			} );

			this.fileObj = params.fileObj;
			this.pathObj = params.pathObj;
			this.fileMtl = params.fileMtl;

		}
		this.setRequestTerminate( params.requestTerminate );
		this.pathTexture = params.pathTexture;
		this.sceneGraphBaseNode = params.sceneGraphBaseNode;
		this.streamMeshes = params.streamMeshes;
		if ( ! this.streamMeshes ) this.meshStore = [];
	};

	/**
	 * Run the loader according the preparation instruction provided in "prepareRun".
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 */
	WWOBJLoader2.prototype.run = function () {
		var scope = this;
		var processLoadedMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			var materialNames = [];
			if ( Boolean( materialCreator ) ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materialNames.push( materialName );
						scope.materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}

				}

			}
			scope.worker.postMessage( {
				cmd: 'setMaterials',
				materialNames: materialNames
			} );

			var materialsFromCallback;
			var callbackMaterialsLoaded;
			for ( var index in scope.callbacks.materialsLoaded ) {

				callbackMaterialsLoaded = scope.callbacks.materialsLoaded[ index ];
				materialsFromCallback = callbackMaterialsLoaded( scope.materials );
				if ( Boolean( materialsFromCallback ) ) scope.materials = materialsFromCallback;

			}
			if ( scope.dataAvailable && scope.objAsArrayBuffer ) {

				scope.worker.postMessage({
					cmd: 'run',
					objAsArrayBuffer: scope.objAsArrayBuffer
				}, [ scope.objAsArrayBuffer.buffer ] );

			} else {

				var refPercentComplete = 0;
				var percentComplete = 0;
				var output;
				var onLoad = function ( objAsArrayBuffer ) {

					scope._announceProgress( 'Running web worker!' );
					scope.objAsArrayBuffer = new Uint8Array( objAsArrayBuffer );
					scope.worker.postMessage( {
						cmd: 'run',
						objAsArrayBuffer: scope.objAsArrayBuffer
					}, [ scope.objAsArrayBuffer.buffer ] );

				};

				var onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					percentComplete = Math.round( event.loaded / event.total * 100 );
					if ( percentComplete > refPercentComplete ) {

						refPercentComplete = percentComplete;
						output = 'Download of "' + scope.fileObj + '": ' + percentComplete + '%';
						console.log( output );
						scope._announceProgress( output );

					}
				};

				var onError = function ( event ) {
					output = 'Error occurred while downloading "' + scope.fileObj + '"';
					console.error( output + ': ' + event );
					scope._announceProgress( output );
					scope._finalize( 'error' );

				};

				scope.fileLoader.setPath( scope.pathObj );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( scope.fileObj, onLoad, onProgress, onError );
			}
			console.timeEnd( 'Loading MTL textures' );
		};


		this.mtlLoader.setPath( this.pathTexture );
		if ( this.dataAvailable ) {

			processLoadedMaterials( ( Boolean( this.mtlAsString ) ) ? this.mtlLoader.parse( this.mtlAsString ) : null );

		} else {

			if ( Boolean( this.fileMtl ) ) {

				this.mtlLoader.load( this.fileMtl, processLoadedMaterials );

			} else {

				processLoadedMaterials();

			}

		}
	};

	WWOBJLoader2.prototype._receiveWorkerMessage = function ( event ) {
		var payload = event.data;

		switch ( payload.cmd ) {
			case 'objData':

				this.counter++;
				var meshName = payload.meshName;

				var bufferGeometry = new THREE.BufferGeometry();
				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.vertices ), 3 ) );
				if ( payload.normals !== null ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.normals ), 3 ) );

				} else {

					bufferGeometry.computeVertexNormals();

				}
				if ( payload.uvs !== null ) {

					bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( payload.uvs ), 2 ) );

				}

				var materialDescriptions = payload.materialDescriptions;
				var materialDescription;
				var material;
				var materialName;
				var createMultiMaterial = payload.multiMaterial;
				var multiMaterials = [];

				var key;
				for ( key in materialDescriptions ) {

					materialDescription = materialDescriptions[ key ];
					material = this.materials[ materialDescription.name ];

					if ( materialDescription.default ) {

						material = this.materials[ 'defaultMaterial' ];

					} else if ( materialDescription.clone ) {

						materialName = material.name + '_flat';
						var materialClone = this.materials[ materialName ];
						if ( ! materialClone ) {

							materialClone = material.clone();
							materialClone.name = materialName;
							materialClone.shading = THREE.FlatShading;
							this.materials[ materialName ] = name;

						}

					} else if ( ! material ) {

						material = this.materials[ 'defaultMaterial' ];

					}
					if ( createMultiMaterial ) multiMaterials.push( material );

				}
				if ( createMultiMaterial ) {

					material = multiMaterials;
					var materialGroups = payload.materialGroups;
					var materialGroup;
					for ( key in materialGroups ) {

						materialGroup = materialGroups[ key ];
						bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

					}

				}

				var callbackMeshLoaded;
				var callbackMeshLoadedResult;
				var disregardMesh = false;
				for ( var index in this.callbacks.meshLoaded ) {

					callbackMeshLoaded = this.callbacks.meshLoaded[ index ];
					callbackMeshLoadedResult = callbackMeshLoaded( meshName, bufferGeometry, material );

					if ( Boolean( callbackMeshLoadedResult ) ) {

						if ( callbackMeshLoadedResult.disregardMesh ) {

							// if one callback disregards the mesh, then processing stops
							disregardMesh = true;
							break;

						}
						if ( callbackMeshLoadedResult.replaceBufferGeometry ) bufferGeometry = callbackMeshLoadedResult.bufferGeometry;
						if ( callbackMeshLoadedResult.replaceMaterial ) material = callbackMeshLoadedResult.material;

					}

				}

				if ( !disregardMesh ) {

					var mesh = new THREE.Mesh( bufferGeometry, material );
					mesh.name = meshName;

					if ( this.streamMeshes ) {

						this.sceneGraphBaseNode.add( mesh );

					} else {

						this.meshStore.push( mesh );

					}
					this._announceProgress( 'Adding mesh (' + this.counter + '):', meshName );

				} else {

					this._announceProgress( 'Removing mesh:', meshName );

				}
				break;

			case 'complete':

				if ( ! this.streamMeshes ) {

					for ( var meshStoreKey in this.meshStore ) {

						if ( this.meshStore.hasOwnProperty( meshStoreKey ) ) this.sceneGraphBaseNode.add( this.meshStore[ meshStoreKey ] );

					}

				}

				console.timeEnd( 'WWOBJLoader2' );
				if ( Boolean( payload.msg ) ) {

					this._announceProgress( payload.msg );

				} else {

					this._announceProgress( '' );

				}

				this._finalize( 'complete' );
				break;

			case 'report_progress':
				this._announceProgress( '', payload.output );
				break;

			default:
				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	WWOBJLoader2.prototype._terminate = function () {
		if ( Boolean( this.worker ) ) {

			if ( this.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			this.worker.terminate();
			this.worker = null;
			this.workerCode = null;
			this._finalize( 'terminate' );

		}
		this.fileLoader = null;
		this.mtlLoader = null;
	};

	WWOBJLoader2.prototype._finalize = function ( reason, requestTerminate ) {
		this.running = false;
		var index;
		var callback;

		if ( reason === 'complete' ) {

			for ( index in this.callbacks.completedLoading ) {

				callback = this.callbacks.completedLoading[ index ];
				callback( this.modelName, this.instanceNo, this.requestTerminate );

			}

		} else if ( reason === 'error' ) {

			for ( index in this.callbacks.errorWhileLoading ) {

				callback = this.callbacks.errorWhileLoading[ index ];
				callback( this.modelName, this.instanceNo, this.requestTerminate );

			}

		}
		this.validated = false;

		this.setRequestTerminate( requestTerminate );

		if ( this.requestTerminate ) {
			this._terminate();
		}
	};

	WWOBJLoader2.prototype._announceProgress = function ( baseText, text ) {
		var output = ( Boolean( baseText ) ) ? baseText: "";
		output = ( Boolean( text ) ) ? output + " " + text : output;

		var callbackProgress;
		for ( var index in this.callbacks.progress ) {

			callbackProgress = this.callbacks.progress[ index ];
			callbackProgress( output );

		}

		if ( this.debug ) console.log( output );
	};

	WWOBJLoader2.prototype._buildWebWorkerCode = function ( existingWorkerCode ) {
		if ( Boolean( existingWorkerCode ) ) this.workerCode = existingWorkerCode;
		if ( ! Boolean( this.workerCode ) ) {

			console.time( 'buildWebWorkerCode' );
			var wwDef = (function () {

				function WWOBJLoader() {
					this.wwMeshCreator = new WWMeshCreator();
					this.parser = new Parser( this.wwMeshCreator );
					this.validated = false;
					this.cmdState = 'created';

					this.debug = false;
				}

				/**
				 * Allows to set debug mode for the parser and the meshCreatorDebug
				 *
				 * @param parserDebug
				 * @param meshCreatorDebug
				 */
				WWOBJLoader.prototype.setDebug = function ( parserDebug, meshCreatorDebug ) {
					this.parser.setDebug( parserDebug );
					this.wwMeshCreator.setDebug( meshCreatorDebug );
				};

				/**
				 * Validate status, then parse arrayBuffer, finalize and return objGroup
				 *
				 * @param arrayBuffer
				 */
				WWOBJLoader.prototype.parse = function ( arrayBuffer ) {
					console.log( 'Parsing arrayBuffer...' );
					console.time( 'parseArrayBuffer' );

					this.validate();
					this.parser.parseArrayBuffer( arrayBuffer );
					var objGroup = this._finalize();

					console.timeEnd( 'parseArrayBuffer' );

					return objGroup;
				};

				WWOBJLoader.prototype.validate = function () {
					if ( this.validated ) return;

					this.parser.validate();
					this.wwMeshCreator.validate();

					this.validated = true;
				};

				WWOBJLoader.prototype._finalize = function () {
					console.log( 'Global output object count: ' + this.wwMeshCreator.globalObjectCount );
					this.parser.finalize();
					this.wwMeshCreator.finalize();
					this.validated = false;
				};

				WWOBJLoader.prototype.init = function ( payload ) {
					this.cmdState = 'init';
					this.setDebug( payload.debug, payload.debug );
				};

				WWOBJLoader.prototype.setMaterials = function ( payload ) {
					this.cmdState = 'setMaterials';
					this.wwMeshCreator.setMaterials( payload.materialNames );
				};

				WWOBJLoader.prototype.run = function ( payload ) {
					this.cmdState = 'run';

					this.parse( payload.objAsArrayBuffer );
					console.log( 'OBJ loading complete!' );

					this.cmdState = 'complete';
					self.postMessage( {
						cmd: this.cmdState,
						msg: null
					} );
				};

				return WWOBJLoader;
			})();

			var wwMeshCreatorDef = (function () {

				function WWMeshCreator() {
					this.materials = null;
					this.debug = false;
					this.globalObjectCount = 1;
					this.validated = false;
				}

				WWMeshCreator.prototype.setMaterials = function ( materials ) {
					this.materials = ( Boolean( materials ) ) ? materials : ( ! Boolean( this.materials ) ? { materials: [] } : this.materials );
				};

				WWMeshCreator.prototype.setDebug = function ( debug ) {
					this.debug = ( ! Boolean( debug ) ) ? this.debug : debug;
				};

				WWMeshCreator.prototype.validate = function () {
					if ( this.validated ) return;

					this.setMaterials( null );
					this.setDebug( null );
					this.globalObjectCount = 1;
				};

				WWMeshCreator.prototype.finalize = function () {
					this.materials = null;
					this.validated = false;
				};

				/**
				 * RawObjectDescriptions are transformed to THREE.Mesh.
				 * It is ensured that rawObjectDescriptions only contain objects with vertices (no need to check).
				 *
				 * @param rawObjectDescriptions
				 * @param inputObjectCount
				 * @param absoluteVertexCount
				 * @param absoluteNormalCount
				 * @param absoluteUvCount
				 */
				WWMeshCreator.prototype.buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {
					if ( this.debug ) console.log( 'OBJLoader.buildMesh:\nInput object no.: ' + inputObjectCount );

					var vertexFa = new Float32Array( absoluteVertexCount );
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

					var vertexBAOffset = 0;
					var vertexGroupOffset = 0;
					var vertexLength;
					var normalOffset = 0;
					var uvOffset = 0;

					for ( var oodIndex in rawObjectDescriptions ) {
						if ( ! rawObjectDescriptions.hasOwnProperty( oodIndex ) ) continue;
						rawObjectDescription = rawObjectDescriptions[ oodIndex ];

						materialDescription = { name: rawObjectDescription.materialName, flat: false, default: false };
						if ( this.materials[ materialDescription.name ] === null ) {

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

						vertexFa.set( rawObjectDescription.vertices, vertexBAOffset );
						vertexBAOffset += vertexLength;

						if ( normalFA ) {

							normalFA.set( rawObjectDescription.normals, normalOffset );
							normalOffset += rawObjectDescription.normals.length;

						}
						if ( uvFA ) {

							uvFA.set( rawObjectDescription.uvs, uvOffset );
							uvOffset += rawObjectDescription.uvs.length;

						}
						if ( this.debug ) this.printReport( rawObjectDescription, selectedMaterialIndex );

					}

					self.postMessage( {
						cmd: 'objData',
						meshName: rawObjectDescription.objectName,
						multiMaterial: createMultiMaterial,
						materialDescriptions: materialDescriptions,
						materialGroups: materialGroups,
						vertices: vertexFa,
						normals: normalFA,
						uvs: uvFA
					}, [ vertexFa.buffer ], normalFA !== null ? [ normalFA.buffer ] : null, uvFA !== null ? [ uvFA.buffer ] : null );

					this.globalObjectCount++;
				};

				return WWMeshCreator;
			})();

			var wwObjLoaderRunnerDef = (function () {

				function WWOBJLoaderRunner() {
					self.addEventListener( 'message', this.runner, false );
				}

				WWOBJLoaderRunner.prototype.runner = function ( event ) {
					var payload = event.data;

					console.log( 'Command state before: ' + WWOBJLoaderRef.cmdState );

					switch ( payload.cmd ) {
						case 'init':

							WWOBJLoaderRef.init( payload );
							break;

						case 'setMaterials':

							WWOBJLoaderRef.setMaterials( payload );
							break;

						case 'run':

							WWOBJLoaderRef.run( payload );
							break;

						default:

							console.error( 'OBJLoader: Received unknown command: ' + payload.cmd );
							break;

					}

					console.log( 'Command state after: ' + WWOBJLoaderRef.cmdState );
				};

				return WWOBJLoaderRunner;
			})();

			var buildObject = function ( fullName, object ) {
				var objectString = fullName + ' = {\n';
				var part;
				for ( var name in object ) {

					part = object[ name ];
					if ( typeof( part ) === 'string' || part instanceof String ) {

						part = part.replace( '\n', '\\n' );
						part = part.replace( '\r', '\\r' );
						objectString += '\t' + name + ': "' + part + '",\n';

					} else if ( part instanceof Array ) {

						objectString += '\t' + name + ': [' + part + '],\n';

					} else if ( Number.isInteger( part ) ) {

						objectString += '\t' + name + ': ' + part + ',\n';

					} else if ( typeof part === 'function' ) {

						objectString += '\t' + name + ': ' + part + ',\n';

					}

				}
				objectString += '}\n\n';

				return objectString;
			};

			var buildSingelton = function ( fullName, internalName, object ) {
				var objectString = fullName + ' = (function () {\n\n';
				objectString += '\t' + object.prototype.constructor.toString() + '\n\n';

				var funcString;
				var objectPart;
				for ( var name in object.prototype ) {

					objectPart = object.prototype[ name ];
					if ( typeof objectPart === 'function' ) {

						funcString = objectPart.toString();
						objectString += '\t' + internalName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

					}

				}
				objectString += '\treturn ' + internalName + ';\n';
				objectString += '})();\n\n';

				return objectString;
			};

			this.workerCode = '';
			this.workerCode += '/**\n';
			this.workerCode += '  * This code was constructed by WWOBJLoader2._buildWebWorkerCode\n';
			this.workerCode += '  */\n\n';

			// parser re-construction
			var objLoaderHelper = new THREE.OBJLoader2();
			this.workerCode += objLoaderHelper._buildWebWorkerCode( buildObject, buildSingelton );

			// web worker construction
			this.workerCode += buildSingelton( 'WWOBJLoader', 'WWOBJLoader', wwDef );
			this.workerCode += buildSingelton( 'WWMeshCreator', 'WWMeshCreator', wwMeshCreatorDef );
			this.workerCode += 'WWOBJLoaderRef = new WWOBJLoader();\n\n';
			this.workerCode += buildSingelton( 'WWOBJLoaderRunner', 'WWOBJLoaderRunner', wwObjLoaderRunnerDef );
			this.workerCode += 'new WWOBJLoaderRunner();\n\n';

			console.timeEnd( 'buildWebWorkerCode' );
		}

		return this.workerCode;
	};

	return WWOBJLoader2;

})();

/**
 * Instruction to configure {@link THREE.OBJLoader2.WWOBJLoader2}.prepareRun to load OBJ from given ArrayBuffer and MTL from given String
 *
 * @param {string} modelName Overall name of the model
 * @param {Uint8Array} objAsArrayBuffer OBJ file content as ArrayBuffer
 * @param {string} pathTexture Path to texture files
 * @param {string} mtlAsString MTL file content as string
 * @param {THREE.Object3D} sceneGraphBaseNode {@link THREE.Object3D} where meshes will be attached
 * @param {boolean} streamMeshes=true Singles meshes are directly integrated into scene when loaded or later
 * @param {boolean} [requestTerminate=false] Request termination of web worker and free local resources after execution
 *
 * @returns {{modelName: string, dataAvailable: boolean, objAsArrayBuffer: null, pathTexture: null, mtlAsString: null, sceneGraphBaseNode: null, streamMeshes: boolean, requestTerminate: boolean}}
 * @constructor
 */
THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer = function ( modelName, objAsArrayBuffer, pathTexture, mtlAsString, sceneGraphBaseNode, streamMeshes, requestTerminate ) {
	return {
		modelName: Boolean( modelName ) ? modelName : 'none',
		dataAvailable: true,
		objAsArrayBuffer: Boolean( objAsArrayBuffer ) ? objAsArrayBuffer : null,
		pathTexture: Boolean( pathTexture ) ? pathTexture : null,
		mtlAsString: Boolean( mtlAsString ) ? mtlAsString : null,
		sceneGraphBaseNode: Boolean( sceneGraphBaseNode ) ? sceneGraphBaseNode : null,
		streamMeshes: ( streamMeshes === null || streamMeshes === undefined ) ? true : streamMeshes,
		requestTerminate: Boolean( requestTerminate )
	};
};

/**
 * Instruction to configure {@link THREE.OBJLoader2.WWOBJLoader2}.prepareRun to load OBJ and MTL from files
 *
 * @param {string} modelName Overall name of the model
 * @param {string} pathObj Path to OBJ file
 * @param {string} fileObj OBJ file name
 * @param {string} pathTexture Path to texture files
 * @param {string} fileMtl MTL file name
 * @param {THREE.Object3D} sceneGraphBaseNode {@link THREE.Object3D} where meshes will be attached
 * @param {boolean} streamMeshes=true Singles meshes are directly integrated into scene when loaded or later
 * @param {boolean} [requestTerminate=false] Request termination of web worker and free local resources after execution
 *
 * @returns {{modelName: string, dataAvailable: boolean, pathObj: null, fileObj: null, pathTexture: null, fileMtl: null, sceneGraphBaseNode: null, streamMeshes: boolean,  requestTerminate: boolean}}
 * @constructor
 */
THREE.OBJLoader2.WWOBJLoader2.PrepDataFile = function ( modelName, pathObj, fileObj, pathTexture, fileMtl, sceneGraphBaseNode, streamMeshes, requestTerminate ) {
	return {
		modelName: Boolean( modelName ) ? modelName : 'none',
		dataAvailable: false,
		pathObj: Boolean( pathObj ) ? pathObj : null,
		fileObj: Boolean( fileObj ) ? fileObj : null,
		pathTexture: Boolean( pathTexture ) ? pathTexture : null,
		fileMtl: Boolean( fileMtl ) ? fileMtl : null,
		sceneGraphBaseNode: Boolean( sceneGraphBaseNode ) ? sceneGraphBaseNode : null,
		streamMeshes: ( streamMeshes === null || streamMeshes === undefined ) ? true : streamMeshes,
		requestTerminate: Boolean( requestTerminate )
	};
};

/**
 * Object to return by {@link THREE.OBJLoader2.WWOBJLoader2}.callbacks.meshLoaded. Used to adjust bufferGeometry or material or prevent complete loading of mesh
 *
 * @param {boolean} disregardMesh=false Tell WWOBJLoader2 to completely disregard this mesh
 * @param {THREE.BufferGeometry} bufferGeometry The {@link THREE.BufferGeometry} to be used
 * @param {THREE.Material} material The {@link THREE.Material} to be used
 *
 * @returns {{ disregardMesh: boolean, replaceBufferGeometry: boolean, bufferGeometry: THREE.BufferGeometry, replaceMaterial: boolean, material: THREE.Material}}
 * @constructor
 */
THREE.OBJLoader2.WWOBJLoader2.LoadedMeshUserOverride = function ( disregardMesh, bufferGeometry, material ) {
	return {
		disregardMesh: Boolean( disregardMesh ),
		replaceBufferGeometry: Boolean( bufferGeometry ),
		bufferGeometry: Boolean( bufferGeometry ) ? bufferGeometry : null,
		replaceMaterial: Boolean( material ),
		material: Boolean( material ) ? material : null
	};
};