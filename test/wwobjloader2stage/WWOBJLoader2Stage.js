/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var Validator = THREE.LoaderSupport.Validator;

var WWOBJLoader2Stage = (function () {

	function WWOBJLoader2Stage( elementToBindTo ) {
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

		this.objLoader2 = new THREE.OBJLoader2();
		this.controls = null;
		this.cube = null;

		this.loadCounter = 0;
		this.objs2Load = [];
		this.allAssets = [];

		this.processing = false;
	}

	WWOBJLoader2Stage.prototype.initGL = function () {
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		} );
		this.renderer.setClearColor( 0x0F0F0F );

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

		var helper = new THREE.GridHelper( 1200, 60, 0xFF4444, 0x404040 );
		this.scene.add( helper );

		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, 0, 0 );
		this.scene.add( this.cube );
	};

	WWOBJLoader2Stage.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	WWOBJLoader2Stage.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	WWOBJLoader2Stage.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	WWOBJLoader2Stage.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	WWOBJLoader2Stage.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	WWOBJLoader2Stage.prototype.initPostGL = function (  ) {
		this.assetsDef = {
			objsFemaleMale: [],
			objsCerberus: [],
			objsWaltHead: [],
			objsVive: [],
			objsPtv1Zip: [],
			objsZomaxOven: [],
			objsZomaxSink: []
		};
		this.assetsDef.objsFemaleMale = [];
		var prepData = new THREE.LoaderSupport.PrepData( 'male02' );
		var pivot = new THREE.Object3D();
		pivot.position.set( 100, 0, -75 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.mtl', 'MTL' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsFemaleMale.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'female02' );
		pivot = new THREE.Object3D();
		pivot.position.set( -100, 0, 75 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.mtl', 'MTL' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsFemaleMale.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'cerberus' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, -100, 0 );
		pivot.scale.set( 50.0, 50.0, 50.0 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/cerberus/Cerberus.obj', 'OBJ' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsCerberus.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'WaltHead' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, 0, -200 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.mtl', 'MTL' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsWaltHead.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'Vive Controller' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, 0, 200 );
		pivot.scale.set( 400.0, 400.0, 400.0 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/vive-controller/vr_controller_vive_1_5.obj', 'OBJ' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsVive.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'PTV1' );
		pivot = new THREE.Object3D();
		pivot.position.set( -250, 0, -200 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/PTV1/PTV1.zip', 'ZIP' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/PTV1/PTV1.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/PTV1/PTV1.mtl', 'MTL' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsPtv1Zip.push( prepData );

		// https://zomax.net/download/263/zomax-net_haze-sink-scene.zip
		// https://zomax.net/download/263/zomax-net_haze-sink-scene.zip
		prepData = new THREE.LoaderSupport.PrepData( 'oven' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, 0, -75 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-oven-scene.zip', 'ZIP' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-oven-scene.obj', 'OBJ' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsZomaxOven.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'sink' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, 0, 75 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-sink-scene.zip', 'ZIP' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-sink-scene.obj', 'OBJ' ) );
		prepData.setUseAsync( true );
		this.assetsDef.objsZomaxSink.push( prepData );
	};

	WWOBJLoader2Stage.prototype.clearAllAssests = function () {
		var ref;
		var scope = this;

		for ( var asset in this.allAssets ) {
			ref = this.allAssets[ asset ];

			var remover = function ( object3d ) {

				if ( object3d === ref.streamMeshesTo ) return;

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
				if ( object3d.hasOwnProperty( 'texture' ) )	object3d.texture.dispose();
			};
			scope.scene.remove( ref.streamMeshesTo );
			ref.streamMeshesTo.traverse( remover );
			ref.streamMeshesTo = null;
		}
		this.loadCounter = 0;
		this.allAssets = [];
	};

	WWOBJLoader2Stage.prototype.updateAssets = function ( prepDatas ) {
		this.objs2Load = [];
		this.loadCounter = 0;
		this.processing = true;

		if ( Validator.isValid( prepDatas ) ) {

			var prepData;
			var errors = '';

			for ( var i = 0; i < prepDatas.length; i++ ) {

				prepData = prepDatas[ i ];
				if ( ! this.allAssets.hasOwnProperty( prepData.modelName ) ) {

					this.objs2Load.push( prepData );
					this.allAssets[ prepData.modelName ] = prepData;

				} else {

					errors += prepData.modelName + ' ';

				}

				if ( errors !== '' ) {
					this.reportProgress( 'Will not reload: ' + errors );
				}

			}

		}
	};

	WWOBJLoader2Stage.prototype.reportProgress = function( content, modelName, instanceNo  ) {
		document.getElementById( 'feedback' ).innerHTML = Validator.isValid( content ) ? content : '';
	};

	WWOBJLoader2Stage.prototype.reloadAssets = function () {
		var scope = this;

		if ( scope.loadCounter < scope.objs2Load.length ) {

			var prepData = scope.objs2Load[ scope.loadCounter ];
			scope.loadCounter++;
			scope.scene.add( prepData.streamMeshesTo );

			var reloadAssetsProxy = function ( object3d, modelName, instanceNo ) {
				scope.reloadAssets();
				scope.reportProgress();
			};
			var callbacks = prepData.getCallbacks();
			callbacks.setCallbackOnLoad( reloadAssetsProxy );
			callbacks.setCallbackOnProgress( scope.reportProgress );

			var first = prepData.resources[ 0 ];
			if ( first.extension === 'ZIP' ) {
				var resourceObj = prepData.resources[ 1 ];
				var resourceMtl = prepData.length === 3 ? prepData.resources[ 2 ] : null;

				var zipTools = new ZipTools( first.pathBase );
				var setObjAsArrayBuffer = function ( data ) {
					scope.reportProgress( '' );
					prepData.resources[ 1 ].content = data;

					scope.objLoader2.init();
					scope.objLoader2.run( prepData );
				};

				var setMtlAsString = function ( data ) {

					if ( prepData.resources.length > 1 ) resourceObj.content = data;
					scope.reportProgress( 'Unzipping: ' + resourceObj.name );
					zipTools.unpackAsUint8Array( resourceObj.name, setObjAsArrayBuffer );
				};

				var doneUnzipping = function () {

					if ( Validator.isValid( resourceMtl ) ) {

						zipTools.unpackAsString( resourceMtl.name, setMtlAsString );

					} else {

						setMtlAsString( null );

					}
				};

				var errorCase = function ( text ) {
					scope.reportProgress( text );
					scope.processing = false;
				};
				zipTools.load( first.url, { success: doneUnzipping, progress: scope.reportProgress, error: errorCase } );

			} else {

				scope.reportProgress( '' );
				scope.objLoader2.init();
				scope.objLoader2.run( prepData );

			}
		} else {

			scope.processing = false;

		}
	};

	return WWOBJLoader2Stage;

})();

var ZipTools = (function () {

	function ZipTools( path ) {
		this.zip = new JSZip();

		this.fileLoader = new THREE.FileLoader();
		this.fileLoader.setPath( path );
		this.fileLoader.setResponseType( 'arraybuffer' );

		this.zipContent = null;
	}

	ZipTools.prototype.load = function ( filename, callbacks ) {
		var scope = this;

		var onSuccess = function ( zipDataFromFileLoader ) {
			scope.zip.loadAsync( zipDataFromFileLoader )
			.then( function ( zip ) {

				scope.zipContent = zip;
				callbacks.success();

			} );
		};

		var refPercentComplete = 0;
		var percentComplete = 0;
		var output;
		var onProgress = function ( event ) {
			if ( ! event.lengthComputable ) return;

			percentComplete = Math.round( event.loaded / event.total * 100 );
			if ( percentComplete > refPercentComplete ) {

				refPercentComplete = percentComplete;
				output = 'Download of "' + filename + '": ' + percentComplete + '%';
				console.log( output );
				if ( Validator.isValid( callbacks.progress ) ) callbacks.progress( output );

			}
		};

		var onError = function ( event ) {
			var output = 'Error of type "' + event.type + '" occurred when trying to load: ' + filename;
			console.error( output );
			callbacks.error( output );
		};

		console.log( 'Starting download: ' + filename );
		this.fileLoader.load( filename, onSuccess, onProgress, onError );
	};

	ZipTools.prototype.unpackAsUint8Array = function ( filename, callback ) {

		if ( JSZip.support.uint8array ) {

			this.zipContent.file( filename ).async( 'uint8array' )
			.then( function ( dataAsUint8Array ) {

				callback( dataAsUint8Array );

			} );

		} else {

			this.zipContent.file( filename ).async( 'base64' )
			.then( function ( data64 ) {

				callback( new TextEncoder( 'utf-8' ).encode( data64 ) );

			} );

		}
	};

	ZipTools.prototype.unpackAsString = function ( filename, callback ) {
		this.zipContent.file( filename ).async( 'string' )
		.then( function ( dataAsString ) {

			callback( dataAsString );

		} );
	};

	return ZipTools;

})();
