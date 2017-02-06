/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WWOBJLoader2Example = (function () {

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

		this.smoothShading = true;
		this.doubleSide = false;
		this.streamMeshes = true;

		this.cube = null;
		this.pivot = null;

		this.wwObjLoader2 = new THREE.OBJLoader2.WWOBJLoader2();
		this.wwObjLoader2.setCrossOrigin( 'anonymous' );

		this.defaultObjDef = {
			name: 'male02',
			path: '../../resource/obj/male02/',
			fileObj: 'male02.obj',
			pathTexture: '../../resource/obj/male02/',
			fileMtl: 'male02.mtl'
		};

		// Check for the various File API support.
		this.fileApiAvailable = true;
		if ( window.File && window.FileReader && window.FileList && window.Blob ) {

			console.log( 'File API is supported! Enabling all features.' );

		} else {

			this.fileApiAvailable = false;
			console.warn( 'File API is not supported! Disabling file loading.' );

		}
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

		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, -20, 0 );
		this.scene.add( this.cube );

		this.createPivot();
	};

	WWOBJLoader2Example.prototype.createPivot = function () {
		this.pivot = new THREE.Object3D();
		this.pivot.name = 'Pivot';
		this.scene.add( this.pivot );
	};

	WWOBJLoader2Example.prototype.initPostGL = function () {
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
		this.wwObjLoader2.registerCallbackProgress( reportProgress );
		this.wwObjLoader2.registerCallbackCompletedLoading( completedLoading );
		this.wwObjLoader2.registerCallbackMaterialsLoaded( materialsLoaded );

		this._loadFiles( this.defaultObjDef );

		return true;
	};

	WWOBJLoader2Example.prototype._loadFiles = function ( objDef ) {
		var prepData = new THREE.OBJLoader2.WWOBJLoader2.PrepDataFile(
			objDef.name, objDef.path, objDef.fileObj, objDef.pathTexture, objDef.fileMtl, this.pivot, this.streamMeshes
		);
		this.wwObjLoader2.prepareRun( prepData );
		this.wwObjLoader2.run();
	};

	WWOBJLoader2Example.prototype._handleFileSelect = function ( event, pathTexture ) {
		var fileObj = null;
		var fileMtl = null;
		var files = event.target.files;

		for ( var i = 0, file; file = files[ i ]; i++) {

			if ( file.name.indexOf( '\.obj' ) > 0 && fileObj === null ) {
				fileObj = file;
			}

			if ( file.name.indexOf( '\.mtl' ) > 0 && fileMtl === null ) {
				fileMtl = file;
			}

		}

		if ( fileObj == null ) {
			alert( 'Unable to load OBJ file from given files.' );
		}

		var fileReader = new FileReader();
		fileReader.onload = function( fileDataObj ) {

			var uint8Array = new Uint8Array( fileDataObj.target.result );
			if ( fileMtl === null ) {

				app.loadFilesUser({
					name: 'userObj',
					objAsArrayBuffer: uint8Array,
					pathTexture: pathTexture,
					mtlAsString: null
				})

			} else {

				fileReader.onload = function( fileDataMtl ) {

					app.loadFilesUser({
						name: 'userObj',
						objAsArrayBuffer: uint8Array,
						pathTexture: pathTexture,
						mtlAsString: fileDataMtl.target.result
					})
				};
				fileReader.readAsText( fileMtl );

			}

		};
		fileReader.readAsArrayBuffer( fileObj );

	};

	WWOBJLoader2Example.prototype.loadFilesUser = function ( objDef ) {
		var prepData = new THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer(
			objDef.name, objDef.objAsArrayBuffer, objDef.pathTexture, objDef.mtlAsString, this.pivot, this.streamMeshes
		);
		this.wwObjLoader2.prepareRun( prepData );
		this.wwObjLoader2.run();
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

	WWOBJLoader2Example.prototype.alterSmoothShading = function () {

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

			for ( var matName in object3d.material.materials ) {

				this.traversalFunction( object3d.material.materials[ matName ] );

			}

		} else if ( object3d.material ) {

			this.traversalFunction( object3d.material );

		}

	};

	WWOBJLoader2Example.prototype.clearAllAssests = function () {
		var scope = this;
		var remover = function ( object3d ) {

			if ( object3d === scope.pivot ) {
				return;
			}
			console.log( 'Removing: ' + object3d.name );
			scope.scene.remove( object3d );

			if ( object3d.hasOwnProperty( 'geometry' ) ) {
				object3d.geometry.dispose();
			}
			if ( object3d.hasOwnProperty( 'material' ) ) {

				var mat = object3d.material;
				if ( mat.hasOwnProperty( 'materials' ) ) {

					for ( var mmat in mat.materials ) {
						mat.materials[ mmat ].dispose();
					}
				}
			}
			if ( object3d.hasOwnProperty( 'texture' ) ) {
				object3d.texture.dispose();
			}
		};

		scope.scene.remove( scope.pivot );
		scope.pivot.traverse( remover );
		scope.createPivot();
	};

	return WWOBJLoader2Example;

})();
