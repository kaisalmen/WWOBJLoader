var _require = eval('require'); //Work around webpack builds failing with NodeJS requires

/**
 * This class provides the NodeJS implementation of the WorkerRunnerRefImpl
 * @class
 * @extends THREE.LoaderSupport.WorkerRunnerRefImpl
 */
THREE.LoaderSupport.NodeWorkerRunnerRefImpl = (function(){
	function NodeWorkerRunnerRefImpl(){
		//No call to super because super class only binds to processMessage
		//In NodeJS, there is no addEventListener so use onmessage.
		//Also, the message object can be passed directly to
		//processMessage() as it isn't an `Event`, but a plain object
		//with the data
		this.getParentScope().onmessage = this.processMessage(this);
	}
	//Inherit from WorkerRunnerRefImpl
	Object.setPrototypeOf(NodeWorkerRunnerRefImpl.prototype,
		THREE.LoaderSupport.WorkerRunnerRefImpl);

	/**
	 * @inheritdoc
	 * @memberOf THREE.LoaderSupport.NodeWorkerRunnerRefImpl
	 * 
	 * @returns {MessagePort} NodeJS object that's similar to
	 * GlobalWorkerScope
	 */
	NodeWorkerRunnerRefImpl.prototype.getParentScope = function(){
		return _require("worker_threads").parentPort;
	}

	return NodeWorkerRunnerRefImpl;
})();

/**
 * This class provides the NodeJS implementation of LoaderWorker
 * @class
 * @extends THREE.LoaderSupport.LoaderWorker
 */
THREE.LoaderSupport.NodeLoaderWorker = (function(){
	function NodeLoaderWorker(){
		LoaderWorker.call(this); //call super class
	}
	//Inherit from LoaderWorker
	Object.setPrototypeOf(NodeLoaderWorker.prototype, LoaderWorker);

	/**
	 * @inheritdoc
	 * @memberOf THREE.LoaderSupport.NodeLoaderWorker
	 */
	NodeLoaderWorker.checkSupport = function() {
		try {
			_require.resolve("worker_threads");
		}
		catch(e) {
			return "This version of Node does not support web workers!";
		}
	}

	/**
	 * @inheritdoc
	 * @memberOf THREE.LoaderSupport.NodeLoaderWorker
	 */
	NodeLoaderWorker.prototype.initWorker = function ( code, runnerImplName ) {
		var supportError = NodeLoaderWorker.checkSupport();
		if(supportError) {
			throw supportError;
		}
			
		this.runnerImplName = runnerImplName;

		var Worker = _require("worker_threads").Worker;
		this.worker = new Worker(code, {eval: true});

		this.worker.onmessage = this._receiveWorkerMessage;

		// set referemce to this, then processing in worker scope within "_receiveWorkerMessage" can access members
		this.worker.runtimeRef = this;

		// process stored queuedMessage
		this._postMessage();
	}

	return NodeLoaderWorker;
})();