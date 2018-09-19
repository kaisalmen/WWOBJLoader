/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Workflow:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   tearDown (to force stop)
 *
 * @class
 */
THREE.WorkerLoader.Director = function () {
	console.info( 'Using THREE.WorkerLoader.Director version: ' + THREE.WorkerLoader.Director.WORKER_LOADER_DIRECTOR_VERSION );
	this.logging = {
		enabled: true,
		debug: false
	};

	this.validator = THREE.MeshTransfer.Validator;
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
THREE.WorkerLoader.Director.MAX_QUEUE_SIZE = 2048;


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

	createWorkerPool: function ( extension, maxQueueSize ) {
		var workerLoaderPool = this.workerLoaderPools[ extension ];
		if ( ! this.validator.isValid( workerLoaderPool ) ) {

			workerLoaderPool = new THREE.WorkerLoader.Director.Pool( this, extension, maxQueueSize );
			this.workerLoaderPools[ extension ] = workerLoaderPool;

		}
	},

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 *
	 */
	updateWorkerPool: function ( extension, maxWebWorkers ) {
		var workerLoaderPool = this.workerLoaderPools[ extension ];
		if ( this.validator.isValid( workerLoaderPool ) ) workerLoaderPool.init( maxWebWorkers );
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
	},

	_requestPoolDelete: function ( extenstion ) {
		delete this.workerLoaderPools[ extenstion ];
	}
};

/**
 *
 * @param directorRef
 * @param {string} [extension] Set the file extension
 * @param {number} [maxQueueSize] Set the maximum size of the instruction queue (1-2048)
 * @constructor
 */
THREE.WorkerLoader.Director.Pool = function ( directorRef, extension, maxQueueSize ) {
	this.directorRef = directorRef;
	this.extenstion = extension;
	this.maxQueueSize = THREE.MeshTransfer.Validator.verifyInput( maxQueueSize, THREE.WorkerLoader.Director.MAX_QUEUE_SIZE );
	this.maxWebWorkers = THREE.WorkerLoader.Director.MAX_WEB_WORKER;
	this.instructionQueue = [];
	this.instructionQueuePointer = 0;
	this.workerLoaders = {};
};


