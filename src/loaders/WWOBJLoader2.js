if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }

THREE.OBJLoader2.WWMeshProvider = (function () {

	var WW_MESH_PROVIDER_VERSION = '1.0.0-dev';

	var Validator = THREE.OBJLoader2.Validator;

	function WWMeshProvider() {
		this._init();
	}

	WWMeshProvider.prototype._init = function () {
		console.log( "Using THREE.OBJLoader2.WWMeshProvider version: " + WW_MESH_PROVIDER_VERSION );

		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";
		if ( window.Blob === undefined  ) throw "This browser does not support Blob!";
		if ( ! typeof window.URL.createObjectURL === 'function'  ) throw "This browser does not support Object creation from URL!";

		this.worker = null;
		this.workerCode = null;

		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.meshStore = null;

		this.materials = [];

		this.callbacks = {
			announceProgress: function ( reason ) {},
			meshLoaded: [],
			completedLoading: function ( baseText, text ) {}
		};

		this.running = false;
		this.counter = 0;
	};

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

	var wwRunnerDef = (function () {

		function WWRunner() {
			self.addEventListener( 'message', this.runner, false );
		}

		WWRunner.prototype.runner = function ( event ) {
			var payload = event.data;

			console.log( 'Command state before: ' + WWImplRef.cmdState );

			switch ( payload.cmd ) {
				case 'init':

					WWImplRef.init( payload );
					break;

				case 'setMaterials':

					WWImplRef.setMaterials( payload );
					break;

				case 'run':

					WWImplRef.run( payload );
					break;

				default:

					console.error( 'OBJLoader: Received unknown command: ' + payload.cmd );
					break;

			}

			console.log( 'Command state after: ' + WWImplRef.cmdState );
		};

		return WWRunner;
	})();

	WWMeshProvider.prototype._validate = function ( functionCodeBuilder, implClassName, existingWorkerCode ) {
		if ( ! Validator.isValid( this.worker ) ) {

			console.time( 'buildWebWorkerCode' );
			this.workerCode = functionCodeBuilder( buildObject, buildSingelton, existingWorkerCode );
			this.workerCode += 'WWImplRef = new ' + implClassName + '();\n\n';
			this.workerCode += buildSingelton( 'WWRunner', 'WWRunner', wwRunnerDef );
			this.workerCode += 'new WWRunner();\n\n';

			var blob = new Blob( [ this.workerCode ], { type: 'text/plain' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );
			console.timeEnd( 'buildWebWorkerCode' );

			var scope = this;
			var scopeFunction = function ( e ) {
				scope._receiveWorkerMessage( e );
			};
			this.worker.addEventListener( 'message', scopeFunction, false );

		}

		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.meshStore = [];

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		var vertexColorMaterial = new THREE.MeshBasicMaterial( { color: 0xDCF1FF } );
		vertexColorMaterial.name = 'vertexColorMaterial';
		vertexColorMaterial.vertexColors = THREE.VertexColors;
		this.materials[ 'vertexColorMaterial' ] = vertexColorMaterial;

		this.counter = 0;
	};

	WWMeshProvider.prototype.setCallbacks = function ( callbackAnnounceProgress, callbacksMeshLoaded, callbackCompletedLoading  ) {
		this.callbacks.announceProgress = Validator.isValid( callbackAnnounceProgress ) ? callbackAnnounceProgress : function ( baseText, text ) { console.log( baseText, text ); };
		this.callbacks.meshLoaded = Validator.isValid( callbacksMeshLoaded ) ? callbacksMeshLoaded : [];
		this.callbacks.completedLoading = Validator.isValid( callbackCompletedLoading ) ? callbackCompletedLoading : function ( reason ) {};
	};

	WWMeshProvider.prototype._terminate = function () {
		if ( Validator.isValid( this.worker ) ) {
			this.worker.terminate();
		}
		this.worker = null;
		this.workerCode = null;
	};

	WWMeshProvider.prototype.addMaterials = function ( materials ) {
		if ( Validator.isValid( materials ) ) {
			for ( var name in materials ) {
				this.materials[ name ] = materials[ name ];
			}
		}
	};

	WWMeshProvider.prototype.postMessage = function ( messageObject ) {
		this.worker.postMessage( messageObject );
	};

	WWMeshProvider.prototype.prepareRun = function ( sceneGraphBaseNode, streamMeshes ) {
		this.running = true;
		this.sceneGraphBaseNode = sceneGraphBaseNode;
		this.streamMeshes = streamMeshes;

		if ( ! this.streamMeshes ) this.meshStore = [];
	};

	WWMeshProvider.prototype._receiveWorkerMessage = function ( event ) {
		var payload = event.data;

		switch ( payload.cmd ) {
			case 'objData':

				var meshName = payload.meshName;

				var bufferGeometry = new THREE.BufferGeometry();
				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.vertices ), 3 ) );
				var haveVertexColors = Validator.isValid( payload.colors );
				if ( haveVertexColors ) {

					bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( payload.colors ), 3 ) );

				}
				if ( Validator.isValid( payload.normals ) ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.normals ), 3 ) );

				} else {

					bufferGeometry.computeVertexNormals();

				}
				if ( Validator.isValid( payload.uvs ) ) {

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
					material = haveVertexColors ? this.materials[ 'vertexColorMaterial' ] : this.materials[ materialDescription.name ];
					if ( ! material ) material = this.materials[ 'defaultMaterial' ];

					if ( materialDescription.default ) {

						material = this.materials[ 'defaultMaterial' ];

					} else if ( materialDescription.flat ) {

						materialName = material.name + '_flat';
						var materialClone = this.materials[ materialName ];
						if ( ! materialClone ) {

							materialClone = material.clone();
							materialClone.name = materialName;
							materialClone.shading = THREE.FlatShading;
							this.materials[ materialName ] = name;

						}

					}

					if ( materialDescription.vertexColors ) material.vertexColors = THREE.VertexColors;
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
				var meshes = [];
				var mesh;
				if ( this.callbacks.meshLoaded.length > 0 ) {

					for ( var index in this.callbacks.meshLoaded ) {

						callbackMeshLoaded = this.callbacks.meshLoaded[ index ];
						callbackMeshLoadedResult = callbackMeshLoaded( meshName, bufferGeometry, material );

						if ( Validator.isValid( callbackMeshLoadedResult ) ) {

							if ( callbackMeshLoadedResult.isDisregardMesh() ) continue;

							if ( callbackMeshLoadedResult.providesAlteredMeshes() ) {

								for ( var i in callbackMeshLoadedResult.meshes ) {

									meshes.push( callbackMeshLoadedResult.meshes[ i ] );
								}

							} else {

								mesh = new THREE.Mesh( bufferGeometry, material );
								mesh.name = meshName;
								meshes.push( mesh );

							}

						} else {

							mesh = new THREE.Mesh( bufferGeometry, material );
							mesh.name = meshName;
							meshes.push( mesh );

						}

					}

				} else {

					mesh = new THREE.Mesh( bufferGeometry, material );
					mesh.name = meshName;
					meshes.push( mesh );

				}
				if ( Validator.isValid( meshes ) && meshes.length > 0 ) {

					var meshNames = [];
					for ( var i in meshes ) {

						mesh = meshes[ i ];
						if ( this.streamMeshes ) {

							this.sceneGraphBaseNode.add( mesh );

						} else {

							this.meshStore.push( mesh );

						}
						meshNames[ i ] = mesh.name;

					}

					this.callbacks.announceProgress( 'Adding multiple mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh (' + this.counter + '): ' + meshName );
					this.counter++;

				} else {

					this.callbacks.announceProgress(  'Not adding mesh: ' + meshName );

				}
				break;

			case 'complete':

				if ( ! this.streamMeshes ) {

					for ( var meshStoreKey in this.meshStore ) {

						if ( this.meshStore.hasOwnProperty( meshStoreKey ) ) this.sceneGraphBaseNode.add( this.meshStore[ meshStoreKey ] );

					}

				}

				if ( Validator.isValid( payload.msg ) ) {

					this.callbacks.announceProgress( payload.msg );

				} else {

					this.callbacks.announceProgress( '' );

				}

				this._completedeRun();
				break;

			case 'report_progress':
				this.callbacks.announceProgress( '', payload.output );
				break;

			default:
				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	WWMeshProvider.prototype._completedeRun = function () {
		this.running = false;
		this.callbacks.completedLoading( 'complete' );
	};

	return WWMeshProvider;
})();

