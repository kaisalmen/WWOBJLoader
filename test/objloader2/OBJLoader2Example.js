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
	};

	OBJLoader2Example.prototype.initContent = function () {
		var modelName = 'female02';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var scope = this;
		var objLoader = new THREE.OBJLoader2();
		var callbackOnLoad = function ( event ) {
			scope.scene.add( event.detail.loaderRootNode );
			console.log( 'Loading complete: ' + event.detail.modelName );
			scope._reportProgress( { detail: { text: '' } } );
		};

		var onLoadMtl = function ( materials ) {
			objLoader.setModelName( modelName );
			objLoader.setMaterials( materials );
			objLoader.setLogging( true, true );
			objLoader.load( '../../resource/obj/female02/female02.obj', callbackOnLoad, null, null, null, false );
		};
		objLoader.loadMtl( '../../resource/obj/female02/female02.mtl', null, onLoadMtl );
	};

	OBJLoader2Example.prototype._reportProgress = function( event ) {
		var output = Validator.verifyInput( event.detail.text, '' );
		console.log( 'Progress: ' + output );
		document.getElementById( 'feedback' ).innerHTML = output;
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
		this.renderer.render( this.scene, this.camera );
	};

	return OBJLoader2Example;

})();