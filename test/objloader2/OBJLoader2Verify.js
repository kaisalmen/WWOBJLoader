/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE.examples === undefined ) THREE.examples = {};
if ( THREE.examples.loaders === undefined ) THREE.examples.loaders = {};

THREE.examples.loaders.OBJLoader2Verify = (function () {

	function OBJLoader2Verify( elementToBindTo ) {
		this.renderer = null;
		this.canvas = elementToBindTo;
		this.aspectRatio = 1;
		this.recalcAspectRatio();

		this.scene = null;
		this.cameraDefaults = {
			posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 ),
			posCameraTarget: new THREE.Vector3( 0, 0, 0 ),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.camera = null;
		this.cameraTarget = this.cameraDefaults.posCameraTarget;

		this.controls = null;

		this.smoothShading = true;
		this.doubleSide = false;

		this.cube = null;
		this.pivot = null;

		this.objDef = {
			path: '../../resource/obj/female02/',
			fileObj: 'female02.obj',
			texturePath: '../../resource/obj/female02/',
			fileMtl: 'female02.mtl'
		};
		/*
		 this.objDef = {
		 path: '../../resource/obj/Cerberus/',
		 fileObj: 'Cerberus.obj',
		 fileMtl: ''
		 };

		 this.objDef = {
		 path: '../../resource/obj/PTV1/',
		 fileObj: 'PTV1.obj',
		 texturePath: '../../resource/obj/PTV1/',
		 fileMtl: 'PTV1.mtl'
		 };

		 this.objDef = {
		 path: '../../resource/obj/zomax/',
		 fileObj: 'zomax-net_haze-sink-scene.obj',
		 texturePath: '../../resource/obj/zomax/',
		 fileMtl: ''
		 };

		 this.objDef = {
		 path: '../../resource/obj/cube/',
		 fileObj: 'cube.obj',
		 texturePath: '../../resource/obj/cube/',
		 fileMtl: 'cube.mtl'
		 }

		 this.objDef = {
		 path: '../../resource/obj/vive-controller/',
		 fileObj: 'vr_controller_vive_1_5.obj',
		 fileMtl: ''
		 };
		 */
	}

	OBJLoader2Verify.prototype.initGL = function () {
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		} );
		this.renderer.setClearColor( 0x050505 );

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera( this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far );
		this.resetCamera();
		this.controls = new THREE.TrackballControls( this.camera );

		var ambientLight = new THREE.AmbientLight( 0x404040 );
		var directionalLight1 = new THREE.DirectionalLight( 0xC0C090 );
		var directionalLight2 = new THREE.DirectionalLight( 0xC0C090 );

		directionalLight1.position.set( -100, -50, 100 );
		directionalLight2.position.set( 100, 50, -100 );

		this.scene.add( directionalLight1 );
		this.scene.add( directionalLight2 );
		this.scene.add( ambientLight );

		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, -20, 0 );
		this.scene.add( this.cube );

		this.pivot = new THREE.Object3D();
		this.pivot.name = 'Pivot';
		this.scene.add( this.pivot );
	};

	OBJLoader2Verify.prototype.initPostGL = function () {
		var scope = this;

		var mtlLoader = new THREE.MTLLoader();
		mtlLoader.setPath( scope.objDef.texturePath );
		mtlLoader.setCrossOrigin( 'anonymous' );
		mtlLoader.load( scope.objDef.fileMtl, function( materials ) {

			materials.preload();

			var objLoader = new THREE.OBJLoader2();
			objLoader.setSceneGraphBaseNode( scope.pivot );
			objLoader.setMaterials( materials.materials );
			objLoader.setPath( scope.objDef.path );
			objLoader.setDebug( false, false );

			var onSuccess = function ( object3d ) {
				console.log( 'Loading complete. Meshes were attached to: ' + object3d.name );
			};

			var onProgress = function ( event ) {
				if ( event.lengthComputable ) {

					var percentComplete = event.loaded / event.total * 100;
					var output = 'Download of "' + scope.objDef.fileObj + '": ' + Math.round( percentComplete ) + '%';
					console.log(output);

				}
			};

			var onError = function ( event ) {
				console.error( 'Error of type "' + event.type + '" occurred when trying to load: ' + event.src );
			};

			objLoader.load( scope.objDef.fileObj, onSuccess, onProgress, onError );

		});

		return true;
	};

	OBJLoader2Verify.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	OBJLoader2Verify.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	OBJLoader2Verify.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	OBJLoader2Verify.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	OBJLoader2Verify.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
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

	return OBJLoader2Verify;

})();