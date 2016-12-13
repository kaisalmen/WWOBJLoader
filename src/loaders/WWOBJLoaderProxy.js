/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWOBJLoaderProxy = (function () {

	WWOBJLoaderProxy.prototype = Object.create( THREE.WebWorker.WWLoaderProxyBase.prototype );
	WWOBJLoaderProxy.prototype.constructor = WWOBJLoaderProxy;

	function WWOBJLoaderProxy( params ) {
		THREE.WebWorker.WWLoaderProxyBase.call( this, params );
	}

	WWOBJLoaderProxy.prototype.init = function ( params ) {
		THREE.WebWorker.WWLoaderProxyBase.prototype.init.call( this, params );

		this.manager = THREE.DefaultLoadingManager;
		this.fileLoader = new THREE.XHRLoader( this.manager );
		this.mtlLoader = null;

		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
		this.fileObj = null;
		this.pathObj = null;

		this.fileMtl = null;
		this.mtlAsString = null;
		this.texturePath = null;

		this.materials = [];
		this.counter = 0;

		this.callbacks.materialsLoaded = null;
		this.callbacks.meshLoaded = null;
	};

	WWOBJLoaderProxy.prototype.registerHookMaterialsLoaded = function ( callbackMaterialsLoaded ) {
		if ( callbackMaterialsLoaded != null ) this.callbacks.materialsLoaded = callbackMaterialsLoaded;
	};

	WWOBJLoaderProxy.prototype.registerHookMeshLoaded = function ( callbackMeshLoaded ) {
		if ( callbackMeshLoaded != null ) this.callbacks.meshLoaded = callbackMeshLoaded;
	};

	WWOBJLoaderProxy.prototype.validate = function () {
		if ( THREE.WebWorker.WWLoaderProxyBase.prototype.validate.call( this ) ) return;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.XHRLoader( this.manager ) : this.fileLoader;
		this.mtlLoader = ( this.mtlLoader == null ) ?  new THREE.MTLLoader() : this.mtlLoader;

		this.dataAvailable = false;
		this.fileObj = null;
		this.pathObj = null;
		this.fileMtl = null;
		this.texturePath = null;

		this.objAsArrayBuffer = null;
		this.mtlAsString = null;

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		this.counter = 0;
	};

	WWOBJLoaderProxy.prototype.prepareRun = function ( params ) {
		this.validate();
		this.dataAvailable = params.dataAvailable;
		this.modelName = params.modelName;
		console.time( 'WWOBJLoaderProxy' );
		if ( this.dataAvailable ) {

			// fast-fail on bad type
			if ( ! ( params.objAsArrayBuffer instanceof ArrayBuffer || params.objAsArrayBuffer instanceof Uint8Array ) ) {
				throw 'Provided input is not of type arraybuffer! Aborting...';
			}

			this.worker.postMessage( {
				cmd: 'init',
				debug: this.debug
			} );

			this.objAsArrayBuffer = params.objAsArrayBuffer;
			this.mtlAsString = params.mtlAsString;

		} else {

			// fast-fail on bad type
			if ( ! ( typeof( params.fileObj ) === 'string' || params.fileObj instanceof String ) ) {
				throw 'Provided file is not properly defined! Aborting...';
			}

			this.worker.postMessage( {
				cmd: 'init',
				debug: this.debug
			} );

			this.fileObj = params.fileObj;
			this.pathObj = params.pathObj;
			this.fileMtl = params.fileMtl;

		}
		this.pathTexture = params.pathTexture;
		this.sceneGraphBaseNode = params.sceneGraphBaseNode;
	};

	WWOBJLoaderProxy.prototype.run = function () {
		var scope = this;
		var processLoadedMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			var materialNames = [];
			if ( materialCreator != null ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materialNames.push( materialName );
						scope.materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}

				}

			}
			scope.worker.postMessage( {
				cmd: 'setMaterials',
				materialNames: materialNames
			} );

			if ( scope.callbacks.materialsLoaded != null ) scope.materials = scope.callbacks.materialsLoaded( scope.materials );

			if ( scope.dataAvailable && scope.objAsArrayBuffer ) {

				scope.worker.postMessage({
					cmd: 'run',
					objAsArrayBuffer: scope.objAsArrayBuffer
				}, [ scope.objAsArrayBuffer.buffer ] );

			} else {

				var refPercentComplete = 0;
				var percentComplete = 0;
				var output;
				var onLoad = function ( objAsArrayBuffer ) {

					scope.announceProgress( 'Running web worker!' );
					scope.objAsArrayBuffer = new Uint8Array( objAsArrayBuffer );
					scope.worker.postMessage( {
						cmd: 'run',
						objAsArrayBuffer: scope.objAsArrayBuffer
					}, [ scope.objAsArrayBuffer.buffer ] );

				};

				var onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					percentComplete = Math.round( event.loaded / event.total * 100 );
					if ( percentComplete > refPercentComplete ) {

						refPercentComplete = percentComplete;
						output = 'Download of "' + scope.fileObj + '": ' + percentComplete + '%';
						console.log( output );
						scope.announceProgress( output );

					}
				};

				var onError = function ( event ) {
					output = 'Error occurred while downloading "' + scope.fileObj + '"';
					console.error( output + ': ' + event );
					scope.announceProgress( output );
					scope.finalize( 'error' );

				};

				scope.fileLoader.setPath( scope.pathObj );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( scope.fileObj, onLoad, onProgress, onError );
			}
			console.timeEnd( 'Loading MTL textures' );
		};

		if ( this.dataAvailable ) {

			processLoadedMaterials( ( this.mtlAsString != null ) ? this.mtlLoader.parse( this.mtlAsString ) : null );

		} else {

			if ( this.fileMtl == null ) {

				processLoadedMaterials();

			} else {

				this.mtlLoader.setPath( this.pathTexture );
				this.mtlLoader.load( this.fileMtl, processLoadedMaterials );

			}

		}
	};

	WWOBJLoaderProxy.prototype.receiveWorkerMessage = function ( event ) {
		var payload = event.data;

		switch ( payload.cmd ) {
			case 'objData':

				this.counter ++;
				var bufferGeometry = new THREE.BufferGeometry();

				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.vertices ), 3 ) );
				if ( payload.normals !== null ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.normals ), 3 ) );

				} else {

					bufferGeometry.computeVertexNormals();

				}
				if ( payload.uvs !== null ) {

					bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( payload.uvs ), 2 ) );

				}

				var materialDescriptions = payload.materialDescriptions;
				var materialDescription;
				var material;
				var materialName;
				var createMultiMaterial = payload.multiMaterial;
				var multiMaterials = [];

				for ( var key in materialDescriptions ) {

					materialDescription = materialDescriptions[ key ];
					material = this.materials[ materialDescription.name ];

					if ( materialDescription.default ) {

						material = this.materials[ 'defaultMaterial' ];

					} else if ( materialDescription.clone ) {

						materialName = material.name + '_flat';
						var materialClone = this.materials[ materialName ];
						if ( ! materialClone ) {

							materialClone = material.clone();
							materialClone.name = materialName;
							materialClone.shading = THREE.FlatShading;
							this.materials[ materialName ] = name;

						}

					} else if ( ! material ) {

						material = this.materials[ 'defaultMaterial' ];

					}
					if ( createMultiMaterial ) multiMaterials.push( material );

				}

				if ( createMultiMaterial ) {

					material = new THREE.MultiMaterial( multiMaterials );
					var materialGroups = payload.materialGroups;
					var materialGroup;
					for ( var key in materialGroups ) {

						materialGroup = materialGroups[ key ];
						bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

					}

				}
				if ( this.callbacks.meshLoaded !== null ) {

					var materialOverride = this.callbacks.meshLoaded( payload.meshName, material );
					if ( materialOverride !== null && materialOverride !== undefined ) {

						material = materialOverride;

					}
				}

				var mesh = new THREE.Mesh( bufferGeometry, material );
				mesh.name = payload.meshName;

				this.sceneGraphBaseNode.add( mesh );

				var output = '(' + this.counter + '): ' + payload.meshName;
				this.announceProgress( 'Adding mesh', output );
				break;

			case 'complete':

				console.timeEnd( 'WWOBJLoaderProxy' );
				if ( payload.msg != null ) {

					this.announceProgress( payload.msg );

				} else {

					this.announceProgress( '' );

				}

				this.finalize( 'complete' );
				break;

			case 'report_progress':
				this.announceProgress( '', payload.output );
				break;

			default:
				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	WWOBJLoaderProxy.prototype.terminate = function () {
		THREE.WebWorker.WWLoaderProxyBase.prototype.terminate.call( this );
		this.fileLoader = null;
		this.mtlLoader = null;
	};

	WWOBJLoaderProxy.prototype.announceProgress = function ( baseText, text ) {
		var output = "";
		if ( baseText !== null && baseText !== undefined ) {

			output = baseText;

		}
		if ( text !== null && text !== undefined ) {

			output = output + " " + text;

		}
		if ( this.callbacks.progress !== null ) {

			this.callbacks.progress( output );

		}
		if ( this.debug ) {

			console.log( output );

		}
	};

	WWOBJLoaderProxy.prototype.addMaterial = function ( name, material ) {
		if ( material.name !== name ) material.name = name;
		this.materials[ name ] = material;
	};

	WWOBJLoaderProxy.prototype.getMaterial = function ( name ) {
		var material = this.materials[ name ];
		if ( ! material ) material = null;
		return material;
	};

	return WWOBJLoaderProxy;

})();
