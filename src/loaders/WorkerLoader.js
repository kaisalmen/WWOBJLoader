if ( THREE.WorkerLoader === undefined ) { THREE.WorkerLoader = {} }

if ( THREE.LoaderSupport === undefined ) console.error( '"THREE.LoaderSupport" is not available. "THREE.WorkerLoader" requires it. Please include "LoaderSupport.js" in your HTML.' );

/**
 * Worker loader...
 * @class
 */
THREE.WorkerLoader = (function () {

	var WORKER_LOADER_VERSION = '1.0.0-dev';
	var Validator = THREE.LoaderSupport.Validator;

	function WorkerLoader( manager, loader ) {
		console.info( 'Using THREE.WorkerLoader version: ' + WORKER_LOADER_VERSION );

		this.manager = Validator.verifyInput( manager, THREE.DefaultLoadingManager );
		this.logging = {
			enabled: true,
			debug: false
		};

		this.fileLoader = new THREE.FileLoader( this.manager );
		this.fileLoader.setResponseType( 'arraybuffer' );

		this.loader = loader;
	}

	/**
	 * Use this method to load a file from the given URL and parse it asynchronously.
	 * @memberOf THREE.WorkerLoader
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {callback} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {callback} [onMeshAlter] A function to be called after a new mesh raw data becomes available for alteration.
	 */
	WorkerLoader.prototype.execute = function ( url, onLoad, onMeshAlter ) {
		var scope = this;
		if ( ! Validator.isValid( onProgress ) ) {
			var numericalValueRef = 0;
			var numericalValue = 0;
			onProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				numericalValue = event.loaded / event.total;
				if ( numericalValue > numericalValueRef ) {

					numericalValueRef = numericalValue;
					var output = 'Download of "' + url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
					scope.onProgress( 'progressLoad', output, numericalValue );

				}
			};
		}

		var onError = function ( event ) {
			var output = 'Error occurred while downloading "' + url + '"';
			console.error( output + ': ' + event );
			scope.onProgress( 'error', output, -1 );
		};

		this.fileLoader.setPath( this.path );
		this.fileLoader.load( url, function ( content ) {
			scope.parseAsync( content, onLoad );

		}, onProgress, onError );
	};

	return WorkerLoader;
})();
