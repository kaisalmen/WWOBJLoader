/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {}
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWOBJLoaderFrontEnd = (function () {

	function WWOBJLoaderFrontEnd( basedir ) {
		// check worker support first
		if ( window.Worker === undefined ) {
			throw "This browser does not support web workers!"
		}

		this.basedir = basedir;
		this.worker = null;

		this.manager = THREE.DefaultLoadingManager;
		this.fileLoader = new THREE.XHRLoader( this.manager );
		this.mtlLoader = null;

		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
		this.objFile = null;
		this.objPath = null;

		this.mtlFile = null;
		this.mtlPath = null;
		this.mtlAsString = null;

		this.materials = [];
		this.objGroup = null;

		this.counter = 0;
		this.debug = false;

		// callbacks
		this.callbackMaterialsLoaded = null;
		this.callbackProgress = null;
		this.callbackMeshLoaded = null;
		this.callbackCompletedLoading = null;
	}

	WWOBJLoaderFrontEnd.prototype.setObjGroup = function ( objGroup ) {
		this.objGroup = objGroup;
	};

	WWOBJLoaderFrontEnd.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	WWOBJLoaderFrontEnd.prototype.registerHookMaterialsLoaded = function ( callback ) {
		this.callbackMaterialsLoaded = callback;
	};

	WWOBJLoaderFrontEnd.prototype.registerProgressCallback = function ( callbackProgress ) {
		this.callbackProgress = callbackProgress;
	};

	WWOBJLoaderFrontEnd.prototype.registerHookMeshLoaded = function ( callback ) {
		this.callbackMeshLoaded = callback;
	};

	WWOBJLoaderFrontEnd.prototype.registerHookCompletedLoading = function ( callback ) {
		this.callbackCompletedLoading = callback;
	};

	WWOBJLoaderFrontEnd.prototype.addMaterial = function ( name, material ) {
		if ( material.name !== name ) material.name = name;
		this.materials[ name ] = material;
	};

	WWOBJLoaderFrontEnd.prototype.getMaterial = function ( name ) {
		var material = this.materials[ name ];
		if ( ! material ) material = null;
		return material;
	};

	WWOBJLoaderFrontEnd.prototype.announceProgress = function ( baseText, text ) {
		var output = "";
		if ( baseText !== null && baseText !== undefined ) {

			output = baseText;

		}
		if ( text !== null && text !== undefined ) {

			output = output + " " + text;

		}
		if ( this.callbackProgress !== null ) {

			this.callbackProgress( output );

		}
		if ( this.debug ) {

			console.log( output );

		}
	};

	WWOBJLoaderFrontEnd.prototype.initWithFiles = function ( basePath, objFile, mtlFile, texturePath ) {
		// fast-fail on bad type
		if ( ! ( typeof( objFile ) === 'string' || objFile instanceof String ) ) {
			throw 'Provided file is not properly defined! Aborting...';
		}
		this.validate();

		console.time( 'WWOBJLoaderFrontEnd' );

		this.worker.postMessage( {
			cmd: 'init',
			debug: this.debug
		} );

		this.dataAvailable = false;
		this.objFile = objFile;
		this.objPath = basePath;
		this.mtlFile = mtlFile;
		this.mtlPath = texturePath;
	};

	WWOBJLoaderFrontEnd.prototype.initWithData = function ( objAsArrayBuffer, mtlAsString, texturePath ) {
		// fast-fail on bad type
		if ( ! ( objAsArrayBuffer instanceof ArrayBuffer || objAsArrayBuffer instanceof Uint8Array ) ) {
			throw 'Provided input is not of type arraybuffer! Aborting...';
		}
		this.validate();

		console.time( 'WWOBJLoaderFrontEnd' );

		this.worker.postMessage( {
			cmd: 'init',
			debug: this.debug
		} );

		this.dataAvailable = true;
		this.objAsArrayBuffer = objAsArrayBuffer;
		this.mtlAsString = mtlAsString;
		this.mtlPath = texturePath;
	};

	WWOBJLoaderFrontEnd.prototype.validate = function () {
		if ( this.worker == null ) {

			this.worker = new Worker( this.basedir + "/src/loaders/WWOBJLoader.js" );

			var scope = this;
			var scopeFunction = function ( e ) {
				scope.processData( e );
			};
			this.worker.addEventListener( 'message', scopeFunction, false );

		}
		this.fileLoader = ( this.fileLoader == null ) ? new THREE.XHRLoader( this.manager ) : this.fileLoader;
		this.mtlLoader = ( this.mtlLoader == null ) ?  new THREE.MTLLoader() : this.mtlLoader;

		this.dataAvailable = false;
		this.objFile = null;
		this.objPath = null;
		this.objAsArrayBuffer = null;

		this.mtlFile = null;
		this.mtlPath = null;
		this.mtlAsString = null;

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		this.counter = 0;
	};

	WWOBJLoaderFrontEnd.prototype.run = function () {
		var scope = this;

		var kickRun = function () {

			// pass materialNames to web worker
			var materialNames = [];
			for ( var materialName in scope.materials ) {
				materialNames.push( materialName );
			}
			scope.worker.postMessage( {
				cmd: 'initMaterials',
				materialNames: materialNames
			} );

			var runWorker = function () {
				scope.worker.postMessage({
					cmd: 'run',
					objAsArrayBuffer: scope.objAsArrayBuffer
				}, [ scope.objAsArrayBuffer.buffer ] );
			};

			if ( scope.dataAvailable && scope.objAsArrayBuffer ) {

				runWorker();

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
						output = 'Download of "' + scope.objFile + '": ' + percentComplete + '%';
						console.log( output );
						scope.announceProgress( output );

					}
				};

				var onError = function ( event ) {
					output = 'Error occurred while downloading "' + scope.objFile + '"';
					console.error( output + ': ' + event );
					scope.announceProgress( output );
				};

				scope.fileLoader.setPath( scope.objPath );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( scope.objFile, onLoad, onProgress, onError );
			}
		};

		var processMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			if ( materialCreator != null ) {
				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
			}
			var materialNames = [];
			for ( var materialName in materialCreatorMaterials ) {

				if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

					materialNames.push( materialName );
					scope.materials[ materialName ] = materialCreatorMaterials[ materialName ];

				}

			}

			// process obj immediately
			kickRun();

			if ( scope.callbackMaterialsLoaded != null ) {

				scope.materials = scope.callbackMaterialsLoaded( scope.materials );

			}
			console.timeEnd( 'Loading MTL textures' );
		};

		if ( scope.dataAvailable ) {

			if ( scope.mtlAsString == null ) {

				processMaterials();

			} else {

				processMaterials( scope.mtlLoader.parse( scope.mtlAsString ) );

			}

		} else {

			if ( scope.mtlFile == null ) {

				processMaterials();

			} else {

				scope.mtlLoader.setPath( this.mtlPath );
				scope.mtlLoader.load( scope.mtlFile, processMaterials );

			}

		}
	};

	WWOBJLoaderFrontEnd.prototype.processData = function ( event ) {
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

				this.objGroup.add( mesh );

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

	WWOBJLoaderFrontEnd.prototype.terminateWorker = function () {
		if ( this.worker !== null ) {

			this.worker.terminate();

		}
		this.worker = null;
		this.mtlLoader = null;
		this.materials = [];
		this.counter = 0;
	};

	return WWOBJLoaderFrontEnd;

})();
