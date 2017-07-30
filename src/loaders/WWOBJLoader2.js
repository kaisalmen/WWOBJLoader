if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }

/**
 * OBJ data will be loaded by dynamically created web worker.
 * First feed instructions with: prepareRun
 * Then: Execute with: run
 * @class
 */
THREE.OBJLoader2.WWOBJLoader2 = (function () {

	var WWOBJLOADER2_VERSION = '2.0.0-dev';

	var Validator = THREE.LoaderSupport.Validator;

	WWOBJLoader2.prototype = Object.create( THREE.OBJLoader2.prototype );
	WWOBJLoader2.prototype.constructor = WWOBJLoader2;

	function WWOBJLoader2( manager ) {
		THREE.OBJLoader2.call( this, manager );
	}

	WWOBJLoader2.prototype.init = function ( manager ) {
		THREE.OBJLoader2.prototype.init.call( this, manager );
		console.log( "Using THREE.OBJLoader2.WWOBJLoader2 version: " + WWOBJLOADER2_VERSION );

		this.setStreamMeshes( true );
		this.requestTerminate = false;
		this.instanceNo = 0;

		var scope = this;
		var scopeBuilderFunc = function ( payload ) {
			scope.builder( payload );
		};
		var scopeFuncComplete = function ( reason ) {
			scope._finalize( reason );
		};
		this.workerSupport = Validator.verifyInput( this.workerSupport, new THREE.LoaderSupport.WorkerSupport( scopeBuilderFunc, scopeFuncComplete ) );
		this.workerSupport.reInit( false, this._buildWebWorkerCode, 'WWOBJLoader' );
	};

	/**
	 * Call requestTerminate to terminate the web worker and free local resource after execution.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {boolean} requestTerminate True or false
	 */
	WWOBJLoader2.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	/**
	 * Set the worker instanceNo
	 *
	 * @param {number} instanceNo
	 */
	WWOBJLoader2.prototype.setInstanceNo = function ( instanceNo ) {
		this.instanceNo = instanceNo;
	};

	/**
	 * Get the worker instanceNo
	 *
	 * @returns {number|*}
	 */
	WWOBJLoader2.prototype.getInstanceNo = function () {
		return this.instanceNo;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * @memberOf THREE..WWOBJLoader2
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode Scenegraph object where meshes will be attached
	 */
	WWOBJLoader2.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		THREE.OBJLoader2.prototype.setSceneGraphBaseNode.call( this, sceneGraphBaseNode );
	};

	/**
	 * Set materials loaded by MTLLoader or any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material}
	 */
	WWOBJLoader2.prototype.setMaterials = function ( materials ) {
		THREE.OBJLoader2.prototype.setMaterials.call( this, materials );
	};

	/**
	 * Run the loader according the provided instructions.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {THREE.LoaderSupport.PrepData} prepData All parameters and resources required for execution
	 */
	WWOBJLoader2.prototype.run = function ( prepData ) {
		console.time( 'WWOBJLoader2' );

		this._applyPrepData( prepData );
		var available = this._checkFiles( prepData.resources );

		var scope = this;
		var onMaterialsLoaded = function ( materials ) {
			scope.setMaterials( materials );

			if ( Validator.isValid( available.obj.content ) ) {

				scope.parse( available.obj.content );

			} else {

				var refPercentComplete = 0;
				var percentComplete = 0;
				var onLoad = function ( arrayBuffer ) {

					scope.onProgress( 'Running web worker!' );
					available.obj.content = new Uint8Array( arrayBuffer );

					scope.parse( available.obj.content );
				};

				var onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					percentComplete = Math.round( event.loaded / event.total * 100 );
					if ( percentComplete > refPercentComplete ) {

						refPercentComplete = percentComplete;
						var output = 'Download of "' + available.obj.url + '": ' + percentComplete + '%';
						console.log( output );
						scope.onProgress( output );

					}
				};

				var onError = function ( event ) {
					var output = 'Error occurred while downloading "' + available.obj.url + '"';
					console.error( output + ': ' + event );
					scope.onProgress( output );
					scope._finalize( 'error' );

				};

				scope.fileLoader.setPath( available.obj.path );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( available.obj.name, onLoad, onProgress, onError );
			}
		};

		this.loadMtl( available.mtl, onMaterialsLoaded, prepData.crossOrigin );
	};

	WWOBJLoader2.prototype._applyPrepData = function ( prepData ) {
		THREE.OBJLoader2.prototype._applyPrepData.call( this, prepData );

		if ( Validator.isValid( prepData ) ) {

			this.modelName = prepData.modelName;
			this.setRequestTerminate( prepData.requestTerminate );

		}
	};

	WWOBJLoader2.prototype.parse = function ( content ) {
		this.workerSupport.run(
			{
				cmd: 'run',
				params: {
					debug: this.debug,
					materialPerSmoothingGroup: this.materialPerSmoothingGroup
				},
				materials: {
					materialNames: this.materialNames
				},
				buffers: {
					objAsArrayBuffer: content
				}
			},
			[ content.buffer ]
		);
	};

	WWOBJLoader2.prototype._finalize = function ( reason, message ) {
		var callback;
		if ( reason === 'complete' ) {

			this.builderComplete( message );
			callback = this.callbacks.onLoad;
			if ( Validator.isValid( callback ) ) callback( this.sceneGraphBaseNode, this.modelName, this.instanceNo, message );

		} else if ( reason === 'error' ) {

			callback = this.callbacks.onError;
			if ( Validator.isValid( callback ) ) callback( this.sceneGraphBaseNode, this.modelName, this.instanceNo, message );

		}
		if ( reason === 'terminate' ) {

			if ( this.workerSupport.running ) throw 'Unable to gracefully terminate worker as it is currently running!';
			console.log( 'Finalize is complete. Terminating application on request!' );
			this.workerSupport._terminate();

		}

		console.timeEnd( 'WWOBJLoader2' );
	};

	WWOBJLoader2.prototype.onProgress = function ( baseText, text ) {
		var content = Validator.isValid( baseText ) ? baseText: "";
		content = Validator.isValid( text ) ? content + " " + text : content;

		var callbackOnProgress = this.callbacks.onProgress;
		if ( Validator.isValid( callbackOnProgress ) ) callbackOnProgress( content, this.modelName, this.instanceNo  );

		if ( this.debug ) console.log( content );
	};

	WWOBJLoader2.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		var workerCode = existingWorkerCode;
		if ( ! Validator.isValid( workerCode ) ) {

			var wwDef = (function () {

				function WWOBJLoader() {
				}

				WWOBJLoader.prototype.run = function ( payload, postMessageCallback, onProgressCallback ) {
					this.cmdState = 'run';

					this.parser = new Parser( postMessageCallback, onProgressCallback );
					this.parser.setDebug( payload.params.debug );
					this.parser.setMaterialNames( payload.materials.materialNames );
					this.parser.setMaterialPerSmoothingGroup( payload.params.materialPerSmoothingGroup );

					console.log( 'Parsing arrayBuffer...' );
					console.time( 'parseArrayBuffer' );

					this.parser.parseArrayBuffer( payload.buffers.objAsArrayBuffer );
					this.parser.finalize();

					console.timeEnd( 'parseArrayBuffer' );
					console.log( 'OBJ loading complete!' );

					this.cmdState = 'complete';
					postMessageCallback( {
						cmd: this.cmdState,
						msg: null
					} );
				};

				return WWOBJLoader;
			})();

			workerCode = '';
			workerCode += '/**\n';
			workerCode += '  * This code was constructed by WWOBJLoader2._buildWebWorkerCode\n';
			workerCode += '  */\n\n';

			// parser re-construction
			workerCode += THREE.OBJLoader2.prototype._buildWebWorkerCode( funcBuildObject, funcBuildSingelton );

			// web worker construction
			workerCode += funcBuildSingelton( 'WWOBJLoader', 'WWOBJLoader', wwDef );

		}

		return workerCode;
	};

	return WWOBJLoader2;

})();
