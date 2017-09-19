/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 *
 * @class
 */
THREE.LoaderSupport.WorkerRunnerRefImpl = (function () {

	function WorkerRunnerRefImpl() {
		var scope = this;
		var scopedRunner = function( event ) {
			scope.run( event.data );
		};
		self.addEventListener( 'message', scopedRunner, false );
	}

	/**
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
	 *
	 * @param parser
	 * @param params
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
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	WorkerRunnerRefImpl.prototype.run = function ( payload ) {
		var logger = new ConsoleLogger( payload.logger.enabled, payload.logger.debug );

		if ( payload.cmd === 'run' ) {

			logger.logInfo( 'WorkerRunner: Starting Run...' );

			var callbacks = {
				callbackBuilder: function ( payload ) {
					self.postMessage( payload );
				},
				callbackProgress: function ( text ) {
					logger.logDebug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
			var parser = new Parser( logger );
			this.applyProperties( parser, payload.params );
			this.applyProperties( parser, payload.materials );
			this.applyProperties( parser, callbacks );
			parser.parse( payload.buffers.input );

			logger.logInfo( 'WorkerRunner: Run complete!' );

			callbacks.callbackBuilder( {
				cmd: 'complete',
				msg: 'WorkerRunner completed run.'
			} );

		} else {

			logger.logError( 'WorkerRunner: Received unknown command: ' + payload.cmd );

		}
	};

	return WorkerRunnerRefImpl;
})();

/**
 * TODO
 *
 * @class
 *
 * @param {THREE.LoaderSupport.ConsoleLogger} logger logger to be used
 */
THREE.LoaderSupport.WorkerSupport = (function () {

	var WORKER_SUPPORT_VERSION = '1.0.0';

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
		this.running = false;
		this.terminateRequested = false;

		this.callbacks = {
			builder: null,
			onLoad: null
		};
	}

	/**
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param functionCodeBuilder
	 * @param forceWorkerReload
	 * @param runnerImpl
	 */
	WorkerSupport.prototype.validate = function ( functionCodeBuilder, forceWorkerReload, runnerImpl ) {
		this.running = false;
		if ( forceWorkerReload ) {

			this.worker = null;
			this.workerCode = null;
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
			this.workerCode = functionCodeBuilder( buildObject, buildSingelton );
			this.workerCode += buildSingelton( workerRunner.name, workerRunner.name, workerRunner );
			this.workerCode += 'new ' + workerRunner.name + '();\n\n';

			var blob = new Blob( [ this.workerCode ], { type: 'text/plain' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );
			this.logger.logTimeEnd( 'buildWebWorkerCode' );

			var scope = this;
			var receiveWorkerMessage = function ( e ) {
				var payload = e.data;

				switch ( payload.cmd ) {
					case 'meshData':
						scope.callbacks.builder( payload );
						break;

					case 'complete':
						scope.callbacks.onLoad( payload.msg );
						scope.running = false;

						if ( scope.terminateRequested ) {

							scope.logger.logInfo( 'WorkerSupport: Run is complete. Terminating application on request!' );
							scope.terminateWorker();

						}
						break;

					default:
						scope.logger.logError( 'WorkerSupport: Received unknown command: ' + payload.cmd );
						break;

				}
			};
			this.worker.addEventListener( 'message', receiveWorkerMessage, false );

		}
	};

	/**
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 */
	WorkerSupport.prototype.terminateWorker = function () {
		if ( Validator.isValid( this.worker ) ) {
			this.worker.terminate();
		}
		this.worker = null;
		this.workerCode = null;
	};

	/**
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param builder
	 * @param onLoad
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
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param terminateRequested
	 */
	WorkerSupport.prototype.setTerminateRequested = function ( terminateRequested ) {
		this.terminateRequested = terminateRequested === true;
	};

	/**
	 * TODO
	 * @memberOf THREE.LoaderSupport.WorkerDirector
	 *
	 * @param messageObject
	 */
	WorkerSupport.prototype.run = function ( messageObject ) {
		if ( ! Validator.isValid( this.callbacks.builder ) ) throw 'Unable to run as no "builder" callback is set.';
		if ( ! Validator.isValid( this.callbacks.onLoad ) ) throw 'Unable to run as no "onLoad" callback is set.';
		if ( Validator.isValid( this.worker ) ) {
			this.running = true;
			this.worker.postMessage( messageObject );
		}
	};

	return WorkerSupport;
})();
