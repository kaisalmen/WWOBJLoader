/**
 * Template class for all web worker based loaders that shall be directed.
 * {@link THREE.LoaderSupport.WW.LoaderDirector} checks for available methods
 *
 * @class
 */
THREE.LoaderSupport.WW.DirectableLoader = (function () {

	function DirectableLoader() {
	}

	/**
	 * Call requestTerminate to terminate the web worker and free local resource after execution.
	 *
	 * @param {boolean} requestTerminate True or false
	 * @private
	 */
	DirectableLoader.prototype.setRequestTerminate = function ( requestTerminate ) {
	};

	/**
	 * Set the worker instanceNo
	 *
	 * @param {number} instanceNo
	 * @private
	 */
	DirectableLoader.prototype.setInstanceNo = function ( instanceNo ) {
		console.log( 'Value of "instanceNo": ' + instanceNo );
	};

	/**
	 * Get the worker instanceNo
	 *
	 * @returns {number|*}
	 * @private
	 */
	DirectableLoader.prototype.getInstanceNo = function () {
	};

	/**
	 * Initialise object
	 *
	 * @param {boolean} reInit
	 * @param {THREE.LoadingManager} manager
	 * @private
	 */
	DirectableLoader.prototype.init = function ( reInit, manager) {
		console.log( 'Value of "reInit": ' + reInit );
		console.log( 'Value of "manager": ' + manager );
	};

	/**
	 * Function is called by {@link THREE.LoaderSupport.WW.MeshProvider} when worker is constructed.
	 *
	 * @param {string} funcBuildObject
	 * @param {string} funcBuildSingelton
	 * @param {string} existingWorkerCode
	 * @private
	 */
	DirectableLoader.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		console.log( 'Value of "funcBuildObject": ' + funcBuildObject );
		console.log( 'Value of "funcBuildSingelton": ' + funcBuildSingelton );
		console.log( 'Value of "existingWorkerCode": ' + existingWorkerCode );
	};

	/**
	 * Run the loader according the instruction provided. This needs to be overridden.
	 * @memberOf THREE.LoaderSupport.WW.DirectableLoader
	 *
	 * @param {Object} params {@link THREE.LoaderSupport.WW.PrepData}
	 * @private
	 */
	DirectableLoader.prototype.run = function ( prepData ) {
		console.log( 'Value of "prepData": ' + prepData );
	};

	/**
	 * Finalize run
	 *
	 * @param {string} reason
	 * @private
	 */
	DirectableLoader.prototype._finalize = function ( reason ) {
		console.log( 'Value of "reason": ' + reason );
	};

	return DirectableLoader;
})();

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
THREE.LoaderSupport.WW.LoaderDirector = (function () {

	var WW_LOADER_DIRECTOR_VERSION = '1.0.0-dev';

	var Validator = THREE.LoaderSupport.Validator;

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 8192;

	function LoaderDirector( classDef ) {
		console.log( "Using THREE.LoaderSupport.WW.LoaderDirector version: " + WW_LOADER_DIRECTOR_VERSION );

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
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
	 *
	 * @returns {number}
	 */
	LoaderDirector.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	/**
	 * Returns the maximum number of workers.
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
	 *
	 * @returns {number}
	 */
	LoaderDirector.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
	 *
	 * @param {string} crossOrigin CORS value
	 */
	LoaderDirector.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
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
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
	 *
	 * @param {Object} prepData Either {@link THREE.LoaderSupport.PrepData}
	 */
	LoaderDirector.prototype.enqueueForRun = function ( prepData ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( prepData );
		}
	};

	/**
	 * Process the instructionQueue until it is depleted.
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
	 */
	LoaderDirector.prototype.processQueue = function () {
		if ( this.instructionQueue.length === 0 ) return;

		var length = Math.min( this.maxWebWorkers, this.instructionQueue.length );
		for ( var i = 0; i < length; i++ ) {

			this._kickWorkerRun( this.workerDescription.workers[ i ], this.instructionQueue[ 0 ], i );
			this.instructionQueue.shift();

		}
	};

	LoaderDirector.prototype._kickWorkerRun = function( worker, prepData, instanceNo ) {
		worker.init();
		worker.setInstanceNo( instanceNo );

		var scope = this;
		var workerCallbacks = worker.getCallbacks();
		var prepDataCallbacks = prepData.getCallbacks();
		var globalCallbacks = this.workerDescription.globalCallbacks;

		var directorOnLoad = function ( sceneGraphBaseNode, modelName, instanceNo ) {
			scope.objectsCompleted++;

			var worker = scope.workerDescription.workers[ instanceNo ];
			var nextPrepData = scope.instructionQueue[ 0 ];
			if ( Validator.isValid( nextPrepData ) ) {

				console.log( '\nAssigning next item from queue to worker (queue length: ' + scope.instructionQueue.length + ')\n\n' );
				scope._kickWorkerRun( worker, nextPrepData, worker.getInstanceNo() );
				scope.instructionQueue.shift();

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

		var wrapperOnError = function ( event ) {
			if ( Validator.isValid( globalCallbacks.onError ) ) {

				globalCallbacks.onError( event );
			}

			if ( Validator.isValid( prepDataCallbacks.onError ) ) {

				prepDataCallbacks.onError( event );

			}
		};

		var wrapperOnProgress = function ( content, modelName, instanceNo ) {
			if ( Validator.isValid( globalCallbacks.onProgress ) ) {

				globalCallbacks.onProgress( content, modelName, instanceNo );
			}

			if ( Validator.isValid( prepDataCallbacks.onProgress ) ) {

				prepDataCallbacks.onProgress( content, modelName, instanceNo );

			}
		};

		var wrapperOnMeshLoaded = function ( meshName, bufferGeometry, material, message ) {
			if ( Validator.isValid( globalCallbacks.onMeshLoaded ) ) {

				globalCallbacks.onMeshLoaded( meshName, bufferGeometry, material, message );
			}

			if ( Validator.isValid( prepDataCallbacks.onMeshLoaded ) ) {

				prepDataCallbacks.onMeshLoaded( meshName, bufferGeometry, material, message );

			}
		};

		workerCallbacks.setCallbackOnLoad( wrapperOnLoad );
		workerCallbacks.setCallbackOnError( wrapperOnError );
		workerCallbacks.setCallbackOnProgress( wrapperOnProgress );
		workerCallbacks.setCallbackOnMeshLoaded( wrapperOnMeshLoaded );

		worker.run( prepData );
	};

	LoaderDirector.prototype._buildWorker = function () {
		var worker = Object.create( this.workerDescription.classDef.prototype );
		this.workerDescription.classDef.call( worker );

		// verify that all required functions defined by "THREE.LoaderSupport.WW.DirectableLoader" are implemented
		if ( worker.hasOwnProperty( 'setRequestTerminate' ) && typeof worker.setRequestTerminate !== 'function'  ) throw classDef + ' has no function "setRequestTerminate".';
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
	 * @memberOf THREE.LoaderSupport.WW.LoaderDirector
	 */
	LoaderDirector.prototype.deregister = function () {
		console.log( 'LoaderDirector received the deregister call. Terminating all workers!' );

		for ( var i = 0, worker, length = this.workerDescription.workers.length; i < length; i++ ) {

			worker = this.workerDescription.workers[ i ];
			worker.setRequestTerminate( true );

			if ( ! worker.meshProvider.running ) {
				console.log( 'Triggered finalize with "termiante" directly.' );
				worker._finalize( 'terminate' );
			}

			var workerCallbacks = worker.getCallbacks();
			if ( Validator.isValid( workerCallbacks.onProgress ) ) workerCallbacks.onProgress( '' );

		}

		this.workerDescription.workers = [];
		this.instructionQueue = [];
	};

	return LoaderDirector;

})();
