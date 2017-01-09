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
			name: 'WWOBJLoaderChecker',
			htmlCanvas: elementToBindTo
		} );

		this.wwDirector = new THREE.OBJLoader2.WW.WWLoaderDirector( 256, 4 );

		this.lights = null;
		this.controls = null;

		this.cube = null;

		this.loadCounter = 0;
		this.objs2Load = [];
		this.allAssets = [];

		this.processing = false;
	}

	WWOBJLoader2Verify.prototype.initPreGL = function () {
		var scope = this;

		var reloadAssetsProxy = function () {
			scope.reloadAssets();
		};

		this.wwDirector.register(
			THREE.OBJLoader2.WW.WWLoader2Proxy.prototype,
			'WWOBJLoader2',
			{
				completedLoading: reloadAssetsProxy,
				progress: this.reportProgress
			}
		);

		// tell ThreeJsApp async loading is done (none needed here)
		this.preloadDone = true;
	};

	WWOBJLoader2Verify.prototype.initGL = function () {
		this.renderer.setClearColor(0x303030);

		var cameraDefaults = {
			posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 )
		};
		this.scenePerspective.setCameraDefaults( cameraDefaults );
		this.controls = new THREE.TrackballControls( this.scenePerspective.camera );

		this.lights = {
			ambientLight: new THREE.AmbientLight( 0x202020 ),
			directionalLight1: new THREE.DirectionalLight( 0xC0C090 ),
			directionalLight2: new THREE.DirectionalLight( 0xC0C090 ),
			directionalLight3: new THREE.DirectionalLight( 0xC0C090 ),
			lightArray: new THREE.Object3D()
		};

		this.lights.directionalLight1.position.set( -100, 0, 100 );
		this.lights.directionalLight2.position.set( 100, 0, 100 );
		this.lights.directionalLight3.position.set( 0, 0, -100 );

		this.lights.lightArray.add( this.lights.directionalLight1 );
		this.lights.lightArray.add( this.lights.directionalLight2 );
		this.lights.lightArray.add( this.lights.directionalLight3 );
		this.scenePerspective.scene.add( this.lights.lightArray );


		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, -20, 0 );
		this.scenePerspective.scene.add( this.cube );
	};

	WWOBJLoader2Verify.prototype.initPostGL = function () {
		this.reloadAssets();

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

	WWOBJLoader2Verify.prototype.clearAllAssests = function () {
		var ref;
		var scope = this;

		for ( var asset in this.allAssets ) {
			ref = this.allAssets[asset];

			var remover = function ( object3d ) {

				if ( object3d === ref.pivot ) {
					return;
				}
				console.log( 'Removing ' + object3d.name );
				scope.scenePerspective.scene.remove( object3d );

				if ( object3d.hasOwnProperty( 'geometry' ) ) {
					object3d.geometry.dispose();
				}
				if ( object3d.hasOwnProperty( 'material' ) ) {

					var mat = object3d.material;
					if ( mat.hasOwnProperty( 'materials' ) ) {

						for ( var mmat in mat.materials ) {
							mat.materials[mmat].dispose();
						}
					}
				}
				if ( object3d.hasOwnProperty( 'texture' ) ) {
					object3d.texture.dispose();
				}
			};
			scope.scenePerspective.scene.remove( ref.pivot );
			ref.pivot.traverse( remover );
			ref.pivot = null;
		}
		this.loadCounter = 0;
		this.allAssets = [];
	};

	WWOBJLoader2Verify.prototype.updateAssets = function ( objs ) {
		this.objs2Load = [];
		this.loadCounter = 0;
		this.processing = true;

		if ( objs !== undefined && objs !== null ) {

			var obj2Load;
			var pivot;
			var errors = '';

			for ( var i = 0; i < objs.length; i ++ ) {

				obj2Load = objs[i];
				if ( ! this.allAssets.hasOwnProperty( obj2Load.name ) ) {

					pivot = new THREE.Object3D();
					pivot.position.set( obj2Load.pos.x, obj2Load.pos.y, obj2Load.pos.z );
					pivot.scale.set( obj2Load.scale, obj2Load.scale, obj2Load.scale );
					obj2Load.pivot = pivot;
					this.objs2Load.push( obj2Load );
					this.allAssets[obj2Load.name] = obj2Load;

				} else {

					errors += obj2Load.name + ' ';

				}

				if ( errors !== '' ) {
					this.reportProgress( 'Will not reload: ' + errors );
				}

			}

		}
	};

	WWOBJLoader2Verify.prototype.reportProgress = function( text ) {
		document.getElementById( 'feedback' ).innerHTML = text;
	};

	WWOBJLoader2Verify.prototype.reloadAssets = function () {
		var scope = this;

		if ( scope.loadCounter < scope.objs2Load.length ) {

			var obj2Load = scope.objs2Load[ scope.loadCounter ];
			scope.loadCounter ++;

			scope.scenePerspective.scene.add( obj2Load.pivot );

			if ( obj2Load.fileZip !== null ) {

				var zipTools = new THREE.examples.apps.ZipTools( obj2Load.pathBase );
				var mtlAsString = null;

				var setObjAsArrayBuffer = function ( data ) {
					scope.reportProgress( '' );
					scope.wwDirector.validate( 1, 1 );
					scope.wwDirector.enqueueForRun( {
						modelName: obj2Load.name,
						sceneGraphBaseNode: obj2Load.pivot,
						dataAvailable: true,
						objAsArrayBuffer: data,
						mtlAsString: mtlAsString,
						pathTexture: obj2Load.pathTexture
					} );
					scope.wwDirector.processQueue();
				};

				var setMtlAsString = function ( data ) {
					mtlAsString = data;
					scope.reportProgress( 'Unzipping: ' + obj2Load.fileObj );
					zipTools.unpackAsUint8Array( obj2Load.fileObj, setObjAsArrayBuffer );
				};

				var doneUnzipping = function () {
					if ( obj2Load.fileMtl !== null ) {

						zipTools.unpackAsString( obj2Load.fileMtl, setMtlAsString );

					} else {

						setMtlAsString( null );

					}
				};

				var errorCase = function ( text ) {
					scope.reportProgress( text );
					scope.processing = false;
				};
				zipTools.load( obj2Load.fileZip, { success: doneUnzipping, progress: scope.reportProgress, error: errorCase } );

			} else {

				scope.wwDirector.validate( 1, 1 );
				scope.wwDirector.enqueueForRun( {
					modelName: obj2Load.name,
					sceneGraphBaseNode: obj2Load.pivot,
					dataAvailable: false,
					pathObj: obj2Load.pathBase,
					fileObj: obj2Load.fileObj,
					pathTexture: obj2Load.pathTexture,
					fileMtl: obj2Load.fileMtl
				} );
				scope.wwDirector.processQueue();

			}
		} else {

			scope.processing = false;

		}
	};

	// ThreeJsApp.renderPost()  not required, default is used

	return WWOBJLoader2Verify;

})();

var WWOBJLoader2ObjDef = function ( name, pathBase, fileObj, fileMtl, pathTexture, fileZip, pos, scale ) {
	this.name = name;
	this.pathBase = pathBase;
	this.fileObj = fileObj;
	this.fileMtl = fileMtl;
	this.pathTexture = pathTexture;
	this.fileZip = fileZip;
	this.pos = pos;
	this.scale = scale == null ? 1.0 : scale;
	this.pivot = null;
};