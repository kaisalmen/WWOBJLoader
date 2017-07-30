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

				WWOBJLoader.prototype.run = function ( payload ) {
					this.cmdState = 'run';

					this.debug = payload.params.debug;

					this.wwMeshCreator = new WWMeshCreator();
					this.wwMeshCreator.setDebug( this.debug );
					this.wwMeshCreator.setMaterials( payload.materials.materialNames );

					this.parser = new Parser( this.wwMeshCreator );
					this.parser.setDebug( this.debug );
					this.parser.setMaterialPerSmoothingGroup( payload.params.materialPerSmoothingGroup );

					this._parse( payload.buffers.objAsArrayBuffer );
					console.log( 'OBJ loading complete!' );

					this.cmdState = 'complete';
					self.postMessage( {
						cmd: this.cmdState,
						msg: null
					} );
				};

				/**
				 * Parse arrayBuffer, finalize and return objGroup
				 *
				 * @param arrayBuffer
				 */
				WWOBJLoader.prototype._parse = function ( arrayBuffer ) {
					console.log( 'Parsing arrayBuffer...' );
					console.time( 'parseArrayBuffer' );

					this.parser.parseArrayBuffer( arrayBuffer );
					var objGroup = this._finalize();

					console.timeEnd( 'parseArrayBuffer' );

					return objGroup;
				};

				WWOBJLoader.prototype._finalize = function () {
					console.log( 'Global output object count: ' + this.wwMeshCreator.globalObjectCount );
					this.parser.finalize();
				};

				return WWOBJLoader;
			})();

			var wwMeshCreatorDef = (function () {

				function WWMeshCreator() {
					this.materials = null;
					this.debug = false;
					this.globalObjectCount = 1;
				}

				WWMeshCreator.prototype.setMaterials = function ( materials ) {
					this.materials = Validator.verifyInput( materials, this.materials );
					this.materials = Validator.verifyInput( this.materials, { materials: [] } );
				};

				WWMeshCreator.prototype.setDebug = function ( debug ) {
					if ( debug === true || debug === false ) this.debug = debug;
				};

				/**
				 * RawObjectDescriptions are transformed to THREE.Mesh.
				 * It is ensured that rawObjectDescriptions only contain objects with vertices (no need to check).
				 *
				 * @param rawObjectDescriptions
				 * @param inputObjectCount
				 * @param absoluteVertexCount
				 * @param absoluteNormalCount
				 * @param absoluteUvCount
				 */
				WWMeshCreator.prototype.buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount,
															   absoluteColorCount, absoluteNormalCount, absoluteUvCount ) {
					if ( this.debug ) console.log( 'OBJLoader.buildMesh:\nInput object no.: ' + inputObjectCount );

					var vertexFA = new Float32Array( absoluteVertexCount );
					var colorFA = ( absoluteColorCount > 0 ) ? new Float32Array( absoluteColorCount ) : null;
					var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
					var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

					var rawObjectDescription;
					var materialDescription;
					var materialDescriptions = [];

					var createMultiMaterial = ( rawObjectDescriptions.length > 1 );
					var materialIndex = 0;
					var materialIndexMapping = [];
					var selectedMaterialIndex;
					var materialGroup;
					var materialGroups = [];

					var vertexFAOffset = 0;
					var vertexGroupOffset = 0;
					var vertexLength;
					var colorFAOffset = 0;
					var normalFAOffset = 0;
					var uvFAOffset = 0;

					for ( var oodIndex in rawObjectDescriptions ) {
						if ( ! rawObjectDescriptions.hasOwnProperty( oodIndex ) ) continue;
						rawObjectDescription = rawObjectDescriptions[ oodIndex ];

						materialDescription = {
							name: rawObjectDescription.materialName,
							flat: false,
							vertexColors: false,
							default: false
						};
						if ( this.materials[ materialDescription.name ] === null ) {

							materialDescription.default = true;
							console.warn( 'object_group "' + rawObjectDescription.objectName + '_' + rawObjectDescription.groupName + '" was defined without material! Assigning "defaultMaterial".' );

						}
						// Attach '_flat' to materialName in case flat shading is needed due to smoothingGroup 0
						if ( rawObjectDescription.smoothingGroup === 0 ) materialDescription.flat = true;

						vertexLength = rawObjectDescription.vertices.length;
						if ( createMultiMaterial ) {

							// re-use material if already used before. Reduces materials array size and eliminates duplicates

							selectedMaterialIndex = materialIndexMapping[ materialDescription.name ];
							if ( ! selectedMaterialIndex ) {

								selectedMaterialIndex = materialIndex;
								materialIndexMapping[ materialDescription.name ] = materialIndex;
								materialDescriptions.push( materialDescription );
								materialIndex++;

							}
							materialGroup = {
								start: vertexGroupOffset,
								count: vertexLength / 3,
								index: selectedMaterialIndex
							};
							materialGroups.push( materialGroup );
							vertexGroupOffset += vertexLength / 3;

						} else {

							materialDescriptions.push( materialDescription );

						}

						vertexFA.set( rawObjectDescription.vertices, vertexFAOffset );
						vertexFAOffset += vertexLength;

						if ( colorFA ) {

							colorFA.set( rawObjectDescription.colors, colorFAOffset );
							colorFAOffset += rawObjectDescription.colors.length;
							materialDescription.vertexColors = true;

						}

						if ( normalFA ) {

							normalFA.set( rawObjectDescription.normals, normalFAOffset );
							normalFAOffset += rawObjectDescription.normals.length;

						}
						if ( uvFA ) {

							uvFA.set( rawObjectDescription.uvs, uvFAOffset );
							uvFAOffset += rawObjectDescription.uvs.length;

						}
						if ( this.debug ) this.printReport( rawObjectDescription, selectedMaterialIndex );

					}

					self.postMessage(
						{
							cmd: 'meshData',
							params: {
								meshName: rawObjectDescription.groupName !== '' ? rawObjectDescription.groupName : rawObjectDescription.objectName,
							},
							materials: {
								multiMaterial: createMultiMaterial,
								materialDescriptions: materialDescriptions,
								materialGroups: materialGroups
							},
							buffers: {
								vertices: vertexFA,
								colors: colorFA,
								normals: normalFA,
								uvs: uvFA
							}
						},
						[ vertexFA.buffer ],
						colorFA !== null ? [ colorFA.buffer ] : null,
						normalFA !== null ? [ normalFA.buffer ] : null,
						uvFA !== null ? [ uvFA.buffer ] : null
					);

					this.globalObjectCount++;
				};

				WWMeshCreator.prototype.printReport = function ( rawObjectDescription, selectedMaterialIndex ) {
					var materialIndexLine = Validator.isValid( selectedMaterialIndex ) ? '\n materialIndex: ' + selectedMaterialIndex : '';
					console.log(
						' Output Object no.: ' + this.globalObjectCount +
						'\n objectName: ' + rawObjectDescription.objectName +
						'\n groupName: ' + rawObjectDescription.groupName +
						'\n materialName: ' + rawObjectDescription.materialName +
						materialIndexLine +
						'\n smoothingGroup: ' + rawObjectDescription.smoothingGroup +
						'\n #vertices: ' + rawObjectDescription.vertices.length / 3 +
						'\n #colors: ' + rawObjectDescription.colors.length / 3 +
						'\n #uvs: ' + rawObjectDescription.uvs.length / 2 +
						'\n #normals: ' + rawObjectDescription.normals.length / 3
					);
				};

				return WWMeshCreator;
			})();

			workerCode = '';
			workerCode += '/**\n';
			workerCode += '  * This code was constructed by WWOBJLoader2._buildWebWorkerCode\n';
			workerCode += '  */\n\n';

			// parser re-construction
			workerCode += THREE.OBJLoader2.prototype._buildWebWorkerCode( funcBuildObject, funcBuildSingelton );

			// web worker construction
			workerCode += funcBuildSingelton( 'WWOBJLoader', 'WWOBJLoader', wwDef );
			workerCode += funcBuildSingelton( 'WWMeshCreator', 'WWMeshCreator', wwMeshCreatorDef );

		}

		return workerCode;
	};

	return WWOBJLoader2;

})();
