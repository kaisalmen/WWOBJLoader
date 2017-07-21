/**
 * Base class for configuration of prepareRun when using {@link THREE.LoaderSupport.WW.MeshProvider}.
 * @class
 */
THREE.LoaderSupport.WW.PrepData = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function PrepData( modelName ) {
		this.modelName = Validator.verifyInput( modelName, '' );
		this.resources = [];
		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.materialPerSmoothingGroup = false;
		this.requestTerminate = false;
		this.callbacks = new THREE.LoaderSupport.WW.PrepDataCallbacks();
	}

	/**
	 * {@link THREE.Object3D} where meshes will be attached.
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode Scene graph object
	 */
	PrepData.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, null );
	};

	/**
	 * Singles meshes are directly integrated into scene when loaded or later.
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @param {boolean} streamMeshes=true Default is true
	 */
	PrepData.prototype.setStreamMeshes = function ( streamMeshes ) {
		this.streamMeshes = streamMeshes !== false;
	};

	/**
	 * Tells whether a material shall be created per smoothing group
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @param {boolean} materialPerSmoothingGroup=false Default is false
	 */
	PrepData.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup;
	};

	/**
	 * Request termination of web worker and free local resources after execution.
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @param {boolean} requestTerminate=false Default is false
	 */
	PrepData.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.WW.PrepDataCallbacks}
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @returns {THREE.LoaderSupport.WW.PrepDataCallbacks}
	 */
	PrepData.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	/**
	 * Add a resource description
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @param {THREE.LoaderSupport.WW.PrepDataResource} The resource description
	 */
	PrepData.prototype.addResource = function ( resource ) {
		this.resources.push( resource );
	};

	return PrepData;
})();

/**
 * Define a resource used by {@link THREE.LoaderSupport.WW.PrepData}.
 * @class
 *
 * @param {string} path Path to the file
 * @param {string} name Name of the file
 * @param {string} extension The file extension (type)
 * @param {Object} [content] The file content as binary or text representation
 */
THREE.LoaderSupport.WW.PrepDataResource = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function PrepDataResource( path, name, extension, content ) {
		this.path = Validator.verifyInput( path, null );
		this.name = Validator.verifyInput( name, null );
		this.extension = Validator.verifyInput( extension, null );
		this.content = Validator.verifyInput( content, null );
		this.dataAvailable = Validator.isValid( this.content );
	}

	/**
	 * Set the content (e.g. Uint8Array or String) of this resource
	 * @memberOf THREE.LoaderSupport.WW.PrepDataResource
	 *
	 * @param {Object} content the file content
	 */
	PrepDataResource.prototype.setContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
		this.dataAvailable = Validator.isValid( this.content );
	};

	return PrepDataResource;
})();


/**
 * Callbacks utilized by functions working with WWLoader implementations
 *
 * @returns {
 *  {
 * 	 registerCallbackProgress: THREE.LoaderSupport.WW.PrepDataCallbacks.registerCallbackProgress,
 * 	 registerCallbackCompletedLoading: THREE.LoaderSupport.WW.PrepDataCallbacks.registerCallbackCompletedLoading,
 * 	 registerCallbackMaterialsLoaded: THREE.LoaderSupport.WW.PrepDataCallbacks.registerCallbackMaterialsLoaded,
 * 	 registerCallbackMeshLoaded: THREE.LoaderSupport.WW.PrepDataCallbacks.registerCallbackMeshLoaded,
 * 	 registerCallbackErrorWhileLoading: THREE.LoaderSupport.WW.PrepDataCallbacks.registerCallbackErrorWhileLoading,
 * 	 progress: null,
 * 	 completedLoading: null,
 * 	 errorWhileLoading: null,
 * 	 materialsLoaded: null,
 * 	 meshLoaded: null
 *  }
 * }
 * @constructor
 */
