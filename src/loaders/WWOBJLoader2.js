/**
 * Use this class to asynchronously load OBJ files.
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.WWOBJLoader2 = function ( manager ) {
	THREE.OBJLoader2.call( this, manager );

	var WW_OBJLOADER2_VERSION = '1.0.0.-dev';
	console.info( 'Using THREE.WWOBJLoader2 version: ' + WW_OBJLOADER2_VERSION );

	this.workerSupport = new THREE.LoaderSupport.WorkerSupport();
};

THREE.WWOBJLoader2.prototype = Object.create( THREE.OBJLoader2.prototype );
THREE.WWOBJLoader2.prototype.constructor = THREE.WWOBJLoader2;


/**
 * Parses OBJ content asynchronously from arraybuffer.
 * @memberOf THREE.WWOBJLoader2
 *
 * @param {arraybuffer} content OBJ data as Uint8Array
 * @param {callback} onLoad Called after worker successfully completed loading
 */
THREE.WWOBJLoader2.prototype.parseAsync = function () {
	var scope = this;
	var measureTime = false;
	var scopedOnLoad = function () {
		onLoad(
			{
				detail: {
					loaderRootNode: scope.loaderRootNode,
					modelName: scope.modelName,
					instanceNo: scope.instanceNo
				}
			}
		);
		if ( measureTime && scope.logging.enabled ) console.timeEnd( 'WWOBJLoader2 parseAsync: ' + scope.modelName );
	};
	// fast-fail in case of illegal data
	if ( ! Validator.isValid( content ) ) {

		console.warn( 'Provided content is not a valid ArrayBuffer.' );
		scopedOnLoad()

	} else {

		measureTime = true;

	}
	if ( measureTime && this.logging.enabled ) console.time( 'WWOBJLoader2 parseAsync: ' + this.modelName );
	this.meshBuilder.init();

	var scopedOnMeshLoaded = function ( payload ) {
		var meshes = scope.meshBuilder.processPayload( payload );
		var mesh;
		for ( var i in meshes ) {
			mesh = meshes[ i ];
			scope.loaderRootNode.add( mesh );
		}
	};
	var buildCode = function ( funcBuildObject, funcBuildSingleton ) {
		var workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by OBJLoader2 buildCode.\n';
		workerCode += '  */\n\n';
		workerCode += 'THREE = { LoaderSupport: {} };\n\n';
		workerCode += funcBuildObject( 'THREE.LoaderSupport.Validator', Validator );
		workerCode += funcBuildSingleton( 'Parser', Parser );

		return workerCode;
	};
	this.workerSupport.validate( buildCode, 'Parser' );
	this.workerSupport.setCallbacks( scopedOnMeshLoaded, scopedOnLoad );
	if ( scope.terminateWorkerOnLoad ) this.workerSupport.setTerminateRequested( true );

	var materialNames = {};
	var materials = this.meshBuilder.getMaterials();
	for ( var materialName in materials ) {

		materialNames[ materialName ] = materialName;

	}
	this.workerSupport.run(
		{
			params: {
				useAsync: true,
				materialPerSmoothingGroup: this.materialPerSmoothingGroup,
				useIndices: this.useIndices,
				disregardNormals: this.disregardNormals
			},
			logging: {
				enabled: this.logging.enabled,
				debug: this.logging.debug
			},
			materials: {
				// in async case only material names are supplied to parser
				materials: materialNames
			},
			data: {
				input: content,
				options: null
			}
		}
	);
};

/**
 * Run the loader according the provided instructions.
 * @memberOf THREE.OBJLoader2
 *
 * @param {THREE.LoaderSupport.PrepData} prepData All parameters and resources required for execution
 * @param {THREE.LoaderSupport.WorkerSupport} [workerSupportExternal] Use pre-existing WorkerSupport
 */
THREE.WWOBJLoader2.prototype.run = function ( prepData, workerSupportExternal ) {
	this._applyPrepData( prepData );
	var available = prepData.checkResourceDescriptorFiles( prepData.resources,
		[
			{ ext: "obj", type: "ArrayBuffer", ignore: false },
			{ ext: "mtl", type: "String", ignore: false },
			{ ext: "zip", type: "String", ignore: true }
		]
	);
	if ( Validator.isValid( workerSupportExternal ) ) {

		this.terminateWorkerOnLoad = false;
		this.workerSupport = workerSupportExternal;
		this.logging.enabled = this.workerSupport.logging.enabled;
		this.logging.debug = this.workerSupport.logging.debug;

	}
	var scope = this;
	var onMaterialsLoaded = function ( materials ) {
		if ( materials !== null ) scope.meshBuilder.setMaterials( materials );
		scope._loadObj( available.obj, scope.callbacks.onLoad, null, null, scope.callbacks.onMeshAlter, prepData.useAsync );

	};
	this._loadMtl( available.mtl, onMaterialsLoaded, prepData.crossOrigin, prepData.materialOptions );
};