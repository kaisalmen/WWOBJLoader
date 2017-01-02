THREE.WebWorker.WWLoaderDirector = (function () {

	var MAX_WEB_WORKER = 16;
	var MAX_QUEUE_SIZE = 1024;

	function WWLoaderDirector( maxQueueSize, maxWebWorkers ) {
		this.maxQueueSize = Math.min( maxQueueSize, MAX_QUEUE_SIZE );
		this.maxWebWorkers = Math.min( maxWebWorkers, MAX_WEB_WORKER );

		this.workerDescription = {
			bound: false,
			prototypeDef: null,
			globalParams: null,
			callbacks: {},
			webWorkers: []
		};
		this.objectsCompleted = 0;
		this.instructionQueue = [];
	}

	WWLoaderDirector.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	WWLoaderDirector.prototype.getMaxWebWorkers = function () {
		return this.maxWebWorkers;
	};

	WWLoaderDirector.prototype.validate = function ( maxQueueSize, maxWebWorkers ) {
		this.maxQueueSize = Math.min( maxQueueSize, MAX_QUEUE_SIZE );
		this.maxWebWorkers = Math.min( maxWebWorkers, MAX_WEB_WORKER );
		this.objectsCompleted = 0;
		this.instructionQueue = [];

		var start = this.workerDescription.webWorkers.length;
		if ( start < this.maxWebWorkers ) {

			for ( i = start; i < this.maxWebWorkers; i ++ ) {

				webWorker = this.buildWebWorker();
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

	WWLoaderDirector.prototype.register = function ( prototypeDef, globalParams, callbacks ) {
		if ( this.workerDescription.bound ) return;
		this.workerDescription.bound = true;
		this.workerDescription.prototypeDef = prototypeDef;
		this.workerDescription.globalParams = globalParams;

		if ( callbacks != null ) {

			for ( var key in callbacks ) {

				if ( callbacks.hasOwnProperty( key ) ) this.workerDescription.callbacks[ key ] = callbacks[ key ];

			}

		}
	};

	WWLoaderDirector.prototype.buildWebWorker = function () {
		var webWorker = Object.create( this.workerDescription.prototypeDef );
		webWorker.init( this.workerDescription.globalParams );

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

	WWLoaderDirector.prototype.unregister = function () {
		console.log( 'WWLoaderDirector received the unregister call. Terminating all workers!' );
		for ( var i = 0, webWorker, length = this.workerDescription.webWorkers.length; i < length; i++ ) {

			webWorker = this.workerDescription.webWorkers[ i ];
			webWorker.setRequestTerminate();

		}
		this.workerDescription.bound = false;
		this.workerDescription.prototypeDef = null;
		this.workerDescription.globalParams = null;
		this.workerDescription.callbacks = {};
		this.workerDescription.webWorkers = [];
	};

	WWLoaderDirector.prototype.enqueueForRun = function ( runParams ) {
		if ( this.instructionQueue.length < this.maxQueueSize ) {
			this.instructionQueue.push( runParams );
		}
	};

	WWLoaderDirector.prototype.processQueue = function () {
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

	return WWLoaderDirector;

})();
