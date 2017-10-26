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

		this.controls = null;
		this.cube = null;

		this.objs2Load = [];
		this.allAssets = [];
		this.processing = false;

		// Check for the various File API support.
		this.fileApiAvailable = true;
		if ( window.File && window.FileReader && window.FileList && window.Blob ) {

			console.log( 'File API is supported! Enabling all features.' );

		} else {

			this.fileApiAvailable = false;
			console.warn( 'File API is not supported! Disabling file loading.' );

		}
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
		this.reloadAssets();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	WWOBJLoader2Stage.prototype.initContent = function (  ) {
		this.assetsDef = {
			objsMale: null,
			objsFemale: null,
			objsCerberus: null,
			objsWaltHead: null,
			objsViveController: null,
			objsPtv1Zip: null,
			objsZomaxOven: null,
			objsZomaxSink: null
		};
		this.assetsDef.objsFemaleMale = [];
		var prepData = new THREE.LoaderSupport.PrepData( 'male02' );
		var pivot = new THREE.Object3D();
		pivot.position.set( -200, 0, -175 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.mtl', 'MTL' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsMale = prepData;

		prepData = new THREE.LoaderSupport.PrepData( 'female02' );
		pivot = new THREE.Object3D();
		pivot.position.set( 200, 0, -75 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.mtl', 'MTL' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsFemale = prepData;

		prepData = new THREE.LoaderSupport.PrepData( 'cerberus' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, -100, 0 );
		pivot.scale.set( 50.0, 50.0, 50.0 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/cerberus/Cerberus.obj', 'OBJ' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsCerberus = prepData;

		prepData = new THREE.LoaderSupport.PrepData( 'WaltHead' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, 0, 75 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.mtl', 'MTL' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsWaltHead = prepData;

		prepData = new THREE.LoaderSupport.PrepData( 'Vive Controller' );
		pivot = new THREE.Object3D();
		pivot.position.set( 0, 0, 200 );
		pivot.scale.set( 400.0, 400.0, 400.0 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/vive-controller/vr_controller_vive_1_5.obj', 'OBJ' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsViveController = prepData;

		prepData = new THREE.LoaderSupport.PrepData( 'PTV1' );
		pivot = new THREE.Object3D();
		pivot.position.set( -250, 0, -200 );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/PTV1/PTV1.zip', 'ZIP' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/PTV1/PTV1.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/PTV1/PTV1.mtl', 'MTL' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsPtv1Zip = prepData;

		// https://zomax.net/download/263/zomax-net_haze-sink-scene.zip
		// https://zomax.net/download/263/zomax-net_haze-sink-scene.zip
		prepData = new THREE.LoaderSupport.PrepData( 'oven' );
		pivot = new THREE.Object3D();
		pivot.position.set( -200, 0, 50 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-oven-scene.zip', 'ZIP' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-oven-scene.obj', 'OBJ' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsZomaxOven = prepData;

		prepData = new THREE.LoaderSupport.PrepData( 'sink' );
		pivot = new THREE.Object3D();
		pivot.position.set( -200, 0, 200 );
		prepData.setStreamMeshesTo( pivot );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-sink-scene.zip', 'ZIP' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/zomax/zomax-net_haze-sink-scene.obj', 'OBJ' ) );
		prepData.setUseIndices( true );
		prepData.setUseAsync( true );
		this.assetsDef.objsZomaxSink = prepData;
	};

	WWOBJLoader2Stage.prototype.clearAllAssests = function () {
		var storedObject3d;
		for ( var asset in this.allAssets ) {

			storedObject3d = this.allAssets[ asset ];
			var scope = this;
			var remover = function ( object3d ) {

				if ( storedObject3d === object3d ) return;

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
			if ( Validator.isValid( storedObject3d ) ) {

				if ( this.pivot !== storedObject3d ) scope.scene.remove( storedObject3d );
				storedObject3d.traverse( remover );
				storedObject3d = null;

			}
		}
		this.allAssets = [];
	};

	WWOBJLoader2Stage.prototype.updateAssets = function ( prepData ) {
		if ( Validator.isValid( prepData ) ) {

			if ( ! this.allAssets.hasOwnProperty( prepData.modelName ) ) {

				this.objs2Load.push( prepData );

			} else {

				this._reportProgress( { detail: { text: 'Will not reload: ' + prepData.modelName } } );

			}

		}
	};

	WWOBJLoader2Stage.prototype._reportProgress = function( event ) {
		var output = Validator.verifyInput( event.detail.text, '' );
		console.log( 'Progress: ' + output );
		document.getElementById( 'feedback' ).innerHTML = output;
	};

	WWOBJLoader2Stage.prototype.reloadAssets = function () {
		if ( this.objs2Load.length === 0 || this.processing ) {

			return;

		} else {

			this.processing = true;

		}

		var prepData = this.objs2Load[ 0 ];
		this.objs2Load.shift();
		var streamMeshes = prepData.streamMeshesTo;
		if ( Validator.isValid( streamMeshes ) ) this.scene.add( streamMeshes );

		var scope = this;
		var reloadAssetsProxy = function ( event ) {
			if ( ! Validator.isValid( streamMeshes ) ) scope.scene.add( event.detail.loaderRootNode );
			scope.processing = false;
			scope.allAssets[ prepData.modelName ] = event.detail.loaderRootNode;
			scope.reloadAssets();
			scope._reportProgress( { detail: { text: '' } } );
		};
		var callbacks = prepData.getCallbacks();
		callbacks.setCallbackOnLoad( reloadAssetsProxy );
		callbacks.setCallbackOnProgress( this._reportProgress );

		var objLoader2 = new THREE.OBJLoader2();
		var resourceZip = prepData.resources[ 0 ];
		if ( resourceZip.extension === 'ZIP' ) {
			var resourceObj = prepData.resources[ 1 ];
			var resourceMtl = prepData.resources.length === 3 ? prepData.resources[ 2 ] : null;

			var zipTools = new ZipTools( resourceZip.pathBase );
			var setObjAsArrayBuffer = function ( data ) {
				scope._reportProgress( { detail: { text: '' } } );
				prepData.resources[ 1 ].content = data;
				objLoader2.run( prepData );
			};

			var setMtlAsString = function ( data ) {
				if ( prepData.resources.length > 2 ) resourceMtl.content = data;
				scope._reportProgress( { detail: { text: 'Unzipping: ' + resourceObj.name } } );
				zipTools.unpackAsUint8Array( resourceObj.name, setObjAsArrayBuffer );
			};

			var doneUnzipping = function () {
				zipTools.unpackAsString( Validator.isValid( resourceMtl ) ? resourceMtl.name : null, setMtlAsString );
			};

			var errorCase = function ( text ) {
				scope._reportProgress( { detail: { text: text } } );
				scope.processing = false;
			};
			zipTools.load( resourceZip.url, { success: doneUnzipping, progress: this._reportProgress, error: errorCase } );

		} else {

			this._reportProgress( { detail: { text: '' } } );
			objLoader2.run( prepData );

		}
	};

	WWOBJLoader2Stage.prototype._handleFileSelect = function ( event, pathTexture ) {
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

		if ( ! Validator.isValid( fileObj ) ) {
			alert( 'Unable to load OBJ file from given files.' );
		}

		var scope = this;
		var callbackOnLoad = function ( event ) {
			scope.scene.add( event.detail.loaderRootNode );
			console.log( 'Loading complete: ' + event.detail.modelName );
			scope._reportProgress( { detail: { text: '' } } );
		};

		var fileReader = new FileReader();
		fileReader.onload = function( fileDataObj ) {

			var uint8Array = new Uint8Array( fileDataObj.target.result );

			var prepData = new THREE.LoaderSupport.PrepData( 'userObj' );
			var resourceOBJ = new THREE.LoaderSupport.ResourceDescriptor( pathTexture + '/' + fileObj.name, 'OBJ' );
			var userPivot = new THREE.Object3D();
			userPivot.position.set(
				-100 + 200 * Math.random(),
				-100 + 200 * Math.random(),
				-100 + 200 * Math.random()
			);
			prepData.setStreamMeshesTo( userPivot );
			scope.scene.add( userPivot );
			scope.allAssets[ prepData.modelName ] = userPivot;

			resourceOBJ.setContent( uint8Array );
			prepData.addResource( resourceOBJ );
			prepData.setUseAsync( true );
			var callbacks = prepData.getCallbacks();
			callbacks.setCallbackOnProgress( scope._reportProgress );
			callbacks.setCallbackOnLoad( callbackOnLoad );

			fileReader.onload = function( fileDataMtl ) {

				var resourceMTL = new THREE.LoaderSupport.ResourceDescriptor( pathTexture + '/' + fileMtl.name, 'MTL' );
				resourceMTL.setContent( fileDataMtl.target.result );
				prepData.addResource( resourceMTL );

				var objLoader = new THREE.OBJLoader2();
				objLoader.run( prepData );
			};
			fileReader.readAsText( fileMtl );
		};
		fileReader.readAsArrayBuffer( fileObj );

	};

	return WWOBJLoader2Stage;

})();

var ZipTools = (function () {

	var Validator = THREE.LoaderSupport.Validator;

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

		var numericalValueRef = 0;
		var numericalValue = 0;
		var output;
		var onProgress = function ( event ) {
			if ( ! event.lengthComputable ) return;

			numericalValue = event.loaded / event.total;
			if ( numericalValue > numericalValueRef ) {

				numericalValueRef = numericalValue;
				output = 'Download of "' + filename + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
				if ( Validator.isValid( callbacks.progress ) ) callbacks.progress( { detail: { text: output } } );

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
		if ( Validator.isValid( filename ) ) {

			this.zipContent.file( filename ).async( 'string' )
			.then( function ( dataAsString ) {

				callback( dataAsString );

			} );

		} else {

			callback( null );

		}
	};

	return ZipTools;

})();
