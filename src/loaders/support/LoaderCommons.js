if ( THREE.LoaderSupport === undefined ) { THREE.LoaderSupport = {} }

/**
 * Validation functions
 * @class
 */
THREE.LoaderSupport.Validator = {
	/**
	 * If given input is null or undefined, false is returned otherwise true.
	 *
	 * @param input Anything
	 * @returns {boolean}
	 */
	isValid: function( input ) {
		return ( input !== null && input !== undefined );
	},
	/**
	 * If given input is null or undefined, the defaultValue is returned otherwise the given input.
	 *
	 * @param input Anything
	 * @param defaultValue Anything
	 * @returns {*}
	 */
	verifyInput: function( input, defaultValue ) {
		return ( input === null || input === undefined ) ? defaultValue : input;
	}
};


/**
 * Callbacks utilized by functions working with WWLoader implementations
 *
 * @returns {
 *  {
 * 	 registerCallbackProgress: THREE.LoaderSupport.Callbacks.registerCallbackProgress,
 * 	 registerCallbackCompletedLoading: THREE.LoaderSupport.Callbacks.registerCallbackCompletedLoading,
 * 	 registerCallbackMeshLoaded: THREE.LoaderSupport.Callbacks.registerCallbackMeshLoaded,
 * 	 registerCallbackErrorWhileLoading: THREE.LoaderSupport.Callbacks.registerCallbackErrorWhileLoading,
 * 	 progress: null,
 * 	 completedLoading: null,
 * 	 errorWhileLoading: null,
 * 	 meshLoaded: null
 *  }
 * }
 * @constructor
 */
THREE.LoaderSupport.Callbacks = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function Callbacks() {
		this.progress = [];
		this.completedLoading = [];
		this.errorWhileLoading = [];
		this.meshLoaded = [];
	}

	/**
	 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackProgress Callback function for described functionality
	 */
	Callbacks.prototype.registerCallbackProgress = function ( callbackProgress ) {
		if ( Validator.isValid( callbackProgress ) ) this.progress.push( callbackProgress );
	};

	/**
	 * Register callback function that is called once loading of the complete model is completed.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackCompletedLoading Callback function for described functionality
	 */
	Callbacks.prototype.registerCallbackCompletedLoading = function ( callbackCompletedLoading ) {
		if ( Validator.isValid( callbackCompletedLoading ) ) this.completedLoading.push( callbackCompletedLoading );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.LoaderSupport.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackMeshLoaded Callback function for described functionality
	 */
	Callbacks.prototype.registerCallbackMeshLoaded = function ( callbackMeshLoaded ) {
		if ( Validator.isValid( callbackMeshLoaded ) ) this.meshLoaded.push( callbackMeshLoaded );
	};

	/**
	 * Report if an error prevented loading.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackErrorWhileLoading Callback function for described functionality
	 */
	Callbacks.prototype.registerCallbackErrorWhileLoading = function ( callbackErrorWhileLoading ) {
		if ( Validator.isValid( callbackErrorWhileLoading ) ) this.errorWhileLoading.push( callbackErrorWhileLoading );
	};

	/**
	 * Clears all registered callbacks.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 */
	Callbacks.prototype.clearAllCallbacks = function () {
		this.progress = [];
		this.completedLoading = [];
		this.errorWhileLoading = [];
		this.meshLoaded = [];
	};

	return Callbacks;
})();


/**
 * Global callback definition
 * @class
 */
THREE.LoaderSupport.Commons = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function Commons() {
		this.instanceNo = 0;
		this.debug = false;
		this.crossOrigin = null;
		this.materials = [];
		this.callbacks = new THREE.LoaderSupport.Callbacks();
	}

	/**
	 * Allows to set debug mode.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {boolean} enabled
	 */
	Commons.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	/**
	 * Answers whether debug is set.
	 *
	 * @returns {boolean}
	 */
	Commons.prototype.getDebug = function () {
		return this.debug;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {string} crossOrigin CORS value
	 */
	Commons.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Set materials loaded by any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material} from MTLLoader
	 */
	Commons.prototype.setMaterials = function ( materials ) {
		this.materials = materials;
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
	 */
	Commons.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	/**
	 * Clears all registered callbacks.
	 * @memberOf THREE.LoaderSupport.Commons
	 */
	Commons.prototype.clearAllCallbacks = function () {
		this.callbacks.clearAllCallbacks();
	};

	/**
	 * Announce feedback which is give to the registered callbacks and logged if debug is enabled
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param baseText
	 * @param text
	 */
	Commons.prototype.announceProgress = function ( baseText, text ) {
		var output = Validator.isValid( baseText ) ? baseText: "";
		output = Validator.isValid( text ) ? output + " " + text : output;

		var callbackProgress;
		for ( var index in this.callbacks.progress ) {

			callbackProgress = this.callbacks.progress[ index ];
			callbackProgress( output, this.instanceNo );

		}

		if ( this.debug ) console.log( output );
	};

	return Commons;
})();


/**
 * Object to return by {@link THREE.LoaderSupport.Commons}.callbacks.meshLoaded.
 * Used to disregard a certain mesh or to return one to many created meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
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
 * A resource description used by {@link THREE.LoaderSupport.WW.PrepData} and others.
 * @class
 *
 * @param {string} path Path to the file
 * @param {string} name Name of the file
 * @param {string} extension The file extension (type)
 * @param {Object} [content] The file content as binary or text representation
 */
THREE.LoaderSupport.ResourceDescriptor = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function ResourceDescriptor( path, name, extension, content ) {
		this.path = Validator.verifyInput( path, null );
		this.name = Validator.verifyInput( name, null );
		this.extension = Validator.verifyInput( extension, null );
		this.content = Validator.verifyInput( content, null );
		this.dataAvailable = Validator.isValid( this.content );
	}

	/**
	 * Set the content (e.g. Uint8Array or String) of this resource
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {Object} content the file content
	 */
	ResourceDescriptor.prototype.setContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
		this.dataAvailable = Validator.isValid( this.content );
	};

	return ResourceDescriptor;
})();
