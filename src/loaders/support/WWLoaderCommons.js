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
