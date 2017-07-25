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

	function Commons( manager ) {
		this.initialized = false;
		this._init( manager );
	}

	Commons.prototype._init = function ( manager ) {
		if ( this.initialized ) return;
		this.manager = Validator.verifyInput( manager, THREE.DefaultLoadingManager );

		this.modelName = '';

		this.debug = false;
		this.sceneGraphBaseNode = null;
		this.crossOrigin = null;
		this.materials = [];
		this.materialNames = [];

		this.callbacks = new THREE.LoaderSupport.Callbacks();

		this.validated = false;
		this.initialized = true;
	};


	Commons.prototype._validate = function ( prepData ) {
		if ( this.validated ) return;

		this.modelName = Validator.verifyInput( Validator.isValid( prepData ) ? prepData.modelName : null, this.modelName );
		var materials = Validator.isValid( prepData ) ? ( prepData.materials.length > 0 ? prepData.materials : null ) : null;
		setMaterials( this, materials );

		this.validated = true;
	};

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
	 * Set the node where the loaded objects will be attached.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode scenegraph object where meshes will be attached
	 */
	Commons.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, this.sceneGraphBaseNode );
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

	var setMaterials = function ( scope, materials ) {
		if ( Validator.isValid( materials ) ) {
			scope.materials = materials;
			scope.materialNames = [];
			for ( var materialName in materials ) {
				scope.materialNames.push( materialName );
			}
		}
	};

	/**
	 * Set materials loaded by any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material} from MTLLoader
	 */
	Commons.prototype.setMaterials = function ( materials ) {
		setMaterials( this, materials );
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
			callbackProgress( output, this.modelName );

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
 * @param {string} url URL to the file
 * @param {string} extension The file extension (type)
 * @param {boolean} useArrayBuffer Whether content is arraybuffer or text
 */
THREE.LoaderSupport.ResourceDescriptor = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function ResourceDescriptor( url, extension, useArrayBuffer ) {
		var urlParts = url.split( '/' );

		if ( urlParts.length < 2 ) {

			this.path = null;
			this.name = this.name = url;
			this.url = url;

		} else {

			this.path = Validator.verifyInput( urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/', null );
			this.name = Validator.verifyInput( urlParts[ urlParts.length - 1 ], null );
			this.url = url;

		}
		this.extension = Validator.verifyInput( extension, "default" );
		this.extension = this.extension.trim();
		this.content = null;
		this.useArrayBuffer = useArrayBuffer !== false;
	}

	/**
	 * Set the content of this resource (String)
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {String} content The file content as text
	 */
	ResourceDescriptor.prototype.setTextContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
		this.useArrayBuffer = false;
	};

	/**
	 * Set the content of this resource (String)
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {Uint8Array} content The file content as text
	 */
	ResourceDescriptor.prototype.setBinaryContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
		this.useArrayBuffer = true;
	};

	return ResourceDescriptor;
})();


/**
 * Base class for configuration of prepareRun when using {@link THREE.LoaderSupport.WW.MeshProvider}.
 * @class
 */
THREE.LoaderSupport.PrepData = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function PrepData( modelName ) {
		this.modelName = Validator.verifyInput( modelName, '' );
		this.resources = [];
		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.materialPerSmoothingGroup = false;
		this.requestTerminate = false;
		this.materials = [];
		this.callbacks = new THREE.LoaderSupport.Callbacks();
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
	 * Set materials loaded by any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material} from MTLLoader
	 */
	PrepData.prototype.setMaterials = function ( materials ) {
		if ( Validator.isValid( materials ) ) this.materials = materials;
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 * @memberOf THREE.LoaderSupport.WW.PrepData
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
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


	PrepData.prototype.clone = function () {
		var clone = new THREE.LoaderSupport.PrepData( this.modelName );
		clone.resources = this.resources;
		clone.sceneGraphBaseNode = this.sceneGraphBaseNode;
		clone.streamMeshes = this.streamMeshes;
		clone.materialPerSmoothingGroup = this.materialPerSmoothingGroup;
		clone.requestTerminate = this.requestTerminate;
		clone.callbacks = this.callbacks;
		return clone;
	};

	return PrepData;
})();
