if ( THREE.WorkerLoader === undefined ) { THREE.WorkerLoader = {} }

/**
 *
 * @param manager
 * @param loader
 * @param loaderRootNode
 * @constructor
 */
THREE.WorkerLoader = function ( manager, loader, loaderRootNode ) {

	console.info( 'Using THREE.WorkerLoader version: ' + THREE.WorkerLoader.WORKER_LOADER_VERSION );

	this.validator = THREE.WorkerLoader.Validator;
	this.manager = this.validator.verifyInput( manager, THREE.DefaultLoadingManager );
	this.logging = {
		enabled: true,
		debug: false
	};


	this.fileLoader = new THREE.FileLoader( this.manager );
	this.fileLoader.setResponseType( 'arraybuffer' );

	this.loader = loader;
	this.loaderRootNode = loaderRootNode;
	this.workerSupport = new THREE.WorkerLoader.WorkerSupport();
	this.meshBuilder = new THREE.OBJLoader.MeshBuilder();
};
THREE.WorkerLoader.WORKER_LOADER_VERSION = '1.0.0-dev';


THREE.WorkerLoader.prototype = {

	constructor: THREE.WorkerLoader,

	/**
	 * Use this method to load a file from the given URL and parse it asynchronously.
	 * @memberOf THREE.WorkerLoader
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {callback} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {callback} [onMesh] A function to be called after a new mesh raw data becomes available (e.g. alteration).
	 */
	load: function ( url, onLoad, onProgress, onError, onMesh ) {
		var scope = this;
		if ( ! this.validator.isValid( onProgress ) ) {
			var numericalValueRef = 0;
			var numericalValue = 0;
			onProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				numericalValue = event.loaded / event.total;
				if ( numericalValue > numericalValueRef ) {

					numericalValueRef = numericalValue;
					var output = 'Download of "' + url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
					scope.onProgress( 'progressLoad', output, numericalValue );

				}
			};
		}

		if ( ! this.validator.isValid( onProgress ) ) {
			onError = function ( event ) {
				var output = 'Error occurred while downloading "' + url + '"';
				console.error( output + ': ' + event );
				scope.onProgress( 'error', output, - 1 );
			};
		}

		this.fileLoader.setPath( this.loader.path );
		this.fileLoader.load( url, function ( content ) {
			scope.parse( content, onLoad );

		}, onProgress, onError );
	},

	/**
	 * Parses content asynchronously from arraybuffer.
	 *
	 * @param {arraybuffer} content data as Uint8Array
	 * @param {callback} onLoad Called after worker successfully completed loading
	 */
	parse: function ( content, onLoad ) {
		var scope = this;
		var measureTime = false;
		var scopedOnLoad = function () {
			onLoad(
				{
					detail: {
						loaderRootNode: scope.loaderRootNode,
						modelName: scope.modelName,
						instanceNo: scope.instanceNo
					}
				}
			);
			if ( measureTime && scope.logging.enabled ) console.timeEnd( 'WWOBJLoader2 parseAsync: ' + scope.loader.modelName );
		};
		// fast-fail in case of illegal data
		if ( ! this.validator.isValid( content ) ) {

			console.warn( 'Provided content is not a valid ArrayBuffer.' );
			scopedOnLoad()

		} else {

			measureTime = true;

		}
		if ( measureTime && this.logging.enabled ) console.time( 'WorkerLoader parse: ' + this.loader.modelName );

		this.meshBuilder.init( this.loaderRootNode );
		this.workerSupport.validate( this.loader.buildWorkerCode, 'Parser' );
		this.workerSupport.setCallbacks( this.meshBuilder.processPayload, scopedOnLoad );
		if ( scope.terminateWorkerOnLoad ) this.workerSupport.setTerminateRequested( true );

		var materialNames = {};
		var materials = this.meshBuilder.getMaterials();
		for ( var materialName in materials ) materialNames[ materialName ] = materialName;

		this.workerSupport.run(
			{
				params: {
					useAsync: true,
					materialPerSmoothingGroup: this.materialPerSmoothingGroup,
					useIndices: this.useIndices,
					disregardNormals: this.disregardNormals
				},
				logging: {
					enabled: this.logging.enabled,
					debug: this.logging.debug
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
	 * Run the loader according the provided instructions.
	 * @memberOf THREE.WorkerLoader
	 *
	 * @param {THREE.WorkerLoader.PrepData} prepData All parameters and resources required for execution
	 * @param {THREE.WorkerLoader.WorkerSupport} [workerSupportExternal] Use pre-existing WorkerSupport
	 */
	execute: function ( prepData, workerSupportExternal ) {

	},

	/**
	 * Announce feedback which is give to the registered callbacks.
	 * @memberOf THREE.WorkerLoader
	 * @private
	 *
	 * @param {string} type The type of event
	 * @param {string} text Textual description of the event
	 * @param {number} numericalValue Numerical value describing the progress
	 */
	_onProgress: function ( type, text, numericalValue ) {
		var content = this.validator.isValid( text ) ? text : '';
		var event = {
			detail: {
				type: type,
				modelName: this.modelName,
				instanceNo: this.instanceNo,
				text: content,
				numericalValue: numericalValue
			}
		};
		if ( this.validator.isValid( this.callbacks.onProgress ) ) this.callbacks.onProgress( event );
		if ( this.logging.enabled && this.logging.debug ) console.debug( content );
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
	this.logging = {
		enabled: true,
		debug: false
	};
	this.validator = THREE.WorkerLoader.Validator;

	// check worker support first
	if ( window.Worker === undefined ) throw "This browser does not support web workers!";
	if ( window.Blob === undefined ) throw "This browser does not support Blob!";
	if ( typeof window.URL.createObjectURL !== 'function' ) throw "This browser does not support Object creation from URL!";

	this.nativeWorkerWrapper = new THREE.WorkerLoader.WorkerSupport._NativeWorkerWrapper();
};
THREE.WorkerLoader.WorkerSupport.WORKER_SUPPORT_VERSION = '3.0.0-dev';

THREE.WorkerLoader.WorkerSupport.prototype = {

	constructor: THREE.WorkerLoader.WorkerSupport,

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
		this.nativeWorkerWrapper.setLogging( this.logging.enabled, this.logging.debug );
	},

	/**
	 * Forces all ArrayBuffers to be transferred to worker to be copied.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {boolean} forceWorkerDataCopy True or false.
	 */
	setForceWorkerDataCopy: function ( forceWorkerDataCopy ) {
		this.nativeWorkerWrapper.setForceCopy( forceWorkerDataCopy );
	},

	/**
	 * Validate the status of worker code and the derived worker.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {Function} functionCodeBuilder Function that is invoked with funcBuildObject and funcBuildSingleton that allows stringification of objects and singletons.
	 * @param {String} parserName Name of the Parser object
	 * @param {String[]} libLocations URL of libraries that shall be added to worker code relative to libPath
	 * @param {String} libPath Base path used for loading libraries
	 * @param {THREE.WorkerLoader.WorkerRunnerRefImpl} runnerImpl The default worker parser wrapper implementation (communication and execution). An extended class could be passed here.
	 */
	validate: function ( functionCodeBuilder, parserName, libLocations, libPath, runnerImpl ) {
		if ( this.validator.isValid( this.nativeWorkerWrapper.worker ) ) return;

		if ( this.logging.enabled ) {

			console.info( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );

		}
		if ( this.validator.isValid( runnerImpl ) ) {

			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using "' + runnerImpl.name + '" as Runner class for worker.' );

		} else {

			runnerImpl = THREE.WorkerLoader.WorkerSupport.WorkerRunnerRefImpl;
			if ( this.logging.enabled ) console.info( 'WorkerSupport: Using DEFAULT "THREE.WorkerLoader.WorkerRunnerRefImpl" as Runner class for worker.' );

		}
		var scope = this;
		var scopedSerializeObject = function ( fullName, object ) {
			scope.serializeObject( fullName, object );
		};
		var scopedSerializeClass = function ( fullName, object, internalName, basePrototypeName, ignoreFunctions ) {
			scope.serializeClass( fullName, object, internalName, basePrototypeName, ignoreFunctions );
		};
		var userWorkerCode = functionCodeBuilder( scopedSerializeObject, scopedSerializeClass );
		userWorkerCode += 'var Parser = '+ parserName +  ';\n\n';
		userWorkerCode += this.serializeClass( runnerImpl.name, runnerImpl );
		userWorkerCode += 'new ' + runnerImpl.name + '();\n\n';


		if ( this.validator.isValid( libLocations ) && libLocations.length > 0 ) {

			var libsContent = '';
			var loadAllLibraries = function ( path, locations ) {
				if ( locations.length === 0 ) {

					scope.nativeWorkerWrapper.initWorker( libsContent + userWorkerCode, runnerImpl.name );
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

			this.nativeWorkerWrapper.initWorker( userWorkerCode, runnerImpl.name );
			if ( this.logging.enabled ) console.timeEnd( 'buildWebWorkerCode' );

		}
	},

	/**
	 * Specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {Function} meshBuilder The mesh builder function. Default is {@link THREE.WorkerLoader.MeshBuilder}.
	 * @param {Function} onLoad The function that is called when parsing is complete.
	 */
	setCallbacks: function ( meshBuilder, onLoad ) {
		this.nativeWorkerWrapper.setCallbacks( meshBuilder, onLoad );
	},

	/**
	 * Runs the parser with the provided configuration.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	run: function ( payload ) {
		this.nativeWorkerWrapper.run( payload );
	},

	/**
	 * Request termination of worker once parser is finished.
	 * @memberOf THREE.WorkerLoader.WorkerSupport
	 *
	 * @param {boolean} terminateRequested True or false.
	 */
	setTerminateRequested: function ( terminateRequested ) {
		this.nativeWorkerWrapper.setTerminateRequested( terminateRequested );
	},

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
	 * @param internalName
	 * @param basePrototypeName
	 * @param ignoreFunctions
	 * @returns {string}
	 */
	serializeClass: function ( fullName, object, internalName, basePrototypeName, ignoreFunctions ) {
		var objectString = '';
		var objectName = ( this.validator.isValid( internalName ) ) ? internalName : object.name;

		var funcString, objectPart, constructorString;
		ignoreFunctions = this.validator.verifyInput( ignoreFunctions, [] );
		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			if ( name === 'constructor' ) {

				funcString = objectPart.toString();
				funcString = funcString.replace( 'function', '' );
				constructorString = '\tfunction ' + objectName + funcString + ';\n\n';

			} else if ( typeof objectPart === 'function' ) {

				if ( ignoreFunctions.indexOf( name ) < 0 ) {

					funcString = objectPart.toString();
					objectString += '\t' + objectName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

				}

			}

		}
		objectString += '\treturn ' + objectName + ';\n';
		objectString += '})();\n\n';

		var inheritanceBlock = '';
		if ( this.validator.isValid( basePrototypeName ) ) {

			inheritanceBlock += '\n';
			inheritanceBlock += objectName + '.prototype = Object.create( ' + basePrototypeName + '.prototype );\n';
			inheritanceBlock += objectName + '.constructor = ' + objectName + ';\n';
			inheritanceBlock += '\n';
		}
		if ( ! this.validator.isValid( constructorString ) ) {

			constructorString = fullName + ' = (function () {\n\n';
			constructorString += inheritanceBlock + '\t' + object.prototype.constructor.toString() + '\n\n';
			objectString = constructorString + objectString;

		} else {

			objectString = fullName + ' = (function () {\n\n' + inheritanceBlock + constructorString + objectString;

		}

		return objectString;
	}

};


/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 * @constructor
 */
THREE.WorkerLoader.WorkerSupport.WorkerRunnerRefImpl = function () {
	var scope = this;
	var scopedRunner = function( event ) {
		scope.processMessage( event.data );
	};
	self.addEventListener( 'message', scopedRunner, false );
};

THREE.WorkerLoader.WorkerSupport.WorkerRunnerRefImpl.prototype = {

	constructor: THREE.WorkerLoader.WorkerSupport.WorkerRunnerRefImpl,

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


/**
 * Private class used by WorkerSupport which wraps the native Worker implementation.
 * @private
 */
THREE.WorkerLoader.WorkerSupport._NativeWorkerWrapper = function () {
	this._reset();
};

THREE.WorkerLoader.WorkerSupport._NativeWorkerWrapper.prototype = {

	constructor: THREE.WorkerLoader.WorkerSupport._NativeWorkerWrapper,

	_reset: function () {
		this.logging = {
			enabled: true,
			debug: false
		};
		this.validator = THREE.WorkerLoader.Validator;

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

	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	},

	setForceCopy: function ( forceCopy ) {
		this.forceCopy = forceCopy === true;
	},

	initWorker: function ( code, runnerImplName ) {
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
		this.callbacks.meshBuilder = this.validator.verifyInput( meshBuilder, this.callbacks.meshBuilder );
		this.callbacks.onLoad = this.validator.verifyInput( onLoad, this.callbacks.onLoad );
	},

	run: function( payload ) {
		if ( this.validator.isValid( this.queuedMessage ) ) {

			console.warn( 'Already processing message. Rejecting new run instruction' );
			return;

		} else {

			this.queuedMessage = payload;
			this.started = true;

		}
		if ( ! this.validator.isValid( this.callbacks.meshBuilder ) ) throw 'Unable to run as no "MeshBuilder" callback is set.';
		if ( ! this.validator.isValid( this.callbacks.onLoad ) ) throw 'Unable to run as no "onLoad" callback is set.';
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
		if ( this.validator.isValid( this.queuedMessage ) && this.validator.isValid( this.worker ) ) {

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
		if ( this.terminateRequested && this.validator.isValid( this.worker ) && ! this.validator.isValid( this.queuedMessage ) && this.started ) {

			if ( this.logging.enabled ) console.info( 'Worker is terminated immediately as it is not running!' );
			this._terminate();

		}
	},

	_terminate: function () {
		this.worker.terminate();
		this._reset();
	}

};
