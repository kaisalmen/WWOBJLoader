if ( THREE.Loaders.WW === undefined ) { THREE.Loaders.WW = {} }

THREE.Loaders.WW.MeshProvider = (function () {

	var WW_MESH_PROVIDER_VERSION = '1.0.0-dev';

	var Validator = THREE.Loaders.Validator;

	function MeshProvider() {
		this._init();
	}

	MeshProvider.prototype._init = function () {
		console.log( "Using THREE.Loaders.WW.MeshProvider version: " + WW_MESH_PROVIDER_VERSION );

		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";
		if ( window.Blob === undefined  ) throw "This browser does not support Blob!";
		if ( typeof window.URL.createObjectURL !== 'function'  ) throw "This browser does not support Object creation from URL!";

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

	MeshProvider.prototype.validate = function ( functionCodeBuilder, implClassName, existingWorkerCode ) {
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

	MeshProvider.prototype.setCallbacks = function ( callbackAnnounceProgress, callbacksMeshLoaded, callbackCompletedLoading  ) {
		this.callbacks.announceProgress = Validator.isValid( callbackAnnounceProgress ) ? callbackAnnounceProgress : function ( baseText, text ) { console.log( baseText, text ); };
		this.callbacks.meshLoaded = Validator.isValid( callbacksMeshLoaded ) ? callbacksMeshLoaded : [];
		this.callbacks.completedLoading = Validator.isValid( callbackCompletedLoading ) ? callbackCompletedLoading : function ( reason ) {};
	};

	MeshProvider.prototype.clearAllCallbacks = function () {
		this.setCallbacks();
	};

	MeshProvider.prototype._terminate = function () {
		if ( Validator.isValid( this.worker ) ) {
			this.worker.terminate();
		}
		this.worker = null;
		this.workerCode = null;
	};

	MeshProvider.prototype.addMaterials = function ( materials ) {
		if ( Validator.isValid( materials ) ) {
			for ( var name in materials ) {
				this.materials[ name ] = materials[ name ];
			}
		}
	};

	MeshProvider.prototype.postMessage = function ( messageObject ) {
		this.worker.postMessage( messageObject );
	};

	MeshProvider.prototype.prepareRun = function ( sceneGraphBaseNode, streamMeshes ) {
		this.running = true;
		this.sceneGraphBaseNode = sceneGraphBaseNode;
		this.streamMeshes = streamMeshes;

		if ( ! this.streamMeshes ) this.meshStore = [];
	};

	MeshProvider.prototype._receiveWorkerMessage = function ( event ) {
		var payload = event.data;

		switch ( payload.cmd ) {
			case 'meshData':

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

					this.callbacks.announceProgress( 'Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh (' + this.counter + '): ' + meshName );
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

				if ( Validator.isValid( payload.msg ) ) this.callbacks.announceProgress( payload.msg );

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

	MeshProvider.prototype._completedeRun = function () {
		this.running = false;
		this.callbacks.completedLoading( 'complete' );
	};

	return MeshProvider;
})();

/**
 * Base class for configuration of prepareRun when using {@link THREE.Loaders.WW.MeshProvider}.
 * @class
 */
THREE.Loaders.WW.PrepDataBase = (function () {

	var Validator = THREE.Loaders.Validator;

	function PrepDataBase() {
		this.dataAvailable = false;
		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.materialPerSmoothingGroup = false;
		this.requestTerminate = false;
		this.callbacks = new THREE.Loaders.WW.PrepDataCallbacks();
	}

	/**
	 * {@link THREE.Object3D} where meshes will be attached.
	 * @memberOf THREE.Loaders.WW.PrepDataBase
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode Scene graph object
	 */
	PrepDataBase.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, null );
	};

	/**
	 * Singles meshes are directly integrated into scene when loaded or later.
	 * @memberOf THREE.Loaders.WW.PrepDataBase
	 *
	 * @param {boolean} streamMeshes=true Default is true
	 */
	PrepDataBase.prototype.setStreamMeshes = function ( streamMeshes ) {
		this.streamMeshes = streamMeshes !== false;
	};

	/**
	 * Tells whether a material shall be created per smoothing group
	 * @memberOf THREE.Loaders.WW.PrepDataBase
	 *
	 * @param {boolean} materialPerSmoothingGroup=false Default is false
	 */
	PrepDataBase.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup;
	};

	/**
	 * Request termination of web worker and free local resources after execution.
	 * @memberOf THREE.Loaders.WW.PrepDataBase
	 *
	 * @param {boolean} requestTerminate=false Default is false
	 */
	PrepDataBase.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	/**
	 * Returns all callbacks as {@link THREE.Loaders.WW.PrepDataCallbacks}
	 * @memberOf THREE.Loaders.WW.PrepDataBase
	 *
	 * @returns {THREE.Loaders.WW.PrepDataCallbacks}
	 */
	PrepDataBase.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	return PrepDataBase;
})();

/**
 * Common to all web worker based loaders that can be directed
 * @class
 */
THREE.Loaders.WW.DirectableLoader = (function () {

	function DirectableLoader() {
		this._init();
	}

	/**
	 * Call from implementation
	 * @private
	 */
	DirectableLoader.prototype._init = function () {
		this.commons = new THREE.Loaders.Commons();
		this.meshProvider = new THREE.Loaders.WW.MeshProvider();
		this.validated = false;
		this.materials = [];
		this.crossOrigin = null;
		this.requestTerminate = false;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.Loaders.WW.DirectableLoader
	 *
	 * @param {string} crossOrigin CORS value
	 */
	DirectableLoader.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Call requestTerminate to terminate the web worker and free local resource after execution.
	 * @memberOf THREE.Loaders.WW.DirectableLoader
	 *
	 * @param {boolean} requestTerminate True or false
	 */
	DirectableLoader.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	/**
	 * Call from implementation
	 * @private
	 */
	DirectableLoader.prototype._validate = function () {
		this.requestTerminate = false;
		this.materials = [];
		this.validated = true;
	};

	/**
	 * Function is called by {@link THREE.Loaders.WW.MeshProvider} when worker is constructed.
	 * @private
	 */
	DirectableLoader.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {

	};

	/**
	 * Set all parameters for required for execution of "run". This needs to be overridden.
	 * @memberOf THREE.Loaders.WW.DirectableLoader
	 *
	 * @param {Object} params {@link THREE.Loaders.WW.PrepDataBase} or extension
	 */
	DirectableLoader.prototype.prepareRun = function ( runParams ) {

	};

	/**
	 * Run the loader according the preparation instruction provided in "prepareRun". This needs to be overridden.
	 * @memberOf THREE.Loaders.WW.DirectableLoader
	 */
	DirectableLoader.prototype.run = function () {

	};

	/**
	 * Call from implementation
	 * @param reason
	 * @private
	 */
	DirectableLoader.prototype._finalize = function ( reason ) {
		this.validated = false;
	};

	return DirectableLoader;
})();

/**
 * Callbacks utilized by functions working with WWLoader implementations
 *
 * @returns {
 *  {
 * 	 registerCallbackProgress: THREE.Loaders.WW.PrepDataCallbacks.registerCallbackProgress,
 * 	 registerCallbackCompletedLoading: THREE.Loaders.WW.PrepDataCallbacks.registerCallbackCompletedLoading,
 * 	 registerCallbackMaterialsLoaded: THREE.Loaders.WW.PrepDataCallbacks.registerCallbackMaterialsLoaded,
 * 	 registerCallbackMeshLoaded: THREE.Loaders.WW.PrepDataCallbacks.registerCallbackMeshLoaded,
 * 	 registerCallbackErrorWhileLoading: THREE.Loaders.WW.PrepDataCallbacks.registerCallbackErrorWhileLoading,
 * 	 progress: null,
 * 	 completedLoading: null,
 * 	 errorWhileLoading: null,
 * 	 materialsLoaded: null,
 * 	 meshLoaded: null
 *  }
 * }
 * @constructor
 */
THREE.Loaders.WW.PrepDataCallbacks = function () {

	var Validator = THREE.Loaders.Validator;

	return {
		/**
		 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
		 * @memberOf THREE.Loaders.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackProgress Callback function for described functionality
		 */
		registerCallbackProgress: function ( callbackProgress ) {
			if ( Validator.isValid( callbackProgress ) ) this.progress = callbackProgress;
		},

		/**
		 * Register callback function that is called once loading of the complete model is completed.
		 * @memberOf THREE.Loaders.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackCompletedLoading Callback function for described functionality
		 */
		registerCallbackCompletedLoading: function ( callbackCompletedLoading ) {
			if ( Validator.isValid( callbackCompletedLoading ) ) this.completedLoading = callbackCompletedLoading;
		},

		/**
		 * Register callback function that is called once materials have been loaded. It allows to alter and return materials.
		 * @memberOf THREE.Loaders.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackMaterialsLoaded Callback function for described functionality
		 */
		registerCallbackMaterialsLoaded: function ( callbackMaterialsLoaded ) {
			if ( Validator.isValid( callbackMaterialsLoaded ) ) this.materialsLoaded = callbackMaterialsLoaded;
		},

		/**
		 * Register callback function that is called every time a mesh was loaded.
		 * Use {@link THREE.Loaders.WW.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
		 * @memberOf THREE.Loaders.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackMeshLoaded Callback function for described functionality
		 */
		registerCallbackMeshLoaded: function ( callbackMeshLoaded ) {
			if ( Validator.isValid( callbackMeshLoaded ) ) this.meshLoaded = callbackMeshLoaded;
		},

		/**
		 * Report if an error prevented loading.
		 * @memberOf THREE.Loaders.WW.PrepDataCallbacks
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