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
		this.materials = [];
		this.sceneGrapAttach = null;
		this.debug = false;

		// callbacks
		this.callbackMaterialsLoaded = null;
		this.callbackProgress = null;
		this.callbackMeshLoaded = null;
		this.callbackCompletedLoading = null;
	}

	WWLoaderBase.prototype.setSceneGrapAttach = function ( sceneGrapAttach ) {
		this.sceneGrapAttach = sceneGrapAttach;
	};

	WWLoaderBase.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	WWLoaderBase.prototype.registerHookMaterialsLoaded = function ( callbackMaterialsLoaded ) {
		this.callbackMaterialsLoaded = callbackMaterialsLoaded;
	};

	WWLoaderBase.prototype.registerProgressCallback = function ( callbackProgress ) {
		this.callbackProgress = callbackProgress;
	};

	WWLoaderBase.prototype.registerHookMeshLoaded = function ( callbackMeshLoaded ) {
		this.callbackMeshLoaded = callbackMeshLoaded;
	};

	WWLoaderBase.prototype.registerHookCompletedLoading = function ( callbackCompletedLoading ) {
		this.callbackCompletedLoading = callbackCompletedLoading;
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

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		this.validated = true;
	};

	WWLoaderBase.prototype.shutdownWorker = function () {
		if ( this.worker != null ) {

			this.worker.terminate();

		}
		this.worker = null;
		this.finalise();
	};

	WWLoaderBase.prototype.initFiles = function () {
		// Overwrite me, please
	};

	WWLoaderBase.prototype.initData = function () {
		// Overwrite me, please
	};

	WWLoaderBase.prototype.addMaterial = function ( name, material ) {
		if ( material.name !== name ) material.name = name;
		this.materials[ name ] = material;
	};

	WWLoaderBase.prototype.getMaterial = function ( name ) {
		var material = this.materials[ name ];
		if ( ! material ) material = null;
		return material;
	};

	WWLoaderBase.prototype.announceProgress = function ( baseText, text ) {
		var output = "";
		if ( baseText !== null && baseText !== undefined ) {

			output = baseText;

		}
		if ( text !== null && text !== undefined ) {

			output = output + " " + text;

		}
		if ( this.callbackProgress !== null ) {

			this.callbackProgress( output );

		}
		if ( this.debug ) {

			console.log( output );

		}
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

	return WWLoaderBase;

})();
