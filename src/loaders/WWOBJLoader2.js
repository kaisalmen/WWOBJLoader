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

	WWOBJLoader2.prototype = Object.create( THREE.LoaderSupport.WW.DirectableLoader.prototype );
	WWOBJLoader2.prototype.constructor = WWOBJLoader2;

	function WWOBJLoader2() {
		THREE.LoaderSupport.WW.DirectableLoader.call( this );
	}

	WWOBJLoader2.prototype._init = function () {
		THREE.LoaderSupport.WW.DirectableLoader.prototype._init.call( this );
		console.log( "Using THREE.OBJLoader2.WWOBJLoader2 version: " + WWOBJLOADER2_VERSION );

		this.modelName = '';
		this.requestTerminate = false;
		this.materialPerSmoothingGroup = false;

		this.manager = THREE.DefaultLoadingManager;
		this.fileLoader = new THREE.FileLoader( this.manager );
		this.mtlLoader = null;

		this.objAsArrayBuffer = null;
		this.fileObj = null;
		this.pathObj = null;

		this.fileMtl = null;
		this.mtlAsString = null;
	};

	/**
	 * Tells whether a material shall be created per smoothing group
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {boolean} materialPerSmoothingGroup=false Default is false
	 */
	WWOBJLoader2.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup;
	};

	WWOBJLoader2.prototype._validate = function () {
		if ( this.validated ) return;
		this.requestTerminate = false;
		this.materials = [];
		this.validated = true;

		this.meshProvider.validate( this._buildWebWorkerCode, 'WWOBJLoader' );

		this.modelName = '';
		this.requestTerminate = false;
		this.materialPerSmoothingGroup = false;

		this.fileLoader = Validator.verifyInput( this.fileLoader, new THREE.FileLoader( this.manager ) );
		this.mtlLoader = Validator.verifyInput( this.mtlLoader, new THREE.MTLLoader() );
		if ( Validator.isValid( this.crossOrigin ) ) this.mtlLoader.setCrossOrigin( this.crossOrigin );

		this.fileObj = null;
		this.pathObj = null;
		this.fileMtl = null;

		this.objAsArrayBuffer = null;
		this.mtlAsString = null;
	};

	/**
	 * Run the loader according the provided instructions.
	 * @memberOf THREE.OBJLoader2.WWOBJLoader2
	 *
	 * @param {Object} params Either {@link THREE.LoaderSupport.WW.PrepData}
	 */
	WWOBJLoader2.prototype.run = function ( params ) {
		console.time( 'WWOBJLoader2' );
		this._validate();
		this.modelName = params.modelName;

 		var resources = params.resources;
		var resource;
		for ( var index in resources ) {

			resource = resources[ index ];
			if ( ! Validator.isValid( resource.name ) ) continue;
			if ( resource.dataAvailable ) {

				if ( resource.extension === 'OBJ' ) {

					// fast-fail on bad type
					if ( ! ( resource.content instanceof Uint8Array ) ) throw 'Provided content is not of type arraybuffer! Aborting...';
					this.objAsArrayBuffer = resource.content;

				} else if ( resource.extension === 'MTL' && Validator.isValid( resource.name ) ) {

					if ( ! ( typeof( resource.content ) === 'string' || resource.content instanceof String ) ) throw 'Provided  content is not of type String! Aborting...';
					this.mtlLoader.setPath( resource.path );
					this.mtlAsString = resource.content;

				}

			} else {

				// fast-fail on bad type
				if ( ! ( typeof( resource.name ) === 'string' || resource.name instanceof String ) ) throw 'Provided file is not properly defined! Aborting...';
				if ( resource.extension === 'OBJ' ) {

					this.pathObj = resource.path;
					this.fileObj = resource.name;

				} else if ( resource.extension === 'MTL' ) {

					this.mtlLoader.setPath( resource.path );
					this.fileMtl = resource.name;

				}
			}
		}
		this.setRequestTerminate( params.requestTerminate );

		var scope = this;
		var scopeFuncComplete = function ( reason ) {
			scope._finalize( reason );
		};
		var scopeFuncAnnounce = function ( baseText, text ) {
			scope.announceProgress( baseText, text );
		};
		this.meshProvider.setCallbacks( scopeFuncAnnounce, this.callbacks.meshLoaded, scopeFuncComplete );
		this.meshProvider.prepareRun( params.sceneGraphBaseNode, params.streamMeshes );

		var messageObject = {
			cmd: 'init',
			debug: this.getDebug(),
			materialPerSmoothingGroup: this.materialPerSmoothingGroup
		};
		this.meshProvider.postMessage( messageObject );


		// run
		var processLoadedMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			var materialNames = [];
			if ( Validator.isValid( materialCreator ) ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materialNames.push( materialName );
						scope.materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}

				}

			}

			scope.meshProvider.addMaterials( scope.materials );
			scope.meshProvider.postMessage(
				{
					cmd: 'setMaterials',
					materialNames: materialNames
				}
			);

			var materialsFromCallback;
			var callbackMaterialsLoaded;
			for ( var index in scope.callbacks.materialsLoaded ) {

				callbackMaterialsLoaded = scope.callbacks.materialsLoaded[ index ];
				materialsFromCallback = callbackMaterialsLoaded( scope.materials );
				if ( Validator.isValid( materialsFromCallback ) ) scope.materials = materialsFromCallback;

			}
			if ( scope.objAsArrayBuffer ) {

				scope.meshProvider.postMessage(
					{
						cmd: 'run',
						objAsArrayBuffer: scope.objAsArrayBuffer
					},
					[ scope.objAsArrayBuffer.buffer ]
				);

			} else {

				var refPercentComplete = 0;
				var percentComplete = 0;
				var onLoad = function ( objAsArrayBuffer ) {

					scope.announceProgress( 'Running web worker!' );
					scope.objAsArrayBuffer = new Uint8Array( objAsArrayBuffer );
					scope.meshProvider.postMessage(
						{
							cmd: 'run',
							objAsArrayBuffer: scope.objAsArrayBuffer
						},
						[ scope.objAsArrayBuffer.buffer ]
					);

				};

				var onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					percentComplete = Math.round( event.loaded / event.total * 100 );
					if ( percentComplete > refPercentComplete ) {

						refPercentComplete = percentComplete;
						var output = 'Download of "' + scope.fileObj + '": ' + percentComplete + '%';
						console.log( output );
						scope.announceProgress( output );

					}
				};

				var onError = function ( event ) {
					var output = 'Error occurred while downloading "' + scope.fileObj + '"';
					console.error( output + ': ' + event );
					scope.announceProgress( output );
					scope._finalize( 'error' );

				};

				scope.fileLoader.setPath( scope.pathObj );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( scope.fileObj, onLoad, onProgress, onError );
			}
			console.timeEnd( 'Loading MTL textures' );
		};

		if ( Validator.isValid( this.mtlAsString ) ) {

			processLoadedMaterials( Validator.isValid( this.mtlAsString ) ? this.mtlLoader.parse( this.mtlAsString ) : null );

		} else {

			if ( Validator.isValid( this.fileMtl ) ) {

				var onError = function ( event ) {
					var output = 'Error occurred while downloading "' + scope.fileMtl + '"';
					console.error( output + ': ' + event );
					scope.announceProgress( output );
					scope._finalize( 'error' );
				};

				this.mtlLoader.load( this.fileMtl, processLoadedMaterials, undefined, onError );

			} else {

				processLoadedMaterials();

			}

		}
	};

	WWOBJLoader2.prototype._finalize = function ( reason ) {
		this.validated = false;
		var index;
		var callback;

		if ( reason === 'complete' ) {

			for ( index in this.callbacks.completedLoading ) {

				callback = this.callbacks.completedLoading[ index ];
				callback( this.instanceNo, this.modelName );

			}

		} else if ( reason === 'error' ) {

			for ( index in this.callbacks.errorWhileLoading ) {

				callback = this.callbacks.errorWhileLoading[ index ];
				callback( this.instanceNo, this.modelName );

			}

		}
		if ( reason === 'terminate' ) {

			if ( this.meshProvider.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			console.log( 'Finalize is complete. Terminating application on request!' );

			this.meshProvider._terminate();

			this.fileLoader = null;
			this.mtlLoader = null;
		}

		console.timeEnd( 'WWOBJLoader2' );
	};

	WWOBJLoader2.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		var workerCode = existingWorkerCode;
		if ( ! Validator.isValid( workerCode ) ) {

			var wwDef = (function () {

				function WWOBJLoader() {
					// classes initialised here are defined in existingWorkerCode
					this.wwMeshCreator = new WWMeshCreator();
					this.parser = new Parser( this.wwMeshCreator );
					this.validated = false;
					this.cmdState = 'created';

					this.debug = false;
				}

				/**
				 * Allows to set debug mode for the parser and the meshCreatorDebug
				 *
				 * @param enabled
				 */
				WWOBJLoader.prototype.setDebug = function ( enabled ) {
					this.parser.setDebug( enabled );
					this.wwMeshCreator.setDebug( enabled );
				};

				/**
				 * Validate status, then parse arrayBuffer, finalize and return objGroup
				 *
				 * @param arrayBuffer
				 */
				WWOBJLoader.prototype.parse = function ( arrayBuffer ) {
					console.log( 'Parsing arrayBuffer...' );
					console.time( 'parseArrayBuffer' );

					this.validate();
					this.parser.parseArrayBuffer( arrayBuffer );
					var objGroup = this._finalize();

					console.timeEnd( 'parseArrayBuffer' );

					return objGroup;
				};

				WWOBJLoader.prototype.validate = function () {
					if ( this.validated ) return;

					this.parser.validate();
					this.wwMeshCreator.validate();

					this.validated = true;
				};

				WWOBJLoader.prototype._finalize = function () {
					console.log( 'Global output object count: ' + this.wwMeshCreator.globalObjectCount );
					this.parser.finalize();
					this.wwMeshCreator.finalize();
					this.validated = false;
				};

				WWOBJLoader.prototype.init = function ( payload ) {
					this.cmdState = 'init';
					this.setDebug( payload.debug );
					this.parser.setMaterialPerSmoothingGroup( payload.materialPerSmoothingGroup );
				};

				WWOBJLoader.prototype.setMaterials = function ( payload ) {
					this.cmdState = 'setMaterials';
					this.wwMeshCreator.setMaterials( payload.materialNames );
				};

				WWOBJLoader.prototype.run = function ( payload ) {
					this.cmdState = 'run';

					this.parse( payload.objAsArrayBuffer );
					console.log( 'OBJ loading complete!' );

					this.cmdState = 'complete';
					self.postMessage( {
						cmd: this.cmdState,
						msg: null
					} );
				};

				return WWOBJLoader;
			})();

			var wwMeshCreatorDef = (function () {

				function WWMeshCreator() {
					this.materials = null;
					this.debug = false;
					this.globalObjectCount = 1;
					this.validated = false;
				}

				WWMeshCreator.prototype.setMaterials = function ( materials ) {
					this.materials = Validator.verifyInput( materials, this.materials );
					this.materials = Validator.verifyInput( this.materials, { materials: [] } );
				};

				WWMeshCreator.prototype.setDebug = function ( debug ) {
					if ( debug === true || debug === false ) this.debug = debug;
				};

				WWMeshCreator.prototype.validate = function () {
					if ( this.validated ) return;

					this.setMaterials( null );
					this.setDebug( null );
					this.globalObjectCount = 1;
				};

				WWMeshCreator.prototype.finalize = function () {
					this.materials = null;
					this.validated = false;
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
							meshName: rawObjectDescription.groupName !== '' ? rawObjectDescription.groupName : rawObjectDescription.objectName,
							multiMaterial: createMultiMaterial,
							materialDescriptions: materialDescriptions,
							materialGroups: materialGroups,
							vertices: vertexFA,
							colors: colorFA,
							normals: normalFA,
							uvs: uvFA
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
