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
