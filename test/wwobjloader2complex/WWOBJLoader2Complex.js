/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE.examples.loaders === undefined ) {
	THREE.examples.loaders = {};
}

/**
 * ThreeJsApp serves as base class that defines an application life-cycle and
 * handles some things you always need to do when writing an example:
 * - Renderer init
 * - Perspective scene with camera (enabled by default)
 *   - CubeMap scene (disabled by default)
 * - Orthographic scene with camera (disabled by default)
 * - Canvas/renderer size changes
 *
 * This example extends ThreeJsApp and overwrites only functions needed.
 */
THREE.examples.loaders.WWOBJLoader2Complex = (function () {

	WWOBJLoader2Complex.prototype = Object.create( THREE.examples.apps.ThreeJsApp.prototype );
	WWOBJLoader2Complex.prototype.constructor = WWOBJLoader2Complex;

	function WWOBJLoader2Complex( elementToBindTo ) {
		THREE.examples.apps.ThreeJsApp.call( this );

		// app configuration: see THREE.examples.apps.ThreeJsAppDefaultDefinition (js/apps/ThreeJsApp.js)
		// Only define what is required (name and htmlCanvas).
		this.configure( {
			name: 'WWOBJLoaderChecker',
			htmlCanvas: elementToBindTo
		} );

		this.wwObjLoader2 = new THREE.OBJLoader2.WWOBJLoader2();

		this.controls = null;

		this.cube = null;

		this.loadCounter = 0;
		this.objs2Load = [];
		this.allAssets = [];

		this.processing = false;
	}

	WWOBJLoader2Complex.prototype.initPreGL = function () {
		var scope = this;

		var reloadAssetsProxy = function () {
			scope.reloadAssets();
		};
		var materialsLoaded = function ( materials ) {
			var count = 0;
			console.log( 'The following materials have been loaded:' );
			for ( var mat in materials ) {
				count++;
			}
			console.log( 'Loaded #' + count + ' materials.' );
		};
		var meshLoaded = function ( meshName ) {
			// just for demonstration...
		};
		var errorWhileLoading = function () {
			// just for demonstration...
		};
		this.wwObjLoader2.registerCallbackMaterialsLoaded( materialsLoaded );
		this.wwObjLoader2.registerCallbackMeshLoaded( meshLoaded );
		this.wwObjLoader2.registerCallbackCompletedLoading( reloadAssetsProxy );
		this.wwObjLoader2.registerCallbackProgress( this.reportProgress );
		this.wwObjLoader2.registerCallbackErrorWhileLoading( errorWhileLoading );

		// tell ThreeJsApp async loading is done (none needed here)
		this.preloadDone = true;
	};

	WWOBJLoader2Complex.prototype.initGL = function () {
		this.renderer.setClearColor( 0x050505 );

		var cameraDefaults = {
			posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 )
		};
		this.scenePerspective.setCameraDefaults( cameraDefaults );
		this.controls = new THREE.TrackballControls( this.scenePerspective.camera );

		var ambientLight = new THREE.AmbientLight( 0x404040 );
		var directionalLight1 = new THREE.DirectionalLight( 0xC0C090 );
		var directionalLight2 = new THREE.DirectionalLight( 0xC0C090 );

		directionalLight1.position.set( -100, -50, 100 );
		directionalLight2.position.set( 100, 50, -100 );

		this.scenePerspective.scene.add( directionalLight1 );
		this.scenePerspective.scene.add( directionalLight2 );
		this.scenePerspective.scene.add( ambientLight );

		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, -20, 0 );
		this.scenePerspective.scene.add( this.cube );
	};

	WWOBJLoader2Complex.prototype.initPostGL = function () {
		this.reloadAssets();

		return true;
	};

	WWOBJLoader2Complex.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();
	};

	WWOBJLoader2Complex.prototype.renderPre = function () {
		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;
	};

	WWOBJLoader2Complex.prototype.clearAllAssests = function () {
		var ref;
		var scope = this;

		for ( var asset in this.allAssets ) {
			ref = this.allAssets[asset];

			var remover = function ( object3d ) {

				if ( object3d === ref.pivot ) {
					return;
				}
				console.log( 'Removing ' + object3d.name );
				scope.scenePerspective.scene.remove( object3d );

				if ( object3d.hasOwnProperty( 'geometry' ) ) {
					object3d.geometry.dispose();
				}
				if ( object3d.hasOwnProperty( 'material' ) ) {

					var mat = object3d.material;
					if ( mat.hasOwnProperty( 'materials' ) ) {

						for ( var mmat in mat.materials ) {
							mat.materials[mmat].dispose();
						}
					}
				}
				if ( object3d.hasOwnProperty( 'texture' ) ) {
					object3d.texture.dispose();
				}
			};
			scope.scenePerspective.scene.remove( ref.pivot );
			ref.pivot.traverse( remover );
			ref.pivot = null;
		}
		this.loadCounter = 0;
		this.allAssets = [];
	};

	WWOBJLoader2Complex.prototype.updateAssets = function ( objs ) {
		this.objs2Load = [];
		this.loadCounter = 0;
		this.processing = true;

		if ( objs !== undefined && objs !== null ) {

			var obj2Load;
			var pivot;
			var errors = '';

			for ( var i = 0; i < objs.length; i ++ ) {

				obj2Load = objs[i];
				if ( ! this.allAssets.hasOwnProperty( obj2Load.name ) ) {

					pivot = new THREE.Object3D();
					pivot.position.set( obj2Load.pos.x, obj2Load.pos.y, obj2Load.pos.z );
					pivot.scale.set( obj2Load.scale, obj2Load.scale, obj2Load.scale );
					obj2Load.pivot = pivot;
					this.objs2Load.push( obj2Load );
					this.allAssets[obj2Load.name] = obj2Load;

				} else {

					errors += obj2Load.name + ' ';

				}

				if ( errors !== '' ) {
					this.reportProgress( 'Will not reload: ' + errors );
				}

			}

		}
	};

	WWOBJLoader2Complex.prototype.reportProgress = function( text ) {
		document.getElementById( 'feedback' ).innerHTML = text;
	};

	WWOBJLoader2Complex.prototype.reloadAssets = function () {
		var scope = this;

		if ( scope.loadCounter < scope.objs2Load.length ) {

			var obj2Load = scope.objs2Load[ scope.loadCounter ];
			var prepData;
			scope.loadCounter ++;

			scope.scenePerspective.scene.add( obj2Load.pivot );

			if ( obj2Load.fileZip !== null ) {

				var zipTools = new THREE.examples.apps.ZipTools( obj2Load.pathBase );
				var mtlAsString = null;

				var setObjAsArrayBuffer = function ( data ) {
					scope.reportProgress( '' );
					prepData = new THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer(
						obj2Load.name, data, obj2Load.pathTexture, mtlAsString, obj2Load.pivot
					);
					scope.wwObjLoader2.prepareRun( prepData );
					scope.wwObjLoader2.run();
				};

				var setMtlAsString = function ( data ) {
					mtlAsString = data;
					scope.reportProgress( 'Unzipping: ' + obj2Load.fileObj );
					zipTools.unpackAsUint8Array( obj2Load.fileObj, setObjAsArrayBuffer );
				};

				var doneUnzipping = function () {
					if ( obj2Load.fileMtl !== null ) {

						zipTools.unpackAsString( obj2Load.fileMtl, setMtlAsString );

					} else {

						setMtlAsString( null );

					}
				};

				var errorCase = function ( text ) {
					scope.reportProgress( text );
					scope.processing = false;
				};
				zipTools.load( obj2Load.fileZip, { success: doneUnzipping, progress: scope.reportProgress, error: errorCase } );

			} else {

				scope.reportProgress( '' );
				prepData = new THREE.OBJLoader2.WWOBJLoader2.PrepDataFile(
					obj2Load.name, obj2Load.pathBase, obj2Load.fileObj, obj2Load.pathTexture, obj2Load.fileMtl, obj2Load.pivot
				);
				scope.wwObjLoader2.prepareRun( prepData );
				scope.wwObjLoader2.run();

			}
		} else {

			scope.processing = false;

		}
	};

	// ThreeJsApp.renderPost()  not required, default is used

	return WWOBJLoader2Complex;

})();

