/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 */
THREE.LoaderSupport.WorkerSupport = function () {
	console.info( 'Using THREE.LoaderSupport.WorkerSupport version: ' + THREE.LoaderSupport.WorkerSupport.WORKER_SUPPORT_VERSION );
	this.logging = {
		enabled: true,
		debug: false
	};

	//Choose implementation of worker based on environment
	this.loaderWorker = typeof "window" !== undefined ? new THREE.LoaderSupport.WorkerSupport.LoaderWorker() : new THREE.LoaderSupport.WorkerSupport.NodeLoaderWorker();
};

THREE.LoaderSupport.WorkerSupport.WORKER_SUPPORT_VERSION = '2.2.1';

THREE.LoaderSupport.WorkerSupport.prototype = {

	constructor: THREE.LoaderSupport.WorkerSupport,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.loaderWorker.setLogging( this.logging.enabled, this.logging.debug );
	},

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 */
	setForceWorkerDataCopy: function ( forceWorkerDataCopy ) {
		this.loaderWorker.setForceCopy( forceWorkerDataCopy );
	},

	/**
	 * Validate the status of worker code and the derived worker.
	 *
	 * @param {Function} functionCodeBuilder Function that is invoked with funcBuildObject and funcBuildSingleton that allows stringification of objects and singletons.
	 * @param {String} parserName Name of the Parser object
	 * @param {String[]} libLocations URL of libraries that shall be added to worker code relative to libPath
	 * @param {String} libPath Base path used for loading libraries
	 * @param {THREE.LoaderSupport.WorkerRunnerRefImpl} runnerImpl The default worker parser wrapper implementation (communication and execution). An extended class could be passed here.
	 */
	validate: function ( functionCodeBuilder, parserName, libLocations, libPath, runnerImpl ) {
		if ( THREE.LoaderSupport.Validator.isValid( this.loaderWorker.worker ) ) return;

		if ( this.logging.enabled ) {

			console.info( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );

		}
		if ( THREE.LoaderSupport.Validator.isValid( runnerImpl ) ) {

			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using "' + runnerImpl.runnerName + '" as Runner class for worker.' );

		} else if ( typeof "window" !== undefined ) { //Browser implementation

			runnerImpl = THREE.LoaderSupport.WorkerRunnerRefImpl;
			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using DEFAULT "THREE.LoaderSupport.WorkerRunnerRefImpl" as Runner class for worker.' );

		} else { //NodeJS implementation

			runnerImpl = THREE.LoaderSupport.NodeWorkerRunnerRefImpl;
			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using DEFAULT "THREE.LoaderSupport.NodeWorkerRunnerRefImpl" as Runner class for worker.' );

		}

		var userWorkerCode = functionCodeBuilder( THREE.LoaderSupport.WorkerSupport.CodeSerializer );
		userWorkerCode += 'var Parser = '+ parserName +  ';\n\n';
		userWorkerCode += THREE.LoaderSupport.WorkerSupport.CodeSerializer.serializeClass( runnerImpl.runnerName, runnerImpl );
		userWorkerCode += 'new ' + runnerImpl.runnerName + '();\n\n';

		var scope = this;
		if ( THREE.LoaderSupport.Validator.isValid( libLocations ) && libLocations.length > 0 ) {

			var libsContent = '';
			var loadAllLibraries = function ( path, locations ) {
				if ( locations.length === 0 ) {

					scope.loaderWorker.initWorker( libsContent + userWorkerCode, runnerImpl.runnerName );
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
			loadAllLibraries( libPath, libLocations );

		} else {

			this.loaderWorker.initWorker( userWorkerCode, runnerImpl.runnerName );
			if ( this.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

		}
	},

	/**
	 * Specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 *
	 * @param {Function} meshBuilder The mesh builder function. Default is {@link THREE.LoaderSupport.MeshBuilder}.
	 * @param {Function} onLoad The function that is called when parsing is complete.
	 */
	setCallbacks: function ( meshBuilder, onLoad ) {
		this.loaderWorker.setCallbacks( meshBuilder, onLoad );
	},

	/**
	 * Runs the parser with the provided configuration.
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	run: function ( payload ) {
		this.loaderWorker.run( payload );
	},

	/**
	 * Request termination of worker once parser is finished.
	 *
	 * @param {boolean} terminateRequested True or false.
	 */
	setTerminateRequested: function ( terminateRequested ) {
		this.loaderWorker.setTerminateRequested( terminateRequested );
	}

};


THREE.LoaderSupport.WorkerSupport.LoaderWorker = function () {
	this._reset();
};

THREE.LoaderSupport.WorkerSupport.LoaderWorker.prototype = {

	constructor: THREE.LoaderSupport.WorkerSupport.LoaderWorker,

	_reset: function () {
		this.logging = {
			enabled: true,
			debug: false
		};
		this.worker = null;
		this.runnerImplName = null;
		this.callbacks = {
			meshBuilder: null,
			onLoad: null
		};
		this.terminateRequested = false;
		this.queuedMessage = null;
		this.started = false;
		this.forceCopy = false;
	},

	/**
	 * Check support for Workers and other necessary features returning
	 * reason if the environment is unsupported
	 *
	 * @returns {string|undefined} Returns undefined if supported, or
	 * string with error if not supported
	 */
	checkSupport: function() {
		if ( window.Worker === undefined ) return "This browser does not support web workers!";
		if ( window.Blob === undefined  ) return "This browser does not support Blob!";
		if ( typeof window.URL.createObjectURL !== 'function'  ) return "This browser does not support Object creation from URL!";
	},

	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	},

	setForceCopy: function ( forceCopy ) {
		this.forceCopy = forceCopy === true;
	},

	initWorker: function ( code, runnerImplName ) {
		var supportError = this.checkSupport();
		if ( supportError ) {

			throw supportError;

		}
		this.runnerImplName = runnerImplName;

		var blob = new Blob( [ code ], { type: 'application/javascript' } );
		this.worker = new Worker( window.URL.createObjectURL( blob ) );

		this.worker.onmessage = this._receiveWorkerMessage;

		// set referemce to this, then processing in worker scope within "_receiveWorkerMessage" can access members
		this.worker.runtimeRef = this;

		// process stored queuedMessage
		this._postMessage();
	},

	/**
	 * Executed in worker scope
	 */
	_receiveWorkerMessage: function ( e ) {
		var payload = e.data;
		switch ( payload.cmd ) {
			case 'meshData':
			case 'materialData':
			case 'imageData':
				this.runtimeRef.callbacks.meshBuilder( payload );
				break;

			case 'complete':
				this.runtimeRef.queuedMessage = null;
				this.started = false;
				this.runtimeRef.callbacks.onLoad( payload.msg );

				if ( this.runtimeRef.terminateRequested ) {

					if ( this.runtimeRef.logging.enabled ) console.info( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Run is complete. Terminating application on request!' );
					this.runtimeRef._terminate();

				}
				break;

			case 'error':
				console.error( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Reported error: ' + payload.msg );
				this.runtimeRef.queuedMessage = null;
				this.started = false;
				this.runtimeRef.callbacks.onLoad( payload.msg );

				if ( this.runtimeRef.terminateRequested ) {

					if ( this.runtimeRef.logging.enabled ) console.info( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Run reported error. Terminating application on request!' );
					this.runtimeRef._terminate();

				}
				break;

			default:
				console.error( 'WorkerSupport [' + this.runtimeRef.runnerImplName + ']: Received unknown command: ' + payload.cmd );
				break;

		}
	},

	setCallbacks: function ( meshBuilder, onLoad ) {
		this.callbacks.meshBuilder = THREE.LoaderSupport.Validator.verifyInput( meshBuilder, this.callbacks.meshBuilder );
		this.callbacks.onLoad = THREE.LoaderSupport.Validator.verifyInput( onLoad, this.callbacks.onLoad );
	},

	run: function( payload ) {
		if ( THREE.LoaderSupport.Validator.isValid( this.queuedMessage ) ) {

			console.warn( 'Already processing message. Rejecting new run instruction' );
			return;

		} else {

			this.queuedMessage = payload;
			this.started = true;

		}
		if ( ! THREE.LoaderSupport.Validator.isValid( this.callbacks.meshBuilder ) ) throw 'Unable to run as no "MeshBuilder" callback is set.';
		if ( ! THREE.LoaderSupport.Validator.isValid( this.callbacks.onLoad ) ) throw 'Unable to run as no "onLoad" callback is set.';
		if ( payload.cmd !== 'run' ) payload.cmd = 'run';
		if ( THREE.LoaderSupport.Validator.isValid( payload.logging ) ) {

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
		if ( THREE.LoaderSupport.Validator.isValid( this.queuedMessage ) && THREE.LoaderSupport.Validator.isValid( this.worker ) ) {

			if ( this.queuedMessage.data.input instanceof ArrayBuffer ) {

				var content;
				if ( this.forceCopy ) {

					content = this.queuedMessage.data.input.slice( 0 );

				} else {

					content = this.queuedMessage.data.input;

				}
				this.worker.postMessage( this.queuedMessage, [ content ] );

			} else {

				this.worker.postMessage( this.queuedMessage );

			}

		}
	},

	setTerminateRequested: function ( terminateRequested ) {
		this.terminateRequested = terminateRequested === true;
		if ( this.terminateRequested && THREE.LoaderSupport.Validator.isValid( this.worker ) && ! THREE.LoaderSupport.Validator.isValid( this.queuedMessage ) && this.started ) {

			if ( this.logging.enabled ) console.info( 'Worker is terminated immediately as it is not running!' );
			this._terminate();

		}
	},

	_terminate: function () {
		this.worker.terminate();
		this._reset();
	}
};


THREE.LoaderSupport.WorkerSupport.CodeSerializer = {

	/**
	 *
	 * @param fullName
	 * @param object
	 * @returns {string}
	 */
	serializeObject: function ( fullName, object ) {
		var objectString = fullName + ' = {\n\n';
		var part;
		for ( var name in object ) {

			part = object[ name ];
			if ( typeof( part ) === 'string' || part instanceof String ) {

				part = part.replace( '\n', '\\n' );
				part = part.replace( '\r', '\\r' );
				objectString += '\t' + name + ': "' + part + '",\n';

			} else if ( part instanceof Array ) {

				objectString += '\t' + name + ': [' + part + '],\n';

			} else if ( typeof part === 'object' ) {

				// TODO: Short-cut for now. Recursion required?
				objectString += '\t' + name + ': {},\n';

			} else {

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
	serializeClass: function ( fullName, object, constructorName, basePrototypeName, ignoreFunctions, includeFunctions, overrideFunctions ) {
		var valueString, objectPart, constructorString, i, funcOverride;
		var prototypeFunctions = [];
		var objectProperties = [];
		var objectFunctions = [];
		var isExtended = ( basePrototypeName !== null && basePrototypeName !== undefined );

		if ( ! Array.isArray( ignoreFunctions ) ) ignoreFunctions = [];
		if ( ! Array.isArray( includeFunctions ) ) includeFunctions = null;
		if ( ! Array.isArray( overrideFunctions ) ) overrideFunctions = [];

		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			valueString = objectPart.toString();
			if ( name === 'constructor' ) {

				constructorString = fullName + ' = ' + valueString + ';\n\n';

			} else if ( typeof objectPart === 'function' ) {

				if ( ignoreFunctions.indexOf( name ) < 0 && ( includeFunctions === null || includeFunctions.indexOf( name ) >= 0 ) ) {

					funcOverride = overrideFunctions[ name ];
					if ( funcOverride && funcOverride.fullName === fullName + '.prototype.' + name ) {

						valueString = funcOverride.code;

					}
					if ( isExtended ) {

						prototypeFunctions.push( fullName + '.prototype.' + name + ' = ' + valueString + ';\n\n' );

					} else {

						prototypeFunctions.push( '\t' + name + ': ' + valueString + ',\n\n' );

					}
				}

			}

		}
		for ( var name in object ) {

			objectPart = object[ name ];

			if ( typeof objectPart === 'function' ) {

				if ( ignoreFunctions.indexOf( name ) < 0 && ( includeFunctions === null || includeFunctions.indexOf( name ) >= 0 ) ) {

					funcOverride = overrideFunctions[ name ];
					if ( funcOverride && funcOverride.fullName === fullName + '.' + name ) {

						valueString = funcOverride.code;

					} else {

						valueString = objectPart.toString();

					}
					objectFunctions.push( fullName + '.' + name + ' = ' + valueString + ';\n\n' );

				}

			} else {

				if ( typeof( objectPart ) === 'string' || objectPart instanceof String) {

					valueString = '\"' + objectPart.toString() + '\"';

				} else if ( typeof objectPart === 'object' ) {

					// TODO: Short-cut for now. Recursion required?
					valueString = "{}";

				} else {

					valueString = objectPart;

				}
				objectProperties.push( fullName + '.' + name + ' = ' + valueString + ';\n' );

			}

		}
		if ( ( constructorString === undefined || constructorString === null ) && typeof object.prototype.constructor === 'function' ) {

			constructorString = fullName + ' = ' + object.prototype.constructor.toString().replace( constructorName, '' );

		}
		var objectString = constructorString + '\n\n';
		if ( isExtended ) {

			objectString += fullName + '.prototype = Object.create( ' + basePrototypeName + '.prototype );\n';

		}
		objectString += fullName + '.prototype.constructor = ' + fullName + ';\n';
		objectString += '\n\n';

		for ( i = 0; i < objectProperties.length; i ++ ) objectString += objectProperties[ i ];
		objectString += '\n\n';

		for ( i = 0; i < objectFunctions.length; i ++ ) objectString += objectFunctions[ i ];
		objectString += '\n\n';

		if ( isExtended ) {

			for ( i = 0; i < prototypeFunctions.length; i ++ ) objectString += prototypeFunctions[ i ];

		} else {

			objectString += fullName + '.prototype = {\n\n';
			for ( i = 0; i < prototypeFunctions.length; i ++ ) objectString += prototypeFunctions[ i ];
			objectString += '\n};';

		}
		objectString += '\n\n';

		return objectString;
	},
};

/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 *
 * @class
 */
THREE.LoaderSupport.WorkerRunnerRefImpl = function () {
	var scopedRunner = function( event ) {
		this.processMessage( event.data );
	};
	this.getParentScope().addEventListener( 'message', scopedRunner.bind( this ) );
};

THREE.LoaderSupport.WorkerRunnerRefImpl.runnerName = 'THREE.LoaderSupport.WorkerRunnerRefImpl';

THREE.LoaderSupport.WorkerRunnerRefImpl.prototype = {

	constructor: THREE.LoaderSupport.WorkerRunnerRefImpl,

	/**
	 * Returns the parent scope that this worker was spawned in.
	 *
	 * @returns {WorkerGlobalScope|Object} Returns a references
	 * to the parent global scope or compatible type.
	 */
	getParentScope: function () {
		return self;
	},

	/**
	 * Applies values from parameter object via set functions or via direct assignment.
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
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	processMessage: function ( payload ) {
		if ( payload.cmd === 'run' ) {

			var self = this.getParentScope();
			var callbacks = {
				callbackMeshBuilder: function ( payload ) {
					self.postMessage( payload );
				},
				callbackProgress: function ( text ) {
					if ( payload.logging.enabled && payload.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
			var parser = new Parser();
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

