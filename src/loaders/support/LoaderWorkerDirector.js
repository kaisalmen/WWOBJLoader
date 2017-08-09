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
THREE.LoaderSupport.WorkerDirector = (function () {

	var LOADER_WORKER_DIRECTOR_VERSION = '1.0.0-dev';

	var Validator = THREE.LoaderSupport.Validator;

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 8192;

	function WorkerDirector( classDef ) {
		console.log( "Using THREE.LoaderSupport.WorkerDirector version: " + LOADER_WORKER_DIRECTOR_VERSION );

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
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @returns {number}
	 */
	WorkerDirector.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	/**
	 * Returns the maximum number of workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @returns {number}
	 */
	WorkerDirector.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {string} crossOrigin CORS value
	 */
	WorkerDirector.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks} globalCallbacks  Register global callbacks used by all web workers
	 * @param {number} maxQueueSize Set the maximum size of the instruction queue (1-1024)
	 * @param {number} maxWebWorkers Set the maximum amount of workers (1-16)
	 */
	WorkerDirector.prototype.prepareWorkers = function ( globalCallbacks, maxQueueSize, maxWebWorkers ) {
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

				worker = this._buildWorker( i );
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
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {Object} prepData Either {@link THREE.LoaderSupport.PrepData}
	 */
	WorkerDirector.prototype.enqueueForRun = function ( prepData ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( prepData );
		}
	};

	/**
	 * Process the instructionQueue until it is depleted.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 */
	WorkerDirector.prototype.processQueue = function () {
		if ( this.instructionQueue.length === 0 ) return;

		var length = Math.min( this.maxWebWorkers, this.instructionQueue.length );
		for ( var i = 0; i < length; i++ ) {

			this._kickWorkerRun( this.workerDescription.workers[ i ], this.instructionQueue[ 0 ], i );
			this.instructionQueue.shift();

		}
	};

	WorkerDirector.prototype._kickWorkerRun = function( worker, prepData, instanceNo ) {
		worker.init();
		worker.setInstanceNo( instanceNo );

		var scope = this;
		var workerCallbacks = worker.callbacks;
		var prepDataCallbacks = prepData.getCallbacks();
		var globalCallbacks = this.workerDescription.globalCallbacks;

		var directorOnLoad = function ( sceneGraphBaseNode, modelName, instanceNo ) {
			scope.objectsCompleted++;

			var worker = scope.workerDescription.workers[ instanceNo ];
			var nextPrepData = scope.instructionQueue[ 0 ];
			if ( Validator.isValid( nextPrepData ) ) {

				scope.instructionQueue.shift();
				console.log( '\nAssigning next item from queue to worker (queue length: ' + scope.instructionQueue.length + ')\n\n' );
				scope._kickWorkerRun( worker, nextPrepData, worker.getInstanceNo() );

			} else if ( scope.instructionQueue.length === 0 ) {

				scope.deregister();

			}
		};

		var wrapperOnLoad = function ( sceneGraphBaseNode, modelName, instanceNo ) {
			if ( Validator.isValid( globalCallbacks.onLoad ) ) {

				globalCallbacks.onLoad( sceneGraphBaseNode, modelName, instanceNo );

			}

			if ( Validator.isValid( prepDataCallbacks.onLoad ) ) {

				prepDataCallbacks.onLoad( sceneGraphBaseNode, modelName, instanceNo );

			}
			directorOnLoad( sceneGraphBaseNode, modelName, instanceNo );
		};

		var wrapperOnProgress = function ( content, modelName, instanceNo ) {
			if ( Validator.isValid( globalCallbacks.onProgress ) ) {

				globalCallbacks.onProgress( content, modelName, instanceNo );
			}

			if ( Validator.isValid( prepDataCallbacks.onProgress ) ) {

				prepDataCallbacks.onProgress( content, modelName, instanceNo );

			}
		};

		var wrapperOnMeshLoaded = function ( meshName, bufferGeometry, material ) {
			if ( Validator.isValid( globalCallbacks.onMeshLoaded ) ) {

				globalCallbacks.onMeshLoaded( meshName, bufferGeometry, material );
			}

			if ( Validator.isValid( prepDataCallbacks.onMeshLoaded ) ) {

				prepDataCallbacks.onMeshLoaded( meshName, bufferGeometry, material );

			}
		};

		workerCallbacks.setCallbackOnLoad( wrapperOnLoad );
		workerCallbacks.setCallbackOnProgress( wrapperOnProgress );
		workerCallbacks.setCallbackOnMeshLoaded( wrapperOnMeshLoaded );

		worker.run( prepData );
	};

	WorkerDirector.prototype._buildWorker = function () {
		var worker = Object.create( this.workerDescription.classDef.prototype );
		this.workerDescription.classDef.call( worker );

		// verify that all required functions are implemented
		if ( worker.hasOwnProperty( 'setTerminateRequested' ) && typeof worker.setTerminateRequested !== 'function'  ) throw classDef + ' has no function "setTerminateRequested".';
		if ( worker.hasOwnProperty( 'setInstanceNo' ) && typeof worker.setInstanceNo !== 'function'  ) throw classDef + ' has no function "_setInstanceNo".';
		if ( worker.hasOwnProperty( 'getInstanceNo' ) && typeof worker.getInstanceNo !== 'function'  ) throw classDef + ' has no function "_getInstanceNo".';
		if ( worker.hasOwnProperty( 'init' ) && typeof worker.init !== 'function'  ) throw classDef + ' has no function "init".';
		if ( worker.hasOwnProperty( '_buildWebWorkerCode' ) && typeof worker._buildWebWorkerCode !== 'function'  ) throw classDef + ' has no function "_buildWebWorkerCode".';
		if ( worker.hasOwnProperty( 'run' ) && typeof worker.run !== 'function'  ) throw classDef + ' has no function "run".';
		if ( worker.hasOwnProperty( '_finalize' ) && typeof worker._finalize !== 'function'  ) throw classDef + ' has no function "_finalize".';

		this.workerDescription.workers.push( worker );
		return worker;
	};

	/**
	 * Terminate all workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 */
	WorkerDirector.prototype.deregister = function () {
		console.log( 'WorkerDirector received the deregister call. Terminating all workers!' );

		for ( var i = 0, worker, length = this.workerDescription.workers.length; i < length; i++ ) {

			worker = this.workerDescription.workers[ i ];
			console.log( 'Requested termination of worker.' );
			worker.setTerminateRequested( true );

			var workerCallbacks = worker.callbacks;
			if ( Validator.isValid( workerCallbacks.onProgress ) ) workerCallbacks.onProgress( '' );

		}

		this.workerDescription.workers = [];
		this.instructionQueue = [];
	};

	return WorkerDirector;

})();