THREE.LoaderSupport.WW.PrepDataCallbacks = function () {

	var Validator = THREE.LoaderSupport.Validator;

	return {
		/**
		 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
		 * @memberOf THREE.LoaderSupport.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackProgress Callback function for described functionality
		 */
		registerCallbackProgress: function ( callbackProgress ) {
			if ( Validator.isValid( callbackProgress ) ) this.progress = callbackProgress;
		},

		/**
		 * Register callback function that is called once loading of the complete model is completed.
		 * @memberOf THREE.LoaderSupport.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackCompletedLoading Callback function for described functionality
		 */
		registerCallbackCompletedLoading: function ( callbackCompletedLoading ) {
			if ( Validator.isValid( callbackCompletedLoading ) ) this.completedLoading = callbackCompletedLoading;
		},

		/**
		 * Register callback function that is called once materials have been loaded. It allows to alter and return materials.
		 * @memberOf THREE.LoaderSupport.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackMaterialsLoaded Callback function for described functionality
		 */
		registerCallbackMaterialsLoaded: function ( callbackMaterialsLoaded ) {
			if ( Validator.isValid( callbackMaterialsLoaded ) ) this.materialsLoaded = callbackMaterialsLoaded;
		},

		/**
		 * Register callback function that is called every time a mesh was loaded.
		 * Use {@link THREE.LoaderSupport.WW.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
		 * @memberOf THREE.LoaderSupport.WW.PrepDataCallbacks
		 *
		 * @param {callback} callbackMeshLoaded Callback function for described functionality
		 */
		registerCallbackMeshLoaded: function ( callbackMeshLoaded ) {
			if ( Validator.isValid( callbackMeshLoaded ) ) this.meshLoaded = callbackMeshLoaded;
		},

		/**
		 * Report if an error prevented loading.
		 * @memberOf THREE.LoaderSupport.WW.PrepDataCallbacks
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
THREE.LoaderSupport.WW.DirectableLoader = (function () {

	DirectableLoader.prototype = Object.create( THREE.LoaderSupport.Commons.prototype );
	DirectableLoader.prototype.constructor = DirectableLoader;

	function DirectableLoader() {
		this._init();
	}

	/**
	 * Call from implementation
	 * @private
	 */
	DirectableLoader.prototype._init = function () {
		THREE.LoaderSupport.Commons.call( this );
		this.meshProvider = new THREE.LoaderSupport.WW.MeshProvider();
		this.validated = false;
		this.materials = [];
		this.requestTerminate = false;
	};

	/**
	 * Call requestTerminate to terminate the web worker and free local resource after execution.
	 * @memberOf THREE.LoaderSupport.WW.DirectableLoader
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
		console.warn( 'DirectableLoader.prototype._validate was not overridden.' );
	};

	/**
	 * Function is called by {@link THREE.LoaderSupport.WW.MeshProvider} when worker is constructed.
	 * @private
	 */
	DirectableLoader.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		console.warn( 'DirectableLoader.prototype._buildWebWorkerCode was not overridden.' );
		console.log( 'Value of "funcBuildObject": ' + funcBuildObject );
		console.log( 'Value of "funcBuildSingelton": ' + funcBuildSingelton );
		console.log( 'Value of "existingWorkerCode": ' + existingWorkerCode );
	};

	/**
	 * Run the loader according the instruction provided. This needs to be overridden.
	 * @memberOf THREE.LoaderSupport.WW.DirectableLoader
	 *
	 * @param {Object} params {@link THREE.LoaderSupport.WW.PrepData}
	 */
	DirectableLoader.prototype.run = function ( runParams ) {
		console.warn( 'DirectableLoader.prototype.run was not overridden.' );
		console.log( 'Value of "runParams": ' + runParams );
	};

	/**
	 * Call from implementation
	 * @param reason
	 * @private
	 */
	DirectableLoader.prototype._finalize = function ( reason ) {
		console.warn( 'DirectableLoader.prototype._finalize was not overridden.' );
		console.log( 'Value of "reason": ' + reason );
	};

	return DirectableLoader;
})();
