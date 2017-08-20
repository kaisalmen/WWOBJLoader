THREE.LoaderSupport.WorkerRunnerRefImpl = (function () {

	function WorkerRunnerRefImpl() {
		var scope = this;
		var scopedRunner = function( event ) {
			scope.run( event.data );
		};
		self.addEventListener( 'message', scopedRunner, false );
	}

	WorkerRunnerRefImpl.prototype.applyProperties = function ( parser, params ) {
		var property, funcName, values;
		for ( property in params ) {
			funcName = 'set' + property.substring( 0, 1 ).toLocaleUpperCase() + property.substring( 1 );
			values = params[ property ];
			if ( parser.hasOwnProperty( property ) ) {

				if ( typeof parser[ funcName ] === 'function' ) {

					parser[ funcName ]( values );

				} else {

					parser[ property ] = values;

				}
			}
		}
	};

	WorkerRunnerRefImpl.prototype.run = function ( payload ) {
		if ( payload.cmd === 'run' ) {

			console.log( 'WorkerRunner: Starting Run...' );

			var callbacks = {
				callbackBuilder: function ( payload ) {
					self.postMessage( payload );
				},
				callbackProgress: function ( message ) {
					console.log( 'WorkerRunner: progress: ' + message );
				}
			};

			// Parser is expected to be named as such
			var parser = new Parser();
			this.applyProperties( parser, payload.params );
			this.applyProperties( parser, payload.materials );
			this.applyProperties( parser, callbacks );
			parser.parse( payload.buffers.input );

			console.log( 'WorkerRunner: Run complete!' );

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

THREE.LoaderSupport.WorkerSupport = (function () {

	var WORKER_SUPPORT_VERSION = '1.0.0-dev';

	var Validator = THREE.LoaderSupport.Validator;

	function WorkerSupport() {
		console.log( "Using THREE.LoaderSupport.WorkerSupport version: " + WORKER_SUPPORT_VERSION );

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

	WorkerSupport.prototype.validate = function ( functionCodeBuilder, forceWorkerReload, runnerImpl ) {
		this.running = false;
		if ( forceWorkerReload ) {

			this.worker = null;
			this.workerCode = null;
			this.callbacks.builder = null;
			this.callbacks.onLoad = null;

		}

		if ( ! Validator.isValid( this.worker ) ) {

			console.log( 'WorkerSupport: Building worker code...' );
			console.time( 'buildWebWorkerCode' );

			var workerRunner;
			if ( Validator.isValid( runnerImpl ) ) {

				console.log( 'WorkerSupport: Using "' + runnerImpl.name + '" as Runncer class for worker.');
				workerRunner = runnerImpl;

			} else {

				console.log( 'WorkerSupport: Using DEFAULT "THREE.LoaderSupport.WorkerRunnerRefImpl" as Runncer class for worker.');
				workerRunner = THREE.LoaderSupport.WorkerRunnerRefImpl;

			}
			this.workerCode = functionCodeBuilder( buildObject, buildSingelton );
			this.workerCode += buildSingelton( workerRunner.name, workerRunner.name, workerRunner );
			this.workerCode += 'new ' + workerRunner.name + '();\n\n';

			var blob = new Blob( [ this.workerCode ], { type: 'text/plain' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );
			console.timeEnd( 'buildWebWorkerCode' );

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
							console.log( 'WorkerSupport: Run is complete. Terminating application on request!' );
							if ( Validator.isValid( scope.worker ) ) {
								scope.worker.terminate();
							}
							scope.worker = null;
							scope.workerCode = null;
						}
						break;

					default:
						console.error( 'WorkerSupport: Received unknown command: ' + payload.cmd );
						break;

				}
			};
			this.worker.addEventListener( 'message', receiveWorkerMessage, false );

		}
	};

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

	WorkerSupport.prototype.setTerminateRequested = function ( terminateRequested ) {
		this.terminateRequested = terminateRequested === true;
	};

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
