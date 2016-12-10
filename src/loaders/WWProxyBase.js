/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWLoaderProxyBase = (function () {

	function WWLoaderProxyBase() {
	}

	WWLoaderProxyBase.prototype.newInstance = function ( webWorkerName, basedir, relativeWorkerSrcPath ) {
		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";

		this.webWorkerName = webWorkerName;
		this.basedir = basedir;
		this.relativeWorkerSrcPath = relativeWorkerSrcPath;

		this.worker = null;
		this.sceneGraphBaseNode = null;
		this.debug = false;

		this.validated = false;
		this.running = false;

		// callbacks
		this.callbackMaterialsLoaded = null;
		this.callbackProgress = null;
		this.callbackMeshLoaded = null;
		this.callbackCompletedLoading = null;

		this.callbackManagerCompletedLoading = null;
	};

	WWLoaderProxyBase.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = sceneGraphBaseNode;
	};

	WWLoaderProxyBase.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	WWLoaderProxyBase.prototype.getWebWorkerName = function () {
		return this.webWorkerName;
	};

	WWLoaderProxyBase.prototype.registerHookMaterialsLoaded = function ( callbackMaterialsLoaded ) {
		this.callbackMaterialsLoaded = callbackMaterialsLoaded;
	};

	WWLoaderProxyBase.prototype.registerProgressCallback = function ( callbackProgress ) {
		this.callbackProgress = callbackProgress;
	};

	WWLoaderProxyBase.prototype.registerHookMeshLoaded = function ( callbackMeshLoaded ) {
		this.callbackMeshLoaded = callbackMeshLoaded;
	};

	WWLoaderProxyBase.prototype.registerHookCompletedLoading = function ( callbackCompletedLoading ) {
		this.callbackCompletedLoading = callbackCompletedLoading;
	};

	WWLoaderProxyBase.prototype.registerHookCompletedLoading = function ( callbackCompletedLoading ) {
		this.callbackCompletedLoading = callbackCompletedLoading;
	};

	WWLoaderProxyBase.prototype.registerHookManagerCompletedLoading = function ( callbackManagerCompletedLoading ) {
		this.callbackManagerCompletedLoading = callbackManagerCompletedLoading;
	};

	WWLoaderProxyBase.prototype.validate = function () {
		if ( this.validated ) return true;
		if ( this.worker == null ) {

			this.worker = new Worker( this.basedir + '/' + this.relativeWorkerSrcPath );

			var scope = this;
			var scopeFunction = function ( e ) {
				scope.receiveWorkerMessage( e );
			};
			this.worker.addEventListener( 'message', scopeFunction, false );

		}
		this.validated = true;
		this.running = true;
	};

	WWLoaderProxyBase.prototype.init = function () {
		// Overwrite me, please
	};

	WWLoaderProxyBase.prototype.run = function () {
		// Overwrite me, please
	};

	WWLoaderProxyBase.prototype.receiveWorkerMessage = function ( event ) {
		// Overwrite me, please
	};

	WWLoaderProxyBase.prototype.finalize = function () {
		if ( this.callbackCompletedLoading !== null ) this.callbackCompletedLoading();
		if ( this.callbackManagerCompletedLoading !== null ) this.callbackManagerCompletedLoading();

		this.validated = false;
		this.running = false;
	};

	WWLoaderProxyBase.prototype.shutdownWorker = function () {
		if ( this.worker != null ) {

			if ( ! this.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			this.worker.terminate();
			this.worker = null;
			this.finalize();

		}
	};

	return WWLoaderProxyBase;

})();
