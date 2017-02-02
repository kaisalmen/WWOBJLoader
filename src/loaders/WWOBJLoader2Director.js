/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Use:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   deregister
 *
 * @class
 */
THREE.OBJLoader2.WWOBJLoader2Director = (function () {

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 1024;

	function WWOBJLoader2Director() {
		this.maxQueueSize = MAX_QUEUE_SIZE ;
		this.maxWebWorkers = MAX_WEB_WORKER;
		this.crossOrigin = null;

		this.workerDescription = {
			prototypeDef: THREE.OBJLoader2.WWOBJLoader2.prototype,
			callbacks: {},
			webWorkers: [],
			codeBuffer: null
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
	 * @param {callback[]} callbacks Register callbacks for all web workers:
	 * 		{ progress: null, completedLoading: null, errorWhileLoading: null, materialsLoaded: null, meshLoaded: null }
	 * @param {number} maxQueueSize Set the maximum size of the instruction queue (1-1024)
	 * @param {number} maxWebWorkers Set the maximum amount of workers (1-16)
	 */
	WWOBJLoader2Director.prototype.prepareWorkers = function ( callbacks, maxQueueSize, maxWebWorkers ) {
		if ( callbacks != null ) {

			for ( var key in callbacks ) {

				if ( callbacks.hasOwnProperty( key ) ) this.workerDescription.callbacks[ key ] = callbacks[ key ];

			}

		}

		this.maxQueueSize = Math.min( maxQueueSize, MAX_QUEUE_SIZE );
		this.maxWebWorkers = Math.min( maxWebWorkers, MAX_WEB_WORKER );
		this.objectsCompleted = 0;
		this.instructionQueue = [];

		var start = this.workerDescription.webWorkers.length;
		if ( start < this.maxWebWorkers ) {

			for ( i = start; i < this.maxWebWorkers; i ++ ) {

				webWorker = this._buildWebWorker();
				this.workerDescription.webWorkers[ i ] = webWorker;

			}

		} else {

			for ( var webWorker, i = start - 1; i >= this.maxWebWorkers; i-- ) {

				webWorker = this.workerDescription.webWorkers[ i ];
				webWorker.setRequestTerminate( true );

				this.workerDescription.webWorkers.pop();

			}

		}
	};

	/**
	 * Store run instructions in internal instructionQueue
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 *
	 * @param {Object} params Either {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer} or {@link THREE.OBJLoader2.WWOBJLoader2.PrepDataFile}
	 */
	WWOBJLoader2Director.prototype.enqueueForRun = function ( runParams ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( runParams );
		}
	};

	/**
	 * Process the instructionQueue until it is depleted
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 */
	WWOBJLoader2Director.prototype.processQueue = function () {
		if ( this.instructionQueue.length === 0 ) return;

		var webWorker;
		var runParams;
		var length = Math.min( this.maxWebWorkers, this.instructionQueue.length );
		for ( var i = 0; i < length; i++ ) {

			webWorker = this.workerDescription.webWorkers[ i ];
			runParams = this.instructionQueue[ 0 ];
			webWorker.prepareRun( runParams );
			webWorker.run();
			this.instructionQueue.shift();

		}
	};

	WWOBJLoader2Director.prototype._buildWebWorker = function () {
		var webWorker = Object.create( this.workerDescription.prototypeDef );
		webWorker._init();
		if ( this.crossOrigin != null )	webWorker.setCrossOrigin( this.crossOrigin );

		// Ensure code string is built once and then it is just passed on to every new instance
		if ( this.workerDescription.codeBuffer == null ) {

			this.workerDescription.codeBuffer = webWorker._buildWebWorkerCode();

		} else {

			webWorker._buildWebWorkerCode( this.workerDescription.codeBuffer );

		}
		for ( var key in this.workerDescription.callbacks ) {

			if ( webWorker.callbacks.hasOwnProperty( key ) && this.workerDescription.callbacks.hasOwnProperty( key ) ) {

				webWorker.callbacks[ key ] = this.workerDescription.callbacks[ key ];

			}

		}
		var scope = this;
		var managerCompletedLoading = function ( modelName, instanceNo, requestTerminate ) {
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

	/**
	 * Terminate all workers
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2Director
	 */
	WWOBJLoader2Director.prototype.deregister = function () {
		console.log( 'WWOBJLoader2Director received the unregister call. Terminating all workers!' );
		for ( var i = 0, webWorker, length = this.workerDescription.webWorkers.length; i < length; i++ ) {

			webWorker = this.workerDescription.webWorkers[ i ];
			webWorker.setRequestTerminate( true );

		}
		this.workerDescription.callbacks = {};
		this.workerDescription.webWorkers = [];
		this.workerDescription.codeBuffer = null;
	};

	return WWOBJLoader2Director;

})();
