/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { FileLoader } from "../../../../node_modules/three/build/three.module.js";
import { CodeSerializer } from "./CodeSerializer.js"
import { WorkerRunner } from "../independent/WorkerRunner.js"
import { CodeBuilderInstructions } from "../main/CodeBuilderInstructions.js"
import { Validator } from  "../../util/Validator.js"


/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 */
const WorkerExecutionSupport = function () {
	// check worker support first
	if ( window.Worker === undefined ) throw "This browser does not support web workers!";
	if ( window.Blob === undefined ) throw "This browser does not support Blob!";
	if ( typeof window.URL.createObjectURL !== 'function' ) throw "This browser does not support Object creation from URL!";

	this._reset();
};
WorkerExecutionSupport.WORKER_SUPPORT_VERSION = '3.0.0-preview';
console.info( 'Using WorkerSupport version: ' + WorkerExecutionSupport.WORKER_SUPPORT_VERSION );


WorkerExecutionSupport.prototype = {

	constructor: WorkerExecutionSupport,

	_reset: function () {
		this.logging = {
			enabled: true,
			debug: false
		};

		let scope = this;
		let scopeTerminate = function (  ) {
			scope._terminate();
		};
		this.worker = {
			native: null,
			logging: true,
			workerRunner: {
				haveUserImpl: false,
				name: 'WorkerRunner',
				impl: WorkerRunner,
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
		if ( this.worker.terminateWorkerOnLoad && Validator.isValid( this.worker.native ) &&
			! Validator.isValid( this.worker.queuedMessage ) && this.worker.started ) {

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
		if ( Validator.isValid( userRunnerImpl ) && Validator.isValid( userRunnerImplName ) ) {

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
	 * @param {Function} onAssetAvailable The function for processing the data, e.g. {@link MeshReceiver}.
	 * @param {Function} [onLoad] The function that is called when parsing is complete.
	 */
	updateCallbacks: function ( onAssetAvailable, onLoad ) {
		this.worker.callbacks.onAssetAvailable = Validator.verifyInput( onAssetAvailable, this.worker.callbacks.onAssetAvailable );
		this.worker.callbacks.onLoad = Validator.verifyInput( onLoad, this.worker.callbacks.onLoad );
		this._verifyCallbacks();
	},

	_verifyCallbacks: function () {
		if ( ! Validator.isValid( this.worker.callbacks.onAssetAvailable ) ) throw 'Unable to run as no "onAssetAvailable" callback is set.';
	},

	/**
	 * Validate the status of worker code and the derived worker and specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 *
	 * @param {Function} buildWorkerCode The function that is invoked to create the worker code of the parser.
	 */
	validate: function ( buildWorkerCode, containFileLoadingCode ) {
		if ( Validator.isValid( this.worker.native ) ) return;
		if ( this.logging.enabled ) {

			console.info( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );
			if ( ! this.worker.workerRunner.haveUserImpl ) console.info( 'WorkerSupport: Using DEFAULT "' + this.worker.workerRunner.name + '" as Runner class for worker.' );

		}
		let codeBuilderInstructions;
		if ( buildWorkerCode === undefined || buildWorkerCode === null ) {

			codeBuilderInstructions = new CodeBuilderInstructions( 'Parser', false );

		} else {

			codeBuilderInstructions = buildWorkerCode( CodeSerializer );

		}

		let codeParserRef = 'if ( ! WorkerSupport ) { WorkerSupport = {} };\n\nWorkerSupport.Parser = ' + codeBuilderInstructions.parserName + ';\n\n'
		codeBuilderInstructions.addCodeFragment( codeParserRef );
		codeBuilderInstructions.addLibrary( 'src/loaders/worker/independent/WorkerRunner.js', '../../' );
		codeBuilderInstructions.addCodeFragment( 'new ' + this.worker.workerRunner.name + '();\n\n' );

		if ( codeBuilderInstructions.containsMeshDisassembler === true || codeBuilderInstructions.usesMeshDisassembler === true ) {

			console.warn( 'Feature \"containsMeshDisassembler\" is currently not available!' );
//			extraCode += CodeSerializer.serializeClass( 'MeshTransmitter', MeshTransmitter );

		}
		if ( containFileLoadingCode ) {

			console.warn( 'Feature \"containFileLoadingCode\" is currently not available!' );

			if ( ! codeBuilderInstructions.providesThree ) {
/*
				userWorkerCode += 'let loading = {};\n\n';
				userWorkerCode += CodeSerializer.serializeObject( 'Cache', Cache );
				userWorkerCode += DefaultLoadingManager.constructor.toString();
				userWorkerCode += 'let DefaultLoadingManager = new LoadingManager();\n\n';
				userWorkerCode += 'let Cache = Cache;\n\n';
				userWorkerCode += CodeSerializer.serializeClass( 'FileLoader', FileLoader, 'FileLoader' );
*/
			}
//			userWorkerCode += CodeSerializer.serializeClass( 'WorkerLoader.ResourceDescriptor', WorkerLoader.ResourceDescriptor );
//			userWorkerCode += CodeSerializer.serializeClass( 'WorkerLoader.FileLoadingExecutor', WorkerLoader.FileLoadingExecutor );
		}
//		userWorkerCode += CodeSerializer.serializeClass( this.worker.workerRunner.name, this.worker.workerRunner.impl );

		let scope = this;
		let scopedReceiveWorkerMessage = function ( event ) {
			scope._receiveWorkerMessage( event );
		};

		let concatenateCode = '';
		let processCodeInstructions = function ( codeInstructions ) {

			let processNewCode = function ( contentAsString ) {
				concatenateCode += contentAsString;
				processCodeInstructions( codeInstructions );
			};

			if ( codeInstructions.length === 0 ) {

				let blob = new Blob( [ concatenateCode ], { type: 'application/javascript' } );
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

				let codeInstruction = codeInstructions[ 0 ];
				codeInstructions.shift();
				if ( codeInstruction.type === 'serializedCode' ) {

					processNewCode( codeInstruction.code );

				} else {

					let fileLoader = new FileLoader();
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
		let payload = event.data;
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
				if ( Validator.isValid( this.worker.callbacks.onLoad ) ) this.worker.callbacks.onLoad( payload.msg );

				if ( this.worker.terminateWorkerOnLoad ) {

					if ( this.worker.logging.enabled ) console.info( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Run is complete. Terminating application on request!' );
					this.worker.callbacks.terminate();

				}
				break;

			case 'error':
				console.error( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Reported error: ' + payload.msg );
				this.worker.queuedMessage = null;
				this.worker.started = false;
				if ( Validator.isValid( this.worker.callbacks.onLoad ) ) this.worker.callbacks.onLoad( payload.msg );

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
		let payload = {
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
		let ready = true;
		if ( Validator.isValid( this.worker.queuedMessage ) ) {

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
		if ( Validator.isValid( this.worker.queuedMessage ) && Validator.isValid( this.worker.native ) ) {

			if ( this.worker.queuedMessage.payload.data.input instanceof ArrayBuffer ) {

				let transferables = [];
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

export { WorkerExecutionSupport }
