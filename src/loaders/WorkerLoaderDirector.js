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
	 * @memberOf THREE.WorkerLoader.Director
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
	 * @memberOf THREE.WorkerLoader.Director
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
	 * @memberOf THREE.WorkerLoader.Director
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
	 * @memberOf THREE.WorkerLoader.Director
	 *
	 * @returns {number}
	 */
	getMaxQueueSize: function () {
		return this.maxQueueSize;
	},

	/**
	 * Returns the maximum number of workers.
	 * @memberOf THREE.WorkerLoader.Director
	 *
	 * @returns {number}
	 */
	getMaxWebWorkers: function () {
		return this.maxWebWorkers;
	},

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 * @memberOf THREE.WorkerLoader.Director
	 *
	 * @param {Object} classDef The loader to be used
	 * @param {String} fileType Use this instance only for specified file type
	 */
	prepareWorkers: function ( classDef, fileType ) {
		if ( ! this.validator.isValid( classDef ) ) throw 'Provided invalid classDef: ' + classDef;

		for ( var instanceNo = 0; instanceNo < this.maxWebWorkers; instanceNo ++ ) {

			var workerLoader = new THREE.WorkerLoader()
				.setLogging( this.logging.enabled, this.logging.debug )
				.setInstanceNo( instanceNo );
			workerLoader.getWorkerSupport().setForceWorkerDataCopy( this.workerDescription.forceWorkerDataCopy );
			this.workerDescription.workerLoaders[ instanceNo ] = {
				inUse: false,
				terminateRequested: false,
				fileType: fileType,
				classDef: classDef,
				workerLoader: workerLoader
			};

		}
	},

	/**
	 * Store run instructions in internal instructionQueue.
	 * @memberOf THREE.WorkerLoader.Director
	 *
	 * @param {THREE.WorkerLoader.PrepData} prepData
	 */
	enqueueForRun: function ( prepData ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( prepData );
		}
	},

	/**
	 * Returns if any workers are running.
	 *
	 * @memberOf THREE.WorkerLoader.Director
	 * @returns {boolean}
	 */
	isRunning: function () {
		var wsKeys = Object.keys( this.workerDescription.workerLoaders );
		return ((this.instructionQueue.length > 0 && this.instructionQueuePointer < this.instructionQueue.length) || wsKeys.length > 0);
	},

	/**
	 * Process the instructionQueue until it is depleted.
	 * @memberOf THREE.WorkerLoader.Director
	 */
	processQueue: function () {
		var prepData, supportDesc;
		for ( var instanceNo in this.workerDescription.workerLoaders ) {

			supportDesc = this.workerDescription.workerLoaders[ instanceNo ];
			if ( ! supportDesc.inUse ) {

				if ( this.instructionQueuePointer < this.instructionQueue.length ) {

					prepData = this.instructionQueue[ this.instructionQueuePointer ];
					this._kickWorkerRun( prepData, supportDesc );
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

	_kickWorkerRun: function ( prepData, supportDesc ) {
		supportDesc.inUse = true;
		supportDesc.workerLoader.getWorkerSupport().setTerminateRequested( supportDesc.terminateRequested );

		if ( this.logging.enabled ) console.info( '\nAssigning next item from queue to worker (queue length: ' + this.instructionQueue.length + ')\n\n' );

		var scope = this;
		var prepDataCallbacks = prepData.getCallbacks();
		var globalCallbacks = this.workerDescription.globalCallbacks;
		var wrapperOnLoad = function ( event ) {
			if ( scope.validator.isValid( globalCallbacks.onLoad ) ) globalCallbacks.onLoad( event );
			if ( scope.validator.isValid( prepDataCallbacks.onLoad ) ) prepDataCallbacks.onLoad( event );
			scope.objectsCompleted ++;
			supportDesc.inUse = false;

			scope.processQueue();
		};

		var wrapperOnProgress = function ( event ) {
			if ( scope.validator.isValid( globalCallbacks.onProgress ) ) globalCallbacks.onProgress( event );
			if ( scope.validator.isValid( prepDataCallbacks.onProgress ) ) prepDataCallbacks.onProgress( event );
		};

		var wrapperOnMeshAlter = function ( event, override ) {
			if ( scope.validator.isValid( globalCallbacks.onMeshAlter ) ) override = globalCallbacks.onMeshAlter( event, override );
			if ( scope.validator.isValid( prepDataCallbacks.onMeshAlter ) ) override = globalCallbacks.onMeshAlter( event, override );
			return override;
		};

		var wrapperOnLoadMaterials = function ( materials ) {
			if ( scope.validator.isValid( globalCallbacks.onLoadMaterials ) ) materials = globalCallbacks.onLoadMaterials( materials );
			if ( scope.validator.isValid( prepDataCallbacks.onLoadMaterials ) ) materials = prepDataCallbacks.onLoadMaterials( materials );
			return materials;
		};

		this._buildLoader( supportDesc );

		var updatedCallbacks = new THREE.WorkerLoader.Callbacks();
		updatedCallbacks.setCallbackOnLoad( wrapperOnLoad );
		updatedCallbacks.setCallbackOnProgress( wrapperOnProgress );
		updatedCallbacks.setCallbackOnMeshAlter( wrapperOnMeshAlter );
		updatedCallbacks.setCallbackOnLoadMaterials( wrapperOnLoadMaterials );
		prepData.callbacks = updatedCallbacks;

		supportDesc.loader.run( prepData, supportDesc.workerLoader.getWorkerSupport() );
	},

	_buildLoader: function ( supportDesc ) {
		// create loader instance from given prototype
		var classDef = supportDesc.classDef;
		var loader = Object.create( classDef.prototype );
		classDef.call( loader, THREE.DefaultLoadingManager );

		if ( typeof loader.buildWorkerCode !== 'function' ) throw classDef.name + ' has no function "buildWorkerCode".';
		if ( typeof loader.execute !== 'function' ) throw classDef.name + ' has no function "execute".';

		supportDesc.workerLoader.updateLoader( loader );
	},

	_deregister: function ( supportDesc ) {
		if ( this.validator.isValid( supportDesc ) ) {

			supportDesc.workerLoader.getWorkerSupport().setTerminateRequested( true );
			if ( this.logging.enabled ) console.info( 'Requested termination of worker #' + supportDesc.instanceNo + '.' );

			var loaderCallbacks = supportDesc.loader.callbacks;
			if ( this.validator.isValid( loaderCallbacks.onProgress ) ) loaderCallbacks.onProgress( { detail: { text: '' } } );
			delete this.workerDescription.workerLoaders[ supportDesc.workerLoader.instanceNo ];

		}
	},

	/**
	 * Terminate all workers.
	 * @memberOf THREE.WorkerLoader.Director
	 *
	 * @param {callback} callbackOnFinishedProcessing Function called once all workers finished processing.
	 */
	tearDown: function ( callbackOnFinishedProcessing ) {
		if ( this.logging.enabled ) console.info( 'Director received the deregister call. Terminating all workers!' );

		this.instructionQueuePointer = this.instructionQueue.length;
		this.callbackOnFinishedProcessing = this.validator.verifyInput( callbackOnFinishedProcessing, null );

		for ( var instanceNo in this.workerDescription.workerLoaders ) {

			this.workerDescription.workerLoaders[ instanceNo ].terminateRequested = true;

		}
	}
};
