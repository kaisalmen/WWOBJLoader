if ( THREE.WorkerLoader === undefined ) { THREE.WorkerLoader = {} }

THREE.WorkerLoader.LoadingTask = function ( description ) {
	this.logging = {
		enabled: true,
		debug: false
	};
	this.description = description;

	this.workerSupport = new THREE.WorkerLoader.WorkerSupport();
	this.terminateWorkerOnLoad = false;
	this.meshBuilder = new THREE.OBJLoader.MeshBuilder();
	this.baseObject3d = new THREE.Group();

	this.loader = null;
	this.loaderConfig = null;
	this.resourceDescriptors = [];

	this.callbacks = {
		parse: {
			onLoad: null,
			onMesh: null
		},
		load: {
			onProgress: null,
			onError: null
		}
	};
};

THREE.WorkerLoader.LoadingTask.prototype = {

	constructor: THREE.WorkerLoader.LoadingTask,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param enabled
	 * @param debug
	 * @returns {THREE.WorkerLoader.LoadingTask}
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.meshBuilder.setLogging( this.logging.enabled, this.logging.debug );
		this.workerSupport.setLogging( this.logging.enabled, this.logging.debug );
		return this;
	},

	/**
	 * The instance number.
	 *
	 * @param {number} instanceNo
	 */
	setInstanceNo: function ( instanceNo ) {
		this.instanceNo = instanceNo;
	},

	/**
	 * Defines where meshes shall be attached to.
	 *
	 * @param {THREE.Object3D} baseObject3d
	 */
	setBaseObject3d: function ( baseObject3d ) {
		if ( baseObject3d !== undefined && baseObject3d !== null ) this.baseObject3d = baseObject3d;
	},

	/**
	 *
	 * @param loader
	 * @param loaderConfig
	 */
	updateLoader: function ( loader, loaderConfig ) {
		if ( loader === undefined || loader === null ) {

			if ( this.logging.enabled ) console.warn( "Provided loader is not valid" );
			return this;

		}
		this.loader = loader;
		this._applyConfiguration( this.loader, loaderConfig );
	},

	updateCallbacks: function ( onLoad, onMesh, onProgress, onError ) {
		this.callbacks.parse.onMesh = onMesh;
		this.callbacks.parse.onLoad = onLoad;
		var scope = this;
		if ( onProgress === null || onProgress === undefined ) {
			var numericalValueRef = 0;
			var numericalValue = 0;
			onProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				numericalValue = event.loaded / event.total;
				if ( numericalValue > numericalValueRef ) {

					numericalValueRef = numericalValue;
					var output = 'Download of "' + url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
					scope._onProgress( 'progressLoad', output, numericalValue );

				}
			};
		}
		this.callbacks.load.onProgress = onProgress;

		if ( onError === null || onError === undefined ) {
			onError = function ( event ) {
				var output = 'Error occurred while downloading "' + url + '"';
				console.error( output + ': ' + event );
				scope._onProgress( 'error', output, - 1 );
			};
		}
		this.callbacks.load.onError = onError;

		/**
		 * Announce feedback which is give to the registered callbacks.
		 * @memberOf THREE.WorkerLoader
		 * @private
		 *
		 * @param {string} type The type of event
		 * @param {string} text Textual description of the event
		 * @param {number} numericalValue Numerical value describing the progress
		 */
		var scope = this;
		var reportProgress = function ( type, text, numericalValue ) {
			var content = THREE.WorkerLoader.Validator.isValid( text ) ? text : '';
			var event = {
				detail: {
					type: type,
					modelName: scope.description,
					instanceNo: scope.instanceNo,
					text: content,
					numericalValue: numericalValue
				}
			};
//			if ( THREE.WorkerLoader.Validator.isValid( this.callbacks.onProgress ) ) this.callbacks.onProgress( event );
			if ( this.logging.enabled && this.logging.debug ) console.debug( content );
		};

		this.meshBuilder._setCallbacks( reportProgress, onMesh, onLoad );
	},

	_processQueue: function ( index ) {
		if ( index === this.resourceDescriptors.length ) {

			this._executeParseSteps();
			return;

		}
		var resourceDescriptor = this.resourceDescriptors[ index ];
		var fileLoader = new THREE.FileLoader( this.manager );
		fileLoader.setResponseType( resourceDescriptor.parserInstructions.resourceType );
		fileLoader.setPath( this.loader.path );

		var scope = this;
		var processResourcesProxy = function ( content ) {
			resourceDescriptor.content = content;
			index++;
			scope._processQueue( index );
		};
		fileLoader.load( resourceDescriptor.url, processResourcesProxy, this.callbacks.load.onProgress, this.callbacks.load.onError );
	},

	_executeParseSteps: function () {
		for ( var index in this.resourceDescriptors ) {

			var resourceDescriptor = this.resourceDescriptors[ index ];
			if ( resourceDescriptor.parserInstructions.useAsync ) {

				this.parseAsync( resourceDescriptor.payload, onLoad, resourceDescriptor.parserInstructions );

			} else {

				onLoad( this.loader.parse( resourceDescriptor.payload, resourceDescriptor.parserInstructions ) );

			}

		}
	}
};

