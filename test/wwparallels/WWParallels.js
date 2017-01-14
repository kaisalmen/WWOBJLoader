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
THREE.examples.loaders.WWParallels = (function () {

	WWParallels.prototype = Object.create( THREE.examples.apps.ThreeJsApp.prototype );
	WWParallels.prototype.constructor = WWParallels;

	function WWParallels( elementToBindTo ) {
		THREE.examples.apps.ThreeJsApp.call( this );

		// app configuration: see THREE.examples.apps.ThreeJsAppDefaultDefinition (js/apps/ThreeJsApp.js)
		// Only define what is required (name and htmlCanvas).
		this.configure( {
			name: 'WWParallels',
			htmlCanvas: elementToBindTo
		} );

		this.wwDirector = new THREE.OBJLoader2.WWOBJLoader2Director();

		this.lights = null;
		this.controls = null;
		this.cube = null;

		this.allAssets = [];
		this.feedbackArray = null;
	}

	WWParallels.prototype.initPreGL = function () {
		// tell ThreeJsApp async loading is done (none needed here)
		this.preloadDone = true;
	};

	WWParallels.prototype.initGL = function () {
		this.renderer.setClearColor(0x303030);

		var cameraDefaults = {
			posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 )
		};
		this.scenePerspective.setCameraDefaults( cameraDefaults );
		this.controls = new THREE.TrackballControls( this.scenePerspective.camera, this.renderer.domElement );

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

	// ThreeJsApp.WWParallels.prototype.initPostGL()  not required, default is used

	WWParallels.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();
	};

	WWParallels.prototype.renderPre = function () {
		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;
	};

	WWParallels.prototype.reportProgress = function( text ) {
		document.getElementById( 'feedback' ).innerHTML = text;
	};

	WWParallels.prototype.enqueueAllAssests = function ( maxQueueSize, maxWebWorkers ) {
		var scope = this;
		scope.wwDirector.objectsCompleted = 0;
		scope.feedbackArray = new Array( maxWebWorkers );
		for ( var i = 0; i < maxWebWorkers; i++ ) {
			scope.feedbackArray[ i ] = 'Worker #' + i + ': Awaiting feedback';
		}
		scope.reportProgress( scope.feedbackArray.join( '\<br\>' ) );

		var callbackCompletedLoading = function ( modelName, instanceNo ) {
			var msg = 'Worker #' + instanceNo + ': Completed loading: ' + modelName + ' (#' + scope.wwDirector.objectsCompleted + ')';
			console.log( msg );
			scope.feedbackArray[ instanceNo ] = msg;
			scope.reportProgress( scope.feedbackArray.join( '\<br\>' ) );
		};
		var callbackMeshLoaded = function ( meshName, material ) {
			var replacedMaterial = null;

			if ( material != null && material.name === 'defaultMaterial' || meshName === 'Mesh_Mesh_head_geo.001' ) {
				replacedMaterial = material;
				replacedMaterial.color = new THREE.Color( Math.random(), Math.random(), Math.random() );
			}

			return replacedMaterial;
		};

		this.wwDirector.prepareWorkers(
			{
				completedLoading: callbackCompletedLoading,
				meshLoaded: callbackMeshLoaded
			},
			maxQueueSize,
			maxWebWorkers
		);
		console.log( 'Configuring WWManager with queue size ' + this.wwDirector.getMaxQueueSize() + ' and ' + this.wwDirector.getMaxWebWorkers() + ' workers.' );

		var models = [];
		models.push( {
			modelName: 'male02',
			dataAvailable: false,
			pathObj: '../../resource/obj/male02/',
			fileObj: 'male02.obj',
			pathTexture: '../../resource/obj/male02/',
			fileMtl: 'male02.mtl'
		} );

		models.push( {
			modelName: 'female02',
			dataAvailable: false,
			pathObj: '../../resource/obj/female02/',
			fileObj: 'female02.obj',
			pathTexture: '../../resource/obj/female02/',
			fileMtl: 'female02.mtl'
		} );

		models.push( {
			modelName: 'viveController',
			dataAvailable: false,
			pathObj: '../../resource/obj/vive-controller/',
			fileObj: 'vr_controller_vive_1_5.obj',
			scale: 400.0
		} );

		models.push( {
			modelName: 'cerberus',
			dataAvailable: false,
			pathObj: '../../resource/obj/Cerberus/',
			fileObj: 'Cerberus.obj'
		} );
		models.push( {
			modelName:'WaltHead',
			dataAvailable: false,
			pathObj: '../../resource/obj/walt/',
			fileObj: 'WaltHead.obj',
			pathTexture: '../../resource/obj/walt/',
			fileMtl: 'WaltHead.mtl'
		} );

		var pivot;
		var distributionBase = -500;
		var distributionMax = 1000;
		var modelIndex = 0;
		var model;
		var runParams;
		for ( var i = 0; i < maxQueueSize; i++ ) {

			modelIndex = Math.floor( Math.random() * 5 );
			model = models[ modelIndex ];

			pivot = new THREE.Object3D();
			pivot.position.set(
				distributionBase + distributionMax * Math.random(),
				distributionBase + distributionMax * Math.random(),
				distributionBase + distributionMax * Math.random()
			);
			if ( model.scale != null ) pivot.scale.set( model.scale, model.scale, model.scale );

			this.scenePerspective.scene.add( pivot );

			model.sceneGraphBaseNode = pivot;
			runParams = {
				modelName: model.modelName,
				sceneGraphBaseNode: model.sceneGraphBaseNode,
				dataAvailable: model.dataAvailable,
				pathObj: model.pathObj,
				fileObj: model.fileObj,
				pathTexture: model.pathTexture,
				fileMtl: model.fileMtl
			};
			this.wwDirector.enqueueForRun( runParams );
			this.allAssets.push( runParams );
		}

		this.wwDirector.processQueue();
	};

	WWParallels.prototype.clearAllAssests = function () {
		var ref;
		var scope = this;

		for ( var asset in this.allAssets ) {
			ref = this.allAssets[asset];

			var remover = function ( object3d ) {

				if ( object3d === ref.sceneGraphBaseNode ) {
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
			scope.scenePerspective.scene.remove( ref.sceneGraphBaseNode );
			ref.sceneGraphBaseNode.traverse( remover );
			ref.sceneGraphBaseNode = null;
		}
		this.allAssets = [];
	};

	WWParallels.prototype.terminateManager = function () {
		this.wwDirector.deregister();
	};

	// ThreeJsApp.renderPost()  not required, default is used

	return WWParallels;

})();