var WWOBJLoader2ObjDef = function ( name, pathBase, fileObj, fileMtl, pathTexture, fileZip, pos, scale ) {
	this.name = name;
	this.pathBase = pathBase;
	this.fileObj = fileObj;
	this.fileMtl = fileMtl;
	this.pathTexture = pathTexture;
	this.fileZip = fileZip;
	this.pos = pos;
	this.scale = scale == null ? 1.0 : scale;
	this.pivot = null;
};

var objsFemaleMale = [];
objsFemaleMale.push( new WWOBJLoader2ObjDef( 'male02', '../../resource/obj/male02/', 'male02.obj', 'male02.mtl', '../../resource/obj/male02/', null, { x: 100, y: 0, z: -75 } ) );
objsFemaleMale.push( new WWOBJLoader2ObjDef( 'female02', '../../resource/obj/female02/', 'female02.obj', 'female02.mtl', '../../resource/obj/female02/', null, { x: -100, y: 0, z: 75 } ) );

// https://zomax.net/download/263/zomax-net_haze-sink-scene.zip
// https://zomax.net/download/263/zomax-net_haze-sink-scene.zip
var objsZomaxOven = [];
objsZomaxOven.push( new WWOBJLoader2ObjDef( 'oven', '../../resource/obj/zomax/', 'zomax-net_haze-oven-scene.obj', null, null, 'zomax-net_haze-oven-scene.zip', { x: 0, y: 0, z: -75 } ) );

var objsZomaxSink = [];
objsZomaxSink.push( new WWOBJLoader2ObjDef( 'sink', '../../resource/obj/zomax/', 'zomax-net_haze-sink-scene.obj', null, null, 'zomax-net_haze-sink-scene.zip', { x: 0, y: 0, z: 75 } ) );

var objsPtv1Zip = [];
objsPtv1Zip.push( new WWOBJLoader2ObjDef( 'PTV1', '../../resource/obj/PTV1/', 'PTV1.obj', 'PTV1.mtl', '../../resource/obj/PTV1/', 'PTV1.zip', { x: -250, y: 0, z: -200 } ) );

var objsCerberus = [];
objsCerberus.push( new WWOBJLoader2ObjDef( 'cerberus', '../../resource/obj/Cerberus/', 'Cerberus.obj', null, '../../resource/obj/Cerberus/', null, { x: 0, y: -100, z: 0 }, 50.0 ) );

var objsWaltHead = [];
objsWaltHead.push( new WWOBJLoader2ObjDef( 'WaltHead', '../../resource/obj/walt/', 'WaltHead.obj', 'WaltHead.mtl', '../../resource/obj/walt/', null, { x: 0, y: 0, z: -200 } ) );

var objsVive = [];
objsVive.push( new WWOBJLoader2ObjDef( 'Vive Controller', '../../resource/obj/vive-controller/', 'vr_controller_vive_1_5.obj', null, '../../resource/obj/walt/', null, { x: 0, y: 0, z: 200 }, 400.0 ) );
