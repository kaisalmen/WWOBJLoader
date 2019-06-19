/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	Group,
	Object3D
} from "three";

import { MeshReceiver } from "../shared/MeshReceiver.js";
import { Validator } from "./Validator.js";
import { ObjectManipulator } from "../worker/independent/ObjectManipulator.js";
import { FileLoadingExecutor } from "../util/FileLoadingExecutor.js";


/**
 *
 * @constructor
 */
const WorkerLoader = function () {
	this.loadingTask = new WorkerLoader.LoadingTask( 'WorkerLoader_LoadingTask' );
};
WorkerLoader.WORKER_LOADER_VERSION = '1.0.0-preview';
console.info( 'Using WorkerLoader version: ' + WorkerLoader.WORKER_LOADER_VERSION );


WorkerLoader.prototype = {

	constructor: WorkerLoader,

	/**
	 *
	 * @param {object} loader
	 * @param {object} [loaderConfig]
	 * @returns {WorkerLoader}
	 */
	setLoader: function ( loader, loaderConfig ) {
		this.loadingTask.setLoader( loader, loaderConfig );
		return this;
	},

	/**
	 *
	 * @param {WorkerLoader.LoadingTask} loadingTask
	 */
	setLoadingTask: function ( loadingTask ) {
		this.loadingTask = Validator.verifyInput( loadingTask, this.loadingTask );
		return this;
	},

	/**
	 *
	 * @returns {WorkerLoader.LoadingTask}
	 */
	getLoadingTask: function () {
		return this.loadingTask;
	},

	/**
	 * Execute a fully configured {@link WorkerLoader.LoadingTask}.
	 *
	 * @param {WorkerLoader.LoadingTask} loadingTask
	 * @returns {WorkerLoader}
	 */
	executeLoadingTask: function ( loadingTask ) {
		this.setLoadingTask( loadingTask );
		this.loadingTask.execute();
		return this;
	},

	/**
	 * Configure the existing {@link WorkerLoader.LoadingTask} with the supplied parameters.
	 *
	 * @param {WorkerLoader.LoadingTaskConfig} loadingTaskConfig
	 * @param {WorkerExecutionSupport} [workerSupport]
	 * @returns {WorkerLoader}
	 */
	executeLoadingTaskConfig: function ( loadingTaskConfig, workerSupport ) {
		this.loadingTask.execute( loadingTaskConfig, workerSupport );
		return this;
	},

	/**
	 * Use this method to load a file from the given URL and parse it asynchronously.
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {function} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {function} [onMesh] A function to be called after a new mesh raw data becomes available (e.g. alteration).
 	 * @param {function} [onReport] A function to be called to communicate status (e.g. loading progess).
	 * @param {function} [onReportError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @returns {WorkerLoader}
	 */
	loadAsync: function ( url, onLoad, onMesh, onReport, onReportError ) {
		this.loadingTask.addResourceDescriptor( new WorkerLoader.ResourceDescriptor( 'URL', 'url_loadAsync', url ) )
			.updateCallbacksPipeline( onLoad, null, null )
			.updateCallbacksParsing( onMesh, null )
			.updateCallbacksApp( onReport, onReportError )
			.execute();
		return this;
	},

	/**
	 * Parses content asynchronously from arraybuffer.
	 *
	 * @param {arraybuffer} content data as Uint8Array
	 * @param {function} onLoad Called after worker successfully completed loading
	 * @param {function} [onMesh] Called after worker successfully delivered a single mesh
	 * @param {Object} [parserConfiguration] Provide additional instructions to the parser
	 * @returns {WorkerLoader}
	 */
	parseAsync: function ( content, onLoad, onMesh, parserConfiguration ) {
		var resourceDescriptor = new WorkerLoader.ResourceDescriptor( 'Buffer', null, content );
		resourceDescriptor.setParserConfiguration( parserConfiguration );

		this.loadingTask.addResourceDescriptor( resourceDescriptor )
			.updateCallbacksPipeline( null, null, onLoad )
			.updateCallbacksParsing( onMesh, null )
			.execute();
		return this;
	}
};

