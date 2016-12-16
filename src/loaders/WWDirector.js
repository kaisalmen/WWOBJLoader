/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWDirector = (function () {

	function WWDirector( maxQueueSize, maxWebWorkers ) {
		this.maxQueueSize = maxQueueSize;
		this.maxWebWorkers = maxWebWorkers;

		this.workerDescription = {
			prototypeDef: null,
			globalParams: null,
			callbacks: {},
			webWorkers: []
		};
		this.objectsCompleted = 0;
		this.instructionQueue = [];

		this.running = false;
	}

	WWDirector.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	WWDirector.prototype.verifyRunning = function () {
		if ( ! this.running ) this.running = true;
	};

	WWDirector.prototype.stop = function () {
		this.running = false;
	};

	WWDirector.prototype.register = function ( prototypeDef, globalParams, callbacks ) {
		this.verifyRunning();

		this.workerDescription.prototypeDef = prototypeDef;
		this.workerDescription.globalParams = globalParams;

		if ( callbacks != null ) {

			for ( var key in callbacks ) {

				if ( callbacks.hasOwnProperty( key ) ) this.workerDescription.callbacks[ key ] = callbacks[ key ];

			}

		}
	};

	WWDirector.prototype.buildWebWorker = function () {
		var webWorker = Object.create( this.workerDescription.prototypeDef );
		webWorker.init( this.workerDescription.globalParams );

		for ( var key in this.workerDescription.callbacks ) {

			if ( webWorker.callbacks.hasOwnProperty( key ) && this.workerDescription.callbacks.hasOwnProperty( key ) ) {

				webWorker.callbacks[ key ] = this.workerDescription.callbacks[ key ];

			}

		}
		var scope = this;
		var managerCompletedLoading = function ( webWorkerName, modelName, instanceNo, requestTerminate ) {
			scope.objectsCompleted++;
			if ( ! requestTerminate ) {

				var rekick = scope.workerDescription.webWorkers[ instanceNo ];
				var runParams = scope.instructionQueue[ 0 ];
				if ( runParams != null ) {

					rekick.prepareRun( runParams );
					rekick.run();
					scope.instructionQueue.shift();

				}

			}
		};

		webWorker.callbacks.director[ 'completedLoading' ] = managerCompletedLoading;
		webWorker.instanceNo = this.workerDescription.webWorkers.length;
		this.workerDescription.webWorkers.push( webWorker );
		return webWorker;
	};

	WWDirector.prototype.unregister = function () {
		for ( var i = 0, webWorker, length = this.workerDescription.webWorkers.length; i < length; i++ ) {

			webWorker = this.workerDescription.webWorkers[ i ];
			webWorker.setRequestTerminate();

		}
		this.workerDescription.prototypeDef = null;
		this.workerDescription.globalParams = null;
		this.workerDescription.callbacks = {};
		this.workerDescription.webWorkers = [];
	};

	WWDirector.prototype.enqueueForRun = function ( runParams ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( runParams );
		}
	};

	WWDirector.prototype.processQueue = function () {
		if ( this.instructionQueue.length === 0 ) return;

		var webWorker;
		var runParams;
		var length = Math.min( this.maxWebWorkers, this.instructionQueue.length );
		for ( var i = 0; i < length; i++ ) {

			webWorker = this.buildWebWorker();
			this.workerDescription.webWorkers[ i ] = webWorker;

			runParams = this.instructionQueue[ 0 ];
			webWorker.prepareRun( runParams );
			webWorker.run();
			this.instructionQueue.shift();

		}
	};

	WWDirector.prototype.terminateManager = function () {
		console.log( 'TERMINATE: WWDirector received the termination signal!' );
		this.stop();
		this.unregister();
	};

	return WWDirector;

})();
