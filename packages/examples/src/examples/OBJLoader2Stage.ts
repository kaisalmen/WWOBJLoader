
import { BoxGeometry, Mesh, Material, MeshNormalMaterial, Object3D, Vector3 } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { Controller, GUI } from 'lil-gui';

import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { ResourceDescriptor } from 'wwobjloader2';
import { AssetPipelineLoader, AssetPipeline, AssetTask } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, reportProgress, ThreeDefaultSetup } from './ExampleCommons.js';
import { AssociatedArrayType } from 'wtd-core';

type AssetsDefType = {
	objsMale: AssetPipelineLoader | undefined;
	objsFemale: AssetPipelineLoader | undefined;
	objsCerberus: AssetPipelineLoader | undefined;
	objsWaltHead: AssetPipelineLoader | undefined;
	objsNinja: AssetPipelineLoader | undefined;
	objsPtv1: AssetPipelineLoader | undefined;
	objsZomaxOven: AssetPipelineLoader | undefined;
	objsZomaxSink: AssetPipelineLoader | undefined;
};

type AssociatedObject3DArrayType = { [key: string]: Object3D }

export class OBJLoader2Stage implements ExampleDefinition {

	private setup: ThreeDefaultSetup;
	private cube: Mesh;
	private pipelineLoaders: AssetPipelineLoader[] = [];
	private allAssets: AssociatedObject3DArrayType = {};
	private processing = false;
	private globalPivot: Object3D;
	private fileApiAvailable = true;

	private assetsDef: AssetsDefType = {
		objsMale: undefined,
		objsFemale: undefined,
		objsCerberus: undefined,
		objsWaltHead: undefined,
		objsNinja: undefined,
		objsPtv1: undefined,
		objsZomaxOven: undefined,
		objsZomaxSink: undefined
	};

	constructor(elementToBindTo: HTMLElement | null) {
		const cameraDefaults = {
			posCamera: new Vector3(0.0, 175.0, 750.0),
			posCameraTarget: new Vector3(0, 0, 0),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.setup = createThreeDefaultSetup(elementToBindTo, cameraDefaults);
		let geometry = new BoxGeometry(10, 10, 10);
		let material = new MeshNormalMaterial();
		this.cube = new Mesh(geometry, material);
		this.cube.position.set(0, 0, 0);
		this.setup.scene.add(this.cube);

		this.globalPivot = new Object3D();
		this.globalPivot.name = 'GlobalPivot';
		this.setup.scene.add(this.globalPivot);

		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			console.log('File API is supported! Enabling all features.');
		} else {
			this.fileApiAvailable = false;
			console.warn('File API is not supported! Disabling file loading.');
		}
	}

	getSetup() {
		return this.setup;
	}

	render() {
		this.reloadAssets();
		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;
		renderDefault(this.setup);
	}