/**
 *
 * @param {String} description
 * @constructor
 */
const LoadingTask = function ( description ) {
	this.logging = {
		enabled: true,
		debug: false
	};
	this.description = description;

	this.workerSupport = null;
	this.dataReceiver = null;

	this.baseObject3d = new Group();
	this.instanceNo = 0;
	this.terminateWorkerOnLoad = true;
	this.forceWorkerDataCopy = false;
	this.enforceSync = false;

	this.sendMaterials = true;
	this.sendMaterialsJson = false;

	this.loader = {
		ref: null,
		config: {},
		buildWorkerCode: null
	};
	this.resourceDescriptors = [];
	this.resetResourceDescriptors();

	this.callbacks = {
		app: {
			onReport: null,
			onReportError: null
		},
		parse: {
			onMesh: null,
			onMaterials: null
		},
		pipeline: {
			onComplete: null,
			onCompleteFileLoading: null,
			onCompleteParsing: null
		}
	};
};


LoadingTask.prototype = {

	constructor: LoadingTask,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param enabled
	 * @param debug
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		if ( Validator.isValid( this.workerSupport ) ) this.workerSupport.setLogging( this.logging.enabled, this.logging.debug );
		return this;
	},

	/**
	 * The instance number.
	 *
	 * @param {number} instanceNo
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setInstanceNo: function ( instanceNo ) {
		this.instanceNo = Validator.verifyInput( instanceNo, this.instanceNo );
		return this;
	},

	/**
	 * Defines where meshes shall be attached to.
	 *
	 * @param {Object3D} baseObject3d
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setBaseObject3d: function ( baseObject3d ) {
		this.baseObject3d = Validator.verifyInput( baseObject3d, this.baseObject3d );
		return this;
	},

	/**
	 *
	 * @param {Boolean} terminateWorkerOnLoad
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setTerminateWorkerOnLoad: function ( terminateWorkerOnLoad ) {
		this.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
		if ( Validator.isValid( this.workerSupport ) ) this.workerSupport.setTerminateWorkerOnLoad( this.terminateWorkerOnLoad );
		return this;
	},

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setForceWorkerDataCopy: function ( forceWorkerDataCopy ) {
		this.forceWorkerDataCopy = forceWorkerDataCopy === true;
		if ( Validator.isValid( this.workerSupport ) ) this.workerSupport.setForceWorkerDataCopy( this.forceWorkerDataCopy );
		return this;
	},

	/**
	 *
	 * @param {Boolean} enforceSync
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setEnforceSync: function ( enforceSync ) {
		this.enforceSync = enforceSync === true;
		return this;
	},

	/**
	 *
	 * @param {object} loader
	 * @param {object} [loaderConfig]
	 * @returns {WorkerLoader.LoadingTask}
	 */
	setLoader: function ( loader, loaderConfig ) {
		if ( ! Validator.isValid( loader ) ) this._throwError( 'Unable to continue. You have not specified a loader!' );
		this.loader.ref = loader;
		this.loader.config = Validator.verifyInput( loaderConfig, this.loader.config );
		return this;
	},

	/**
	 * Funtion that is invoked to build the worker code. This overrules anything the loader already supplies.
	 * @param buildWorkerCode
	 */
	setBuildWorkerCodeFunction: function ( buildWorkerCode ) {
		this.loader.buildWorkerCode = buildWorkerCode;
	},

	/**
	 *
	 * @param resourceDescriptor
	 * @returns {WorkerLoader.LoadingTask}
	 */
	addResourceDescriptor: function ( resourceDescriptor ) {
		this.resourceDescriptors.push( resourceDescriptor );
		return this;
	},

	/**
	 *
	 * @param resourceDescriptors
	 * @returns {WorkerLoader.LoadingTask}
	 */
	resetResourceDescriptors: function ( resourceDescriptors ) {
		this.resourceDescriptors = Array.isArray( resourceDescriptors ) ? resourceDescriptors : this.resourceDescriptors;
		return this;
	},

	/**
	 *
	 * @param {Function} onMesh
	 * @param {Function} onMaterials
	 * @returns {WorkerLoader.LoadingTask}
	 */
	updateCallbacksParsing: function ( onMesh, onMaterials ) {
		this.callbacks.parse.onMesh = Validator.verifyInput( onMesh, this.callbacks.parse.onMesh );
		this.callbacks.parse.onMaterials = Validator.verifyInput( onMaterials, this.callbacks.parse.onMaterials );
		return this;
	},

	/**
	 *
	 * @param {Function} onComplete
	 * @param {Function} onCompleteLoad
	 * @param {Function} onCompleteParse
	 * @returns {WorkerLoader.LoadingTask}
	 */
	updateCallbacksPipeline: function ( onComplete, onCompleteFileLoading, onCompleteParsing ) {
		this.callbacks.pipeline.onComplete = Validator.verifyInput( onComplete, this.callbacks.pipeline.onComplete );
		this.callbacks.pipeline.onCompleteFileLoading = Validator.verifyInput( onCompleteFileLoading, this.callbacks.pipeline.onCompleteFileLoading );
		this.callbacks.pipeline.onCompleteParsing = Validator.verifyInput( onCompleteParsing, this.callbacks.pipeline.onCompleteParsing );
		return this;
	},

	/**
	 *
	 * @param {Function} onReport
	 * @param {Function} [onReportError]
	 * @returns {WorkerLoader.LoadingTask}
	 */
	updateCallbacksApp: function ( onReport, onReportError ) {
		this.callbacks.app.onReport = Validator.verifyInput( onReport, this.callbacks.app.onReport );
		this.callbacks.app.onReportError = Validator.verifyInput( onReportError, this.callbacks.app.onReportError );
		return this;
	},

	_throwError: function ( errorMessage, event ) {
		if ( Validator.isValid( this.callbacks.app.onReportError ) )  {

			this.callbacks.app.onReportError( errorMessage, event );

		} else {

			throw errorMessage;

		}
	},

	/**
	 * @param {WorkerLoader.LoadingTaskConfig} [loadingTaskConfig]
	 * @param {WorkerExecutionSupport} [workerSupport]
	 *
	 * @returns {WorkerLoader.LoadingTask}
	 */
	execute: function ( loadingTaskConfig, workerSupport ) {
		var loadingTask = this;
		var scopedLoadFiles = function ( payload ) {
			loadingTask._executeLoadFiles( payload );
		};
		this._initExecute( scopedLoadFiles, loadingTaskConfig, workerSupport );

		return this;
	},

	_initExecute: function ( callbackLoadFiles, loadingTaskConfig, workerSupport ) {
		this._applyConfig( loadingTaskConfig );
		if ( Validator.isValid( workerSupport ) && workerSupport instanceof WorkerExecutionSupport ) {

			this.workerSupport = workerSupport;

		} else {

			this.workerSupport = new WorkerExecutionSupport();
			this.workerSupport.setLogging( this.logging.enabled, this.logging.debug );
			this.workerSupport.setTerminateWorkerOnLoad( this.terminateWorkerOnLoad );
			this.workerSupport.setForceWorkerDataCopy( this.forceWorkerDataCopy );

		}
		this.dataReceiver = new MeshReceiver();
		this.dataReceiver.setLogging( this.logging.enabled, this.logging.debug );

		var loadingTask = this;
		var callbackDataReceiverProgress = function ( type, text, numericalValue ) {
			var content = Validator.isValid( text ) ? text : '';
			var event = {
				detail: {
					type: type,
					modelName: loadingTask.description,
					instanceNo: loadingTask.instanceNo,
					text: content,
					numericalValue: numericalValue
				}
			};
			if ( Validator.isValid( loadingTask.callbacks.app.onReport ) ) loadingTask.callbacks.app.onReport( event );
			if ( loadingTask.logging.enabled && loadingTask.logging.debug ) console.debug( content );
		};

		this.dataReceiver._setCallbacks( callbackDataReceiverProgress, this.callbacks.parse.onMesh, this.callbacks.parse.onMaterials );
		this.dataReceiver.setBaseObject3d( this.baseObject3d );
		this.dataReceiver.createDefaultMaterials();


		// do we need to provide ResourceDescriptors to Worker?
		var resourceDescriptor;
		var provideRds = false;
		for ( var name in this.resourceDescriptors ) {

			resourceDescriptor = this.resourceDescriptors[ name ];
			if ( ( resourceDescriptor.async.load || resourceDescriptor.async.parse ) && ! this.enforceSync ) {

				provideRds = true;
				break;

			}

		}
		var rdForWorkerInit = null;
		if ( provideRds ) {

			rdForWorkerInit = [];
			for ( var name in this.resourceDescriptors ) {

				resourceDescriptor = this.resourceDescriptors[ name ];
				rdForWorkerInit.push( resourceDescriptor.createSendable() );

			}

			this.workerSupport.validate( this.loader.ref, this.loader.buildWorkerCode, provideRds );
			this.workerSupport.updateCallbacks( callbackLoadFiles );

		} else {

			callbackLoadFiles();

		}
	},

	/**
	 *
	 * @param {WorkerLoader.LoadingTaskConfig} loadingTaskConfig
	 *
	 * @returns {WorkerLoader.LoadingTask}
	 */
	_applyConfig: function ( loadingTaskConfig ) {
		loadingTaskConfig = Validator.verifyInput( loadingTaskConfig, null );

		var ownConfig = {};
		if ( Validator.isValid( loadingTaskConfig ) && loadingTaskConfig instanceof WorkerLoader.LoadingTaskConfig ) {

			ownConfig = loadingTaskConfig.config;
			var classDef = loadingTaskConfig.loader.classDef;
			if ( Validator.isValid( classDef ) ) {

				var loader = Object.create( classDef.prototype );
				classDef.call( loader );
				this.setLoader( loader, loadingTaskConfig.loader.config );
			}
			this.setBuildWorkerCodeFunction( loadingTaskConfig.loader.buildWorkerCode );

		}
		if ( ! Validator.isValid( this.loader.ref ) ) {

			this._throwError( 'Unable to continue. You have not specified a loader!' );

		}
		if ( typeof this.loader.buildWorkerCode !== 'function' ) {

			if ( typeof this.loader.ref.buildWorkerCode === 'function' ) {

				this.loader.buildWorkerCode = this.loader.ref.buildWorkerCode;

			} else {

				console.info( 'No buildWorkerCode function is available for: ' + this.loader.ref.modelName + 'Processing is limited to main.' );

			}

		}
		ObjectManipulator.applyProperties( this, ownConfig );
		if ( loadingTaskConfig !== null ) {

			this.resetResourceDescriptors( loadingTaskConfig.resourceDescriptors );
			this.updateCallbacksApp(
				loadingTaskConfig.callbacks.app.onReport,
				loadingTaskConfig.callbacks.app.onReportError
			).updateCallbacksParsing(
				loadingTaskConfig.callbacks.parse.onMesh,
				loadingTaskConfig.callbacks.parse.onMaterials
			).updateCallbacksPipeline(
				loadingTaskConfig.callbacks.pipeline.onComplete,
				loadingTaskConfig.callbacks.pipeline.onCompleteFileLoading,
				loadingTaskConfig.callbacks.pipeline.onCompleteParsing
			);
		}
		// this will ensure that any base configuration on LoadingTask and Loader are aligned
		ObjectManipulator.applyProperties( this.loader.ref, ownConfig );
		ObjectManipulator.applyProperties( this.loader.ref, this.loader.config );
		if ( typeof this.loader.ref.setGenericErrorHandler === 'function' ) {

			this.loader.ref.setGenericErrorHandler( this.callbacks.app.onReportError );

		}
		return this;
	},

	_executeLoadFiles: function () {
		var loadingTask = this;

		var fileLoadingExecutor = new FileLoadingExecutor( loadingTask.instanceNo, loadingTask.description );
		fileLoadingExecutor
			.setCallbacks( loadingTask.callbacks.app.onReport, loadingTask._throwError );

		var loadAllResources = function ( index ) {
			if ( index === loadingTask.resourceDescriptors.length ) {

				loadingTask._executeParseAssets();
				return;

			}
			var resourceDescriptorCurrent = loadingTask.resourceDescriptors[ index ];

			var onCompleteFileLoading = function ( content, completedIndex ) {
				if ( Validator.isValid( content ) ) loadingTask.resourceDescriptors[ completedIndex ].content = content;
				completedIndex++;
				loadAllResources( completedIndex );
			};

			if ( Validator.isValid( resourceDescriptorCurrent ) && resourceDescriptorCurrent.resourceType === 'URL' ) {

				if ( resourceDescriptorCurrent.async.load ) {
					loadingTask.workerSupport.updateCallbacks( onCompleteFileLoading );
					loadingTask.workerSupport.runAsyncLoad(
						{
							// specific parser instructions need to be set here
							params: {
								index: index,
								instanceNo: loadingTask.instanceNo,
								description: loadingTask.description,
								path: loadingTask.loader.ref.path
							}
						}
					)

				} else {

					fileLoadingExecutor.loadFile( resourceDescriptorCurrent, index, onCompleteFileLoading );

				}

			} else {

				onCompleteFileLoading( null, index );

			}

		};
		loadAllResources( 0 );
	},

	_executeParseAssets: function () {
		var loadingTask = this;
		var executeParsingStep = function ( index ) {
			if ( index === loadingTask.resourceDescriptors.length ) {

				loadingTask._finalizeParsing();
				return;

			}
			var resourceDescriptorCurrent = loadingTask.resourceDescriptors[ index ];
			var result;
			var useAsync = resourceDescriptorCurrent.async.parse && ! loadingTask.enforceSync;
			if ( useAsync ) {

				var scopedOnLoad = function ( measureTime ) {
					measureTime = Validator.verifyInput( measureTime, true );
					if ( measureTime && loadingTask.logging.enabled ) console.timeEnd( 'WorkerLoader parse [' + loadingTask.instanceNo + '] : ' + resourceDescriptorCurrent.name );

					result = loadingTask.baseObject3d;
					resourceDescriptorCurrent.setParserResult( result );
					var callbackOnProcessResult = resourceDescriptorCurrent.getCallbackOnProcessResult();
					if ( Validator.isValid( callbackOnProcessResult ) ) callbackOnProcessResult( resourceDescriptorCurrent );
					if ( Validator.isValid( loadingTask.callbacks.pipeline.onCompleteParsing ) ) {

						loadingTask.callbacks.pipeline.onCompleteParsing( {
							detail: {
								extension: resourceDescriptorCurrent.extension,
								result: resourceDescriptorCurrent.result,
								modelName: resourceDescriptorCurrent.name,
								instanceNo: loadingTask.instanceNo
							}
						} );

					}
					index ++;
					executeParsingStep( index );
				};

				var scopedOnMesh = function ( content ) {
					loadingTask.dataReceiver.processPayload( content );
				};

				// fast-fail in case of illegal data
				if ( ! Validator.isValid( resourceDescriptorCurrent.content ) && ! resourceDescriptorCurrent.async.load ) {

					console.warn( 'Provided content is not a valid ArrayBuffer.' );
					scopedOnLoad( false );

				} else {

					loadingTask.workerSupport.updateCallbacks( scopedOnMesh, scopedOnLoad );
					loadingTask._parseAsync( resourceDescriptorCurrent, index );

				}

			} else {

				ObjectManipulator.applyProperties( loadingTask.loader.ref, resourceDescriptorCurrent.parserConfiguration );
				if ( typeof loadingTask.loader.ref.getParseFunctionName === 'function' ) {

					var parseFunctionName = loadingTask.loader.ref.getParseFunctionName();
					result = loadingTask.loader.ref[ parseFunctionName ]( resourceDescriptorCurrent.content, resourceDescriptorCurrent.parserConfiguration );

				} else {

					result = loadingTask.loader.ref.parse( resourceDescriptorCurrent.content, resourceDescriptorCurrent.parserConfiguration );

				}
				if ( typeof loadingTask.loader.ref.setBaseObject3d === 'function' ) {

					loadingTask.loader.ref[ 'setBaseObject3d' ]( loadingTask.baseObject3d );

				}
				resourceDescriptorCurrent.setParserResult( result );
				var callbackOnProcessResult = resourceDescriptorCurrent.getCallbackOnProcessResult();
				if ( Validator.isValid( callbackOnProcessResult ) ) callbackOnProcessResult( resourceDescriptorCurrent );
				if ( Validator.isValid( loadingTask.callbacks.pipeline.onCompleteParsing ) ) {

					loadingTask.callbacks.pipeline.onCompleteParsing( {
						detail: {
							extension: resourceDescriptorCurrent.extension,
							result: result,
							modelName: resourceDescriptorCurrent.name,
							instanceNo: loadingTask.instanceNo
						}
					} );

				}
				index ++;
				executeParsingStep( index );

			}
		};
		executeParsingStep( 0 );
	},

	/**
	 *
	 * @param {WorkerLoader.LoadingTask} loadingTask
	 * @private
	 */
	_parseAsync: function ( resourceDescriptor, index ) {
		if ( ! Validator.isValid( this.loader.ref ) ) this._throwError( 'Unable to run "executeWithOverride" without proper "loader"!' );
		if ( this.logging.enabled ) console.time( 'WorkerLoader parse [' + this.instanceNo + '] : ' + resourceDescriptor.name );

		var ltModelName = this.loader.ref.modelName;
		if ( ltModelName !== undefined && ltModelName !== null && ltModelName.length > 0 ) resourceDescriptor.name = this.loader.ref.modelName;
		if ( Validator.isValid( this.loader.ref.dataReceiver ) && this.loader.ref.dataReceiver instanceof MeshReceiver ) {

			this.dataReceiver.setMaterials( this.loader.ref.dataReceiver.getMaterials() );

		}

		var materialsContainer = {
			materials: {},
			serializedMaterials: {}
		};
		if ( this.sendMaterials ) {

			var materials = this.dataReceiver.getMaterials();
			for ( var materialName in materials ) materialsContainer.materials[ materialName ] = materialName;
			if ( this.sendMaterialsJson ) materialsContainer.serializedMaterials = this.dataReceiver.getMaterialsJSON();

		}
		var params = ( Validator.isValid( resourceDescriptor.parserConfiguration ) ) ? resourceDescriptor.parserConfiguration : {};
		if ( resourceDescriptor.async.load ) params.index = index;
		this.workerSupport.runAsyncParse(
			{
				// specific parser instructions need to be set here
				params: params,
				materials: materialsContainer,
				data: {
					input: resourceDescriptor.content,
					options: resourceDescriptor.dataOptions
				}
			},
			resourceDescriptor.transferables
		)
	},

	_finalizeParsing: function () {
		var resourceDescriptorCurrent = this.resourceDescriptors[ this.resourceDescriptors.length - 1 ];
		if ( resourceDescriptorCurrent.async.parse ) {

			if ( Validator.isValid( this.callbacks.pipeline.onComplete ) ) {

				this.callbacks.pipeline.onComplete( {
					detail: {
						extension: resourceDescriptorCurrent.extension,
						result: resourceDescriptorCurrent.result,
						modelName: resourceDescriptorCurrent.name,
						instanceNo: this.instanceNo
					}
				} );
			}

		} else {

			if ( Validator.isValid( this.callbacks.pipeline.onComplete ) ) {

				this.callbacks.pipeline.onComplete( this.baseObject3d );

			}

		}
	}
};

