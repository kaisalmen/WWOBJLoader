/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

THREE.WebWorker.WWOBJLoaderFrontEnd = (function () {

	function WWOBJLoaderFrontEnd( basedir ) {
		// check worker support first
		if ( window.Worker === undefined ) {
			throw "This browser does not support web workers!"
		}

		this.worker = new Worker( basedir + "/js/apps/tools/loaders/WWOBJLoader.js" );

		var scope = this;
		var scopeFunction = function ( e ) {
			scope.processData( e );
		};
		this.worker.addEventListener( 'message', scopeFunction, false );

		this.mtlLoader = new THREE.MTLLoader();
		this.mtlFile = null;
		this.texturePath = null;
		this.dataAvailable = false;
		this.mtlAsString = null;

		this.materials = [];
		this.defaultMaterial = new THREE.MeshPhongMaterial();
		this.defaultMaterial.name = "defaultMaterial";

		this.counter = 0;
		this.objGroup = null;

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
		if ( material.name !== name ) {

			material.name = name;

		}
		this.materials[ name ] = material;
	};

	WWOBJLoaderFrontEnd.prototype.getMaterial = function ( name ) {
		var material = this.materials[ name ];
		if ( material === undefined ) {

			material = null;

		}
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

		console.time( 'WWOBJLoaderFrontEnd' );
		this.dataAvailable = false;

		this.worker.postMessage( {
			cmd: 'init',
			debug: this.debug,
			dataAvailable: this.dataAvailable,
			basePath: basePath,
			objFile: objFile,
			objAsArrayBuffer: null
		} );


		// configure MTLLoader
		this.mtlFile = mtlFile;
		this.texturePath = texturePath;
		this.mtlLoader.setPath( this.texturePath );
	};

	WWOBJLoaderFrontEnd.prototype.initWithData = function ( objAsArrayBuffer, mtlAsString, texturePath ) {

		console.time( 'WWOBJLoaderFrontEnd' );
		this.dataAvailable = true;

		this.worker.postMessage( {
			cmd: 'init',
			debug: this.debug,
			dataAvailable: this.dataAvailable,
			basePath: null,
			objFile: null,
			objAsArrayBuffer: objAsArrayBuffer === undefined ? null : objAsArrayBuffer
		}, [ objAsArrayBuffer.buffer ] );

		this.mtlAsString = mtlAsString;
		this.texturePath = texturePath;
		this.mtlLoader.setPath( this.texturePath );
	};

	WWOBJLoaderFrontEnd.prototype.run = function () {
		var scope = this;

		var kickRun = function () {
			scope.worker.postMessage({
				cmd: 'run',
			});
		};

		// fast-exec in case of no mtl file or data
		if ( this.dataAvailable && ( scope.mtlAsString === undefined || scope.mtlAsString === null ) ) {

			kickRun();
			return;

		}
		else if ( ! this.dataAvailable && ( scope.mtlFile === undefined || scope.mtlFile === null ) ) {

			kickRun();
			return;

		}

		var processMaterials = function ( materialsOrg ) {

			var matInfoOrg = materialsOrg.materialsInfo;

			// Clone mtl input material objects
			var matInfoMod = {};
			var name, matOrg, matMod;
			for ( name in matInfoOrg ) {

				if ( matInfoOrg.hasOwnProperty( name ) ) {

					matOrg = matInfoOrg[ name ];
					matMod = Object.assign( {}, matOrg );

					if ( matMod.hasOwnProperty( 'map_kd' ) ) {

						delete matMod[ 'map_kd' ];

					}
					if ( matMod.hasOwnProperty( 'map_ks' ) ) {

						delete matMod[ 'map_ks' ];

					}
					if ( matMod.hasOwnProperty( 'map_bump' ) ) {

						delete matMod[ 'map_bump' ];

					}
					if ( matMod.hasOwnProperty( 'bump' ) ) {

						delete matMod[ 'bump' ];

					}
					matInfoMod[ name ] = matMod;

				}
			}
			var materialsMod = new THREE.MTLLoader.MaterialCreator( materialsOrg.baseUrl, materialsOrg.options );
			materialsMod.setMaterials( matInfoMod );
			materialsMod.preload();

			// set 'castrated' materials in associated materials array
			for ( name in materialsMod.materials ) {

				if ( materialsMod.materials.hasOwnProperty( name ) ) {

					scope.materials[ name ] = materialsMod.materials[ name ];

				}
			}

			// pass 'castrated' materials to web worker
			scope.worker.postMessage( {
				cmd: 'initMaterials',
				materials: JSON.stringify( matInfoMod ),
				baseUrl: materialsMod.baseUrl,
				options: materialsMod.options
			} );

			// process obj immediately
			kickRun();


			console.time( 'Loading MTL textures' );
			materialsOrg.preload();

			// update stored materials with texture mapping information (= fully restoration)
			var matWithTextures = materialsOrg.materials;
			var intermediate;
			var updated;
			for ( name in scope.materials ) {

				if ( scope.materials.hasOwnProperty( name ) && matWithTextures.hasOwnProperty( name ) ) {

					intermediate = scope.materials[ name ];
					updated = matWithTextures[ name ];
					intermediate.setValues( updated );

				}
			}

			if ( scope.callbackMaterialsLoaded !== null ) {

				scope.materials = scope.callbackMaterialsLoaded( scope.materials );

			}
			console.timeEnd( 'Loading MTL textures' );
		};

		if ( this.dataAvailable ) {

			processMaterials( scope.mtlLoader.parse( scope.mtlAsString ) );

		} else {

			scope.mtlLoader.load( scope.mtlFile, processMaterials );

		}
	};

	WWOBJLoaderFrontEnd.prototype.processData = function ( event ) {
		var payload = event.data;
		var material;

		switch ( payload.cmd ) {
			case 'objData':

				this.counter ++;
				var bufferGeometry = new THREE.BufferGeometry();

				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.vertices ), 3 ) );
				if ( payload.normals !== undefined ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.normals ), 3 ) );

				} else {

					bufferGeometry.computeVertexNormals();

				}
				if ( payload.uvs !== undefined ) {

					bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( payload.uvs ), 2 ) );

				}
				if ( payload.multiMaterial ) {

					var materialNames = JSON.parse( payload.materialName );
					var multiMaterials = [];
					var name;
					for ( var key in materialNames ) {

						name = materialNames[ key ];
						multiMaterials.push( this.materials[ name ] );

					}

					material = new THREE.MultiMaterial( multiMaterials );

				} else {

					material = this.materials[ payload.materialName ];

				}

				if ( material === null || material === undefined ) {

					material = this.defaultMaterial;

				}

				if ( payload.materialGroups !== null ) {

					var materialGroups = JSON.parse( payload.materialGroups );
					for ( var group, i = 0, length = materialGroups.length; i < length; i ++ ) {

						group = materialGroups[ i ];
						bufferGeometry.addGroup( group.start, group.count, group.index );

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
				this.announceProgress();

				if ( this.callbackCompletedLoading !== null ) {

					this.callbackCompletedLoading();

				}

				this.worker.terminate();

				break;

			default:

				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	return WWOBJLoaderFrontEnd;

})();
