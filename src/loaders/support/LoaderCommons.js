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
 * Callbacks utilized by loaders and builders.
 * @class
 */
THREE.LoaderSupport.Callbacks = function () {
	this.onProgress = null;
	this.onReportError = null;
	this.onMeshAlter = null;
	this.onLoad = null;
	this.onLoadMaterials = null;
};

THREE.LoaderSupport.Callbacks.prototype = {

	constructor: THREE.LoaderSupport.Callbacks,

	/**
	 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
	 *
	 * @param {callback} callbackOnProgress Callback function for described functionality
	 */
	setCallbackOnProgress: function ( callbackOnProgress ) {
		this.onProgress = THREE.LoaderSupport.Validator.verifyInput( callbackOnProgress, this.onProgress );
	},

	/**
	 * Register callback function that is invoked when an error is reported.
	 *
	 * @param {callback} callbackOnReportError Callback function for described functionality
	 */
	setCallbackOnReportError: function ( callbackOnReportError ) {
		this.onReportError = THREE.LoaderSupport.Validator.verifyInput( callbackOnReportError, this.onReportError );
	},

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.LoaderSupport.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 *
	 * @param {callback} callbackOnMeshAlter Callback function for described functionality
	 */
	setCallbackOnMeshAlter: function ( callbackOnMeshAlter ) {
		this.onMeshAlter = THREE.LoaderSupport.Validator.verifyInput( callbackOnMeshAlter, this.onMeshAlter );
	},

	/**
	 * Register callback function that is called once loading of the complete OBJ file is completed.
	 *
	 * @param {callback} callbackOnLoad Callback function for described functionality
	 */
	setCallbackOnLoad: function ( callbackOnLoad ) {
		this.onLoad = THREE.LoaderSupport.Validator.verifyInput( callbackOnLoad, this.onLoad );
	},

	/**
	 * Register callback function that is called when materials have been loaded.
	 *
	 * @param {callback} callbackOnLoadMaterials Callback function for described functionality
	 */
	setCallbackOnLoadMaterials: function ( callbackOnLoadMaterials ) {
		this.onLoadMaterials = THREE.LoaderSupport.Validator.verifyInput( callbackOnLoadMaterials, this.onLoadMaterials );
	}

};


/**
 * Object to return by callback onMeshAlter. Used to disregard a certain mesh or to return one to many meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 * @param {boolean} disregardMesh=false Tell implementation that mesh(es) have been altered or added
 */
THREE.LoaderSupport.LoadedMeshUserOverride = function( disregardMesh, alteredMesh ) {
	this.disregardMesh = disregardMesh === true;
	this.alteredMesh = alteredMesh === true;
	this.meshes = [];
};

THREE.LoaderSupport.LoadedMeshUserOverride.prototype = {

	constructor: THREE.LoaderSupport.LoadedMeshUserOverride,

	/**
	 * Add a mesh created within callback.
	 *
	 * @param {THREE.Mesh} mesh
	 */
	addMesh: function ( mesh ) {
		this.meshes.push( mesh );
		this.alteredMesh = true;
	},

	/**
	 * Answers if mesh shall be disregarded completely.
	 *
	 * @returns {boolean}
	 */
	isDisregardMesh: function () {
		return this.disregardMesh;
	},

	/**
	 * Answers if new mesh(es) were created.
	 *
	 * @returns {boolean}
	 */
	providesAlteredMeshes: function () {
		return this.alteredMesh;
	}

};


/**
 * A resource description used by {@link THREE.LoaderSupport.PrepData} and others.
 * @class
 *
 * @param {string} url URL to the file
 * @param {string} extension The file extension (type)
 */