/**
 *
 * @param {THREE.DefaultLoadingManager} manager
 * @param {object} [loader]
 * @param {object} [loaderConfig]
 * @constructor
 */
THREE.WorkerLoader = function ( manager, loader, loaderConfig ) {

	console.info( 'Using THREE.WorkerLoader version: ' + THREE.WorkerLoader.WORKER_LOADER_VERSION );
	this.manager = this.validator.verifyInput( manager, THREE.DefaultLoadingManager );
	this.validator = THREE.WorkerLoader.Validator;

	this.loadingTask = new THREE.WorkerLoader.LoadingTask( 'default' );
	this.loadingTask.updateLoader( loader, loaderConfig );

	this.callbacks = {
		onProgress: null
	}
};
THREE.WorkerLoader.WORKER_LOADER_VERSION = '1.0.0-dev';


THREE.WorkerLoader.prototype = {

	constructor: THREE.WorkerLoader,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 * @returns {THREE.WorkerLoader}
	 */
	setLogging: function ( enabled, debug ) {
		this.loadingTask.setLogging( enabled, debug );
		return this;
	},

	/**
	 *
	 * @param {THREE.Object3D} baseObject3d
	 * @returns {THREE.WorkerLoader}
	 */
	setBaseObject3d: function ( baseObject3d ) {
		this.loadingTask.setBaseObject3d( baseObject3d );
		return this;
	},

	/**
	 *
	 * @param {object} [loader]
	 * @param {object} [loaderConfig]
	 * @returns {THREE.WorkerLoader}
	 */
	updateLoader: function ( loader, loaderConfig ) {
		this.loadingTask.updateLoader( loader, loaderConfig );
		return this;
	},

	/**
	 * Use this method to load a file from the given URL and parse it asynchronously.
	 * @memberOf THREE.WorkerLoader
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {function} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
 	 * @param {function} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {function} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @param {function} [onMesh] A function to be called after a new mesh raw data becomes available (e.g. alteration).
	 */
	loadAsync: function ( url, onLoad, onProgress, onError, onMesh ) {
		this.loadingTask.resourceDescriptors.push( new THREE.WorkerLoader.ResourceDescriptor( 'URL', 'url_loadAsync', url ) );
		this.loadingTask.updateCallbacks( onLoad, onMesh, onProgress, onError );
		this.loadingTask._processQueue();
	},

	/**
	 * Parses content asynchronously from arraybuffer.
	 *
	 * @param {arraybuffer} content data as Uint8Array
	 * @param {function} onLoad Called after worker successfully completed loading
	 * @param {function} [onMesh] Called after worker successfully delivered a single mesh
	 * @param {Object} [parserInstructions] Provide additional instructions to the parser
	 */
	parseAsync: function ( content, onLoad, onMesh, parserInstructions ) {
		var resDesc = THREE.WorkerLoader.ResourceDescriptor( 'Buffer', null, content );
		resDesc.setParserInstructions( parserInstructions );
		this.loadingTask.resourceDescriptors.push( resDesc );
		this.loadingTask.updateCallbacks( onLoad, onMesh );
		this._parseAsync( this.loadingTask );
	},

	/**
	 *
	 * @param {THREE.WorkerLoader.LoadingTask} loadingTask
	 * @private
	 */
	_parseAsync: function ( loadingTask ) {
		var resDesc = loadingTask.resourceDescriptor;
		if ( ! THREE.WorkerLoader.Validator.isValid( loadingTask.loader ) ) {

			throw 'Unable to run "executeWithOverride" without proper "loader"!';

		}
		if ( loadingTask.loader.modelName !== undefined || loadingTask.loader.modelName !== null ) {

			resDesc.name = loadingTask.loader.modelName;

		}

		var measureTime = false;
		var scopedOnLoad = function () {
			onLoad(
				{
					detail: {
						object3d: loadingTask.baseObject3d,
						modelName: resDesc.name,
						instanceNo: resDesc.instanceNo
					}
				}
			);
			if ( measureTime && loadingTask.logging.enabled ) console.timeEnd( 'WorkerLoader parse [' + resDesc.instanceNo + '] : ' + resDesc.name );
		};
		// fast-fail in case of illegal data
		if ( ! THREE.WorkerLoader.Validator.isValid( resDesc.content ) ) {

			console.warn( 'Provided content is not a valid ArrayBuffer.' );
			scopedOnLoad()

		} else {

			measureTime = true;

		}
		if ( measureTime && loadingTask.logging.enabled ) console.time( 'WorkerLoader parse [' + resDesc.instanceNo + '] : ' + resDesc.name );

		var scopedOnMesh = function ( payload ) {
			loadingTask.meshBuilder.processPayload( payload );
		};

		loadingTask.meshBuilder.setBaseObject3d( loadingTask.baseObject3d );
		loadingTask.meshBuilder.createDefaultMaterials();
		if ( THREE.WorkerLoader.Validator.isValid( loadingTask.loader.meshBuilder ) && loadingTask.loader.meshBuilder instanceof THREE.OBJLoader.MeshBuilder ) {

			loadingTask.meshBuilder.setMaterials( loadingTask.loader.meshBuilder.getMaterials() );

		}
		loadingTask.workerSupport.validate( loadingTask.loader );
		loadingTask.workerSupport.setCallbacks( scopedOnMesh, scopedOnLoad );
		if ( loadingTask.terminateWorkerOnLoad ) loadingTask.workerSupport.setTerminateRequested( true );

		var materialNames = {};
		var materials = loadingTask.meshBuilder.getMaterials();
		for ( var materialName in materials ) materialNames[ materialName ] = materialName;


		var params = ( THREE.WorkerLoader.Validator.isValid( resDesc.parserInstructions ) ) ? resDesc.parserInstructions : {};
		// enforce async param
		params.useAsync = true;

		loadingTask.workerSupport.run(
			{
				// this is only applicable to OBJLoader
				// materialPerSmoothingGroup: this.materialPerSmoothingGroup,
				// useIndices: this.useIndices,
				// disregardNormals: this.disregardNormals
				params: params,
				logging: {
					enabled: loadingTask.logging.enabled,
					debug: loadingTask.logging.debug
				},
				materials: {
					// in async case only material names are supplied to parser
					materials: materialNames
				},
				data: {
					input: content,
					options: null
				}
			}
		)
	},

	/**
	 * Run loader async according the provided instructions.
	 * @param {object} localConfig
	 * @param {function} callbackOnLoad
	 * @param {function} [callbackOnProgress]
	 * @param {function} [callbackOnError]
	 */
	execute: function ( localConfig, callbackOnLoad, callbackOnProgress, callbackOnError ) {
		this._applyConfiguration( this, localConfig );
		this._processQueue( 0, callbackOnLoad, callbackOnProgress, callbackOnError );
	},

	_applyConfiguration: function ( scope, applicableConfiguration, forceCreation ) {
		// fast-fail
		if ( scope === undefined || scope === null || applicableConfiguration === undefined || applicableConfiguration === null ) return;

		var property, value;
		for ( property in applicableConfiguration ) {

			value = applicableConfiguration[ property ];
			if ( scope.hasOwnProperty( property ) || forceCreation ) {

				scope[ property ] = value;

			}
		}
	},

	/**
	 * Returns the WorkerSupport for e.g. configuration purposes
	 * @returns {THREE.WorkerLoader.WorkerSupport}
	 */
	getWorkerSupport: function () {
		return this.workerSupport;
	},

	setTerminateWorkerOnLoad: function ( terminateWorkerOnLoad ) {
		this.terminateWorkerOnLoad = terminateWorkerOnLoad;
	}
};