THREE.WorkerLoader.Director.Pool.prototype = {

	constructor: THREE.WorkerLoader.Director.Pool,

	getMaxWebWorkers: function () {
		return this.maxWebWorkers;
	},

	getMaxQueueSize: function () {
		return this.maxQueueSize;
	},

	isRunning: function () {
		var wsKeys = Object.keys( this.workerLoaders );
		return ( ( this.instructionQueue.length > 0 && this.instructionQueuePointer < this.instructionQueue.length ) || wsKeys.length > 0 );
	},

	/**

	 * @param {number} [maxWebWorkers] Set the maximum amount of workers (1-16)
	 * @returns {THREE.WorkerLoader.Director.Pool}
	 */
	init: function ( maxWebWorkers ) {
		var oldMaxWebWorkers = this.maxWebWorkers;
		this.maxWebWorkers = THREE.MeshTransfer.Validator.verifyInput( maxWebWorkers, THREE.WorkerLoader.Director.MAX_WEB_WORKER );
		this.maxWebWorkers = Math.min( this.maxWebWorkers, this.maxQueueSize );

		var workerSupport, supportDesc;
/*
		if ( oldMaxWebWorkers > this.maxWebWorkers ) {

			for ( var instanceNo = this.maxWebWorkers; instanceNo < oldMaxWebWorkers; instanceNo++ ) {

				supportDesc = this.workerLoaders[ instanceNo ];
				if ( this.directorRef.validator.isValid( supportDesc ) ) {

					this._deregister( supportDesc );

				}

			}

		}
*/
		for ( var instanceNo = 0; instanceNo < this.maxWebWorkers; instanceNo++ ) {

			supportDesc = this.workerLoaders[ instanceNo ];
			if ( ! this.directorRef.validator.isValid( supportDesc ) ) {

				workerSupport = new THREE.WorkerLoader.WorkerSupport()
					.setForceWorkerDataCopy( this.directorRef.forceWorkerDataCopy )
					.setTerminateWorkerOnLoad( false );
				var supportDesc = {
					instanceNo: instanceNo,
					inUse: false,
					workerLoader: new THREE.WorkerLoader(),
					workerSupport: workerSupport
				};
				this.workerLoaders[ instanceNo ] = supportDesc;

			}

		}
		return this;
	},

	enqueueForRun: function ( loadingTaskConfig ) {
		var overallNo = this.instructionQueue.length;
		if ( overallNo < this.maxQueueSize ) this.instructionQueue.push( loadingTaskConfig );
	},

	processQueue: function () {
		var loadingTaskConfig, supportDesc;
		for ( var instanceNo in this.workerLoaders ) {

			supportDesc = this.workerLoaders[ instanceNo ];
			if ( ! supportDesc.inUse ) {

				if ( this.instructionQueuePointer < this.instructionQueue.length ) {

					loadingTaskConfig = this.instructionQueue[ this.instructionQueuePointer ];
					this._kickWorkerRun( loadingTaskConfig, supportDesc );
					this.instructionQueuePointer++;

				} else {

					this._deregister( supportDesc );

				}

			}

		}
		if ( ! this.isRunning() ) {

			this.directorRef._requestPoolDelete( this.extension );
			if ( this.directorRef.validator.isValid( this.directorRef.globalCallbacks.onQueueComplete ) ) this.directorRef.globalCallbacks.onQueueComplete();

		}
	},

	_kickWorkerRun: function ( loadingTaskConfig, supportDesc ) {
		supportDesc.inUse = true;
		if ( this.directorRef.logging.enabled ) console.info( '\nAssigning next item from queue to worker (queue length: ' + this.instructionQueue.length + ')\n\n' );

		var scope = this;
		var directorRef = this.directorRef;
		var validator = this.directorRef.validator;
		var orgTaskOnComplete = loadingTaskConfig.callbacks.pipeline.onComplete;
		var wrapperOnComplete = function ( event ) {
			if ( validator.isValid( directorRef.globalCallbacks.onComplete ) ) directorRef.globalCallbacks.onComplete( event );
			if ( validator.isValid( orgTaskOnComplete ) ) orgTaskOnComplete( event );
			directorRef.objectsCompleted++;
			supportDesc.inUse = false;
			if ( supportDesc.instanceNo < scope.maxWebWorkers ) {

				scope.processQueue();

			} else {

				scope._deregister( supportDesc );

			}
		};

		var orgTaskOnMesh = loadingTaskConfig.callbacks.parse.onMesh;
		var wrapperOnMesh = function ( event, override ) {
			if ( validator.isValid( directorRef.globalCallbacks.onMesh ) ) override = directorRef.globalCallbacks.onMesh( event, override );
			if ( validator.isValid( orgTaskOnMesh ) ) override = orgTaskOnMesh( event, override );
			return override;
		};

		var orgTaskOnMaterials = loadingTaskConfig.callbacks.parse.onMaterials;
		var wrapperOnLoadMaterials = function ( materials ) {
			if ( validator.isValid( directorRef.globalCallbacks.onMaterials ) ) materials = directorRef.globalCallbacks.onMaterials( materials );
			if ( validator.isValid( orgTaskOnMaterials ) ) materials = orgTaskOnMaterials( materials );
			return materials;
		};

		var orgTaskOnReport = loadingTaskConfig.callbacks.app.onReport;
		var wrapperOnReport = function ( event ) {
			if ( validator.isValid( directorRef.globalCallbacks.onReport ) ) directorRef.globalCallbacks.onReport( event );
			if ( validator.isValid( orgTaskOnReport ) ) orgTaskOnReport( event );
		};

		var orgTaskOnReportError = loadingTaskConfig.callbacks.app.onReportError;
		var wrapperOnReportError = function ( errorMessage ) {
			var continueProcessing = true;
			if ( validator.isValid( directorRef.globalCallbacks.onReportError ) ) continueProcessing = directorRef.globalCallbacks.onReportError( supportDesc, errorMessage );
			if ( validator.isValid( orgTaskOnReportError ) ) continueProcessing = orgTaskOnReportError( supportDesc, errorMessage );

			if ( ! validator.isValid( directorRef.globalCallbacks.onReportError ) && ! validator.isValid( orgTaskOnReportError ) ) {

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
		supportDesc.workerLoader.executeLoadingTaskConfig( loadingTaskConfig, supportDesc.workerSupport );
	},

	_deregister: function ( supportDesc ) {
		if ( this.directorRef.validator.isValid( supportDesc ) ) {

			if ( this.directorRef.validator.isValid( supportDesc.workerLoader.loadingTask ) ) {

				var instanceNo = supportDesc.instanceNo;
				supportDesc.workerSupport.setTerminateWorkerOnLoad( true );
				if ( this.directorRef.logging.enabled ) console.info( 'Requested termination of worker #' + instanceNo + '.' );
				if ( this.directorRef.validator.isValid( supportDesc.workerLoader.loadingTask.callbacks.app.onReport ) ) {

					supportDesc.workerLoader.loadingTask.callbacks.app.onReport( {
						detail: {
							text: ''
						}
					} );

				}
				if ( ! supportDesc.inUse ) delete this.workerLoaders[ supportDesc.instanceNo ];

			}
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
