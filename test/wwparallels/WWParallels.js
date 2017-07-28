/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WWParallels = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function WWParallels( elementToBindTo ) {
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

		this.wwDirector = new THREE.LoaderSupport.WW.LoaderDirector( THREE.OBJLoader2.WWOBJLoader2 );
		this.wwDirector.setCrossOrigin( 'anonymous' );

		this.controls = null;
		this.cube = null;

		this.allAssets = [];
		this.feedbackArray = null;

		this.running = false;
	}

	WWParallels.prototype.initGL = function () {
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
		this.cube.position.set( 0, 0, 0 );
		this.scene.add( this.cube );
	};

	WWParallels.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	WWParallels.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	WWParallels.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	WWParallels.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	WWParallels.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};
	WWParallels.prototype.reportProgress = function( text ) {
		document.getElementById( 'feedback' ).innerHTML = text;
	};

	WWParallels.prototype.enqueueAllAssests = function ( maxQueueSize, maxWebWorkers, streamMeshes ) {
		if ( this.running ) {

			return;

		} else {

			this.running = true;

		}

		var scope = this;
		scope.wwDirector.objectsCompleted = 0;
		scope.feedbackArray = [];
		scope.reportDonwload = [];

		var i;
		for ( i = 0; i < maxWebWorkers; i++ ) {

			scope.feedbackArray[ i ] = 'Worker #' + i + ': Awaiting feedback';
			scope.reportDonwload[ i ] = true;

		}
		scope.reportProgress( scope.feedbackArray.join( '\<br\>' ) );

		var callbackOnLoad = function ( sceneGraphBaseNode, modelName, instanceNo ) {
			scope.reportDonwload[ instanceNo ] = false;
			scope.scene.add( sceneGraphBaseNode );

			var msg = 'Worker #' + instanceNo + ': Completed loading: ' + modelName + ' (#' + scope.wwDirector.objectsCompleted + ')';
			console.log( msg );
			scope.feedbackArray[ instanceNo ] = msg;
			scope.reportProgress( scope.feedbackArray.join( '\<br\>' ) );

			if ( scope.wwDirector.objectsCompleted + 1 === maxQueueSize ) scope.running = false;
		};

		var callbackReportProgress = function ( content, modelName, instanceNo ) {
			if ( scope.reportDonwload[ instanceNo ] ) {
				var msg = 'Worker #' + instanceNo + ': ' + content;
				console.log( msg );

				scope.feedbackArray[ instanceNo ] = msg;
				scope.reportProgress( scope.feedbackArray.join( '\<br\>' ) );
			}
		};

		var callbackMeshLoaded = function ( name, bufferGeometry, material ) {
			var override = new THREE.LoaderSupport.LoadedMeshUserOverride( false, false );

			if ( Validator.isValid( material ) && material.name === 'defaultMaterial' || name === 'Mesh_Mesh_head_geo.001_lambert2SG.001' ) {

				var materialOverride = material;
				materialOverride.color = new THREE.Color( Math.random(), Math.random(), Math.random() );
				var mesh = new THREE.Mesh( bufferGeometry, material );
				mesh.name = name;

				override.addMesh( mesh );
				override.alteredMesh = true;

			}
			return override;
		};

		var callbacks = new THREE.LoaderSupport.Callbacks();
		callbacks.setCallbackOnProgress( callbackReportProgress );
		callbacks.setCallbackOnLoad( callbackOnLoad );
		callbacks.setCallbackOnMeshLoaded( callbackMeshLoaded );

		this.wwDirector.prepareWorkers( callbacks, maxQueueSize, maxWebWorkers );
		console.log( 'Configuring WWManager with queue size ' + this.wwDirector.getMaxQueueSize() + ' and ' + this.wwDirector.getMaxWebWorkers() + ' workers.' );

		var modelPrepDatas = [];
		prepData = new THREE.LoaderSupport.PrepData( 'male02' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.obj', 'OBJ ') );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.mtl', 'MTL' ) );

		callbacks = prepData.getCallbacks();
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'female02' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.mtl', 'MTL' ) );
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'viveController' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/vive-controller/vr_controller_vive_1_5.obj', 'OBJ' ) );
		prepData.scale = 400.0;

		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'cerberus' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/cerberus/Cerberus.obj', 'OBJ' ) );
		prepData.scale = 50.0;
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'WaltHead' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.mtl', 'MTL' ) );
		modelPrepDatas.push( prepData );

		var pivot;
		var distributionBase = -500;
		var distributionMax = 1000;
		var modelPrepDataIndex = 0;
		var modelPrepData;
		var prepData;
		var scale;
		for ( i = 0; i < maxQueueSize; i++ ) {

			modelPrepDataIndex = Math.floor( Math.random() * modelPrepDatas.length );

			modelPrepData = modelPrepDatas[ modelPrepDataIndex ];
			scale = Validator.verifyInput( modelPrepData.scale, 0 );
			modelPrepData = modelPrepData.clone();

			pivot = new THREE.Object3D();
			pivot.position.set(
				distributionBase + distributionMax * Math.random(),
				distributionBase + distributionMax * Math.random(),
				distributionBase + distributionMax * Math.random()
			);
			if ( scale > 0 ) pivot.scale.set( scale, scale, scale );

			modelPrepData.setSceneGraphBaseNode( pivot );
			modelPrepData.setStreamMeshes( streamMeshes );

			this.wwDirector.enqueueForRun( modelPrepData );
			this.allAssets.push( modelPrepData );
		}

		this.wwDirector.processQueue();
	};

	WWParallels.prototype.clearAllAssests = function () {
		var prepData;
		var scope = this;

		for ( var asset in this.allAssets ) {
			prepData = this.allAssets[ asset ];

			var remover = function ( object3d ) {

				if ( object3d === prepData.sceneGraphBaseNode ) return;
				console.log( 'Removing ' + object3d.name );
				scope.scene.remove( object3d );

				if ( object3d.hasOwnProperty( 'geometry' ) ) object3d.geometry.dispose();
				if ( object3d.hasOwnProperty( 'material' ) ) {

					var mat = object3d.material;
					if ( mat.hasOwnProperty( 'materials' ) ) {

						var materials = mat.materials;
						for ( var name in materials ) {

							if ( materials.hasOwnProperty( name ) ) materials[ name ].dispose();

						}
					}
				}
				if ( object3d.hasOwnProperty( 'texture' ) ) object3d.texture.dispose();
			};
			scope.scene.remove( prepData.sceneGraphBaseNode );
			prepData.sceneGraphBaseNode.traverse( remover );
			prepData.sceneGraphBaseNode = null;
		}
		this.allAssets = [];
	};

	WWParallels.prototype.terminateManager = function () {
		this.wwDirector.deregister();
		this.running = false;
	};

	return WWParallels;

})();