/**
 *
 * @param {String} resourceType
 * @param {String} name
 * @param {Object} content
 * @constructor
 */
THREE.WorkerLoader.ResourceDescriptor = function ( resourceType, name, content ) {
	this.name = ( name !== undefined && name !== null ) ? name : 'Unnamed_Resource';
	this.instanceNo = 0;
	this.resourceType = resourceType;
	this.content = content;
	this.url = null;
	this.filename = null;
	this.path = '';
	this.extension = null;
	this.parserInstructions = {
		useAsync: true,
		payloadType: 'arraybuffer'
	};

	this._init();
};

THREE.WorkerLoader.ResourceDescriptor.prototype = {

	constructor: THREE.WorkerLoader.ResourceDescriptor,

	_init: function () {

		if ( this.resourceType === 'Buffer' ) {

			if ( ! ( this.content instanceof ArrayBuffer ||
				this.content instanceof Int8Array ||
				this.content instanceof Uint8Array ||
				this.content instanceof Uint8ClampedArray ||
				this.content instanceof Int16Array ||
				this.content instanceof Uint16Array ||
				this.content instanceof Int32Array ||
				this.content instanceof Uint32Array ||
				this.content instanceof Float32Array ||
				this.content instanceof Float64Array ) ) {

				throw 'Provided content is neither an "ArrayBuffer" nor a "TypedArray"! Aborting...';

			}
			this.parserInstructions.payloadType = 'arraybuffer';

		} else if ( this.resourceType === 'String' ) {

			if ( ! ( typeof( this.content ) === 'string' || this.content instanceof String ) ) throw 'Provided content is not of resourceType "String"! Aborting...';
			this.parserInstructions.payloadType = 'text';

		} else if ( this.resourceType === 'URL' ) {

			this.url = this.content;
			this.filename = this.url;
			var urlParts = this.url.split( '/' );
			if ( urlParts.length > 2 ) {

				this.filename = urlParts[ urlParts.length - 1 ];
				var urlPartsPath = urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/';
				if ( urlPartsPath !== undefined && urlPartsPath !== null ) this.path = urlPartsPath;

			}
			var filenameParts = this.filename.split( '.' );
			if ( filenameParts.length > 1 ) this.extension = filenameParts[ filenameParts.length - 1 ];

		} else if ( this.resourceType === 'Metadata' ) {

			this.content = 'no_content';

		} else {

			throw 'An unsupported resourceType "' + this.resourceType + '" was provided! Aborting...'

		}
	},

	setInstanceNo: function ( instanceNo ) {
		this.instanceNo = instanceNo;
	},

	setParserInstructions: function ( parserInstructions ) {
		THREE.WorkerLoader.prototype._applyConfiguration( this.parserInstructions, parserInstructions, true );
		if ( this.parserInstructions.name === undefined || this.parserInstructions.name === null ) this.parserInstructions.name = this.name;
	}
};


