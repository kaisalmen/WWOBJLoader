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
THREE.examples.loaders.WWOBJLoader2Verify = (function () {

	WWOBJLoader2Verify.prototype = Object.create( THREE.examples.apps.ThreeJsApp.prototype );
	WWOBJLoader2Verify.prototype.constructor = WWOBJLoader2Verify;

	function WWOBJLoader2Verify( elementToBindTo ) {
		THREE.examples.apps.ThreeJsApp.call( this );

		// app configuration: see THREE.examples.apps.ThreeJsAppDefaultDefinition (js/apps/ThreeJsApp.js)
		// Only define what is required (name and htmlCanvas).
		this.configure( {
			name: 'WWOBJLoader2Verification',
			htmlCanvas: elementToBindTo
		} );

		this.controls = null;

		this.smoothShading = true;
		this.doubleSide = false;

		this.cube = null;
		this.pivot = null;
	}

	WWOBJLoader2Verify.prototype.initGL = function () {
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

		this.pivot = new THREE.Object3D();
		this.pivot.name = 'Pivot';
		this.scenePerspective.scene.add( this.pivot );
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

		var fileDef = {
			path: '../../resource/obj/male02/',
			fileObj: 'male02.obj',
			texturePath: '../../resource/obj/male02/',
			fileMtl: 'male02.mtl'
		};
		var prepData = new THREE.OBJLoader2.WWOBJLoader2.PrepDataFile(
			'male02', fileDef.path, fileDef.fileObj, fileDef.texturePath, fileDef.fileMtl, this.pivot
		);
		wwObjLoader2.prepareRun( prepData );
		wwObjLoader2.run();

		return true;
	};

	WWOBJLoader2Verify.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();
	};

	WWOBJLoader2Verify.prototype.renderPre = function () {
		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;
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

	// ThreeJsApp.renderPost()  not required, default is used

	return WWOBJLoader2Verify;

})();
