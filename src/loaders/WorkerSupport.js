/**
 * @author Kai Salmen / www.kaisalmen.de
 */
//if ( ! THREE.WorkerLoader ) { THREE.WorkerLoader = {} }

/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 */
THREE.WorkerSupport = function () {
	// check worker support first
	if ( window.Worker === undefined ) throw "This browser does not support web workers!";
	if ( window.Blob === undefined ) throw "This browser does not support Blob!";
	if ( typeof window.URL.createObjectURL !== 'function' ) throw "This browser does not support Object creation from URL!";

	this._reset();
};
THREE.WorkerSupport.WORKER_SUPPORT_VERSION = '3.0.0-preview';

THREE.WorkerSupport.prototype = {

	constructor: THREE.WorkerSupport,

	printVersion: function() {
		console.info( 'Using THREE.WorkerSupport version: ' + THREE.WorkerSupport.WORKER_SUPPORT_VERSION );
	},

	_reset: function () {
		this.logging = {
			enabled: true,
			debug: false
		};

		var scope = this;
		var scopeTerminate = function (  ) {
			scope._terminate();
		};
		this.worker = {
			native: null,
			logging: true,
			workerRunner: {
				haveUserImpl: false,
				name: 'THREE.WorkerSupport.WorkerRunner',
				impl: THREE.WorkerSupport.WorkerRunner,
				parserName: null,
				usesMeshDisassembler: null,
				defaultGeometryType: null
			},
			terminateWorkerOnLoad: false,
			forceWorkerDataCopy: false,
			started: false,
			queuedMessage: null,
			callbacks: {
				onAssetAvailable: null,
				onLoad: null,
				terminate: scopeTerminate
			}
		};
	},

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.worker.logging = enabled === true;
		return this;
	},

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 */
	setForceWorkerDataCopy: function ( forceWorkerDataCopy ) {
		this.worker.forceWorkerDataCopy = forceWorkerDataCopy === true;
		return this;
	},

	/**
	 * Request termination of worker once parser is finished.
	 *
	 * @param {boolean} terminateWorkerOnLoad True or false.
	 */
	setTerminateWorkerOnLoad: function ( terminateWorkerOnLoad ) {
		this.worker.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
		if ( this.worker.terminateWorkerOnLoad && THREE.MeshTransfer.Validator.isValid( this.worker.native ) &&
			! THREE.MeshTransfer.Validator.isValid( this.worker.queuedMessage ) && this.worker.started ) {

			if ( this.logging.enabled ) console.info( 'Worker is terminated immediately as it is not running!' );
			this._terminate();

		}
		return this;
	},

	/**
	 * Set a user-defined runner embedding the worker code and  handling communication and execution with main.
	 *
	 * @param {object} userRunnerImpl The object reference
	 * @param {string} userRunnerImplName The name of the object
	 */
	setUserRunnerImpl: function ( userRunnerImpl, userRunnerImplName ) {
		if ( THREE.MeshTransfer.Validator.isValid( userRunnerImpl ) && THREE.MeshTransfer.Validator.isValid( userRunnerImplName ) ) {

			this.worker.workerRunner.haveUserImpl = true;
			this.worker.workerRunner.impl = userRunnerImpl;
			this.worker.workerRunner.name = userRunnerImplName;
			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using "' + userRunnerImplName + '" as Runner class for worker.' );

		}
		return this;
	},

	/**
	 * Update all callbacks.
	 *
	 * @param {Function} onAssetAvailable The function for processing the data, e.g. {@link THREE.MeshTransfer.MeshReceiver}.
	 * @param {Function} [onLoad] The function that is called when parsing is complete.
	 */
	updateCallbacks: function ( onAssetAvailable, onLoad ) {
		this.worker.callbacks.onAssetAvailable = THREE.MeshTransfer.Validator.verifyInput( onAssetAvailable, this.worker.callbacks.onAssetAvailable );
		this.worker.callbacks.onLoad = THREE.MeshTransfer.Validator.verifyInput( onLoad, this.worker.callbacks.onLoad );
		this._verifyCallbacks();
	},

	_verifyCallbacks: function () {
		if ( ! THREE.MeshTransfer.Validator.isValid( this.worker.callbacks.onAssetAvailable ) ) throw 'Unable to run as no "onAssetAvailable" callback is set.';
	},

	/**
	 * Validate the status of worker code and the derived worker and specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 *
	 * @param {Function} buildWorkerCode The function that is invoked to create the worker code of the parser.
	 */
	validate: function ( loaderRef, buildWorkerCode, containFileLoadingCode ) {
		if ( THREE.MeshTransfer.Validator.isValid( this.worker.native ) ) return;
		if ( this.logging.enabled ) {

			console.info( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );
			if ( ! this.worker.workerRunner.haveUserImpl ) console.info( 'WorkerSupport: Using DEFAULT "' + this.worker.workerRunner.name + '" as Runner class for worker.' );

		}
		var codeBuilderInstructions;
		if ( buildWorkerCode === undefined || buildWorkerCode === null ) {

			codeBuilderInstructions = new THREE.WorkerSupport.CodeBuilderIntructions( 'Parser', false );

		} else {

			codeBuilderInstructions = buildWorkerCode( THREE.CodeSerializer, loaderRef );

		}

		var codeParserRef = 'if ( ! THREE.WorkerSupport ) { THREE.WorkerSupport = {} };\n\nTHREE.WorkerSupport.Parser = ' + codeBuilderInstructions.parserName + ';\n\n'
		codeBuilderInstructions.addCodeFragment( codeParserRef );
		codeBuilderInstructions.addLibrary( 'src/loaders/worker/WorkerRunner.js', '../../' );
		codeBuilderInstructions.addCodeFragment( 'new ' + this.worker.workerRunner.name + '();\n\n' );

		if ( codeBuilderInstructions.containsMeshDisassembler === true || codeBuilderInstructions.usesMeshDisassembler === true ) {

			console.warn( 'Feature \"containsMeshDisassembler\" is currently not available!' );
//			extraCode += 'THREE.MeshTransfer = {};\n\n';
//			extraCode += THREE.CodeSerializer.serializeClass( 'THREE.MeshTransfer.MeshTransmitter', THREE.MeshTransfer.MeshTransmitter );

		}
		if ( containFileLoadingCode ) {

			console.warn( 'Feature \"containFileLoadingCode\" is currently not available!' );

			if ( ! codeBuilderInstructions.providesThree ) {
/*
				userWorkerCode += 'var loading = {};\n\n';
				userWorkerCode += THREE.CodeSerializer.serializeObject( 'THREE.Cache', THREE.Cache );
				userWorkerCode += THREE.DefaultLoadingManager.constructor.toString();
				userWorkerCode += 'var DefaultLoadingManager = new LoadingManager();\n\n';
				userWorkerCode += 'var Cache = THREE.Cache;\n\n';
				userWorkerCode += THREE.CodeSerializer.serializeClass( 'THREE.FileLoader', THREE.FileLoader, 'FileLoader' );
*/
			}
//			userWorkerCode += THREE.CodeSerializer.serializeClass( 'THREE.WorkerLoader.ResourceDescriptor', THREE.WorkerLoader.ResourceDescriptor );
//			userWorkerCode += THREE.CodeSerializer.serializeClass( 'THREE.WorkerLoader.FileLoadingExecutor', THREE.WorkerLoader.FileLoadingExecutor );
		}
//		userWorkerCode += THREE.CodeSerializer.serializeClass( this.worker.workerRunner.name, this.worker.workerRunner.impl );

		var scope = this;
		var scopedReceiveWorkerMessage = function ( event ) {
			scope._receiveWorkerMessage( event );
		};

		var concatenateCode = '';
		var processCodeInstructions = function ( codeInstructions ) {

			var processNewCode = function ( contentAsString ) {
				concatenateCode += contentAsString;
				processCodeInstructions( codeInstructions );
			};

			if ( codeInstructions.length === 0 ) {

				var blob = new Blob( [ concatenateCode ], { type: 'application/javascript' } );
				scope.worker.native = new Worker( window.URL.createObjectURL( blob ) );
				scope.worker.native.onmessage = scopedReceiveWorkerMessage;
				scope.worker.workerRunner.usesMeshDisassembler = codeBuilderInstructions.usesMeshDisassembler;
				scope.worker.workerRunner.defaultGeometryType = 0;
				if ( codeBuilderInstructions.defaultGeometryType !== undefined && codeBuilderInstructions.defaultGeometryType !== null ) {

					scope.worker.workerRunner.defaultGeometryType = codeBuilderInstructions.defaultGeometryType;
				}

				// process stored queuedMessage
				scope._postMessage();
				if ( scope.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

			} else {

				var codeInstruction = codeInstructions[ 0 ];
				codeInstructions.shift();
				if ( codeInstruction.type === 'serializedCode' ) {

					processNewCode( codeInstruction.code );

				} else {

					var fileLoader = new THREE.FileLoader();
					fileLoader.setPath( codeInstruction.resourcePath );
					fileLoader.setResponseType( 'text' );
					fileLoader.load( codeInstruction.libraryPath, processNewCode );

				}

			}
		};
		processCodeInstructions( codeBuilderInstructions.getCodeInstructions() );
	},

	/**
	 * Executed in worker scope
	 */
	_receiveWorkerMessage: function ( event ) {
		var payload = event.data;
		switch ( payload.cmd ) {
			case 'data':
				this.worker.callbacks.onAssetAvailable( payload );
				break;

			case 'confirm':
				if ( payload.type === 'initWorkerDone' ) {

					this.worker.queuedMessage = null;
					this.worker.callbacks.onAssetAvailable( payload );

				} else if ( payload.type === 'fileLoaded' ) {

					this.worker.queuedMessage = null;
					this.worker.callbacks.onAssetAvailable( null, payload.params.index );
				}
				break;

			case 'completeOverall':
				this.worker.queuedMessage = null;
				this.worker.started = false;
				if ( THREE.MeshTransfer.Validator.isValid( this.worker.callbacks.onLoad ) ) this.worker.callbacks.onLoad( payload.msg );

				if ( this.worker.terminateWorkerOnLoad ) {

					if ( this.worker.logging.enabled ) console.info( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Run is complete. Terminating application on request!' );
					this.worker.callbacks.terminate();

				}
				break;

			case 'error':
				console.error( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Reported error: ' + payload.msg );
				this.worker.queuedMessage = null;
				this.worker.started = false;
				if ( THREE.MeshTransfer.Validator.isValid( this.worker.callbacks.onLoad ) ) this.worker.callbacks.onLoad( payload.msg );

				if ( this.worker.terminateWorkerOnLoad ) {

					if ( this.worker.logging.enabled ) console.info( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Run reported error. Terminating application on request!' );
					this.worker.callbacks.terminate();

				}
				break;

			default:
				console.error( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Received unknown command: ' + payload.cmd );
				break;

		}
	},

	runAsyncInitWorker: function ( resourceDescriptors ) {
		var payload = {
			cmd: 'initWorker',
			logging: {
				enabled: this.logging.enabled,
				debug: this.logging.debug
			},
			data: {
				resourceDescriptors: resourceDescriptors
			}
		};
		if ( ! this._verifyWorkerIsAvailable( payload ) ) return;

		this._postMessage();
	},

	/**
	 * Runs the file loading in worker with the provided configuration.
	 *
	 * @param {Object} payload configuration required for loading files.
	 */
	runAsyncLoad: function ( payload ) {
		payload.cmd = 'loadFile';
		payload.data = {};
		if ( ! this._verifyWorkerIsAvailable( payload ) ) return;

		this._postMessage();
	},

	/**
	 * Runs the parser with the provided configuration.
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	runAsyncParse: function( payload, transferables ) {
		payload.cmd = 'parse';
		payload.usesMeshDisassembler = this.worker.workerRunner.usesMeshDisassembler;
		payload.defaultGeometryType = this.worker.workerRunner.defaultGeometryType;
		if ( ! this._verifyWorkerIsAvailable( payload, transferables ) ) return;

		this._postMessage();
	},

	_verifyWorkerIsAvailable: function ( payload, transferables ) {
		this._verifyCallbacks();
		var ready = true;
		if ( THREE.MeshTransfer.Validator.isValid( this.worker.queuedMessage ) ) {

			console.warn( 'Already processing message. Rejecting new run instruction' );
			ready = false;

		} else {

			this.worker.queuedMessage = {
				payload: payload,
				transferables: transferables
			};
			this.worker.started = true;

		}
		return ready;
	},

	_postMessage: function () {
		if ( THREE.MeshTransfer.Validator.isValid( this.worker.queuedMessage ) && THREE.MeshTransfer.Validator.isValid( this.worker.native ) ) {

			if ( this.worker.queuedMessage.payload.data.input instanceof ArrayBuffer ) {

				var transferables = [];
				if ( this.worker.forceWorkerDataCopy ) {

					transferables.push( this.worker.queuedMessage.payload.data.input.slice( 0 ) );

				} else {

					transferables.push( this.worker.queuedMessage.payload.data.input );

				}
				if ( this.worker.queuedMessage.transferables.length > 0 ) {

					transferables = transferables.concat( this.worker.queuedMessage.transferables );

				}
				this.worker.native.postMessage( this.worker.queuedMessage.payload, transferables );

			} else {

				this.worker.native.postMessage( this.worker.queuedMessage.payload );

			}

		}
	},

	_terminate: function () {
		this.worker.native.terminate();
		this._reset();
	}
};

THREE.WorkerSupport.CodeBuilderIntructions = function ( parserName, providesThree ) {
	this.parserName = parserName;
	this.providesThree = providesThree === true;
	this.codeInstructions = [];
	this.defaultGeometryType = 0;
	this.containsMeshDisassembler = false;
	this.usesMeshDisassembler = false;
};

THREE.WorkerSupport.CodeBuilderIntructions.prototype = {

	addCodeFragment: function( codeFragment ) {
		this.codeInstructions.push( {
			type: 'serializedCode',
			code: codeFragment
		} );
	},

	addLibrary: function( libraryPath, resourcePath ) {
		this.codeInstructions.push( {
			type: 'lib',
			libraryPath: libraryPath,
			resourcePath: resourcePath
		} );
	},

	getCodeInstructions: function() {
		return this.codeInstructions;
	}
};