THREE.LoaderSupport.ResourceDescriptor = function ( url, extension ) {
	var urlParts = url.split( '/' );

	if ( urlParts.length < 2 ) {

		this.path = null;
		this.name = url;
		this.url = url;

	} else {

		this.path = THREE.LoaderSupport.Validator.verifyInput( urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/', null );
		this.name = urlParts[ urlParts.length - 1 ];
		this.url = url;

	}
	this.name = THREE.LoaderSupport.Validator.verifyInput( this.name, 'Unnamed_Resource' );
	this.extension = THREE.LoaderSupport.Validator.verifyInput( extension, 'default' );
	this.extension = this.extension.trim();
	this.content = null;
}

THREE.LoaderSupport.ResourceDescriptor.prototype = {

	constructor: THREE.LoaderSupport.ResourceDescriptor,

	/**
	 * Set the content of this resource
	 *
	 * @param {Object} content The file content as arraybuffer or text
	 */
	setContent: function ( content ) {
		this.content = THREE.LoaderSupport.Validator.verifyInput( content, null );
	}
};


/**
 * Configuration instructions to be used by run method.
 * @class
 */
THREE.LoaderSupport.PrepData = function ( modelName ) {
	this.logging = {
		enabled: true,
		debug: false
	};
	this.modelName = THREE.LoaderSupport.Validator.verifyInput( modelName, '' );
	this.resources = [];
	this.callbacks = new THREE.LoaderSupport.Callbacks();
};

THREE.LoaderSupport.PrepData.prototype = {

	constructor: THREE.LoaderSupport.PrepData,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	},

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
	 */
	getCallbacks: function () {
		return this.callbacks;
	},

	/**
	 * Add a resource description.
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor} Adds a {@link THREE.LoaderSupport.ResourceDescriptor}
	 */
	addResource: function ( resource ) {
		this.resources.push( resource );
	},

	/**
	 * Clones this object and returns it afterwards. Callbacks and resources are not cloned deep (references!).
	 *
	 * @returns {@link THREE.LoaderSupport.PrepData}
	 */
	clone: function () {
		var clone = new THREE.LoaderSupport.PrepData( this.modelName );
		clone.logging.enabled = this.logging.enabled;
		clone.logging.debug = this.logging.debug;
		clone.resources = this.resources;
		clone.callbacks = this.callbacks;

		var property, value;
		for ( property in this ) {

			value = this[ property ];
			if ( ! clone.hasOwnProperty( property ) && typeof this[ property ] !== 'function' ) {

				clone[ property ] = value;

			}
		}

		return clone;
	},

	/**
	 * Identify files or content of interest from an Array of {@link THREE.LoaderSupport.ResourceDescriptor}.
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor[]} resources Array of {@link THREE.LoaderSupport.ResourceDescriptor}
	 * @param Object fileDesc Object describing which resources are of interest (ext, type (string or UInt8Array) and ignore (boolean))
	 * @returns {{}} Object with each "ext" and the corresponding {@link THREE.LoaderSupport.ResourceDescriptor}
	 */
	checkResourceDescriptorFiles: function ( resources, fileDesc ) {
		var resource, triple, i, found;
		var result = {};

		for ( var index in resources ) {

			resource = resources[ index ];
			found = false;
			if ( ! THREE.LoaderSupport.Validator.isValid( resource.name ) ) continue;
			if ( THREE.LoaderSupport.Validator.isValid( resource.content ) ) {

				for ( i = 0; i < fileDesc.length && !found; i++ ) {

					triple = fileDesc[ i ];
					if ( resource.extension.toLowerCase() === triple.ext.toLowerCase() ) {

						if ( triple.ignore ) {

							found = true;

						} else if ( triple.type === "ArrayBuffer" ) {

							// fast-fail on bad type
							if ( ! ( resource.content instanceof ArrayBuffer || resource.content instanceof Uint8Array ) ) throw 'Provided content is not of type ArrayBuffer! Aborting...';
							result[ triple.ext ] = resource;
							found = true;

						} else if ( triple.type === "String" ) {

							if ( ! ( typeof( resource.content ) === 'string' || resource.content instanceof String) ) throw 'Provided  content is not of type String! Aborting...';
							result[ triple.ext ] = resource;
							found = true;

						}

					}

				}
				if ( !found ) throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			} else {

				// fast-fail on bad type
				if ( ! ( typeof( resource.name ) === 'string' || resource.name instanceof String ) ) throw 'Provided file is not properly defined! Aborting...';
				for ( i = 0; i < fileDesc.length && !found; i++ ) {

					triple = fileDesc[ i ];
					if ( resource.extension.toLowerCase() === triple.ext.toLowerCase() ) {

						if ( ! triple.ignore ) result[ triple.ext ] = resource;
						found = true;

					}

				}
				if ( !found ) throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			}
		}

		return result;
	}
};
