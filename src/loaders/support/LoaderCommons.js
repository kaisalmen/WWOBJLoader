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
		this.clearAllCallbacks();
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
	 * Register callback function that is invoked by internal function "_announceProgress" to print feedback.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {callback} callbackProgress Callback function for described functionality
	 */
	Commons.prototype.registerCallbackProgress = function ( callbackProgress ) {
		if ( Validator.isValid( callbackProgress ) ) this.callbacks.progress.push( callbackProgress );
	};

	/**
	 * Register callback function that is called once loading of the complete model is completed.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {callback} callbackCompletedLoading Callback function for described functionality
	 */
	Commons.prototype.registerCallbackCompletedLoading = function ( callbackCompletedLoading ) {
		if ( Validator.isValid( callbackCompletedLoading ) ) this.callbacks.completedLoading.push( callbackCompletedLoading );
	};

	/**
	 * Register callback function that is called to report an error that prevented loading.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {callback} callbackErrorWhileLoading Callback function for described functionality
	 */
	Commons.prototype.registerCallbackErrorWhileLoading = function ( callbackErrorWhileLoading ) {
		if ( Validator.isValid( callbackErrorWhileLoading ) ) this.callbacks.errorWhileLoading.push( callbackErrorWhileLoading );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.LoaderSupport.OBJLoader2.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {callback} callbackMeshLoaded Callback function for described functionality
	 */
	Commons.prototype.registerCallbackMeshLoaded = function ( callbackMeshLoaded ) {
		if ( Validator.isValid( callbackMeshLoaded ) ) this.callbacks.meshLoaded.push( callbackMeshLoaded );
	};

	/**
	 * Clears all registered callbacks.
	 * @memberOf THREE.LoaderSupport.Commons
	 */
	Commons.prototype.clearAllCallbacks = function () {
		this.callbacks = {
			progress: [],
			completedLoading: [],
			errorWhileLoading: [],
			meshLoaded: [],
			materialsLoaded: []
		};
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

	/**
	 * Set materials loaded by any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material} from MTLLoader
	 */
	Commons.prototype.setMaterials = function ( materials ) {
		this.materials = materials;
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
