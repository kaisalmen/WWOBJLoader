/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 *
 * @class
 */
THREE.LoaderSupport.WorkerRunnerRefImpl = (function () {

	function WorkerRunnerRefImpl() {
		var scope = this;
		var scopedRunner = function( event ) {
			scope.processMessage( event.data );
		};
		self.addEventListener( 'message', scopedRunner, false );
	}

	/**
	 * Applies values from parameter object via set functions or via direct assignment.
	 * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
	 *
	 * @param {Object} parser The parser instance
	 * @param {Object} params The parameter object
	 */
	WorkerRunnerRefImpl.prototype.applyProperties = function ( parser, params ) {
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
	};

	/**
	 * Configures the Parser implementation according the supplied configuration object.
	 * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	WorkerRunnerRefImpl.prototype.processMessage = function ( payload ) {
		var logEnabled = payload.logger.enabled;
		var logDebug = payload.logger.enabled;
		if ( payload.cmd === 'run' ) {

			var callbacks = {
				callbackBuilder: function ( payload ) {
					self.postMessage( payload );
				},
				callbackProgress: function ( text ) {
					if ( logEnabled && logDebug ) console.debug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
			var parser = new Parser();
			if ( typeof parser[ 'setLogConfig' ] === 'function' ) parser.setLogConfig( logEnabled, logDebug );
			this.applyProperties( parser, payload.params );
			this.applyProperties( parser, payload.materials );
			this.applyProperties( parser, callbacks );
			parser.workerScope = self;
			parser.parse( payload.data.input, payload.data.options );

			if ( logEnabled ) console.log( 'WorkerRunner: Run complete!' );

			callbacks.callbackBuilder( {
				cmd: 'complete',
				msg: 'WorkerRunner completed run.'
			} );

		} else {

			console.error( 'WorkerRunner: Received unknown command: ' + payload.cmd );

		}
	};

	return WorkerRunnerRefImpl;
})();

/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 *
 * @param {THREE.LoaderSupport.ConsoleLogger} logger logger to be used
 */
THREE.LoaderSupport.WorkerSupport = (function () {

	var WORKER_SUPPORT_VERSION = '1.1.0';

	var Validator = THREE.LoaderSupport.Validator;

	function WorkerSupport( logger ) {
		this.logger = Validator.verifyInput( logger, new THREE.LoaderSupport.ConsoleLogger() );
		this.logger.logInfo( 'Using THREE.LoaderSupport.WorkerSupport version: ' + WORKER_SUPPORT_VERSION );

		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";
		if ( window.Blob === undefined  ) throw "This browser does not support Blob!";
		if ( typeof window.URL.createObjectURL !== 'function'  ) throw "This browser does not support Object creation from URL!";

		this.worker = null;
		this.workerCode = null;
		this.loading = true;
		this.queuedMessage = null;
		this.running = false;
		this.terminateRequested = false;

		this.callbacks = {
			builder: null,
			onLoad: null
		};
	}

	/**
	 * Validate the status of worker code and the derived worker.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {Function} functionCodeBuilder Function that is invoked with funcBuildObject and funcBuildSingelton that allows stringification of objects and singletons.
	 * @param {boolean} forceWorkerReload Force re-build of the worker code.
	 * @param {String[]} libLocations URL of libraries that shall be added to worker code relative to libPath
	 * @param {String} libPath Base path used for loading libraries
	 * @param {THREE.LoaderSupport.WorkerRunnerRefImpl} runnerImpl The default worker parser wrapper implementation (communication and execution). An extended class could be passed here.
	 */
	WorkerSupport.prototype.validate = function ( functionCodeBuilder, forceWorkerReload, libLocations, libPath, runnerImpl ) {
		if ( forceWorkerReload ) {

			this.worker = null;
			this.workerCode = null;
			this.loading = true;
			this.queuedMessage = null;
			this.callbacks.builder = null;
			this.callbacks.onLoad = null;

		}

		if ( ! Validator.isValid( this.worker ) ) {

			this.logger.logInfo( 'WorkerSupport: Building worker code...' );
			this.logger.logTimeStart( 'buildWebWorkerCode' );

			var workerRunner;
			if ( Validator.isValid( runnerImpl ) ) {

				this.logger.logInfo( 'WorkerSupport: Using "' + runnerImpl.name + '" as Runncer class for worker.' );
				workerRunner = runnerImpl;

			} else {

				this.logger.logInfo( 'WorkerSupport: Using DEFAULT "THREE.LoaderSupport.WorkerRunnerRefImpl" as Runncer class for worker.' );
				workerRunner = THREE.LoaderSupport.WorkerRunnerRefImpl;

			}

			var scope = this;
			var buildWorkerCode = function ( baseWorkerCode ) {
				scope.workerCode = baseWorkerCode;
				scope.workerCode += functionCodeBuilder( buildObject, buildSingelton );
				scope.workerCode += buildSingelton( workerRunner.name, workerRunner.name, workerRunner );
				scope.workerCode += 'new ' + workerRunner.name + '();\n\n';

				var blob = new Blob( [ scope.workerCode ], { type: 'application/javascript' } );
				scope.worker = new Worker( window.URL.createObjectURL( blob ) );
				scope.logger.logTimeEnd( 'buildWebWorkerCode' );

				var receiveWorkerMessage = function ( e ) {
					var payload = e.data;

					switch ( payload.cmd ) {
						case 'meshData':
						case 'materialData':
						case 'imageData':
							scope.callbacks.builder( payload );
							break;

						case 'complete':
							scope.callbacks.onLoad( payload.msg );
							scope.running = false;

							if ( scope.terminateRequested ) {

								scope.logger.logInfo( 'WorkerSupport [' + workerRunner.name + ']: Run is complete. Terminating application on request!' );
								scope.terminateWorker();

							}
							break;

						case 'error':
							scope.logger.logError( 'WorkerSupport [' + workerRunner.name + ']: Reported error: ' + payload.msg );
							scope.running = false;

							if ( scope.terminateRequested ) {

								scope.logger.logInfo( 'WorkerSupport [' + workerRunner.name + ']: Run reported error. Terminating application on request!' );
								scope.terminateWorker();

							}
							break;

						default:
							scope.logger.logError( 'WorkerSupport [' + workerRunner.name + ']: Received unknown command: ' + payload.cmd );
							break;

					}
				};
				scope.worker.addEventListener( 'message', receiveWorkerMessage, false );
				scope.loading = false;
				scope._postMessage();
			};

			if ( Validator.isValid( libLocations ) && libLocations.length > 0 ) {

				var libsContent = '';
				var loadAllLibraries = function ( path, locations ) {
					if ( locations.length === 0 ) {

						buildWorkerCode( libsContent );

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

				buildWorkerCode( '' );

			}
		}
	};

	/**
	 * Terminate the worker and the code.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 */
	WorkerSupport.prototype.terminateWorker = function () {
		if ( Validator.isValid( this.worker ) ) {
			this.worker.terminate();
		}
		this.worker = null;
		this.workerCode = null;
	};

	/**
	 * Specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {Function} builder The builder function. Default is {@link THREE.LoaderSupport.Builder}.
	 * @param {Function} onLoad The function that is called when parsing is complete.
	 */
	WorkerSupport.prototype.setCallbacks = function ( builder, onLoad ) {
		this.callbacks = {
			builder: builder,
			onLoad: onLoad
		};
	};

	var buildObject = function ( fullName, object ) {
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
	};

	var buildSingelton = function ( fullName, internalName, object ) {
		var objectString = fullName + ' = (function () {\n\n';
		objectString += '\t' + object.prototype.constructor.toString() + '\n\n';
		objectString = objectString.replace( object.name, internalName );

		var funcString;
		var objectPart;
		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			if ( typeof objectPart === 'function' ) {

				funcString = objectPart.toString();
				objectString += '\t' + internalName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

			}

		}
		objectString += '\treturn ' + internalName + ';\n';
		objectString += '})();\n\n';

		return objectString;
	};

	/**
	 * Request termination of worker once parser is finished.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {boolean} terminateRequested True or false.
	 */
	WorkerSupport.prototype.setTerminateRequested = function ( terminateRequested ) {
		this.terminateRequested = terminateRequested === true;
		if ( ! this.running ) {

			this.logger.logWarn( 'WorkerSupport: Terminating application immediately!' );
			this.terminateWorker();

		}
	};

	/**
	 * Runs the parser with the provided configuration.
	 * @memberOf THREE.LoaderSupport.WorkerSupport
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	WorkerSupport.prototype.run = function ( payload ) {
		if ( ! Validator.isValid( this.callbacks.builder ) ) throw 'Unable to run as no "builder" callback is set.';
		if ( ! Validator.isValid( this.callbacks.onLoad ) ) throw 'Unable to run as no "onLoad" callback is set.';
		if ( Validator.isValid( this.worker ) || this.loading ) {

			if ( payload.cmd !== 'run' ) payload.cmd = 'run';
			if ( Validator.isValid( payload.logger ) ) {

				payload.logger.enabled = Validator.verifyInput( payload.logger.enabled, true );
				payload.logger.debug = Validator.verifyInput( payload.logger.debug, false );

			} else {

				payload.logger = {
					enabled: true,
					debug: false
				}

			}
			this.queuedMessage = payload;
			this._postMessage();

		}
	};

	WorkerSupport.prototype._postMessage = function () {
		if ( ! this.loading && Validator.isValid( this.queuedMessage ) ) {
			this.running = true;
			this.worker.postMessage( this.queuedMessage );
		}
	};

	return WorkerSupport;
})();