/**
 * OBJ data will be loaded by dynamically created web worker.
 * First feed instructions with: prepareRun
 * Then: Execute with: run
 * @class
 */
THREE.OBJLoader2.WWOBJLoader2 = (function () {

	var WWOBJLOADER2_VERSION = '1.3.0-dev';

	var Validator = THREE.OBJLoader2.Validator;

	WWOBJLoader2.prototype = Object.create( THREE.OBJLoader2.Commons.prototype );
	WWOBJLoader2.prototype.constructor = WWOBJLoader2;

	function WWOBJLoader2() {
		this._init();
	}

	WWOBJLoader2.prototype._init = function () {
		THREE.OBJLoader2.Commons.call( this );
		console.log( "Using THREE.OBJLoader2.WWOBJLoader2 version: " + WWOBJLOADER2_VERSION );

		this.wwMeshProvider = new THREE.OBJLoader2.WWMeshProvider();

		this.instanceNo = 0;
		this.debug = false;

		this.modelName = '';
		this.validated = false;
		this.requestTerminate = false;

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
	};

	/**
	 * Enable or disable debug logging.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {boolean} enabled True or false
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
	 * Call requestTerminate to terminate the web worker and free local resource after execution.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {boolean} requestTerminate True or false
	 */
	WWOBJLoader2.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	WWOBJLoader2.prototype._validate = function () {
		if ( this.validated ) return;

		this.wwMeshProvider._validate( this._buildWebWorkerCode, 'WWOBJLoader' );

		this.modelName = '';
		this.validated = true;
		this.requestTerminate = false;

		this.fileLoader = Validator.verifyInput( this.fileLoader, new THREE.FileLoader( this.manager ) );
		this.mtlLoader = Validator.verifyInput( this.mtlLoader, new THREE.MTLLoader() );
		if ( Validator.isValid( this.crossOrigin ) ) this.mtlLoader.setCrossOrigin( this.crossOrigin );

		this.dataAvailable = false;
		this.fileObj = null;
		this.pathObj = null;
		this.fileMtl = null;
		this.texturePath = null;

		this.objAsArrayBuffer = null;
		this.mtlAsString = null;

		this.materials = [];
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

		var messageObject;
		if ( this.dataAvailable ) {

			// fast-fail on bad type
			if ( ! ( params.objAsArrayBuffer instanceof Uint8Array ) ) {
				throw 'Provided input is not of type arraybuffer! Aborting...';
			}

			messageObject = {
				cmd: 'init',
				debug: this.debug,
				materialPerSmoothingGroup: this.materialPerSmoothingGroup
			};
			this.objAsArrayBuffer = params.objAsArrayBuffer;
			this.mtlAsString = params.mtlAsString;

		} else {

			// fast-fail on bad type
			if ( ! ( typeof( params.fileObj ) === 'string' || params.fileObj instanceof String ) ) {
				throw 'Provided file is not properly defined! Aborting...';
			}

			messageObject = {
				cmd: 'init',
				debug: this.debug,
				materialPerSmoothingGroup: this.materialPerSmoothingGroup
			};
			this.fileObj = params.fileObj;
			this.pathObj = params.pathObj;
			this.fileMtl = params.fileMtl;

		}
		this.setRequestTerminate( params.requestTerminate );
		this.pathTexture = params.pathTexture;

		var scope = this;
		var scopeFuncComplete = function ( reason ) {
			scope._finalize( reason );
		};
		var scopeFuncAnnounce = function ( baseText, text ) {
			scope._announceProgress( baseText, text );
		};
		this.wwMeshProvider.setCallbacks( scopeFuncAnnounce, this.callbacks.meshLoaded, scopeFuncComplete );
		this.wwMeshProvider.prepareRun( params.sceneGraphBaseNode, params.streamMeshes );
		this.wwMeshProvider.postMessage( messageObject );
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
			if ( Validator.isValid( materialCreator ) ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materialNames.push( materialName );
						scope.materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}

				}

			}

			scope.wwMeshProvider.addMaterials( scope.materials );
			scope.wwMeshProvider.postMessage(
				{
					cmd: 'setMaterials',
					materialNames: materialNames
				}
			);

			var materialsFromCallback;
			var callbackMaterialsLoaded;
			for ( var index in scope.callbacks.materialsLoaded ) {

				callbackMaterialsLoaded = scope.callbacks.materialsLoaded[ index ];
				materialsFromCallback = callbackMaterialsLoaded( scope.materials );
				if ( Validator.isValid( materialsFromCallback ) ) scope.materials = materialsFromCallback;

			}
			if ( scope.dataAvailable && scope.objAsArrayBuffer ) {

				scope.wwMeshProvider.postMessage(
					{
						cmd: 'run',
						objAsArrayBuffer: scope.objAsArrayBuffer
					},
					[ scope.objAsArrayBuffer.buffer ]
				);

			} else {

				var refPercentComplete = 0;
				var percentComplete = 0;
				var output;
				var onLoad = function ( objAsArrayBuffer ) {

					scope._announceProgress( 'Running web worker!' );
					scope.objAsArrayBuffer = new Uint8Array( objAsArrayBuffer );
					scope.wwMeshProvider.postMessage(
						{
							cmd: 'run',
							objAsArrayBuffer: scope.objAsArrayBuffer
						},
						[ scope.objAsArrayBuffer.buffer ]
					);

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

			processLoadedMaterials( Validator.isValid( this.mtlAsString ) ? this.mtlLoader.parse( this.mtlAsString ) : null );

		} else {

			if ( Validator.isValid( this.fileMtl ) ) {

				var onError = function ( event ) {
					var output = 'Error occurred while downloading "' + scope.fileMtl + '"';
					console.error( output + ': ' + event );
					scope._announceProgress( output );
					scope._finalize( 'error' );
				};

				this.mtlLoader.load( this.fileMtl, processLoadedMaterials, undefined, onError );

			} else {

				processLoadedMaterials();

			}

		}
	};

	WWOBJLoader2.prototype._finalize = function ( reason ) {
		var index;
		var callback;

		if ( reason === 'complete' ) {

			for ( index in this.callbacks.completedLoading ) {

				callback = this.callbacks.completedLoading[ index ];
				callback( this.modelName, this.instanceNo );

			}

		} else if ( reason === 'error' ) {

			for ( index in this.callbacks.errorWhileLoading ) {

				callback = this.callbacks.errorWhileLoading[ index ];
				callback( this.modelName, this.instanceNo );

			}

		}
		if ( reason === 'terminate' ) {

			if ( this.wwMeshProvider.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			console.log( 'Finalize is complete. Terminating application on request!' );

			this.wwMeshProvider._terminate();

			this.fileLoader = null;
			this.mtlLoader = null;
		}

		this.validated = false;
		console.timeEnd( 'WWOBJLoader2' );
	};

	WWOBJLoader2.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		var workerCode = existingWorkerCode;
		if ( ! Validator.isValid( workerCode ) ) {

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
					this.parser.setMaterialPerSmoothingGroup( payload.materialPerSmoothingGroup );
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
					this.materials = Validator.verifyInput( materials, this.materials );
					this.materials = Validator.verifyInput( this.materials, { materials: [] } );
				};

				WWMeshCreator.prototype.setDebug = function ( debug ) {
					if ( debug === true || debug === false ) this.debug = debug;
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
				WWMeshCreator.prototype.buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount,
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

					self.postMessage(
						{
							cmd: 'objData',
							meshName: rawObjectDescription.groupName !== '' ? rawObjectDescription.groupName : rawObjectDescription.objectName,
							multiMaterial: createMultiMaterial,
							materialDescriptions: materialDescriptions,
							materialGroups: materialGroups,
							vertices: vertexFA,
							colors: colorFA,
							normals: normalFA,
							uvs: uvFA
						},
						[ vertexFA.buffer ],
						colorFA !== null ? [ colorFA.buffer ] : null,
						normalFA !== null ? [ normalFA.buffer ] : null,
						uvFA !== null ? [ uvFA.buffer ] : null
					);

					this.globalObjectCount++;
				};

				WWMeshCreator.prototype.printReport = function ( rawObjectDescription, selectedMaterialIndex ) {
					var materialIndexLine = Validator.isValid( selectedMaterialIndex ) ? '\n materialIndex: ' + selectedMaterialIndex : '';
					console.log(
						' Output Object no.: ' + this.globalObjectCount +
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

				return WWMeshCreator;
			})();

			workerCode = '';
			workerCode += '/**\n';
			workerCode += '  * This code was constructed by WWOBJLoader2._buildWebWorkerCode\n';
			workerCode += '  */\n\n';

			// parser re-construction
			workerCode += THREE.OBJLoader2.prototype._buildWebWorkerCode( funcBuildObject, funcBuildSingelton );

			// web worker construction
			workerCode += funcBuildSingelton( 'WWOBJLoader', 'WWOBJLoader', wwDef );
			workerCode += funcBuildSingelton( 'WWMeshCreator', 'WWMeshCreator', wwMeshCreatorDef );

		}

		return workerCode;
	};

	return WWOBJLoader2;

})();