	private initContent() {
		let assetTaskMale02Mtl = new AssetTask('taskMale02Mtl');
		let resMale02 = new ResourceDescriptor('./models/obj/main/male02/male02.mtl').setNeedStringOutput(true);
		assetTaskMale02Mtl.setResourceDescriptor(resMale02);

		assetTaskMale02Mtl.setLoader(new MTLLoader(), {
			resourcePath: './models/obj/main/male02/',
			materialOptions: {}
		});

		let assetTaskMale02MtlObjLink = new AssetTask('taskMale02MtlObjLink');
		assetTaskMale02MtlObjLink.setLinker(new MtlObjBridge());

		let assetTaskMale02Obj = new AssetTask('taskMale02Obj');
		let resFemale02 = new ResourceDescriptor('./models/obj/main/male02/male02.obj');
		assetTaskMale02Obj.setResourceDescriptor(resFemale02);
		assetTaskMale02Obj.setLoader(new OBJLoader2());

		let assetPipelineMale02 = new AssetPipeline();
		assetPipelineMale02.addAssetTask(assetTaskMale02Mtl);
		assetPipelineMale02.addAssetTask(assetTaskMale02MtlObjLink);
		assetPipelineMale02.addAssetTask(assetTaskMale02Obj);

		let aplMale02 = new AssetPipelineLoader('APL_Male02', assetPipelineMale02);
		let pivot = new Object3D();
		pivot.position.set(-200, 0, -175);
		this.setup.scene.add(pivot);
		aplMale02.setBaseObject3d(pivot);
		this.assetsDef.objsMale = aplMale02;


		let assetTaskFemale02Mtl = new AssetTask('taskFemale02Mtl');
		let resFemale02Mtl = new ResourceDescriptor('./models/obj/main/female02/female02.mtl').setNeedStringOutput(true);
		assetTaskFemale02Mtl.setResourceDescriptor(resFemale02Mtl);
		assetTaskFemale02Mtl.setLoader(new MTLLoader(), {
			resourcePath: './models/obj/main/female02/',
			materialOptions: {}
		});

		let assetTaskFemale02MtlObjLink = new AssetTask('taskFemale02MtlObjLink');
		assetTaskFemale02MtlObjLink.setLinker(new MtlObjBridge());

		let assetTaskFemale02Obj = new AssetTask('taskFemale02Obj');
		let resFemale02Obj = new ResourceDescriptor('./models/obj/main/female02/female02.obj');
		assetTaskFemale02Obj.setResourceDescriptor(resFemale02Obj);
		assetTaskFemale02Obj.setLoader(new OBJLoader2());


		let assetPipelineFemale02 = new AssetPipeline();
		assetPipelineFemale02.addAssetTask(assetTaskFemale02Mtl);
		assetPipelineFemale02.addAssetTask(assetTaskFemale02MtlObjLink);
		assetPipelineFemale02.addAssetTask(assetTaskFemale02Obj);

		let aplFemale02 = new AssetPipelineLoader('APL_Female02', assetPipelineFemale02);
		pivot = new Object3D();
		pivot.position.set(200, 0, -75);
		this.setup.scene.add(pivot);
		aplFemale02.setBaseObject3d(pivot);
		this.assetsDef.objsFemale = aplFemale02;


		let assetTaskPTV1Mtl = new AssetTask('taskPTV1Mtl');
		let resPTV1Mtl = new ResourceDescriptor('./models/obj/extra/PTV1/PTV1.mtl').setNeedStringOutput(true);
		assetTaskPTV1Mtl.setResourceDescriptor(resPTV1Mtl);
		assetTaskPTV1Mtl.setLoader(new MTLLoader(), {
			resourcePath: './models/obj/PTV1/',
			materialOptions: {}
		});

		let assetTaskPTV1MtlObjLink = new AssetTask('taskPTV1MtlObjLink');
		assetTaskPTV1MtlObjLink.setLinker(new MtlObjBridge());

		let assetTaskPTV1Obj = new AssetTask('taskPTV1Obj');
		let resPTV1Obj = new ResourceDescriptor('./models/obj/extra/PTV1/PTV1.obj');
		assetTaskPTV1Obj.setResourceDescriptor(resPTV1Obj);
		assetTaskPTV1Obj.setLoader(new OBJLoader2());

		let assetPipelinePTV1 = new AssetPipeline();
		assetPipelinePTV1.addAssetTask(assetTaskPTV1Mtl);
		assetPipelinePTV1.addAssetTask(assetTaskPTV1MtlObjLink);
		assetPipelinePTV1.addAssetTask(assetTaskPTV1Obj);

		let aplPTV1 = new AssetPipelineLoader('APL_PTV1', assetPipelinePTV1);
		pivot = new Object3D();
		pivot.position.set(-250, 0, -200);
		this.setup.scene.add(pivot);
		aplPTV1.setBaseObject3d(pivot);
		this.assetsDef.objsPtv1 = aplPTV1;


		let assetTaskCerberusObj = new AssetTask('taskCerberusObj');
		let resCerberusObj = new ResourceDescriptor('./models/obj/main/cerberus/Cerberus.obj');
		assetTaskCerberusObj.setResourceDescriptor(resCerberusObj);
		assetTaskCerberusObj.setLoader(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineCerberus = new AssetPipeline();
		assetPipelineCerberus.addAssetTask(assetTaskCerberusObj);

		let aplCerberus = new AssetPipelineLoader('APL_Cerberus', assetPipelineCerberus);
		pivot = new Object3D();
		pivot.position.set(0, -100, 0);
		pivot.scale.set(50.0, 50.0, 50.0);
		this.setup.scene.add(pivot);
		aplCerberus.setBaseObject3d(pivot);
		this.assetsDef.objsCerberus = aplCerberus;


		let assetTaskWaltHeadMtl = new AssetTask('taskWaltHeadMtl');
		let resWaltHeadMtl = new ResourceDescriptor('./models/obj/main/walt/WaltHead.mtl').setNeedStringOutput(true);
		assetTaskWaltHeadMtl.setResourceDescriptor(resWaltHeadMtl);
		assetTaskWaltHeadMtl.setLoader(new MTLLoader(), {
			resourcePath: './models/obj/main/walt/',
			materialOptions: {}
		});

		let assetTaskWaltHeadMtlObjLink = new AssetTask('taskWaltHeadMtlObjLink');
		assetTaskWaltHeadMtlObjLink.setLinker(new MtlObjBridge());

		let assetTaskWaltHeadObj = new AssetTask('taskWaltHeadObj');
		let resWaltHeadObj = new ResourceDescriptor('./models/obj/main/walt/WaltHead.obj');
		assetTaskWaltHeadObj.setResourceDescriptor(resWaltHeadObj);
		assetTaskWaltHeadObj.setLoader(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineWaltHead = new AssetPipeline();
		assetPipelineWaltHead.addAssetTask(assetTaskWaltHeadMtl);
		assetPipelineWaltHead.addAssetTask(assetTaskWaltHeadMtlObjLink);
		assetPipelineWaltHead.addAssetTask(assetTaskWaltHeadObj);

		let aplWaltHead = new AssetPipelineLoader('APL_WaltHead', assetPipelineWaltHead);
		pivot = new Object3D();
		pivot.position.set(0, 0, 75);
		this.setup.scene.add(pivot);
		aplWaltHead.setBaseObject3d(pivot);
		this.assetsDef.objsWaltHead = aplWaltHead;


		let assetTaskNinjaObj = new AssetTask('taskNinjaObj');
		let resNinjaObj = new ResourceDescriptor('./models/obj/main/ninja/ninjaHead_Low.obj');
		assetTaskNinjaObj.setResourceDescriptor(resNinjaObj);
		assetTaskNinjaObj.setLoader(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineNinja = new AssetPipeline();
		assetPipelineNinja.addAssetTask(assetTaskNinjaObj);


		let aplNinja = new AssetPipelineLoader('APL_Ninja', assetPipelineNinja);
		pivot = new Object3D();
		pivot.position.set(0, 0, 200);
		this.setup.scene.add(pivot);
		aplNinja.setBaseObject3d(pivot);
		this.assetsDef.objsNinja = aplNinja;

		let assetTaskOvenObj = new AssetTask('taskOvenObj');
		let resOvenObj = new ResourceDescriptor('./models/obj/extra/zomax/zomax-net_haze-oven-scene.obj');

		assetTaskOvenObj.setResourceDescriptor(resOvenObj);
		assetTaskOvenObj.setLoader(new OBJLoader2(), {
			useIndices: true,
			logging: {
				enabled: true,
				debug: true
			}
		});
		let assetPipelineOven = new AssetPipeline();
		assetPipelineOven.addAssetTask(assetTaskOvenObj);


		let aplOven = new AssetPipelineLoader('APL_Oven', assetPipelineOven);
		pivot = new Object3D();
		pivot.position.set(-200, 0, 50);
		this.setup.scene.add(pivot);
		aplOven.setBaseObject3d(pivot);
		this.assetsDef.objsZomaxOven = aplOven;


		let assetTaskSinkObj = new AssetTask('taskSinkObj');
		let resSinkObj = new ResourceDescriptor('./models/obj/extra/zomax/zomax-net_haze-sink-scene.obj');

		assetTaskSinkObj.setResourceDescriptor(resSinkObj);
		assetTaskSinkObj.setLoader(new OBJLoader2(), {
			useIndices: false
		});
		let assetPipelineSink = new AssetPipeline();
		assetPipelineSink.addAssetTask(assetTaskSinkObj);


		let aplSink = new AssetPipelineLoader('APL_Sink', assetPipelineSink);
		pivot = new Object3D();
		pivot.position.set(-200, 0, 200);
		this.setup.scene.add(pivot);
		aplSink.setBaseObject3d(pivot);
		this.assetsDef.objsZomaxSink = aplSink;
	}

	private clearAllAssests() {
		let storedObject3d: Object3D | undefined;
		let scope = this;

		for (let asset in this.allAssets) {
			storedObject3d = this.allAssets[asset];
			const remover = (object3d: Object3D) => {
				if (storedObject3d === object3d) {
					return;
				}
				const objToUse = object3d as Mesh;
				if (Object.prototype.hasOwnProperty.call(objToUse, 'geometry')) {
					objToUse.geometry.dispose();
				}

				if (Object.prototype.hasOwnProperty.call(objToUse, 'material')) {
					if (objToUse.material instanceof Material) {
						if (typeof objToUse.material.dispose === 'function') {
							objToUse.material.dispose();
						}
					}
					else if (objToUse.material.length > 0) {
						for (const mat of objToUse.material) {
							mat.dispose();
						}
					}
				}
			}

			if (storedObject3d) {
				if (this.globalPivot !== storedObject3d) {
					scope.setup.scene.remove(storedObject3d);
				}
				storedObject3d.traverse(remover);
				storedObject3d = undefined;
			}
		};

		this.allAssets = {};
	}

	private updateAssets(prepData: AssetPipelineLoader | undefined) {
		if (prepData) {
			if (!this.allAssets.hasOwnProperty(prepData.getName())) {
				this.pipelineLoaders.push(prepData);
			} else {
				reportProgress({
					detail: {
						text: 'Will not reload: ' + prepData.getName()
					}
				});
			}
		}
	}

	private reloadAssets() {
		if (this.pipelineLoaders.length === 0 || this.processing) {
			return;
		} else {
			this.processing = true;
		}

		const pipelineLoader = this.pipelineLoaders[0];
		this.pipelineLoaders.shift();

		const scope = this;
		const loadAssetsProxy = (pipelineName: string, result?: Object3D) => {
			console.timeEnd(pipelineLoader.getName());
			scope.processing = false;
			if (result) {
				scope.allAssets[pipelineName] = result;
			}
			scope.reloadAssets();
			reportProgress({ detail: { text: '' } });
		};
		reportProgress({ detail: { text: '' } });

		pipelineLoader.setOnComplete(loadAssetsProxy);

		console.time(pipelineLoader.getName());
		pipelineLoader.run();
	}

	private handleFileSelect(event: Event, pathTexture: string) {
		let fileObj = null;
		let fileMtl = null;
		let files = (event.target as unknown as AssociatedArrayType).files as File[];

		for (let i = 0, file; file = files[i]; i++) {
			if (file.name.indexOf('\.obj') > 0 && fileObj === null) {
				fileObj = file;
			}
			if (file.name.indexOf('\.mtl') > 0 && fileMtl === null) {
				fileMtl = file;
			}
		}

		if (!fileObj || !fileObj) {
			alert('Unable to load OBJ file from given files.');
		}

		let assetTaskUserMtl = new AssetTask('taskUserMtl');
		let resUserMtl = new ResourceDescriptor(pathTexture + '/' + fileMtl?.name).setNeedStringOutput(true);
		assetTaskUserMtl.setResourceDescriptor(resUserMtl);
		assetTaskUserMtl.setLoader(new MTLLoader(), {
			resourcePath: pathTexture,
			materialOptions: {}
		});

		let assetTaskUserMtlObjLink = new AssetTask('taskUserMtlObjLink');
		assetTaskUserMtlObjLink.setLinker(new MtlObjBridge());

		let assetTaskUserObj = new AssetTask('taskUserObj');
		let resUserObj = new ResourceDescriptor(pathTexture + '/' + fileObj?.name);
		assetTaskUserObj.setResourceDescriptor(resUserObj);
		assetTaskUserObj.setLoader(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineUser = new AssetPipeline();
		assetPipelineUser.addAssetTask(assetTaskUserMtl);
		assetPipelineUser.addAssetTask(assetTaskUserMtlObjLink);
		assetPipelineUser.addAssetTask(assetTaskUserObj);

		let aplUser = new AssetPipelineLoader('APL_WaltHead', assetPipelineUser);
		let userPivot = new Object3D();
		userPivot.position.set(
			-100 + 200 * Math.random(),
			-100 + 200 * Math.random(),
			-100 + 200 * Math.random()
		);
		this.setup.scene.add(userPivot);
		aplUser.setBaseObject3d(userPivot);

		aplUser.run();
	}

	run() {
		// Init dat.gui and controls
		let elemFileInput = document.getElementById('fileUploadInput');
		let menuDiv = document.getElementById('dat');
		let gui = new GUI({
			autoPlace: false,
			width: 320
		});
		menuDiv?.appendChild(gui.domElement);

		let folderOptions = gui.addFolder('OBJLoader2Stage Options');
		let handleMale: Controller;
		let handleFemale: Controller;
		let handleWalt: Controller;
		let handleCerberus: Controller;
		let handleNinja: Controller;
		let handlePTV1: Controller;
		let handleSink: Controller;
		let handleOven: Controller;
		const appScope = this;
		const wwOBJLoader2StageControl = {
			pathTexture: './models/obj/main/female02/',
			blockEvent: (event: Event) => {
				event.stopPropagation();
			},
			enableElement: function(elementHandle: Controller) {
				elementHandle.domElement.removeEventListener('click', this.blockEvent, true);
				if (elementHandle.domElement.parentElement) {
					elementHandle.domElement.parentElement.style.pointerEvents = 'auto';
					elementHandle.domElement.parentElement.style.opacity = '1.0';
				}
			},
			disableElement: function(elementHandle: Controller) {
				elementHandle.domElement.addEventListener('click', this.blockEvent, true);
				if (elementHandle.domElement.parentElement) {
					elementHandle.domElement.parentElement.style.pointerEvents = 'none';
					elementHandle.domElement.parentElement.style.opacity = '0.5';
				}
			},
			loadMale: function() {
				appScope.updateAssets(appScope.assetsDef.objsMale);
				this.disableElement(handleMale);
			},
			loadFemale: function() {
				appScope.updateAssets(appScope.assetsDef.objsFemale);
				this.disableElement(handleFemale);
			},
			loadWaltHead: function() {
				appScope.updateAssets(appScope.assetsDef.objsWaltHead);
				this.disableElement(handleWalt);
			},
			loadCerberus: function() {
				appScope.updateAssets(appScope.assetsDef.objsCerberus);
				this.disableElement(handleCerberus);
			},
			loadNinja: function() {
				appScope.updateAssets(appScope.assetsDef.objsNinja);
				this.disableElement(handleNinja);
			},
			loadPTV1: function() {
				appScope.updateAssets(appScope.assetsDef.objsPtv1);
				this.disableElement(handlePTV1);
			},
			loadOven: function() {
				appScope.updateAssets(appScope.assetsDef.objsZomaxOven);
				this.disableElement(handleOven);
			},
			loadSink: function() {
				appScope.updateAssets(appScope.assetsDef.objsZomaxSink);
				this.disableElement(handleSink);
			},
			loadUserFiles: function() {
				elemFileInput?.click();
			},
			clearAllAssests: function() {
				appScope.clearAllAssests();
				appScope.initContent();
				this.enableElement(handleMale);
				this.enableElement(handleFemale);
				this.enableElement(handleWalt);
				this.enableElement(handleCerberus);
				this.enableElement(handleNinja);
				this.enableElement(handlePTV1);
				this.enableElement(handleOven);
				this.enableElement(handleSink);
			}
		};
		handleMale = folderOptions.add(wwOBJLoader2StageControl, 'loadMale').name('Load Male');
		handleFemale = folderOptions.add(wwOBJLoader2StageControl, 'loadFemale').name('Load Female');
		handleWalt = folderOptions.add(wwOBJLoader2StageControl, 'loadWaltHead').name('Load Walt Head');
		handleCerberus = folderOptions.add(wwOBJLoader2StageControl, 'loadCerberus').name('Load Cerberus');
		handleNinja = folderOptions.add(wwOBJLoader2StageControl, 'loadNinja').name('Ninja');
		handlePTV1 = folderOptions.add(wwOBJLoader2StageControl, 'loadPTV1').name('PTV1');
		handleOven = folderOptions.add(wwOBJLoader2StageControl, 'loadOven').name('Oven');
		handleSink = folderOptions.add(wwOBJLoader2StageControl, 'loadSink').name('Sink');
		folderOptions.add(wwOBJLoader2StageControl, 'clearAllAssests').name('Clear Scene');
		folderOptions.open();

		let folderUserFiles = gui.addFolder('User Files');
		if (appScope.fileApiAvailable) {
			folderUserFiles.add(wwOBJLoader2StageControl, 'loadUserFiles').name('Load OBJ/MTL Files');
			elemFileInput?.addEventListener('change', (event: Event) => {
				appScope.handleFileSelect(event, wwOBJLoader2StageControl.pathTexture);
			}, false);

			const controlPathTexture = folderUserFiles.add(wwOBJLoader2StageControl, 'pathTexture').name('Relative path to textures');
			controlPathTexture.onChange((value: string) => {
				console.log('Setting pathTexture to: ' + value);
				wwOBJLoader2StageControl.pathTexture = value + '/';
			});
		}

		this.initContent();

		wwOBJLoader2StageControl.loadMale();
		wwOBJLoader2StageControl.loadFemale();
	}
}
