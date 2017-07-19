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
THREE.Loaders.WW.LoaderDirector = (function () {

	var WW_LOADER_DIRECTOR_VERSION = '1.0.0-dev';

	var Validator = THREE.Loaders.Validator;

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 8192;

	function LoaderDirector( classDef ) {
		console.log( "Using THREE.Loaders.WW.LoaderDirector version: " + WW_LOADER_DIRECTOR_VERSION );

		this.maxQueueSize = MAX_QUEUE_SIZE ;
		this.maxWebWorkers = MAX_WEB_WORKER;
		this.crossOrigin = null;

		if ( ! Validator.isValid( classDef ) ) throw 'Provided invalid classDef: ' + classDef;

		this.workerDescription = {
			classDef: classDef,
			globalCallbacks: {},
			workers: []
		};
		this.objectsCompleted = 0;
		this.instructionQueue = [];
	}

	/**
	 * Returns the maximum length of the instruction queue.
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 *
	 * @returns {number}
	 */
	LoaderDirector.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	/**
	 * Returns the maximum number of workers.
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 *
	 * @returns {number}
	 */
	LoaderDirector.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 *
	 * @param {string} crossOrigin CORS value
	 */
	LoaderDirector.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 *
	 * @param {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks} globalCallbacks  Register global callbacks used by all web workers
	 * @param {number} maxQueueSize Set the maximum size of the instruction queue (1-1024)
	 * @param {number} maxWebWorkers Set the maximum amount of workers (1-16)
	 */
	LoaderDirector.prototype.prepareWorkers = function ( globalCallbacks, maxQueueSize, maxWebWorkers ) {
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
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 *
	 * @param {Object} runParams Either {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer} or {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataFile}
	 */
	LoaderDirector.prototype.enqueueForRun = function ( runParams ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( runParams );
		}
	};

	/**
	 * Process the instructionQueue until it is depleted.
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 */
	LoaderDirector.prototype.processQueue = function () {
		if ( this.instructionQueue.length === 0 ) return;

		var length = Math.min( this.maxWebWorkers, this.instructionQueue.length );
		for ( var i = 0; i < length; i++ ) {

			this._kickWorkerRun( this.workerDescription.workers[ i ], this.instructionQueue[ 0 ] );
			this.instructionQueue.shift();

		}
	};

	LoaderDirector.prototype._kickWorkerRun = function( worker, runParams ) {
		worker.commons.clearAllCallbacks();
		var key;
		var globalCallbacks = this.workerDescription.globalCallbacks;
		var workerCallbacks = worker.commons.callbacks;
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
		worker.commons.registerCallbackCompletedLoading( directorCompletedLoading );

		worker.prepareRun( runParams );
		worker.run();
	};

	LoaderDirector.prototype._buildWorker = function () {
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
	 * @memberOf THREE.Loaders.WW.LoaderDirector
	 */
	LoaderDirector.prototype.deregister = function () {
		console.log( 'LoaderDirector received the unregister call. Terminating all workers!' );
		for ( var i = 0, worker, length = this.workerDescription.workers.length; i < length; i++ ) {

			worker = this.workerDescription.workers[ i ];
			worker.setRequestTerminate( true );

			if ( ! worker.meshProvider.running ) {
				console.log( 'Triggered finalize with "termiante" directly.' );
				worker._finalize( 'terminate' );
			}

		}
		if ( Validator.isValid( this.workerDescription.globalCallbacks.progress ) ) this.workerDescription.globalCallbacks.progress( '' );
		this.workerDescription.workers = [];
		this.instructionQueue = [];
	};

	return LoaderDirector;

})();
