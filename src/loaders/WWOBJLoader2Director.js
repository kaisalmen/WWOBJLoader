THREE.OBJLoader2.WWOBJLoader2Director = (function () {

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 1024;

	function WWOBJLoader2Director() {
		this.maxQueueSize = MAX_QUEUE_SIZE ;
		this.maxWebWorkers = MAX_WEB_WORKER;

		this.workerDescription = {
			bound: false,
			prototypeDef: null,
			webWorkerName: null,
			callbacks: {},
			webWorkers: [],
			codeBuffer: null
		};
		this.objectsCompleted = 0;
		this.instructionQueue = [];
	}

	WWOBJLoader2Director.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	WWOBJLoader2Director.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	WWOBJLoader2Director.prototype.register = function ( prototypeDef, webWorkerName, callbacks ) {
		if ( this.workerDescription.bound ) return;
		this.workerDescription.bound = true;
		this.workerDescription.prototypeDef = prototypeDef;
		this.workerDescription.webWorkerName = webWorkerName;

		if ( callbacks != null ) {

			for ( var key in callbacks ) {

				if ( callbacks.hasOwnProperty( key ) ) this.workerDescription.callbacks[ key ] = callbacks[ key ];

			}

		}
	};

	WWOBJLoader2Director.prototype.validate = function ( maxQueueSize, maxWebWorkers ) {
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
				webWorker.setRequestTerminate();

				this.workerDescription.webWorkers.pop();

			}

		}
	};

	WWOBJLoader2Director.prototype.enqueueForRun = function ( runParams ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( runParams );
		}
	};

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
		webWorker._init( this.workerDescription.webWorkerName );

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
		var managerCompletedLoading = function ( webWorkerName, modelName, instanceNo, requestTerminate ) {
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

	WWOBJLoader2Director.prototype.unregister = function () {
		console.log( 'WWOBJLoader2Director received the unregister call. Terminating all workers!' );
		for ( var i = 0, webWorker, length = this.workerDescription.webWorkers.length; i < length; i++ ) {

			webWorker = this.workerDescription.webWorkers[ i ];
			webWorker.setRequestTerminate();

		}
		this.workerDescription.bound = false;
		this.workerDescription.prototypeDef = null;
		this.workerDescription.webWorkerName = null;
		this.workerDescription.callbacks = {};
		this.workerDescription.webWorkers = [];
		this.workerDescription.codeBuffer = null;
	};

	return WWOBJLoader2Director;

})();
