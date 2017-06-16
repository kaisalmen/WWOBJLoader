/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Workflow:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   deregister
 *
 * @class
 */
THREE.OBJLoader2.WWOBJLoader2Director = (function () {

	var Validator = THREE.OBJLoader2.Validator;

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 8192;

	function WWOBJLoader2Director( classDef ) {
		this.maxQueueSize = MAX_QUEUE_SIZE ;
		this.maxWebWorkers = MAX_WEB_WORKER;
		this.crossOrigin = null;

		this.workerDescription = {
			classDef: Validator.verifyInput( classDef, THREE.OBJLoader2.WWOBJLoader2 ),
			globalCallbacks: {},
			workers: []
		};
		this.objectsCompleted = 0;
		this.instructionQueue = [];
	}

	/**
	 * Returns the maximum length of the instruction queue.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 *
	 * @returns {number}
	 */
	WWOBJLoader2Director.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	/**
	 * Returns the maximum number of workers.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 *
	 * @returns {number}
	 */
	WWOBJLoader2Director.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 *
	 * @param {string} crossOrigin CORS value
	 */
	WWOBJLoader2Director.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 *
	 * @param {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks} globalCallbacks  Register global callbacks used by all web workers
	 * @param {number} maxQueueSize Set the maximum size of the instruction queue (1-1024)
	 * @param {number} maxWebWorkers Set the maximum amount of workers (1-16)
	 */
	WWOBJLoader2Director.prototype.prepareWorkers = function ( globalCallbacks, maxQueueSize, maxWebWorkers ) {
		if ( Validator.isValid( globalCallbacks ) ) this.workerDescription.globalCallbacks = globalCallbacks;
		this.maxQueueSize = Math.min( maxQueueSize, MAX_QUEUE_SIZE );
		this.maxWebWorkers = Math.min( maxWebWorkers, MAX_WEB_WORKER );
		this.objectsCompleted = 0;
		this.instructionQueue = [];

		var start = this.workerDescription.workers.length;
		var worker;
		var i;
		if ( start < this.maxWebWorkers ) {

			for ( i = start; i < this.maxWebWorkers; i++ ) {

				worker = this._buildWorker();
				this.workerDescription.workers[ i ] = worker;

			}

		} else {

			for ( i = start - 1; i >= this.maxWebWorkers; i-- ) {

				worker = this.workerDescription.workers[ i ];
				worker.setRequestTerminate( true );
				this.workerDescription.workers.pop();

			}

		}
	};

	/**
	 * Store run instructions in internal instructionQueue.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 *
	 * @param {Object} runParams Either {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer} or {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataFile}
	 */
	WWOBJLoader2Director.prototype.enqueueForRun = function ( runParams ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( runParams );
		}
	};

	/**
	 * Process the instructionQueue until it is depleted.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 */
	WWOBJLoader2Director.prototype.processQueue = function () {
		if ( this.instructionQueue.length === 0 ) return;

		var length = Math.min( this.maxWebWorkers, this.instructionQueue.length );
		for ( var i = 0; i < length; i++ ) {

			this._kickWorkerRun( this.workerDescription.workers[ i ], this.instructionQueue[ 0 ] );
			this.instructionQueue.shift();

		}
	};

	WWOBJLoader2Director.prototype._kickWorkerRun = function( worker, runParams ) {
		worker.clearAllCallbacks();
		var key;
		var globalCallbacks = this.workerDescription.globalCallbacks;
		var workerCallbacks = worker.callbacks;
		var selectedGlobalCallback;
		for ( key in globalCallbacks ) {

			if ( workerCallbacks.hasOwnProperty( key ) && globalCallbacks.hasOwnProperty( key ) ) {

				selectedGlobalCallback = globalCallbacks[ key ];
				if ( Validator.isValid( selectedGlobalCallback ) ) workerCallbacks[ key ].push( selectedGlobalCallback );

			}

		}
		// register per object callbacks
		var runCallbacks = runParams.callbacks;
		if ( Validator.isValid( runCallbacks ) ) {

			for ( key in runCallbacks ) {

				if ( workerCallbacks.hasOwnProperty( key ) && runCallbacks.hasOwnProperty( key ) && Validator.isValid( runCallbacks[ key ] ) ) {

					workerCallbacks[ key ].push( runCallbacks[ key ] );

				}

			}

		}

		var scope = this;
		var directorCompletedLoading = function ( instanceNo, modelName ) {
			scope.objectsCompleted++;

			var worker = scope.workerDescription.workers[ instanceNo ];
			var runParams = scope.instructionQueue[ 0 ];
			if ( Validator.isValid( runParams ) ) {

				console.log( '\nAssigning next item from queue to worker (queue length: ' + scope.instructionQueue.length + ')\n\n' );
				scope._kickWorkerRun( worker, runParams );
				scope.instructionQueue.shift();

			} else if ( scope.instructionQueue.length === 0 ) {

				scope.deregister();

			}
		};
		worker.registerCallbackCompletedLoading( directorCompletedLoading );

		worker.prepareRun( runParams );
		worker.run();
	};

	WWOBJLoader2Director.prototype._buildWorker = function () {
		var worker = Object.create( this.workerDescription.classDef.prototype );
		this.workerDescription.classDef.call( worker );
		worker._init();
		if ( Validator.isValid( this.crossOrigin ) ) worker.setCrossOrigin( this.crossOrigin );

		worker.instanceNo = this.workerDescription.workers.length;
		this.workerDescription.workers.push( worker );
		return worker;
	};

	/**
	 * Terminate all workers.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 */
	WWOBJLoader2Director.prototype.deregister = function () {
		console.log( 'WWOBJLoader2Director received the unregister call. Terminating all workers!' );
		for ( var i = 0, worker, length = this.workerDescription.workers.length; i < length; i++ ) {

			worker = this.workerDescription.workers[ i ];
			worker.setRequestTerminate( true );

			if ( ! worker.wwMeshProvider.running ) {
				console.log( 'Triggered finalize with "termiante" directly.' );
				worker._finalize( 'terminate' );
			}

		}
		if ( Validator.isValid( this.workerDescription.globalCallbacks.progress ) ) this.workerDescription.globalCallbacks.progress( '' );
		this.workerDescription.workers = [];
		this.instructionQueue = [];
	};

	return WWOBJLoader2Director;

})();
