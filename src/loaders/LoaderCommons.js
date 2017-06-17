if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }

THREE.OBJLoader2.Validator = {
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
THREE.OBJLoader2.Commons = (function () {

	var Validator = THREE.OBJLoader2.Validator;

	function Commons() {
		this.clearAllCallbacks();
	}

	/**
	 * Register callback function that is invoked by internal function "_announceProgress" to print feedback.
	 * @memberOf THREE.OBJLoader2.Commons
	 *
	 * @param {callback} callbackProgress Callback function for described functionality
	 */
	Commons.prototype.registerCallbackProgress = function ( callbackProgress ) {
		if ( Validator.isValid( callbackProgress ) ) this.callbacks.progress.push( callbackProgress );
	};

	/**
	 * Register callback function that is called once loading of the complete model is completed.
	 * @memberOf THREE.OBJLoader2.Commons
	 *
	 * @param {callback} callbackCompletedLoading Callback function for described functionality
	 */
	Commons.prototype.registerCallbackCompletedLoading = function ( callbackCompletedLoading ) {
		if ( Validator.isValid( callbackCompletedLoading ) ) this.callbacks.completedLoading.push( callbackCompletedLoading );
	};

	/**
	 * Register callback function that is called to report an error that prevented loading.
	 * @memberOf THREE.OBJLoader2.Commons
	 *
	 * @param {callback} callbackErrorWhileLoading Callback function for described functionality
	 */
	Commons.prototype.registerCallbackErrorWhileLoading = function ( callbackErrorWhileLoading ) {
		if ( Validator.isValid( callbackErrorWhileLoading ) ) this.callbacks.errorWhileLoading.push( callbackErrorWhileLoading );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.OBJLoader2.OBJLoader2.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.OBJLoader2.Commons
	 *
	 * @param {callback} callbackMeshLoaded Callback function for described functionality
	 */
	Commons.prototype.registerCallbackMeshLoaded = function ( callbackMeshLoaded ) {
		if ( Validator.isValid( callbackMeshLoaded ) ) this.callbacks.meshLoaded.push( callbackMeshLoaded );
	};

	/**
	 * Register callback function that is called once materials have been loaded. It allows to alter and return materials.
	 * @memberOf THREE.OBJLoader2.Commons
	 *
	 * @param {callback} callbackMaterialsLoaded Callback function for described functionality
	 */
	Commons.prototype.registerCallbackMaterialsLoaded = function ( callbackMaterialsLoaded ) {
		if ( Validator.isValid( callbackMaterialsLoaded ) ) this.callbacks.materialsLoaded.push( callbackMaterialsLoaded );
	};

	/**
	 * Clears all registered callbacks.
	 * @memberOf THREE.OBJLoader2.Commons
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

	Commons.prototype._announceProgress = function ( baseText, text ) {
		var output = Validator.isValid( baseText ) ? baseText: "";
		output = Validator.isValid( text ) ? output + " " + text : output;

		var callbackProgress;
		for ( var index in this.callbacks.progress ) {

			callbackProgress = this.callbacks.progress[ index ];
			callbackProgress( output );

		}

		if ( this.debug ) console.log( output );
	};

	/**
	 * Tells whether a material shall be created per smoothing group
	 * @memberOf THREE.OBJLoader2.Commons
	 *
	 * @param {boolean} materialPerSmoothingGroup=false Default is false
	 */
	Commons.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup;
	};

	return Commons;
})();