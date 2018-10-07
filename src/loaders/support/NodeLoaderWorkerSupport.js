/**
 * This class provides the NodeJS implementation of the WorkerRunnerRefImpl
 * @class
 * @extends THREE.LoaderSupport.WorkerRunnerRefImpl
 */
THREE.LoaderSupport.NodeWorkerRunnerRefImpl = ( function(){

	function NodeWorkerRunnerRefImpl () {
		//No call to super because super class only binds to processMessage
		//In NodeJS, there is no addEventListener so use onmessage.
		//Also, the message object can be passed directly to
		//processMessage() as it isn't an `Event`, but a plain object
		//with the data
		this.getParentScope().onmessage = this.processMessage.bind( this );
	}
	//Inherit from WorkerRunnerRefImpl
	Object.setPrototypeOf( NodeWorkerRunnerRefImpl.prototype, THREE.LoaderSupport.WorkerRunnerRefImpl.prototype );

	/**
	 * @inheritdoc
	 * @memberOf THREE.LoaderSupport.NodeWorkerRunnerRefImpl
	 *
	 * @returns {MessagePort} NodeJS object that's similar to
	 * GlobalWorkerScope
	 */
	NodeWorkerRunnerRefImpl.prototype.getParentScope = function(){
		//Work around webpack builds failing with NodeJS requires
		//(placing it outside this function will fail because
		//this class is passed to the worker as a string!)
		var _require = eval( 'require' );
		return _require( 'worker_threads' ).parentPort;
	};

	return NodeWorkerRunnerRefImpl;
})();

