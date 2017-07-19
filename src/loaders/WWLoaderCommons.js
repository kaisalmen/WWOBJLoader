if ( THREE.Loaders.WW === undefined ) { THREE.Loaders.WW = {} }

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