/**
 * Instruction to configure {@link THREE.OBJLoader2.WWOBJLoader2}.prepareRun to load OBJ from given ArrayBuffer and MTL from given String.
 *
 * @param {string} modelName Overall name of the model
 * @param {Uint8Array} objAsArrayBuffer OBJ file content as ArrayBuffer
 * @param {string} pathTexture Path to texture files
 * @param {string} mtlAsString MTL file content as string
 *
 * @returns {{modelName: string, dataAvailable: boolean, objAsArrayBuffer: null, pathTexture: null, mtlAsString: null, sceneGraphBaseNode: null, streamMeshes: boolean, requestTerminate: boolean}}
 * @constructor
 */
THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer = function ( modelName, objAsArrayBuffer, pathTexture, mtlAsString ) {

	var Validator = THREE.OBJLoader2.Validator;

	return {

		/**
		 * {@link THREE.Object3D} where meshes will be attached.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer
		 *
		 * @param {THREE.Object3D} sceneGraphBaseNode Scene graph object
		 */
		setSceneGraphBaseNode: function ( sceneGraphBaseNode ) {
			this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, null );
		},

		/**
		 * Singles meshes are directly integrated into scene when loaded or later.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer
		 *
		 * @param {boolean} streamMeshes=true Default is true
		 */
		setStreamMeshes: function ( streamMeshes ) {
			this.streamMeshes = streamMeshes !== false;
		},

		/**
		 * Request termination of web worker and free local resources after execution.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer
		 *
		 * @param {boolean} requestTerminate=false Default is false
		 */
		setRequestTerminate: function ( requestTerminate ) {
			this.requestTerminate = requestTerminate === true;
		},

		/**
		 * Returns all callbacks as {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks}
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer
		 *
		 * @returns {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks}
		 */
		getCallbacks: function () {
			return this.callbacks;
		},
		modelName: Validator.verifyInput( modelName, '' ),
		dataAvailable: true,
		objAsArrayBuffer: Validator.verifyInput( objAsArrayBuffer, null ),
		pathTexture: Validator.verifyInput( pathTexture, null ),
		mtlAsString: Validator.verifyInput( mtlAsString, null ),
		sceneGraphBaseNode: null,
		streamMeshes: true,
		requestTerminate: false,
		callbacks: new THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks()
	};
};

