import { Vector3 } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { ResourceDescriptor } from './utils/ResourceDescriptor.js';
import { AssetPipelineLoader, AssetPipeline, AssetTask, ParserType, LinkType } from './utils/AssetPipelineLoader.js';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, ThreeDefaultSetup } from './ExampleCommons.js';

export class AssetPipelineLoaderExample implements ExampleDefinition {

	private setup: ThreeDefaultSetup;

	constructor(elementToBindTo: HTMLElement | null) {
		const cameraDefaults = {
			posCamera: new Vector3(0.0, 175.0, 500.0),
			posCameraTarget: new Vector3(0, 0, 0),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.setup = createThreeDefaultSetup(elementToBindTo, cameraDefaults);
	}

	getSetup() {
		return this.setup;
	}

	render() {
		renderDefault(this.setup);
	}

	run() {
		let assetTask0 = new AssetTask('task0');
		let rdMtl = new ResourceDescriptor('./models/obj/main/female02/female02.mtl').setNeedStringOutput(true);
		assetTask0.setResourceDescriptor(rdMtl);
		let loaderConfigurationMtl = {
			resourcePath: './models/obj/main/female02/',
			materialOptions: {}
		};
		assetTask0.setAssetHandler(new MTLLoader() as unknown as ParserType, loaderConfigurationMtl);

		let assetTask1 = new AssetTask('task1');
		assetTask1.setLinker(true);
		assetTask1.setAssetHandler(MtlObjBridge as unknown as LinkType);

		let assetTask2 = new AssetTask('task2');
		let rdObj = new ResourceDescriptor('./models/obj/main/female02/female02.obj');
		assetTask2.setResourceDescriptor(rdObj);
		assetTask2.setAssetHandler(new OBJLoader2() as unknown as ParserType);

		let assetPipeline = new AssetPipeline();
		assetPipeline.addAssetTask(assetTask0);
		assetPipeline.addAssetTask(assetTask1);
		assetPipeline.addAssetTask(assetTask2);

		let assetPipelineLoader = new AssetPipelineLoader('testAssetPipelineLoader', assetPipeline);
		assetPipelineLoader.setBaseObject3d(this.setup.scene);
		assetPipelineLoader.run();
	}

}
