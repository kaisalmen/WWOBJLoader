/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WWOBJLoader2Example = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function WWOBJLoader2Example( elementToBindTo ) {
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

		this.flatShading = false;
		this.doubleSide = false;

		this.cube = null;
		this.pivot = null;
	}

	WWOBJLoader2Example.prototype.initGL = function () {
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

	WWOBJLoader2Example.prototype.useParseSync = function () {
		var modelName = 'female02';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var scope = this;
		var objLoader = new THREE.OBJLoader2();
		var onLoadMtl = function ( materials ) {
			objLoader.setModelName( modelName );
			objLoader.setMaterials( materials );

			var fileLoader = new THREE.FileLoader();
			fileLoader.setPath( '../../' );
			fileLoader.setResponseType( 'arraybuffer' );
			fileLoader.load( 'resource/obj/female02/female02.obj',
				function ( content ) {
					var local = new THREE.Object3D();
					local.name = 'Pivot_female02';
					local.position.set( 75, 0, 0 );
					scope.pivot.add( local );
					local.add( objLoader.parse( content ) );

					scope._reportProgress( { detail: { text: 'Loading complete: ' + modelName } } );
				}
			);
		};
		objLoader.loadMtl( '../../resource/obj/female02/female02.mtl', null, onLoadMtl );
	};


	WWOBJLoader2Example.prototype.useParseAsync = function () {
		var modelName = 'female02_vertex' ;
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var callbackOnLoad = function ( event ) {
			var local = new THREE.Object3D();
			local.name = 'Pivot_female02_vertex';
			local.position.set( -75, 0, 0 );
			scope.pivot.add( local );
			local.add( event.detail.loaderRootNode );

			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var scope = this;
		var objLoader = new THREE.OBJLoader2();
		objLoader.setModelName( modelName );

		var fileLoader = new THREE.FileLoader();
		fileLoader.setPath( '../../' );
		fileLoader.setResponseType( 'arraybuffer' );
		var filename = 'resource/obj/female02/female02_vertex_colors.obj';
		fileLoader.load( filename,
			function ( content ) {
				objLoader.parseAsync( content, callbackOnLoad );
				scope._reportProgress( { detail: { text: 'File loading complete: ' + filename } } );
			}
		);
	};

	WWOBJLoader2Example.prototype.useLoadSync = function () {
		var modelName = 'male02';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var scope = this;
		var objLoader = new THREE.OBJLoader2();
		var callbackOnLoad = function ( event ) {
			var local = new THREE.Object3D();
			local.name = 'Pivot_male02';
			local.position.set( 0, 0, -75 );
			scope.pivot.add( local );
			local.add( event.detail.loaderRootNode );

			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var onLoadMtl = function ( materials ) {
			objLoader.setModelName( modelName );
			objLoader.setMaterials( materials );
			objLoader.setUseIndices( true );
			objLoader.load( '../../resource/obj/male02/male02.obj', callbackOnLoad, null, null, null, false );
		};
		objLoader.loadMtl( '../../resource/obj/male02/male02.mtl', null, onLoadMtl );
	};

	WWOBJLoader2Example.prototype.useLoadAsync = function () {
		var modelName = 'WaltHead';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var scope = this;
		var objLoader = new THREE.OBJLoader2();
		var callbackOnLoad = function ( event ) {
			objLoader.workerSupport.setTerminateRequested( true );

			var local = new THREE.Object3D();
			local.name = 'Pivot_WaltHead';
			local.position.set( -125, 50, 0 );
			var scale = 0.5;
			local.scale.set( scale, scale, scale );
			scope.pivot.add( local );
			local.add( event.detail.loaderRootNode );

			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var onLoadMtl = function ( materials ) {
			objLoader.setModelName( modelName );
			objLoader.setMaterials( materials );
			objLoader.terminateWorkerOnLoad = false;
			objLoader.load( '../../resource/obj/walt/WaltHead.obj', callbackOnLoad, null, null, null, true );

		};
		objLoader.loadMtl( '../../resource/obj/walt/WaltHead.mtl', null, onLoadMtl );
	};

	WWOBJLoader2Example.prototype.useRunSync = function () {
		var scope = this;
		var callbackOnLoad = function ( event ) {
			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var prepData = new THREE.LoaderSupport.PrepData( 'cerberus' );
		var local = new THREE.Object3D();
		local.position.set( 0, 0, 100 );
		local.scale.set( 50.0, 50.0, 50.0 );
		this.pivot.add( local );
		prepData.streamMeshesTo = local;
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/cerberus/Cerberus.obj', 'OBJ' ) );
		var callbacks = prepData.getCallbacks();
		callbacks.setCallbackOnProgress( this._reportProgress );
		callbacks.setCallbackOnLoad( callbackOnLoad );

		var objLoader = new THREE.OBJLoader2();
		objLoader.run( prepData );
	};

	WWOBJLoader2Example.prototype.useRunAsyncMeshAlter = function () {
		var scope = this;
		var callbackOnLoad = function ( event ) {
			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var prepData = new THREE.LoaderSupport.PrepData( 'vive-controller' );
		var local = new THREE.Object3D();
		local.position.set( 125, 50, 0 );
		local.name = 'Pivot_vive-controller';
		this.pivot.add( local );
		prepData.streamMeshesTo = local;
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/vive-controller/vr_controller_vive_1_5.obj', 'OBJ' ) );
		prepData.useAsync = true;
		var callbacks = prepData.getCallbacks();
		var callbackMeshAlter = function ( event ) {
			var override = new THREE.LoaderSupport.LoadedMeshUserOverride( false, true );

			var mesh = new THREE.Mesh( event.detail.bufferGeometry, event.detail.material );
			var scale = 200.0;
			mesh.scale.set( scale, scale, scale );
			mesh.name = event.detail.meshName;
			var helper = new THREE.VertexNormalsHelper( mesh, 2, 0x00ff00, 1 );
			helper.name = 'VertexNormalsHelper';

			override.addMesh( mesh );
			override.addMesh( helper );

			return override;
		};
		callbacks.setCallbackOnMeshAlter( callbackMeshAlter );
		callbacks.setCallbackOnProgress( this._reportProgress );
		callbacks.setCallbackOnLoad( callbackOnLoad );

		var objLoader = new THREE.OBJLoader2();
		objLoader.run( prepData );
	};

	WWOBJLoader2Example.prototype.finalize = function () {
		this._reportProgress( { detail: { text: '' } } );
	};

	WWOBJLoader2Example.prototype._reportProgress = function( event ) {
		var output = Validator.verifyInput( event.detail.text, '' );
		console.log( 'Progress: ' + output );
		document.getElementById( 'feedback' ).innerHTML = output;
	};

	WWOBJLoader2Example.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	WWOBJLoader2Example.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	WWOBJLoader2Example.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	WWOBJLoader2Example.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	WWOBJLoader2Example.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	WWOBJLoader2Example.prototype.alterShading = function () {
		var scope = this;
		scope.flatShading = ! scope.flatShading;
		console.log( scope.flatShading ? 'Enabling flat shading' : 'Enabling smooth shading');

		scope.traversalFunction = function ( material ) {
			material.flatShading = scope.flatShading;
			material.needsUpdate = true;
		};
		var scopeTraverse = function ( object3d ) {
			scope.traverseScene( object3d );
		};
		scope.pivot.traverse( scopeTraverse );
	};

	WWOBJLoader2Example.prototype.alterDouble = function () {
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

	WWOBJLoader2Example.prototype.traverseScene = function ( object3d ) {
		if ( object3d.material instanceof THREE.MultiMaterial ) {

			var materials = object3d.material.materials;
			for ( var name in materials ) {

				if ( materials.hasOwnProperty( name ) )	this.traversalFunction( materials[ name ] );

			}

		} else if ( object3d.material ) {

			this.traversalFunction( object3d.material );

		}
	};

	return WWOBJLoader2Example;

})();
