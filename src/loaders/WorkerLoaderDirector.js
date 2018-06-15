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

	this.logging = {
		enabled: true,
		debug: false
	};

	this.validator = THREE.LoaderSupport.Validator;
	this.crossOrigin = null;

	this.globalCallbacks = {
		onComplete: null,
		onMesh: null,
		onMaterials: null,
		onReport: null,
		onReportError: null,
		onQueueComplete: null
	};
	this.forceWorkerDataCopy = true;
	this.workerLoaderPools = {};

	this.objectsCompleted = 0;
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
		this.forceWorkerDataCopy = forceWorkerDataCopy === true;
		return this;
	},

	/**
	 * Register global callbacks used by all web workers during parsing.
	 *
	 * @param {function} onComplete
	 * @param {function} onMesh
	 * @param {function} onMaterials
	 * @returns {THREE.WorkerLoader.Director}
	 */
	setGlobalParseCallbacks: function ( onComplete, onMesh, onMaterials ) {
		this.globalCallbacks.onComplete = this.validator.verifyInput( onComplete, this.globalCallbacks.onComplete );
		this.globalCallbacks.onMesh = this.validator.verifyInput( onMesh, this.globalCallbacks.onMesh );
		this.globalCallbacks.onMaterials = this.validator.verifyInput( onMaterials, this.globalCallbacks.onMaterials );
		return this;
	},

	/**
	 * Register global callbacks used on application level for feedback.
	 *
	 * @param {function} onReport
	 * @param {function} onReportError Receives supportDesc object and the error messsage
	 * @param {function} onQueueComplete Called when WorkerLoader queue processing is done
	 * @returns {THREE.WorkerLoader.Director}
	 */
	setGlobalAppCallbacks: function ( onReport, onReportError, onQueueComplete ) {
		this.globalCallbacks.onReport = this.validator.verifyInput( onReport, this.globalCallbacks.onReport );
		this.globalCallbacks.onReportError = this.validator.verifyInput( onReportError, this.globalCallbacks.onReportError );
		this.globalCallbacks.onQueueComplete = this.validator.verifyInput( onQueueComplete, this.globalCallbacks.onQueueComplete );
		return this;
	},

	/**
	 * Returns the maximum length of the instruction queue.
	 *
	 * @returns {number}
	 */
	getMaxQueueSize: function ( extension ) {
		var maxQueueSize = -1;
		var workerLoaderPool = this.workerLoaderPools[ extension ];
		if ( this.validator.isValid( workerLoaderPool ) ) maxQueueSize = workerLoaderPool.getMaxQueueSize();
		return maxQueueSize;
	},

	/**
	 * Returns the maximum number of workers.
	 *
	 * @returns {number}
	 */
	getMaxWebWorkers: function ( extension ) {
		var maxWebWorkers = -1;
		var workerLoaderPool = this.workerLoaderPools[ extension ];
		if ( this.validator.isValid( workerLoaderPool ) ) maxWebWorkers = workerLoaderPool.getMaxWebWorkers();
		return maxWebWorkers;
	},

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 *
	 */
	prepareWorkers: function ( workerPoolDescriptions ) {
		var maxQueueSize, maxWebWorkers, workerPoolDescription, workerLoaderPool;
		for ( var extension in workerPoolDescriptions ) {

			workerPoolDescription = workerPoolDescriptions[ extension ];
			maxQueueSize = this.validator.verifyInput( workerPoolDescription.maxQueueSize, THREE.WorkerLoader.Director.MAX_QUEUE_SIZE );
			maxWebWorkers = this.validator.verifyInput( workerPoolDescription.maxWebWorkers, THREE.WorkerLoader.Director.MAX_WEB_WORKER );
			maxWebWorkers = Math.min( maxWebWorkers, maxQueueSize );

			workerLoaderPool = {
				maxQueueSize: maxQueueSize,
				maxWebWorkers: maxWebWorkers,
				instructionQueue: [],
				instructionQueuePointer: 0,
				workerLoaders: {},
				getMaxWebWorkers: function () {
					return this.maxWebWorkers;
				},
				getMaxQueueSize: function () {
					return this.maxQueueSize;
				},
				enqueueForRun: function ( loadingTaskConfig ) {
					var overallNo = this.instructionQueue.length;
					if ( overallNo < this.maxQueueSize ) this.instructionQueue.push( loadingTaskConfig );
				},
				isRunning: function () {
					var wsKeys = Object.keys( this.workerLoaders );
					return ( ( this.instructionQueue.length > 0 && this.instructionQueuePointer < this.instructionQueue.length ) || wsKeys.length > 0 );
				},
				processQueue: function ( workerLoaderDirector ) {
					var loadingTaskConfig, supportDesc;
					for ( var instanceNo in this.workerLoaders ) {

						supportDesc = this.workerLoaders[ instanceNo ];
						if ( ! supportDesc.inUse ) {

							if ( this.instructionQueuePointer < this.instructionQueue.length ) {

								loadingTaskConfig = this.instructionQueue[ this.instructionQueuePointer ];

								workerLoaderDirector._kickWorkerRun( loadingTaskConfig, supportDesc );
								this.instructionQueuePointer++;

							} else {

								workerLoaderDirector._deregister( supportDesc );

							}

						}

					}

					if ( ! this.isRunning() && workerLoaderDirector.validator.isValid( workerLoaderDirector.globalCallbacks.onQueueComplete ) ) {

						workerLoaderDirector.globalCallbacks.onQueueComplete();

					}
				},
				tearDown: function () {
					this.instructionQueuePointer = this.instructionQueue.length;
					for ( var instanceNo in this.workerLoaders ) {

						var supportDesc = this.workerLoaders[ instanceNo ];
						supportDesc.workerLoader.getLoadingTask().setTerminateWorkerOnLoad( true );

					}
				}
			};
			for ( var instanceNo = 0; instanceNo < maxWebWorkers; instanceNo ++ ) {

				var supportDesc = {
					instanceNo: instanceNo,
					inUse: false,
					extension: extension,
					workerLoader: new THREE.WorkerLoader(),
					workerSupport: new THREE.WorkerLoader.WorkerSupport()
						.setForceWorkerDataCopy( this.forceWorkerDataCopy )
						.setTerminateRequested( false )
				};
				workerLoaderPool.workerLoaders[ instanceNo ] = supportDesc;

			}
			this.workerLoaderPools[ extension ] = workerLoaderPool;

		}
	},

	/**
	 * Store run instructions in internal instructionQueue.
	 *
	 * @param {THREE.WorkerLoader.LoadingTaskConfig} loadingTaskConfig The configuration that should be applied to the loading task
	 */
	enqueueForRun: function ( loadingTaskConfig ) {
		var workerLoaderPool = this.workerLoaderPools[ loadingTaskConfig.extension ];
		if ( this.validator.isValid( workerLoaderPool ) ) workerLoaderPool.enqueueForRun( loadingTaskConfig );
	},

	/**
	 * Returns if any workers are running.
	 *
	 * @returns {boolean}
	 */
	isRunning: function () {
		var running = false;
		var scope = this;
		Object.keys( scope.workerLoaderPools ).forEach(
			function ( key ) {
				running |= scope.workerLoaderPools[ key ].isRunning();
			}
		);
		return running;
	},

	/**
	 * Process the instructionQueue until it is depleted.
	 */
	processQueue: function () {
		var scope = this;
		Object.keys( scope.workerLoaderPools ).forEach(
			function ( key ) {
				scope.workerLoaderPools[ key ].processQueue( scope );
			}
		);
	},

	_kickWorkerRun: function ( loadingTaskConfig, supportDesc ) {
		supportDesc.inUse = true;
		if ( this.logging.enabled ) console.info( '\nAssigning next item from queue to worker (queue length: ' + this.instructionQueue.length + ')\n\n' );

		var scope = this;
		var validator = scope.validator;
		var orgTaskOnComplete = loadingTaskConfig.callbacks.pipeline.onComplete;
		var wrapperOnComplete = function ( event ) {
			if ( validator.isValid( scope.globalCallbacks.onComplete ) ) scope.globalCallbacks.onComplete( event );
			if ( validator.isValid( orgTaskOnComplete ) ) orgTaskOnComplete( event );
			scope.objectsCompleted++;
			supportDesc.inUse = false;

			scope.processQueue();
		};

		var orgTaskOnMesh = loadingTaskConfig.callbacks.parse.onMesh;
		var wrapperOnMesh = function ( event, override ) {
			if ( validator.isValid( scope.globalCallbacks.onMesh ) ) override = scope.globalCallbacks.onMesh( event, override );
			if ( validator.isValid( orgTaskOnMesh ) ) override = orgTaskOnMesh( event, override );
			return override;
		};

		var orgTaskOnMaterials = loadingTaskConfig.callbacks.parse.onMaterials;
		var wrapperOnLoadMaterials = function ( materials ) {
			if ( validator.isValid( scope.globalCallbacks.onMaterials ) ) materials = scope.globalCallbacks.onMaterials( materials );
			if ( validator.isValid( orgTaskOnMaterials ) ) materials = orgTaskOnMaterials( materials );
			return materials;
		};

		var orgTaskOnReport = loadingTaskConfig.callbacks.app.onReport;
		var wrapperOnReport = function ( event ) {
			if ( validator.isValid( scope.globalCallbacks.onReport ) ) scope.globalCallbacks.onReport( event );
			if ( validator.isValid( orgTaskOnReport ) ) orgTaskOnReport( event );
		};

		var orgTaskOnReportError = loadingTaskConfig.callbacks.app.onReportError;
		var wrapperOnReportError = function ( errorMessage ) {
			var continueProcessing = true;
			if ( validator.isValid( scope.globalCallbacks.onReportError ) ) continueProcessing = scope.globalCallbacks.onReportError( supportDesc, errorMessage );
			if ( validator.isValid( orgTaskOnReportError ) ) continueProcessing = orgTaskOnReportError( supportDesc, errorMessage );

			if ( ! validator.isValid( scope.globalCallbacks.onReportError ) && ! validator.isValid( orgTaskOnReportError ) ) {

				console.error( 'Loader reported an error: ' );
				console.error( errorMessage );
			}

			if ( continueProcessing ) {

				supportDesc.inUse = false;
				scope.processQueue();

			}
		};

		loadingTaskConfig.config[ 'description' ] = 'WorkerLoader.Director.No' + this.instructionQueuePointer;
		loadingTaskConfig.config[ 'instanceNo' ] = supportDesc.instanceNo;
		loadingTaskConfig
			.setCallbacksApp( wrapperOnReport, wrapperOnReportError )
			.setCallbacksParsing( wrapperOnMesh, wrapperOnLoadMaterials )
			.setCallbacksPipeline( wrapperOnComplete );
		supportDesc.workerLoader.getLoadingTask()
			.execute( loadingTaskConfig, supportDesc.workerSupport );
	},

	_deregister: function ( supportDesc ) {
		if ( this.validator.isValid( supportDesc ) ) {

			if ( this.validator.isValid( supportDesc.workerLoader.loadingTask ) ) {

				supportDesc.workerSupport.setTerminateRequested( true );

				if ( this.logging.enabled ) console.info( 'Requested termination of worker #' + supportDesc.instanceNo + '.' );
				if ( this.validator.isValid( supportDesc.workerLoader.loadingTask.callbacks.app.onReport ) ) {

					supportDesc.workerLoader.loadingTask.callbacks.app.onReport( {
						detail: {
							text: ''
						}
					} );

				}
				delete this.workerLoaderPools[ supportDesc.extension ];

			}
		}
	},

	/**
	 * Terminate all workers.
	 */
	tearDown: function () {
		if ( this.logging.enabled ) console.info( 'Director received the deregister call. Terminating all workers!' );

		var scope = this;
		Object.keys( scope.workerLoaderPools ).forEach(
			function ( key ) {
				scope.workerLoaderPools[ key ].tearDown();
			}
		);
	}
};
