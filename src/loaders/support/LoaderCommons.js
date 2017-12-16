if ( THREE.LoaderSupport === undefined ) { THREE.LoaderSupport = {} }

/**
 * Validation functions.
 * @class
 */
THREE.LoaderSupport.Validator = {
	/**
	 * If given input is null or undefined, false is returned otherwise true.
	 *
	 * @param input Can be anything
	 * @returns {boolean}
	 */
	isValid: function( input ) {
		return ( input !== null && input !== undefined );
	},
	/**
	 * If given input is null or undefined, the defaultValue is returned otherwise the given input.
	 *
	 * @param input Can be anything
	 * @param defaultValue Can be anything
	 * @returns {*}
	 */
	verifyInput: function( input, defaultValue ) {
		return ( input === null || input === undefined ) ? defaultValue : input;
	}
};


/**
 * Logging wrapper for console.
 * @class
 *
 * @param {boolean} enabled=true Tell if logger is enabled.
 * @param {boolean} debug=false Toggle debug logging.
 */
THREE.LoaderSupport.ConsoleLogger = (function () {

	function ConsoleLogger( enabled, debug ) {
		this.enabled = enabled !== false;
		this.debug = debug === true;
	}

	/**
	 * Enable or disable debug logging.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {boolean} debug True or False
	 */
	ConsoleLogger.prototype.setDebug = function ( debug ) {
		this.debug = debug === true;
	};

	/**
	 * Returns if is enabled and debug.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @returns {boolean}
	 */
	ConsoleLogger.prototype.isDebug = function () {
		return this.isEnabled() && this.debug;
	};

	/**
	 * Enable or disable info, debug and time logging.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {boolean} enabled True or False
	 */
	ConsoleLogger.prototype.setEnabled = function ( enabled ) {
		this.enabled = enabled === true;
	};

	/**
	 * Returns if is enabled.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @returns {boolean}
	 */
	ConsoleLogger.prototype.isEnabled = function () {
		return this.enabled;
	};

	/**
	 * Log a debug message if enabled and debug is set.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {string} message Message to log
	 */
	ConsoleLogger.prototype.logDebug = function ( message ) {
		if ( this.enabled && this.debug ) console.info( message );
	};

	/**
	 * Log an info message if enabled.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {string} message Message to log
	 */
	ConsoleLogger.prototype.logInfo = function ( message ) {
		if ( this.enabled ) console.info( message );
	};

	/**
	 * Log a warn message (always).
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {string} message Message to log
	 */
	ConsoleLogger.prototype.logWarn = function ( message ) {
		console.warn( message );
	};

	/**
	 * Log an error message (always).
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {string} message Message to log
	 */
	ConsoleLogger.prototype.logError = function ( message ) {
		console.error( message );
	};

	/**
	 * Start time measurement with provided id.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {string} id Time identification
	 */
	ConsoleLogger.prototype.logTimeStart = function ( id ) {
		if ( this.enabled ) console.time( id );
	};

	/**
	 * Stop time measurement started with provided id.
	 * @memberOf THREE.LoaderSupport.ConsoleLogger
	 *
	 * @param {string} id Time identification
	 */
	ConsoleLogger.prototype.logTimeEnd = function ( id ) {
		if ( this.enabled ) console.timeEnd( id );
	};

	return ConsoleLogger;
})();

/**
 * Callbacks utilized by loaders and builder.
 * @class
 */
THREE.LoaderSupport.Callbacks = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function Callbacks() {
		this.onProgress = null;
		this.onMeshAlter = null;
		this.onLoad = null;
		this.onLoadMaterials = null;
	}

	/**
	 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnProgress Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnProgress = function ( callbackOnProgress ) {
		this.onProgress = Validator.verifyInput( callbackOnProgress, this.onProgress );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.LoaderSupport.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnMeshAlter Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnMeshAlter = function ( callbackOnMeshAlter ) {
		this.onMeshAlter = Validator.verifyInput( callbackOnMeshAlter, this.onMeshAlter );
	};

	/**
	 * Register callback function that is called once loading of the complete OBJ file is completed.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnLoad Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnLoad = function ( callbackOnLoad ) {
		this.onLoad = Validator.verifyInput( callbackOnLoad, this.onLoad );
	};

	/**
	 * Register callback function that is called when materials have been loaded.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnLoadMaterials Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnLoadMaterials = function ( callbackOnLoadMaterials ) {
		this.onLoadMaterials = Validator.verifyInput( callbackOnLoadMaterials, this.onLoadMaterials );
	};

	return Callbacks;
})();


/**
 * Object to return by callback onMeshAlter. Used to disregard a certain mesh or to return one to many meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 * @param {boolean} disregardMesh=false Tell implementation that mesh(es) have been altered or added
 */
