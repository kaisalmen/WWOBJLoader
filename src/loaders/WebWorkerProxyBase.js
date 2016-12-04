/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWLoaderBase = (function () {

	function WWLoaderBase( basedir, relativeWorkerSrcPath ) {
		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";

		this.basedir = basedir;
		this.relativeWorkerSrcPath = relativeWorkerSrcPath;
		this.worker = null;

		this.validated = false;
		this.sceneGraphBaseNode = null;
		this.debug = false;
	}

	WWLoaderBase.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = sceneGraphBaseNode;
	};

	WWLoaderBase.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	WWLoaderBase.prototype.validate = function () {
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
	};

	WWLoaderBase.prototype.initFiles = function () {
		// Overwrite me, please
	};

	WWLoaderBase.prototype.initData = function () {
		// Overwrite me, please
	};

	WWLoaderBase.prototype.run = function () {
		// Overwrite me, please
	};

	WWLoaderBase.prototype.receiveWorkerMessage = function ( event ) {
		// Overwrite me, please
	};

	WWLoaderBase.prototype.finalize = function () {
		this.validated = false;
	};

	WWLoaderBase.prototype.shutdownWorker = function () {
		if ( this.worker != null ) {

			this.worker.terminate();

		}
		this.worker = null;
		this.finalize();
	};

	return WWLoaderBase;

})();
