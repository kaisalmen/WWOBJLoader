/**
 * This class provides the NodeJS implementation of the WorkerRunnerRefImpl
 * @class
 * @extends THREE.LoaderSupport.WorkerRunnerRefImpl
 */
THREE.LoaderSupport.NodeWorkerRunnerRefImpl = function () {
	this.runnerName = 'THREE.LoaderSupport.NodeWorkerRunnerRefImpl';
	// No call to super because super class only binds to processMessage
	// In NodeJS, there is no addEventListener so use onmessage.
	// Also, the message object can be passed directly to
	// processMessage() as it isn't an `Event`, but a plain object
	// with the data
	this.getParentScope().onmessage = this.processMessage.bind( this );
};

THREE.LoaderSupport.NodeWorkerRunnerRefImpl.prototype = Object.create( THREE.LoaderSupport.WorkerRunnerRefImpl.prototype );
THREE.LoaderSupport.NodeWorkerRunnerRefImpl.prototype.constructor = THREE.LoaderSupport.NodeWorkerRunnerRefImpl;
THREE.LoaderSupport.NodeWorkerRunnerRefImpl.runnerName = 'THREE.LoaderSupport.NodeWorkerRunnerRefImpl';

THREE.LoaderSupport.NodeWorkerRunnerRefImpl.prototype = {

	getParentScope: function(){
		// Work around webpack builds failing with NodeJS requires
		// (placing it outside this function will fail because
		// this class is passed to the worker as a string!)
		var _require = eval( 'require' );
		return _require( 'worker_threads' ).parentPort;
	}
};


/**
 * This class provides the NodeJS implementation of LoaderWorker
 * @class
 * @extends LoaderWorker
 */
THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker = function (){
	THREE.LoaderSupport.WorkerSupport.LoaderWorker.call( this );
};

THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker.prototype = Object.create( THREE.LoaderSupport.WorkerSupport.LoaderWorker.prototype );
THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker.prototype.constructor = THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker;

/**
 * @inheritdoc
  */
THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker.checkSupport = function() {
	try {
		// Work around webpack builds failing with NodeJS requires
		var _require = eval( 'require' );
		_require.resolve( 'worker_threads' );
	}
	catch(e) {
		return 'This version of Node does not support web workers!';
	}
};

/**
 * @inheritdoc
 */
THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker.prototype.initWorker = function ( code, runnerImplName ) {
	var supportError = this.checkSupport();
	if( supportError ) {

		throw supportError;

	}
	this.runnerImplName = runnerImplName;

	// Work around webpack builds failing with NodeJS requires
	var _require = eval( 'require' );
	var Worker = _require( 'worker_threads' ).Worker;
	this.worker = new Worker( code, { eval: true } );

	this.worker.onmessage = this._receiveWorkerMessage;

	// set referemce to this, then processing in worker scope within "_receiveWorkerMessage" can access members
	this.worker.runtimeRef = this;

	// process stored queuedMessage
	this._postMessage();
};