THREE.WorkerLoader.Validator = {

	/**
	 * If given input is null or undefined, false is returned otherwise true.
	 *
	 * @param input Can be anything
	 * @returns {boolean}
	 */
	isValid: function( input ) {
		return ( input !== null && input !== undefined );
	},

	/**
	 * If given input is null or undefined, the defaultValue is returned otherwise the given input.
	 *
	 * @param input Can be anything
	 * @param defaultValue Can be anything
	 * @returns {*}
	 */
	verifyInput: function( input, defaultValue ) {
		return ( input === null || input === undefined ) ? defaultValue : input;
	}
};


/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 */
THREE.WorkerLoader.WorkerSupport = function () {
	console.info( 'Using THREE.WorkerLoader.WorkerSupport version: ' + THREE.WorkerLoader.WorkerSupport.WORKER_SUPPORT_VERSION );

	// check worker support first
	if ( window.Worker === undefined ) throw "This browser does not support web workers!";
	if ( window.Blob === undefined ) throw "This browser does not support Blob!";
	if ( typeof window.URL.createObjectURL !== 'function' ) throw "This browser does not support Object creation from URL!";

	this._reset();
};

THREE.WorkerLoader.WorkerSupport.prototype = {

	constructor: THREE.WorkerLoader.WorkerSupport,

	_reset: function () {
		this.logging = {
			enabled: true,
			debug: false
		};
		this.validator = THREE.WorkerLoader.Validator;

		var scope = this;
		var scopeTerminate = function (  ) {
			scope._terminate();
		};
		this.worker = {
			native: null,
			logging: true,
			workerRunner: {
				haveUserImpl: false,
				name: 'THREE.WorkerLoader.WorkerSupport._WorkerRunnerRefImpl',
				impl: THREE.WorkerLoader.WorkerSupport._WorkerRunnerRefImpl
			},
			terminateRequested: false,
			forceWorkerDataCopy: false,
			started: false,
			queuedMessage: null,
			callbacks: {
				meshBuilder: null,
				onLoad: null,
				terminate: scopeTerminate
			}
		};
	},

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.worker.logging = enabled === true;
	},

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 */
	setForceWorkerDataCopy: function ( forceWorkerDataCopy ) {
		this.worker.forceWorkerDataCopy = forceWorkerDataCopy === true;
	},

	/**
	 * Specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {Function} meshBuilder The mesh builder function. Default is {@link THREE.WorkerLoader.MeshBuilder}.
	 * @param {Function} onLoad The function that is called when parsing is complete.
	 */
	setCallbacks: function ( meshBuilder, onLoad ) {
		this.worker.callbacks.meshBuilder = this.validator.verifyInput( meshBuilder, this.worker.callbacks.meshBuilder );
		this.worker.callbacks.onLoad = this.validator.verifyInput( onLoad, this.worker.callbacks.onLoad );
	},

	/**
	 * Request termination of worker once parser is finished.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {boolean} terminateRequested True or false.
	 */
	setTerminateRequested: function ( terminateRequested ) {
		this.worker.terminateRequested = terminateRequested === true;
		if ( this.worker.terminateRequested && this.validator.isValid( this.worker.native ) && ! this.validator.isValid( this.worker.queuedMessage ) && this.worker.started ) {

			if ( this.logging.enabled ) console.info( 'Worker is terminated immediately as it is not running!' );
			this._terminate();

		}
	},

	/**
	 * Set a user-defined runner embedding the worker code and  handling communication and execution with main.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param userRunnerImpl The object reference
	 * @param userRunnerImplName The name of the object
	 */
	setUserRunnerImpl: function ( userRunnerImpl, userRunnerImplName ) {
		if ( this.validator.isValid( userRunnerImpl ) && this.validator.isValid( userRunnerImplName ) ) {

			this.worker.workerRunner.haveUserImpl = true;
			this.worker.workerRunner.impl = userRunnerImpl;
			this.worker.workerRunner.name = userRunnerImplName;
			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using "' + userRunnerImplName + '" as Runner class for worker.' );

		}
	},

	/**
	 * Validate the status of worker code and the derived worker.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {Object} loader The loader that shall be used to create the parser code.
	 */
	validate: function ( loader ) {
		if ( this.validator.isValid( this.worker.native ) ) return;
		if ( this.logging.enabled ) {

			console.info( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );
			if ( ! this.worker.workerRunner.haveUserImpl ) console.info( 'WorkerSupport: Using DEFAULT "' + this.worker.workerRunner.name + '" as Runner class for worker.' );

		}
		var codeBuilderInstructions = loader.buildWorkerCode( THREE.WorkerLoader.WorkerSupport.CodeSerializer );
		var userWorkerCode = codeBuilderInstructions.code;
		userWorkerCode += 'THREE.WorkerLoader = {\n\tWorkerSupport: {},\n\tParser: ' + codeBuilderInstructions.parserName + '\n};\n\n';
		userWorkerCode += THREE.WorkerLoader.WorkerSupport.CodeSerializer.serializeClass( this.worker.workerRunner.name, this.worker.workerRunner.impl );
		userWorkerCode += 'new ' + this.worker.workerRunner.name + '();\n\n';

		var scope = this;
		var scopedReceiveWorkerMessage = function ( event ) {
			scope._receiveWorkerMessage( event );
		};
		var initWorker = function ( stringifiedCode ) {
			var blob = new Blob( [ stringifiedCode ], { type: 'application/javascript' } );
			scope.worker.native = new Worker( window.URL.createObjectURL( blob ) );
			scope.worker.native.onmessage = scopedReceiveWorkerMessage;

			// process stored queuedMessage
			scope._postMessage();
		};

		if ( this.validator.isValid( codeBuilderInstructions.libs ) &&
				this.validator.isValid( codeBuilderInstructions.libs.locations ) &&
				codeBuilderInstructions.libs.locations.length > 0 ) {

			var libsContent = '';
			var loadAllLibraries = function ( path, locations ) {
				if ( locations.length === 0 ) {

					initWorker( libsContent + '\n\n' + userWorkerCode );
					if ( scope.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

				} else {

					var loadedLib = function ( contentAsString ) {
						libsContent += contentAsString;
						loadAllLibraries( path, locations );
					};

					var fileLoader = new THREE.FileLoader();
					fileLoader.setPath( path );
					fileLoader.setResponseType( 'text' );
					fileLoader.load( locations[ 0 ], loadedLib );
					locations.shift();

				}
			};
			codeBuilderInstructions.libs.path = this.validator.verifyInput( codeBuilderInstructions.libs.path, '' );
			loadAllLibraries( codeBuilderInstructions.libs.path, codeBuilderInstructions.libs.locations );

		} else {

			initWorker( userWorkerCode );
			if ( this.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

		}
	},

	/**
	 * Executed in worker scope
	 */
	_receiveWorkerMessage: function ( event ) {
		var payload = event.data;
		switch ( payload.cmd ) {
			case 'meshData':
			case 'materialData':
			case 'imageData':
				this.worker.callbacks.meshBuilder( payload );
				break;

			case 'complete':
				this.worker.queuedMessage = null;
				this.worker.started = false;
				this.worker.callbacks.onLoad( payload.msg );

				if ( this.worker.terminateRequested ) {

					if ( this.worker.logging.enabled ) console.info( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Run is complete. Terminating application on request!' );
					this.worker.callbacks.terminate();

				}
				break;

			case 'error':
				console.error( 'WorkerSupport [' + this.worker.workerRunner.namee + ']: Reported error: ' + payload.msg );
				this.worker.queuedMessage = null;
				this.worker.started = false;
				this.worker.callbacks.onLoad( payload.msg );

				if ( this.worker.terminateRequested ) {

					if ( this.worker.logging.enabled ) console.info( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Run reported error. Terminating application on request!' );
					this.worker.callbacks.terminate();

				}
				break;

			default:
				console.error( 'WorkerSupport [' + this.worker.workerRunner.name + ']: Received unknown command: ' + payload.cmd );
				break;

		}
	},

	/**
	 * Runs the parser with the provided configuration.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	run: function( payload ) {
		if ( this.validator.isValid( this.worker.queuedMessage ) ) {

			console.warn( 'Already processing message. Rejecting new run instruction' );
			return;

		} else {

			this.worker.queuedMessage = payload;
			this.worker.started = true;

		}
		if ( ! this.validator.isValid( this.worker.callbacks.meshBuilder ) ) throw 'Unable to run as no "MeshBuilder" callback is set.';
		if ( ! this.validator.isValid( this.worker.callbacks.onLoad ) ) throw 'Unable to run as no "onLoad" callback is set.';
		if ( payload.cmd !== 'run' ) payload.cmd = 'run';
		if ( this.validator.isValid( payload.logging ) ) {

			payload.logging.enabled = payload.logging.enabled === true;
			payload.logging.debug = payload.logging.debug === true;

		} else {

			payload.logging = {
				enabled: true,
				debug: false
			}

		}
		this._postMessage();
	},

	_postMessage: function () {
		if ( this.validator.isValid( this.worker.queuedMessage ) && this.validator.isValid( this.worker.native ) ) {

			if ( this.worker.queuedMessage.data.input instanceof ArrayBuffer ) {

				var content;
				if ( this.worker.forceWorkerDataCopy ) {

					content = this.worker.queuedMessage.data.input.slice( 0 );

				} else {

					content = this.worker.queuedMessage.data.input;

				}
				this.worker.native.postMessage( this.worker.queuedMessage, [ content ] );

			} else {

				this.worker.native.postMessage( this.worker.queuedMessage );

			}

		}
	},

	_terminate: function () {
		this.worker.native.terminate();
		this._reset();
	}
};
THREE.WorkerLoader.WorkerSupport.WORKER_SUPPORT_VERSION = '3.0.0-dev';


THREE.WorkerLoader.WorkerSupport.CodeSerializer = {

	/**
	 *
	 * @param fullName
	 * @param object
	 * @returns {string}
	 */
	serializeObject: function ( fullName, object ) {
		var objectString = fullName + ' = {\n';
		var part;
		for ( var name in object ) {

			part = object[ name ];
			if ( typeof( part ) === 'string' || part instanceof String ) {

				part = part.replace( '\n', '\\n' );
				part = part.replace( '\r', '\\r' );
				objectString += '\t' + name + ': "' + part + '",\n';

			} else if ( part instanceof Array ) {

				objectString += '\t' + name + ': [' + part + '],\n';

			} else if ( Number.isInteger( part ) ) {

				objectString += '\t' + name + ': ' + part + ',\n';

			} else if ( typeof part === 'function' ) {

				objectString += '\t' + name + ': ' + part + ',\n';

			}

		}
		objectString += '}\n\n';

		return objectString;
	},

	/**
	 *
	 * @param fullName
	 * @param object
	 * @param basePrototypeName
	 * @param ignoreFunctions
	 * @returns {string}
	 */
	serializeClass: function ( fullName, object, basePrototypeName, ignoreFunctions ) {
		var funcString, objectPart, constructorString;
		var prototypeFunctions = '';

		if ( ! Array.isArray( ignoreFunctions ) ) ignoreFunctions = [];

		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			if ( name === 'constructor' ) {

				funcString = objectPart.toString();
				constructorString = fullName + ' = ' + funcString + ';\n\n';

			} else if ( typeof objectPart === 'function' ) {

				if ( ignoreFunctions.indexOf( name ) < 0 ) {

					funcString = objectPart.toString();
					prototypeFunctions += '\t' + name + ': ' + funcString + ',\n\n';

				}

			}

		}

		var objectString = constructorString;
		objectString += fullName + '.prototype = {\n\n';
		objectString += '\tconstructor: ' + fullName + ',\n\n';
		objectString += prototypeFunctions;
		objectString += '\n};\n\n';

		if ( basePrototypeName !== null && basePrototypeName !== undefined ) {

			objectString += '\n';
			objectString += fullName + '.prototype = Object.create( ' + basePrototypeName + '.prototype );\n';
			objectString += fullName + '.constructor = ' + fullName + ';\n';
			objectString += '\n';
		}

		return objectString;
	},

	serializeSingleton: function ( fullName, object, internalName, basePrototypeName, ignoreFunctions ) {
		var objectName = ( Validator.isValid( internalName ) ) ? internalName : object.name;

		var objectString = fullName + ' = (function () {\n\n';
		var inheritanceBlock = '\n';
		if ( Validator.isValid( basePrototypeName ) ) {

			inheritanceBlock += '\t' + objectName + '.prototype = Object.create( ' + basePrototypeName + '.prototype );\n';
			inheritanceBlock += '\t' + objectName + '.constructor = ' + objectName + ';\n\n';

		}
		objectString += inheritanceBlock;
		objectString += '\t' + object.prototype.constructor.toString() + '\n\n';

		var funcString, objectPart;
		ignoreFunctions = Validator.verifyInput( ignoreFunctions, [] );
		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			if ( typeof objectPart === 'function' && ignoreFunctions.indexOf( name ) < 0 ) {

				funcString = objectPart.toString();
				objectString += '\t' + objectName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

			}

		}
		objectString += '\treturn ' + objectName + ';\n';
		objectString += '})();\n\n';

		return objectString;
	}
};


/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 * @constructor
 */
THREE.WorkerLoader.WorkerSupport._WorkerRunnerRefImpl = function () {
	var scope = this;
	var scopedRunner = function( event ) {
		scope.processMessage( event.data );
	};
	self.addEventListener( 'message', scopedRunner, false );
};

THREE.WorkerLoader.WorkerSupport._WorkerRunnerRefImpl.prototype = {

	constructor: THREE.WorkerLoader.WorkerSupport._WorkerRunnerRefImpl,

	/**
	 * Applies values from parameter object via set functions or via direct assignment.
	 * @memberOf THREE.WorkerLoader.WorkerRunnerRefImpl
	 *
	 * @param {Object} parser The parser instance
	 * @param {Object} params The parameter object
	 */
	applyProperties: function ( parser, params ) {
		var property, funcName, values;
		for ( property in params ) {
			funcName = 'set' + property.substring( 0, 1 ).toLocaleUpperCase() + property.substring( 1 );
			values = params[ property ];

			if ( typeof parser[ funcName ] === 'function' ) {

				parser[ funcName ]( values );

			} else if ( parser.hasOwnProperty( property ) ) {

				parser[ property ] = values;

			}
		}
	},

	/**
	 * Configures the Parser implementation according the supplied configuration object.
	 * @memberOf THREE.WorkerLoader.WorkerRunnerRefImpl
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	processMessage: function ( payload ) {
		if ( payload.cmd === 'run' ) {

			var callbacks = {
				callbackMeshBuilder: function ( payload ) {
					self.postMessage( payload );
				},
				callbackProgress: function ( text ) {
					if ( payload.logging.enabled && payload.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
			var parser = new THREE.WorkerLoader.Parser();
			if ( typeof parser[ 'setLogging' ] === 'function' ) parser.setLogging( payload.logging.enabled, payload.logging.debug );
			this.applyProperties( parser, payload.params );
			this.applyProperties( parser, payload.materials );
			this.applyProperties( parser, callbacks );
			parser.workerScope = self;
			parser.parse( payload.data.input, payload.data.options );

			if ( payload.logging.enabled ) console.log( 'WorkerRunner: Run complete!' );

			callbacks.callbackMeshBuilder( {
				cmd: 'complete',
				msg: 'WorkerRunner completed run.'
			} );

		} else {

			console.error( 'WorkerRunner: Received unknown command: ' + payload.cmd );

		}
	}
};
