/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWOBJLoaderFrontEnd = (function () {

	WWOBJLoaderFrontEnd.prototype = Object.create( THREE.WebWorker.WWLoaderBase );
	WWOBJLoaderFrontEnd.prototype.constructor = WWOBJLoaderFrontEnd;

	function WWOBJLoaderFrontEnd( basedir, relativeWorkerSrcPath ) {
		THREE.WebWorker.WWLoaderBase.call( this, basedir, relativeWorkerSrcPath );
		this.parent = THREE.WebWorker.WWLoaderBase.prototype;

		this.manager = THREE.DefaultLoadingManager;
		this.fileLoader = new THREE.XHRLoader( this.manager );
		this.mtlLoader = null;

		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
		this.objFile = null;
		this.objPath = null;

		this.mtlFile = null;
		this.mtlFileAsString = null;
		this.texturePath = null;

		this.counter = 0;
	}

	WWOBJLoaderFrontEnd.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.parent.setSceneGraphBaseNode.call( this, sceneGraphBaseNode );
	};

	WWOBJLoaderFrontEnd.prototype.setDebug = function ( enabled ) {
		this.parent.setDebug.call( this, enabled );
	};

	WWOBJLoaderFrontEnd.prototype.registerHookMaterialsLoaded = function ( callback ) {
		this.parent.registerHookMaterialsLoaded.call( this, callback );
	};

	WWOBJLoaderFrontEnd.prototype.registerProgressCallback = function ( callback ) {
		this.parent.registerProgressCallback.call( this, callback );
	};

	WWOBJLoaderFrontEnd.prototype.registerHookMeshLoaded = function ( callback ) {
		this.parent.registerHookMeshLoaded.call( this, callback );
	};

	WWOBJLoaderFrontEnd.prototype.registerHookCompletedLoading = function ( callback ) {
		this.parent.registerHookCompletedLoading.call( this, callback );
	};

    WWOBJLoaderFrontEnd.prototype.validate = function () {
		if ( this.parent.validate.call( this ) ) return;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.XHRLoader( this.manager ) : this.fileLoader;
		this.mtlLoader = ( this.mtlLoader == null ) ?  new THREE.MTLLoader() : this.mtlLoader;

		this.dataAvailable = false;
		this.objFile = null;
		this.objPath = null;
		this.objAsArrayBuffer = null;

		this.mtlFile = null;
		this.mtlFileAsString = null;
		this.texturePath = null;

		this.counter = 0;
	};

	WWOBJLoaderFrontEnd.prototype.shutdownWorker = function () {
		this.parent.shutdownWorker.call( this );
		this.fileLoader = null;
		this.mtlLoader = null;
	};

	WWOBJLoaderFrontEnd.prototype.initFiles = function ( basePath, objFile, mtlFile, texturePath ) {
		// fast-fail on bad type
		if ( ! ( typeof( objFile ) === 'string' || objFile instanceof String ) ) {
			throw 'Provided file is not properly defined! Aborting...';
		}
		console.time( 'WWOBJLoaderFrontEnd' );
		this.validate();

		this.worker.postMessage( {
			cmd: 'init',
			debug: this.debug
		} );

		this.dataAvailable = false;
		this.objFile = objFile;
		this.objPath = basePath;
		this.mtlFile = mtlFile;
		this.texturePath = texturePath;
	};

	WWOBJLoaderFrontEnd.prototype.initData = function ( objAsArrayBuffer, mtlAsString, texturePath ) {
		// fast-fail on bad type
		if ( ! ( objAsArrayBuffer instanceof ArrayBuffer || objAsArrayBuffer instanceof Uint8Array ) ) {
			throw 'Provided input is not of type arraybuffer! Aborting...';
		}
		console.time( 'WWOBJLoaderFrontEnd' );
		this.validate();

		this.worker.postMessage( {
			cmd: 'init',
			debug: this.debug
		} );

		this.dataAvailable = true;
		this.objAsArrayBuffer = objAsArrayBuffer;
		this.mtlFileAsString = mtlAsString;
		this.texturePath = texturePath;
	};

	WWOBJLoaderFrontEnd.prototype.addMaterial = function ( name, material ) {
		this.parent.addMaterial.call( this, name, material );
	};

	WWOBJLoaderFrontEnd.prototype.getMaterial = function ( name ) {
		this.parent.getMaterial.call( this, name );
	};

	WWOBJLoaderFrontEnd.prototype.announceProgress = function ( baseText, text ) {
		this.parent.announceProgress.call( this, baseText, text );
	};

	WWOBJLoaderFrontEnd.prototype.run = function () {
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

			if ( scope.callbackMaterialsLoaded != null ) scope.materials = scope.callbackMaterialsLoaded( scope.materials );

			if ( scope.dataAvailable && scope.objAsArrayBuffer ) {

				scope.worker.postMessage({
					cmd: 'run',
					objAsArrayBuffer: scope.objAsArrayBuffer
				}, [ scope.objAsArrayBuffer.buffer ] );
				scope.finalize();

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
					scope.finalize();

				};

				var onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					percentComplete = Math.round( event.loaded / event.total * 100 );
					if ( percentComplete > refPercentComplete ) {

						refPercentComplete = percentComplete;
						output = 'Download of "' + scope.objFile + '": ' + percentComplete + '%';
						console.log( output );
						scope.announceProgress( output );

					}
				};

				var onError = function ( event ) {
					output = 'Error occurred while downloading "' + scope.objFile + '"';
					console.error( output + ': ' + event );
					scope.announceProgress( output );
					scope.finalize();

				};

				scope.fileLoader.setPath( scope.objPath );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( scope.objFile, onLoad, onProgress, onError );
			}
			console.timeEnd( 'Loading MTL textures' );
		};

		if ( this.dataAvailable ) {

			processLoadedMaterials( ( this.mtlFileAsString != null ) ? this.mtlLoader.parse( this.mtlFileAsString ) : null );

		} else {

			if ( this.mtlFile == null ) {

				processLoadedMaterials();

			} else {

				this.mtlLoader.setPath( this.texturePath );
				this.mtlLoader.load( this.mtlFile, processLoadedMaterials );

			}

		}
	};

	WWOBJLoaderFrontEnd.prototype.receiveWorkerMessage = function ( event ) {
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
				if ( this.callbackMeshLoaded !== null ) {

					var materialOverride = this.callbackMeshLoaded( payload.meshName, material );
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

				console.timeEnd( 'WWOBJLoaderFrontEnd' );
				if ( payload.msg != null ) {

					this.announceProgress( payload.msg );

				} else {

					this.announceProgress( '' );

				}

 				if ( this.callbackCompletedLoading !== null ) {

					this.callbackCompletedLoading();

				}
				break;

			case 'report_progress':
				this.announceProgress( '', payload.output );
				break;

			default:

				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	WWOBJLoaderFrontEnd.prototype.finalize = function () {
		this.parent.finalize.call( this );
	};

	return WWOBJLoaderFrontEnd;

})();