THREE.LoaderSupport.LoadedMeshUserOverride = (function () {

	function LoadedMeshUserOverride( disregardMesh, alteredMesh ) {
		this.disregardMesh = disregardMesh === true;
		this.alteredMesh = alteredMesh === true;
		this.meshes = [];
	}

	/**
	 * Add a mesh created within callback.
	 *
	 * @memberOf THREE.OBJLoader2.LoadedMeshUserOverride
	 *
	 * @param {THREE.Mesh} mesh
	 */
	LoadedMeshUserOverride.prototype.addMesh = function ( mesh ) {
		this.meshes.push( mesh );
		this.alteredMesh = true;
	};

	/**
	 * Answers if mesh shall be disregarded completely.
	 *
	 * @returns {boolean}
	 */
	LoadedMeshUserOverride.prototype.isDisregardMesh = function () {
		return this.disregardMesh;
	};

	/**
	 * Answers if new mesh(es) were created.
	 *
	 * @returns {boolean}
	 */
	LoadedMeshUserOverride.prototype.providesAlteredMeshes = function () {
		return this.alteredMesh;
	};

	return LoadedMeshUserOverride;
})();


/**
 * A resource description used by {@link THREE.LoaderSupport.PrepData} and others.
 * @class
 *
 * @param {string} url URL to the file
 * @param {string} extension The file extension (type)
 */
THREE.LoaderSupport.ResourceDescriptor = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function ResourceDescriptor( url, extension ) {
		var urlParts = url.split( '/' );

		if ( urlParts.length < 2 ) {

			this.path = null;
			this.name = url;
			this.url = url;

		} else {

			this.path = Validator.verifyInput( urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/', null );
			this.name = Validator.verifyInput( urlParts[ urlParts.length - 1 ], null );
			this.url = url;

		}
		this.extension = Validator.verifyInput( extension, "default" );
		this.extension = this.extension.trim();
		this.content = null;
	}

	/**
	 * Set the content of this resource (String)
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {Object} content The file content as arraybuffer or text
	 */
	ResourceDescriptor.prototype.setContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
	};

	return ResourceDescriptor;
})();


/**
 * Configuration instructions to be used by run method.
 * @class
 */
THREE.LoaderSupport.PrepData = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function PrepData( modelName ) {
		this.modelName = Validator.verifyInput( modelName, '' );
		this.resources = [];
		this.streamMeshesTo = null;
		this.materialPerSmoothingGroup = false;
		this.useIndices = false;
		this.disregardNormals = false;
		this.callbacks = new THREE.LoaderSupport.Callbacks();
		this.crossOrigin;
		this.useAsync = false;
	}

	/**
	 * Set the node where the loaded objects will be attached directly.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.Object3D} streamMeshesTo Object already attached to scenegraph where new meshes will be attached to
	 */
	PrepData.prototype.setStreamMeshesTo = function ( streamMeshesTo ) {
		this.streamMeshesTo = Validator.verifyInput( streamMeshesTo, null );
	};

	/**
	 * Tells whether a material shall be created per smoothing group.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} materialPerSmoothingGroup=false
	 */
	PrepData.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup === true;
	};

	/**
	 * Tells whether indices should be used
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} useIndices=false
	 */
	PrepData.prototype.setUseIndices = function ( useIndices ) {
		this.useIndices = useIndices === true;
	};

	/**
	 * Tells whether normals should be completely disregarded and regenerated.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} disregardNormals=false
	 */
	PrepData.prototype.setDisregardNormals = function ( disregardNormals ) {
		this.disregardNormals = disregardNormals === true;
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
	 */
	PrepData.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {string} crossOrigin CORS value
	 */
	PrepData.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Add a resource description.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor}
	 */
	PrepData.prototype.addResource = function ( resource ) {
		this.resources.push( resource );
	};

	/**
	 * If true uses async loading with worker, if false loads data synchronously.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} useAsync
	 */
	PrepData.prototype.setUseAsync = function ( useAsync ) {
		this.useAsync = useAsync === true;
	};

	/**
	 * Clones this object and returns it afterwards.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @returns {@link THREE.LoaderSupport.PrepData}
	 */
	PrepData.prototype.clone = function () {
		var clone = new THREE.LoaderSupport.PrepData( this.modelName );
		clone.resources = this.resources;
		clone.streamMeshesTo = this.streamMeshesTo;
		clone.materialPerSmoothingGroup = this.materialPerSmoothingGroup;
		clone.useIndices = this.useIndices;
		clone.disregardNormals = this.disregardNormals;
		clone.callbacks = this.callbacks;
		clone.crossOrigin = this.crossOrigin;
		clone.useAsync = this.useAsync;
		return clone;
	};

	return PrepData;
})();