/**
 * Instruction to configure {@link THREE.OBJLoader2.WWOBJLoader2}.prepareRun to load OBJ and MTL from files.
 *
 * @param {string} modelName Overall name of the model
 * @param {string} pathObj Path to OBJ file
 * @param {string} fileObj OBJ file name
 * @param {string} pathTexture Path to texture files
 * @param {string} fileMtl MTL file name
 *
 * @returns {{modelName: string, dataAvailable: boolean, pathObj: null, fileObj: null, pathTexture: null, fileMtl: null, sceneGraphBaseNode: null, streamMeshes: boolean,  requestTerminate: boolean}}
 * @constructor
 */
THREE.OBJLoader2.WWOBJLoader2.PrepDataFile = function ( modelName, pathObj, fileObj, pathTexture, fileMtl ) {

	var Validator = THREE.OBJLoader2.Validator;

	return {

		/**
		 * {@link THREE.Object3D} where meshes will be attached.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataFile
		 *
		 * @param {THREE.Object3D} sceneGraphBaseNode Scene graph object
		 */
		setSceneGraphBaseNode: function ( sceneGraphBaseNode ) {
			this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, null );
		},

		/**
		 * Singles meshes are directly integrated into scene when loaded or later.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataFile
		 *
		 * @param {boolean} streamMeshes=true Default is true
		 */
		setStreamMeshes: function ( streamMeshes ) {
			this.streamMeshes = streamMeshes !== false;
		},

		/**
		 * Request termination of web worker and free local resources after execution.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataFile
		 *
		 * @param {boolean} requestTerminate=false Default is false
		 */
		setRequestTerminate: function ( requestTerminate ) {
			this.requestTerminate = requestTerminate === true;
		},

		/**
		 * Returns all callbacks as {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks}
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataFile
		 *
		 * @returns {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks}
		 */
		getCallbacks: function () {
			return this.callbacks;
		},
		modelName: Validator.verifyInput( modelName, '' ),
		dataAvailable: false,
		pathObj: Validator.verifyInput( pathObj, null ),
		fileObj: Validator.verifyInput( fileObj, null ),
		pathTexture: Validator.verifyInput( pathTexture, null ),
		fileMtl: Validator.verifyInput( fileMtl, null ),
		sceneGraphBaseNode: null,
		streamMeshes: true,
		requestTerminate: false,
		callbacks: new THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks()
	};
};

