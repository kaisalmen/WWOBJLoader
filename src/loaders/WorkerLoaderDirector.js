/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Workflow:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   tearDown (to force stop)
 *
 * @class
 *
 * @param {number} [maxQueueSize] Set the maximum size of the instruction queue (1-8192)
 * @param {number} [maxWebWorkers] Set the maximum amount of workers (1-16)
 */
THREE.WorkerLoader.Director = function ( maxQueueSize, maxWebWorkers ) {

	console.info( 'Using THREE.WorkerLoader.Director version: ' + THREE.WorkerLoader.Director.WORKER_LOADER_DIRECTOR_VERSION );

	this.validator = THREE.WorkerLoader.Validator;

	this.logging = {
		enabled: true,
		debug: false
	};

	this.maxQueueSize = Math.min( maxQueueSize, THREE.WorkerLoader.Director.MAX_QUEUE_SIZE );
	this.maxWebWorkers = Math.min( maxWebWorkers, THREE.WorkerLoader.Director.MAX_WEB_WORKER );
	this.maxWebWorkers = Math.min( this.maxWebWorkers, this.maxQueueSize );
	this.crossOrigin = null;

	this.workerDescription = {
		globalCallbacks: {},
		workerLoaders: {},
		forceWorkerDataCopy: true
	};
	this.objectsCompleted = 0;
	this.instructionQueue = [];
	this.instructionQueuePointer = 0;

	this.callbackOnFinishedProcessing = null;
};

THREE.WorkerLoader.Director.WORKER_LOADER_DIRECTOR_VERSION = '3.0.0-dev';
THREE.WorkerLoader.Director.MAX_WEB_WORKER = 16;
THREE.WorkerLoader.Director.MAX_QUEUE_SIZE = 8192;


