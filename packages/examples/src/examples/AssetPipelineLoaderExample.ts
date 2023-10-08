import { Vector3 } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { ResourceDescriptor } from 'wwobjloader2';
import { AssetPipelineLoader, AssetPipeline, AssetTask } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, ThreeDefaultSetup } from './ExampleCommons.js';

export class AssetPipelineLoaderExample implements ExampleDefinition {

    private setup: ThreeDefaultSetup;

    constructor(canvas: HTMLCanvasElement | null) {
        const cameraDefaults = {
            posCamera: new Vector3(0.0, 175.0, 500.0),
            posCameraTarget: new Vector3(0, 0, 0),
            near: 0.1,
            far: 10000,
            fov: 45
        };
        this.setup = createThreeDefaultSetup(canvas, cameraDefaults, {
            width: canvas?.offsetWidth ?? 0,
            height: canvas?.offsetHeight ?? 0,
            pixelRatio: window.devicePixelRatio
        });
    }

    getSetup() {
        return this.setup;
    }

    render() {
        renderDefault(this.setup);
    }

    run() {
        const assetTask0 = new AssetTask('task0');
        const rdMtl = new ResourceDescriptor('./models/obj/main/female02/female02.mtl').setNeedStringOutput(true);
        assetTask0.setResourceDescriptor(rdMtl);
        const loaderConfigurationMtl = {
            resourcePath: './models/obj/main/female02/',
            materialOptions: {}
        };
        assetTask0.setLoader(new MTLLoader(), loaderConfigurationMtl);

        const assetTask1 = new AssetTask('task1');
        assetTask1.setLinker(new MtlObjBridge());

        const assetTask2 = new AssetTask('task2');
        const rdObj = new ResourceDescriptor('./models/obj/main/female02/female02.obj');
        assetTask2.setResourceDescriptor(rdObj);
        assetTask2.setLoader(new OBJLoader2());

        const assetPipeline = new AssetPipeline();
        assetPipeline.addAssetTask(assetTask0);
        assetPipeline.addAssetTask(assetTask1);
        assetPipeline.addAssetTask(assetTask2);

        const assetPipelineLoader = new AssetPipelineLoader('testAssetPipelineLoader', assetPipeline);
        assetPipelineLoader.setBaseObject3d(this.setup.scene);
        assetPipelineLoader.run();
    }

}