/**
 * Callbacks utilized by functions working with {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer} or {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataFile}
 *
 * @returns {{registerCallbackProgress: THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks.registerCallbackProgress, registerCallbackCompletedLoading: THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks.registerCallbackCompletedLoading, registerCallbackMaterialsLoaded: THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks.registerCallbackMaterialsLoaded, registerCallbackMeshLoaded: THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks.registerCallbackMeshLoaded, registerCallbackErrorWhileLoading: THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks.registerCallbackErrorWhileLoading, progress: null, completedLoading: null, errorWhileLoading: null, materialsLoaded: null, meshLoaded: null}}
 * @constructor
 */
THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks = function () {

	var Validator = THREE.OBJLoader2.Validator;

	return {
		/**
		 * Register callback function that is invoked by internal function "_announceProgress" to print feedback.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks
		 *
		 * @param {callback} callbackProgress Callback function for described functionality
		 */
		registerCallbackProgress: function ( callbackProgress ) {
			if ( Validator.isValid( callbackProgress ) ) this.progress = callbackProgress;
		},

		/**
		 * Register callback function that is called once loading of the complete model is completed.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks
		 *
		 * @param {callback} callbackCompletedLoading Callback function for described functionality
		 */
		registerCallbackCompletedLoading: function ( callbackCompletedLoading ) {
			if ( Validator.isValid( callbackCompletedLoading ) ) this.completedLoading = callbackCompletedLoading;
		},

		/**
		 * Register callback function that is called once materials have been loaded. It allows to alter and return materials.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks
		 *
		 * @param {callback} callbackMaterialsLoaded Callback function for described functionality
		 */
		registerCallbackMaterialsLoaded: function ( callbackMaterialsLoaded ) {
			if ( Validator.isValid( callbackMaterialsLoaded ) ) this.materialsLoaded = callbackMaterialsLoaded;
		},

		/**
		 * Register callback function that is called every time a mesh was loaded.
		 * Use {@link THREE.OBJLoader2.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks
		 *
		 * @param {callback} callbackMeshLoaded Callback function for described functionality
		 */
		registerCallbackMeshLoaded: function ( callbackMeshLoaded ) {
			if ( Validator.isValid( callbackMeshLoaded ) ) this.meshLoaded = callbackMeshLoaded;
		},

		/**
		 * Report if an error prevented loading.
		 * @memberOf THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks
		 *
		 * @param {callback} callbackErrorWhileLoading Callback function for described functionality
		 */
		registerCallbackErrorWhileLoading: function ( callbackErrorWhileLoading ) {
			if ( Validator.isValid( callbackErrorWhileLoading ) ) this.errorWhileLoading = callbackErrorWhileLoading;
		},

		progress: null,
		completedLoading: null,
		errorWhileLoading: null,
		materialsLoaded: null,
		meshLoaded: null
	};
};
