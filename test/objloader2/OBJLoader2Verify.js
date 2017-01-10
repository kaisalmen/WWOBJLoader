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
THREE.examples.loaders.OBJLoader2Verify = (function () {

	OBJLoader2Verify.prototype = Object.create( THREE.examples.apps.ThreeJsApp.prototype );
	OBJLoader2Verify.prototype.constructor = OBJLoader2Verify;

	function OBJLoader2Verify( elementToBindTo ) {
		THREE.examples.apps.ThreeJsApp.call( this );

		// app configuration: see THREE.examples.apps.ThreeJsAppDefaultDefinition (js/apps/ThreeJsApp.js)
		// Only define what is required (name and htmlCanvas).
		this.configure( {
			name: 'OBJLoader2Verification',
			htmlCanvas: elementToBindTo
		} );

		this.lights = null;
		this.controls = null;

		this.smoothShading = true;
		this.doubleSide = false;

		this.cube = null;
		this.pivot = null;

		this.fileDef = {
			path: '../../resource/obj/female02/',
			fileObj: 'female02.obj',
			texturePath: '../../resource/obj/female02/',
			fileMtl: 'female02.mtl'
		};
		/*
		 this.fileDef = {
		 path: '../../resource/obj/Cerberus/',
		 fileObj: 'Cerberus.obj',
		 fileMtl: ''
		 };

		 this.fileDef = {
		 path: '../../resource/obj/PTV1/',
		 fileObj: 'PTV1.obj',
		 texturePath: '../../resource/obj/PTV1/',
		 fileMtl: 'PTV1.mtl'
		 };

		 this.fileDef = {
		 path: '../../resource/obj/zomax/',
		 fileObj: 'zomax-net_haze-sink-scene.obj',
		 texturePath: '../../resource/obj/zomax/',
		 fileMtl: ''
		 };

		 this.fileDef = {
		 path: '../../resource/obj/cube/',
		 fileObj: 'cube.obj',
		 texturePath: '../../resource/obj/cube/',
		 fileMtl: 'cube.mtl'
		 }

		 this.fileDef = {
		 path: '../../resource/obj/vive-controller/',
		 fileObj: 'vr_controller_vive_1_5.obj',
		 fileMtl: ''
		 };
		 */
	}

	// ThreeJsApp.initPreGL()  not required, default is used

	OBJLoader2Verify.prototype.initGL = function () {
		this.renderer.setClearColor(0x303030);

		var cameraDefaults = {
			posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 )
		};
		this.scenePerspective.setCameraDefaults( cameraDefaults );
		this.controls = new THREE.TrackballControls( this.scenePerspective.camera );

		this.lights = {
			ambientLight: new THREE.AmbientLight( 0x202020 ),
			directionalLight1: new THREE.DirectionalLight( 0xC0C090 ),
			directionalLight2: new THREE.DirectionalLight( 0xC0C090 ),
			directionalLight3: new THREE.DirectionalLight( 0xC0C090 ),
			lightArray: new THREE.Object3D()
		};

		this.lights.directionalLight1.position.set( -100, 0, 100 );
		this.lights.directionalLight2.position.set( 100, 0, 100 );
		this.lights.directionalLight3.position.set( 0, 0, -100 );

		this.lights.lightArray.add( this.lights.directionalLight1 );
		this.lights.lightArray.add( this.lights.directionalLight2 );
		this.lights.lightArray.add( this.lights.directionalLight3 );
		this.scenePerspective.scene.add( this.lights.lightArray );


		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, -20, 0 );
		this.scenePerspective.scene.add( this.cube );

		this.pivot = new THREE.Object3D();
		this.scenePerspective.scene.add( this.pivot );
	};

	// ThreeJsApp.WWOBJLoaderChecker.prototype.initPostGL()  not required, default is used

	OBJLoader2Verify.prototype.initPostGL = function () {
		var scope = this;

		var mtlLoader = new THREE.MTLLoader();
		mtlLoader.setPath( scope.fileDef.texturePath );
		mtlLoader.load( scope.fileDef.fileMtl, function( materials ) {

			materials.preload();

			var objLoader = new THREE.OBJLoader2();
			objLoader.setMaterials( materials.materials );
			objLoader.setPath( scope.fileDef.path );
			objLoader.setDebug( false, false );

			var onSuccess = function ( object3d ) {
				if ( object3d !== undefined && object3d !== null ) {

					scope.pivot.add( object3d );

				}
			};

			var onProgress = function ( event ) {
				if ( event.lengthComputable ) {

					var percentComplete = event.loaded / event.total * 100;
					var output = 'Download of "' + scope.fileDef.fileObj + '": ' + Math.round( percentComplete ) + '%';
					console.log(output);

				}
			};

			var onError = function ( event ) {
				console.error( 'Error of type "' + event.type + '" occurred when trying to load: ' + event.src );
			};

			objLoader.load( scope.fileDef.fileObj, onSuccess, onProgress, onError );

		});

		return true;
	};

	OBJLoader2Verify.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();
	};

	OBJLoader2Verify.prototype.renderPre = function () {
		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;
	};


	OBJLoader2Verify.prototype.alterSmoothShading = function () {

		var scope = this;
		scope.smoothShading = ! scope.smoothShading;
		var side = document.getElementById( 'shading' );
		side.style.backgroundColor = scope.smoothShading ? 'darkgreen' : 'darkorange';
		side.style.borderColor = scope.smoothShading ? 'darkgreen' : 'darkorange';
		side.innerHTML = scope.smoothShading ? 'Smooth Shading' : 'Flat Shading';
		console.log( scope.smoothShading ? 'Enabling SmoothShading' : 'Enabling FlatShading');


		scope.traversalFunction = function ( material ) {
			material.shading = scope.smoothShading ? THREE.SmoothShading : THREE.FlatShading;
			material.needsUpdate = true;
		};
		var scopeTraverse = function ( object3d ) {
			scope.traverseScene( object3d );
		};
		scope.pivot.traverse( scopeTraverse );
	};

	OBJLoader2Verify.prototype.alterDouble = function () {

		var scope = this;
		scope.doubleSide = ! scope.doubleSide;
		var side = document.getElementById( 'side' );
		side.style.backgroundColor = scope.doubleSide ? 'darkgreen' : 'darkorange';
		side.style.borderColor = scope.doubleSide ? 'darkgreen' : 'darkorange';
		side.innerHTML = scope.doubleSide ? 'Double Side' : 'Front Side';
		console.log( scope.doubleSide ? 'Enabling DoubleSide materials' : 'Enabling FrontSide materials');


		scope.traversalFunction  = function ( material ) {
			material.side = scope.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
		};

		var scopeTraverse = function ( object3d ) {
			scope.traverseScene( object3d );
		};
		scope.pivot.traverse( scopeTraverse );
	};

	OBJLoader2Verify.prototype.traverseScene = function ( object3d ) {

		if ( object3d.material instanceof THREE.MultiMaterial ) {

			for ( var matName in object3d.material.materials ) {

				this.traversalFunction( object3d.material.materials[matName] );

			}

		} else if ( object3d.material ) {

			this.traversalFunction( object3d.material );

		}

	};

	// ThreeJsApp.renderPost()  not required, default is used

	return OBJLoader2Verify;

})();