THREE.WorkerLoader.Director.prototype = {

	constructor: THREE.WorkerLoader.Director,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 * @returns {THREE.WorkerLoader.Director}
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		return this;
	},

	/**
	 * Sets the CORS string to be used.
	 *
	 * @param {string} crossOrigin CORS value
	 * @returns {THREE.WorkerLoader.Director}
	 */
	setCrossOrigin: function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
		return this;
	},

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 * @returns {THREE.WorkerLoader.Director}
	 */
	setForceWorkerDataCopy: function ( forceWorkerDataCopy ) {
		this.workerDescription.forceWorkerDataCopy = forceWorkerDataCopy === true;
		return this;
	},

	/**
	 * @param {object} globalCallbacks  Register global callbacks used by all web workers
	 *
	 * @param globalCallbacks
	 * @returns {THREE.WorkerLoader.Director}
	 */
	setGlobalCallbacks: function ( globalCallbacks ) {
		if ( this.validator.isValid( globalCallbacks ) ) this.workerDescription.globalCallbacks = globalCallbacks;
		return this;
	},

	/**
	 * Returns the maximum length of the instruction queue.
	 *
	 * @returns {number}
	 */
	getMaxQueueSize: function () {
		return this.maxQueueSize;
	},

	/**
	 * Returns the maximum number of workers.
	 *
	 * @returns {number}
	 */
	getMaxWebWorkers: function () {
		return this.maxWebWorkers;
	},

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 *
	 * @param {THREE.WorkerLoader.LoadingTaskConfig} loadingTaskConfig The configuration that should be applied to the loading task
	 */
	prepareWorkers: function ( loadingTaskConfig ) {
		for ( var instanceNo = 0; instanceNo < this.maxWebWorkers; instanceNo ++ ) {

			var supportDesc = {
				instanceNo: instanceNo,
				inUse: false,
				loadingTaskConfig: null
			};
			this.workerDescription.workerLoaders[ instanceNo ] = supportDesc;

		}
	},

	/**
	 * Store run instructions in internal instructionQueue.
	 *
	 * @param {THREE.WorkerLoader.LoadingTaskConfig} loadingTaskConfig
	 */
	enqueueForRun: function ( loadingTaskConfig ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( loadingTaskConfig );
		}
	},

	/**
	 * Returns if any workers are running.
	 *
	 * @returns {boolean}
	 */
	isRunning: function () {
		var wsKeys = Object.keys( this.workerDescription.workerLoaders );
		return ((this.instructionQueue.length > 0 && this.instructionQueuePointer < this.instructionQueue.length) || wsKeys.length > 0);
	},

	/**
	 * Process the instructionQueue until it is depleted.
	 */
	processQueue: function () {
		var loadingTaskConfig, supportDesc;
		for ( var instanceNo in this.workerDescription.workerLoaders ) {

			supportDesc = this.workerDescription.workerLoaders[ instanceNo ];
			if ( ! supportDesc.inUse ) {

				if ( this.instructionQueuePointer < this.instructionQueue.length ) {

					loadingTaskConfig = this.instructionQueue[ this.instructionQueuePointer ];

					this._kickWorkerRun( loadingTaskConfig, supportDesc );
					this.instructionQueuePointer ++;

				} else {

					this._deregister( supportDesc );

				}

			}

		}

		if ( ! this.isRunning() && this.callbackOnFinishedProcessing !== null ) {

			this.callbackOnFinishedProcessing();
			this.callbackOnFinishedProcessing = null;

		}
	},

	_kickWorkerRun: function ( loadingTaskConfig, supportDesc ) {
		supportDesc.inUse = true;
		loadingTaskConfig.config.instanceNo = supportDesc.instanceNo;
		loadingTaskConfig.config.terminateWorkerOnLoad = false;

		if ( this.logging.enabled ) console.info( '\nAssigning next item from queue to worker (queue length: ' + this.instructionQueue.length + ')\n\n' );

		var scope = this;
		var globalCallbacks = this.workerDescription.globalCallbacks;
		var wrapperOnLoad = function ( event ) {
			if ( scope.validator.isValid( globalCallbacks.onLoad ) ) globalCallbacks.onLoad( event );
			if ( scope.validator.isValid( loadingTaskConfig.callbacks.parse.onLoad ) ) loadingTaskConfig.callbacks.parse.onLoad( event );
			scope.objectsCompleted ++;
			supportDesc.inUse = false;

			scope.processQueue();
		};

		var wrapperOnMeshAlter = function ( event, override ) {
			if ( scope.validator.isValid( globalCallbacks.onMeshAlter ) ) override = globalCallbacks.onMeshAlter( event, override );
			if ( scope.validator.isValid( loadingTaskConfig.callbacks.parse.onMeshAlter ) ) override = loadingTaskConfig.callbacks.parse.onMeshAlter( event, override );
			return override;
		};

		var wrapperOnLoadMaterials = function ( materials ) {
			if ( scope.validator.isValid( globalCallbacks.onLoadMaterials ) ) materials = globalCallbacks.onLoadMaterials( materials );
			if ( scope.validator.isValid( loadingTaskConfig.callbacks.parse.onMaterials ) ) materials = loadingTaskConfig.callbacks.parse.onMaterials( materials );
			return materials;
		};

		var wrapperOnReport = function ( event ) {
			if ( scope.validator.isValid( globalCallbacks.onProgress ) ) globalCallbacks.onProgress( event );
			if ( scope.validator.isValid( loadingTaskConfig.callbacks.app.onReport ) ) loadingTaskConfig.callbacks.app.onReport( event );
		};


		loadingTaskConfig.callbacks.parse.onLoad = wrapperOnLoad;
		loadingTaskConfig.callbacks.parse.onMeshAlter = wrapperOnMeshAlter;
		loadingTaskConfig.callbacks.parse.onLoadMaterials = wrapperOnLoadMaterials;
		loadingTaskConfig.callbacks.app.onReport = wrapperOnReport;

		new THREE.WorkerLoader().execute( loadingTaskConfig );
	},

	_deregister: function ( supportDesc ) {
		if ( this.validator.isValid( supportDesc ) ) {

			supportDesc.loadingTaskConfig.terminateWorkerOnLoad = true;
			if ( this.logging.enabled ) console.info( 'Requested termination of worker #' + supportDesc.instanceNo + '.' );

			if ( this.validator.isValid( loadingTaskConfig.callbacks.app.onReport ) ) loadingTaskConfig.callbacks.app.onReport( { detail: { text: '' } } );
			delete this.workerDescription.workerLoaders[ supportDesc.instanceNo ];

		}
	},

	/**
	 * Terminate all workers.
	 *
	 * @param {callback} callbackOnFinishedProcessing Function called once all workers finished processing.
	 */
	tearDown: function ( callbackOnFinishedProcessing ) {
		if ( this.logging.enabled ) console.info( 'Director received the deregister call. Terminating all workers!' );

		this.instructionQueuePointer = this.instructionQueue.length;
		this.callbackOnFinishedProcessing = this.validator.verifyInput( callbackOnFinishedProcessing, null );

		for ( var instanceNo in this.workerDescription.workerLoaders ) {

			var supportDesc = this.workerDescription.workerLoaders[ instanceNo ];
			supportDesc.loadingTaskConfig.terminateWorkerOnLoad = true;

		}
	}
};
