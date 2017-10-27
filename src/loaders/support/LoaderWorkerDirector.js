/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Workflow:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   deregister
 *
 * @class
 *
 * @param {string} classDef Class definition to be used for construction
 * @param {THREE.LoaderSupport.ConsoleLogger} logger logger to be used
 */
THREE.LoaderSupport.WorkerDirector = (function () {

	var LOADER_WORKER_DIRECTOR_VERSION = '2.0.0';

	var Validator = THREE.LoaderSupport.Validator;

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 8192;

	function WorkerDirector( classDef, logger ) {
		this.logger = Validator.verifyInput( logger, new THREE.LoaderSupport.ConsoleLogger() );
		this.logger.logInfo( 'Using THREE.LoaderSupport.WorkerDirector version: ' + LOADER_WORKER_DIRECTOR_VERSION );

		this.maxQueueSize = MAX_QUEUE_SIZE ;
		this.maxWebWorkers = MAX_WEB_WORKER;
		this.crossOrigin = null;

		if ( ! Validator.isValid( classDef ) ) throw 'Provided invalid classDef: ' + classDef;

		this.workerDescription = {
			classDef: classDef,
			globalCallbacks: {},
			workerSupports: []
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

		var start = this.workerDescription.workerSupports.length;
		var i;
		if ( start < this.maxWebWorkers ) {

			for ( i = start; i < this.maxWebWorkers; i++ ) {

				this.workerDescription.workerSupports[ i ] = {
					workerSupport: new THREE.LoaderSupport.WorkerSupport( this.logger ),
					loader: null
				};

			}

		} else {

			for ( i = start - 1; i >= this.maxWebWorkers; i-- ) {

				this.workerDescription.workerSupports[ i ].workerSupport.setRequestTerminate( true );
				this.workerDescription.workerSupports.pop();

			}
		}
	};

	/**
	 * Store run instructions in internal instructionQueue.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param {THREE.LoaderSupport.PrepData} prepData
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

			this._kickWorkerRun( this.instructionQueue[ 0 ], i );
			this.instructionQueue.shift();

		}
	};

	WorkerDirector.prototype._kickWorkerRun = function( prepData, workerInstanceNo ) {
		var scope = this;
		var directorOnLoad = function ( event ) {
			scope.objectsCompleted++;

			var nextPrepData = scope.instructionQueue[ 0 ];
			if ( Validator.isValid( nextPrepData ) ) {

				scope.instructionQueue.shift();
				scope.logger.logInfo( '\nAssigning next item from queue to worker (queue length: ' + scope.instructionQueue.length + ')\n\n' );
				scope._kickWorkerRun( nextPrepData, event.detail.instanceNo );

			} else if ( scope.instructionQueue.length === 0 ) {

				scope.deregister();

			}
		};

		var prepDataCallbacks = prepData.getCallbacks();
		var globalCallbacks = this.workerDescription.globalCallbacks;
		var wrapperOnLoad = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onLoad ) ) globalCallbacks.onLoad( event );
			if ( Validator.isValid( prepDataCallbacks.onLoad ) ) prepDataCallbacks.onLoad( event );
			directorOnLoad( event );
		};

		var wrapperOnProgress = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onProgress ) ) globalCallbacks.onProgress( event );
			if ( Validator.isValid( prepDataCallbacks.onProgress ) ) prepDataCallbacks.onProgress( event );
		};

		var wrapperOnMeshAlter = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onMeshAlter ) ) globalCallbacks.onMeshAlter( event );
			if ( Validator.isValid( prepDataCallbacks.onMeshAlter ) ) prepDataCallbacks.onMeshAlter( event );
		};

		var supportTuple = this.workerDescription.workerSupports[ workerInstanceNo ];
		supportTuple.loader = this._buildLoader( workerInstanceNo );

		var updatedCallbacks = new THREE.LoaderSupport.Callbacks();
		updatedCallbacks.setCallbackOnLoad( wrapperOnLoad );
		updatedCallbacks.setCallbackOnProgress( wrapperOnProgress );
		updatedCallbacks.setCallbackOnMeshAlter( wrapperOnMeshAlter );
		prepData.callbacks = updatedCallbacks;

		supportTuple.loader.run( prepData, supportTuple.workerSupport );
	};

	WorkerDirector.prototype._buildLoader = function ( instanceNo ) {
		var classDef = this.workerDescription.classDef;
		var loader = Object.create( classDef.prototype );
		this.workerDescription.classDef.call( loader, null, this.logger );

		// verify that all required functions are implemented
		if ( ! loader.hasOwnProperty( 'instanceNo' ) ) throw classDef.name + ' has no property "instanceNo".';
		loader.instanceNo = instanceNo;

		if ( ! loader.hasOwnProperty( 'workerSupport' ) ) {

			throw classDef.name + ' has no property "workerSupport".';

		} else if ( ! classDef.workerSupport instanceof THREE.LoaderSupport.WorkerSupport ) {

			throw classDef.name + '.workerSupport is not of type "THREE.LoaderSupport.WorkerSupport".';

		}
		if ( typeof loader.run !== 'function'  ) throw classDef.name + ' has no function "run".';

		return loader;
	};

	/**
	 * Terminate all workers.
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 */
	WorkerDirector.prototype.deregister = function () {
		this.logger.logInfo( 'WorkerDirector received the deregister call. Terminating all workers!' );

		for ( var i = 0, length = this.workerDescription.workerSupports.length; i < length; i++ ) {

			var supportTuple = this.workerDescription.workerSupports[ i ];
			supportTuple.workerSupport.setTerminateRequested( true );
			this.logger.logInfo( 'Requested termination of worker.' );

			var loaderCallbacks = supportTuple.loader.callbacks;
			if ( Validator.isValid( loaderCallbacks ) && Validator.isValid( loaderCallbacks.onProgress ) ) loaderCallbacks.onProgress( { detail: { text: '' } } );

		}

		this.workerDescription.workerSupports = [];
		this.instructionQueue = [];
	};

	return WorkerDirector;

})();
