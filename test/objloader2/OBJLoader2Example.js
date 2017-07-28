/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var OBJLoader2Example = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function OBJLoader2Example( elementToBindTo ) {
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

		this.objLoader = new THREE.OBJLoader2();
		this.loadList = [];
	}

	OBJLoader2Example.prototype.initGL = function () {
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		} );
		this.renderer.setClearColor( 0x050505 );

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera( this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far );
		this.resetCamera();
		this.controls = new THREE.TrackballControls( this.camera, this.renderer.domElement );

		var ambientLight = new THREE.AmbientLight( 0x404040 );
		var directionalLight1 = new THREE.DirectionalLight( 0xC0C090 );
		var directionalLight2 = new THREE.DirectionalLight( 0xC0C090 );

		directionalLight1.position.set( -100, -50, 100 );
		directionalLight2.position.set( 100, 50, -100 );

		this.scene.add( directionalLight1 );
		this.scene.add( directionalLight2 );
		this.scene.add( ambientLight );

		var helper = new THREE.GridHelper( 1200, 60, 0xFF4444, 0x404040 );
		this.scene.add( helper );

		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, 0, 0 );
		this.scene.add( this.cube );

		this.pivot = new THREE.Object3D();
		this.pivot.name = 'Pivot';
		this.scene.add( this.pivot );
	};

	OBJLoader2Example.prototype.addToLoadList = function ( prepData ) {
		this.loadList.push( prepData );
	};

	OBJLoader2Example.prototype.processLoadList = function () {
		if ( this.loadList.length > 0 ) {
			var prepData = this.loadList[ 0 ];
			if ( ! Validator.isValid( prepData ) ) return;

			this.loadList.shift();
			this.loadObj( prepData );
		}
	};

	OBJLoader2Example.prototype.registerCallbacks = function ( applyHere ) {
		var scope = this;
		var callbackOnLoad = function ( sceneGraphBaseNode, modelName, instanceNo ) {
			scope.scene.add( sceneGraphBaseNode );
			console.log( 'Loading complete: ' + modelName );
			scope._reportProgress( '' );

			scope.processLoadList();
		};
		var callbackMeshLoaded = function ( name, bufferGeometry, material ) {
			var override = new THREE.LoaderSupport.LoadedMeshUserOverride( false, true );

			var mesh = new THREE.Mesh( bufferGeometry, material );
			mesh.name = name;
			var helper = new THREE.VertexNormalsHelper( mesh, 2, 0x00ff00, 1 );
			helper.name = 'VertexNormalsHelper';

			override.addMesh( mesh );
			override.addMesh( helper );

			return override;
		};
		applyHere.setCallbackOnProgress( this._reportProgress );
		applyHere.setCallbackOnLoad( callbackOnLoad );
		applyHere.setCallbackOnMeshLoaded( callbackMeshLoaded );
	};

	/**
	 *
	 * @param {THREE.LoaderSupport.PrepData prepData
	 */
	OBJLoader2Example.prototype.loadObj = function ( prepData ) {
		if ( ! Validator.isValid( prepData ) ) return;

		var modelName = prepData.modelName;
		this._reportProgress( 'Loading: ' + modelName );

		var scope = this;
		if ( prepData.automatedRun ) {

			scope.pivot.add( prepData.sceneGraphBaseNode );

			scope.objLoader.init();
			scope.registerCallbacks( prepData.getCallbacks() );
			scope.objLoader.run( prepData );

		} else {

			var resourceObj = prepData.resources[ 0 ];
			var resourceMtl = prepData.resources[ 1 ];

			var onLoadMtl = function ( materials ) {

				scope.pivot.add( prepData.sceneGraphBaseNode );

				scope.objLoader.init();
				scope.objLoader.setMaterials( materials );
				scope.objLoader.setSceneGraphBaseNode( prepData.sceneGraphBaseNode );
				scope.registerCallbacks( scope.objLoader.getCallbacks() );
				scope.objLoader.load( resourceObj.url );
			};

			scope.objLoader.loadMtl( resourceMtl, onLoadMtl, 'anonymous' );

		}
	};

	OBJLoader2Example.prototype._reportProgress = function( content, modelName, instanceNo ) {
		console.log( 'Progress: ' + content );
		document.getElementById( 'feedback' ).innerHTML = Validator.isValid( content ) ? content : '';
	};

	OBJLoader2Example.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	OBJLoader2Example.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	OBJLoader2Example.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	OBJLoader2Example.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	OBJLoader2Example.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	OBJLoader2Example.prototype.alterSmoothShading = function () {

		var scope = this;
		scope.smoothShading = ! scope.smoothShading;
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

	OBJLoader2Example.prototype.alterDouble = function () {

		var scope = this;
		scope.doubleSide = ! scope.doubleSide;
		console.log( scope.doubleSide ? 'Enabling DoubleSide materials' : 'Enabling FrontSide materials');

		scope.traversalFunction  = function ( material ) {
			material.side = scope.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
		};

		var scopeTraverse = function ( object3d ) {
			scope.traverseScene( object3d );
		};
		scope.pivot.traverse( scopeTraverse );
	};

	OBJLoader2Example.prototype.traverseScene = function ( object3d ) {

		if ( object3d.material instanceof THREE.MultiMaterial ) {

			var materials = object3d.material.materials;
			for ( var name in materials ) {

				if ( materials.hasOwnProperty( name ) )	this.traversalFunction( materials[ name ] );

			}

		} else if ( object3d.material ) {

			this.traversalFunction( object3d.material );

		}

	};

	return OBJLoader2Example;

})();