/**
 * Encapsulates the configuration for a complete {@link WorkerLoader.LoadingTask}.
 * @constructor
 */
const LoadingTaskConfig = function ( ownConfig ) {
	this.loader = {
		classDef: null,
		config: {},
		buildWorkerCode: null
	};
	this.config = Validator.verifyInput( ownConfig, {} );
	this.resourceDescriptors = [];
	this.extension = 'unknown';

	this.callbacks = {
		app: {
			onReport: null,
			onReportError: null
		},
		parse: {
			onMesh: null,
			onMaterials: null
		},
		pipeline: {
			onComplete: null,
			onCompleteFileLoading: null,
			onCompleteParsing: null
		}
	};
};

LoadingTaskConfig.prototype = {

	constructor: LoadingTaskConfig,

	/**
	 *
	 * @param {String} loaderClassDef
	 * @param {Object} [loaderConfig]
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setLoaderConfig: function ( loaderClassDef, loaderConfig ) {
		this.loader.classDef = Validator.verifyInput( loaderClassDef, this.loader.classDef );
		this.loader.config = Validator.verifyInput( loaderConfig, this.loader.config );
		return this;
	},

	/**
	 * Set the overall file extension associated with this LoaderTaskConfig
	 * @param extension
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setExtension: function ( extension ) {
		this.extension = extension;
		return this;
	},

	/**
	 * Funtion that is invoked to build the worker code. This overrules anything the loader already supplies.
	 * @param buildWorkerCode
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setBuildWorkerCodeFunction: function ( buildWorkerCode ) {
		this.loader.buildWorkerCode = buildWorkerCode;
		return this;
	},

	/**
	 *
	 * @param {WorkerLoader.ResourceDescriptor} resourceDescriptor
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	addResourceDescriptor: function ( resourceDescriptor ) {
		this.resourceDescriptors.push( resourceDescriptor );
		return this;
	},

	/**
	 *
	 * @param resourceDescriptor
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setResourceDescriptors: function ( resourceDescriptors ) {
		this.resourceDescriptors = [];
		for ( var name in resourceDescriptors ) {

			this.resourceDescriptors.push( resourceDescriptors[ name ] );

		}
		return this;
	},

	/**
	 * Sets the callbacks used during parsing and for general reporting to the application context.
	 * @param {Function} [onMesh]
	 * @param {Function} [onMaterials]
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setCallbacksParsing: function ( onMesh, onMaterials ) {
		this.callbacks.parse.onMesh = Validator.verifyInput( onMesh, this.callbacks.parse.onMesh );
		this.callbacks.parse.onMaterials = Validator.verifyInput( onMaterials, this.callbacks.parse.onMaterials );
		return this;
	},

	/**
	 *
	 * @param {Function} onComplete
	 * @param {Function} onCompleteLoad
	 * @param {Function} onCompleteParse
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setCallbacksPipeline: function ( onComplete, onCompleteFileLoading, onCompleteParsing ) {
		this.callbacks.pipeline.onComplete = Validator.verifyInput( onComplete, this.callbacks.pipeline.onComplete );
		this.callbacks.pipeline.onCompleteFileLoading = Validator.verifyInput( onCompleteFileLoading, this.callbacks.pipeline.onCompleteFileLoading );
		this.callbacks.pipeline.onCompleteParsing = Validator.verifyInput( onCompleteParsing, this.callbacks.pipeline.onCompleteParsing );
		return this;
	},

	/**
	 *
	 * @param {Function} onReport
	 * @param {Function} [onReportError]
	 * @returns {WorkerLoader.LoadingTaskConfig}
	 */
	setCallbacksApp: function ( onReport, onReportError ) {
		this.callbacks.app.onReport = Validator.verifyInput( onReport, this.callbacks.app.onReport );
		this.callbacks.app.onReportError = Validator.verifyInput( onReportError, this.callbacks.app.onReportError );
		return this;
	}
};

export {
	WorkerLoader,
	LoadingTask,
	LoadingTaskConfig
}
