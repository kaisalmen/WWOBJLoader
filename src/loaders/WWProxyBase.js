/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWLoaderProxyBase = (function () {

	function WWLoaderProxyBase( params ) {
		this.init( params );
	}

	WWLoaderProxyBase.prototype.init = function ( params ) {
		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";

		this.webWorkerName = params.name;
		this.basedir = params.basedir;
		this.relativeWorkerSrcPath = params.relativeWorkerSrcPath;

		this.instanceNo = 0;
		this.worker = null;
		this.debug = false;

		this.sceneGraphBaseNode = null;
		this.modelName = 'none';
		this.validated = false;
		this.running = false;
		this.requestTerminate = false;

		this.callbacks = {
			progress: null,
			completedLoading: null,
			errorWhileLoading: null,
			manager: {
				completedLoading: null,
				errorWhileLoading: null
			}
		}
	};

	WWLoaderProxyBase.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	WWLoaderProxyBase.prototype.getWebWorkerName = function () {
		return this.webWorkerName;
	};

	WWLoaderProxyBase.prototype.getModelName = function () {
		return this.modelName;
	};

	WWLoaderProxyBase.prototype.registerProgressCallback = function ( callbackProgress ) {
		if ( callbackProgress != null ) this.callbacks.progress = callbackProgress;
	};

	WWLoaderProxyBase.prototype.registerHookCompletedLoading = function ( callbackCompletedLoading ) {
		if ( callbackCompletedLoading != null ) this.callbacks.completedLoading = callbackCompletedLoading;
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
		this.sceneGraphBaseNode = null;
		this.modelName = 'none';
		this.validated = true;
		this.running = true;
		this.requestTerminate = false;
	};

	WWLoaderProxyBase.prototype.prepareRun = function () {
		// Overwrite me, please
	};

	WWLoaderProxyBase.prototype.run = function () {
		// Overwrite me, please
	};

	WWLoaderProxyBase.prototype.receiveWorkerMessage = function ( event ) {
		// Overwrite me, please
	};

	WWLoaderProxyBase.prototype.finalize = function ( reason ) {
		if ( reason === 'complete' ) {

			if ( this.callbacks.completedLoading != null ) this.callbacks.completedLoading( this.webWorkerName, this.modelName, this.instanceNo );
			if ( this.callbacks.manager.completedLoading != null ) this.callbacks.manager.completedLoading( this.webWorkerName, this.modelName, this.instanceNo );

		} else if ( reason === 'error' ) {

			if ( this.callbacks.errorWhileLoading != null ) this.callbacks.errorWhileLoading( this.webWorkerName, this.modelName, this.instanceNo );
			if ( this.callbacks.manager.errorWhileLoading != null ) this.callbacks.manager.errorWhileLoading( this.webWorkerName, this.modelName, this.instanceNo );

		}
		this.validated = false;
		this.running = false;

		if ( this.requestTerminate ) {
			this.terminate();
		}
	};

	WWLoaderProxyBase.prototype.setRequestTerminate = function () {
		this.requestTerminate = true;
	};

	WWLoaderProxyBase.prototype.terminate = function () {
		if ( this.worker != null ) {

			if ( this.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			this.worker.terminate();
			this.worker = null;
			this.finalize( 'terminate' );

		}
	};

	return WWLoaderProxyBase;

})();
