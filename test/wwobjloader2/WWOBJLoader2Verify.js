/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE.examples === undefined ) THREE.examples = {};
if ( THREE.examples.loaders === undefined ) THREE.examples.loaders = {};

THREE.examples.loaders.WWOBJLoader2Verify = (function () {

	function WWOBJLoader2Verify( elementToBindTo ) {
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
			path: '../../resource/obj/male02/',
			fileObj: 'male02.obj',
			texturePath: '../../resource/obj/male02/',
			fileMtl: 'male02.mtl'
		};
	}

	WWOBJLoader2Verify.prototype.initGL = function () {
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

	WWOBJLoader2Verify.prototype.initPostGL = function () {
		var wwObjLoader2 = new THREE.OBJLoader2.WWOBJLoader2();

		var reportProgress = function ( content ) {
			console.log( 'Progress: ' + content );
		};
		var materialsLoaded = function ( materials ) {
			var count = 0;
			console.log( 'The following materials have been loaded:' );
			for ( var mat in materials ) {
				count++;
			}
			console.log( 'Loaded #' + count + ' materials.' );
		};
		var completedLoading = function () {
			console.log( 'Loading complete!' );
		};
		wwObjLoader2.registerCallbackProgress( reportProgress );
		wwObjLoader2.registerCallbackCompletedLoading( completedLoading );
		wwObjLoader2.registerCallbackMaterialsLoaded( materialsLoaded );

		var prepData = new THREE.OBJLoader2.WWOBJLoader2.PrepDataFile(
			'male02', this.objDef.path, this.objDef.fileObj, this.objDef.texturePath, this.objDef.fileMtl, this.pivot
		);
		wwObjLoader2.prepareRun( prepData );
		wwObjLoader2.run();

		return true;
	};

	WWOBJLoader2Verify.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	WWOBJLoader2Verify.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	WWOBJLoader2Verify.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	WWOBJLoader2Verify.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	WWOBJLoader2Verify.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	WWOBJLoader2Verify.prototype.alterSmoothShading = function () {

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

	WWOBJLoader2Verify.prototype.alterDouble = function () {

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

	WWOBJLoader2Verify.prototype.traverseScene = function ( object3d ) {

		if ( object3d.material instanceof THREE.MultiMaterial ) {

			for ( var matName in object3d.material.materials ) {

				this.traversalFunction( object3d.material.materials[matName] );

			}

		} else if ( object3d.material ) {

			this.traversalFunction( object3d.material );

		}

	};

	return WWOBJLoader2Verify;

})();
