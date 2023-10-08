import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, reportProgress, ThreeDefaultSetup } from './ExampleCommons.js';
import { Object3D, Vector3 } from 'three';

export class OBJLoader2OBJLoaderCompareExample implements ExampleDefinition {

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
        const modelName = 'verificationCubes';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const objLoader = new OBJLoader();

        const objLoader2 = new OBJLoader2();
        objLoader2.setModelName(modelName);
        objLoader2.setLogging(true, false);
        objLoader2.setUseOAsMesh(true);

        const callbackOnLoad = (object3d: Object3D) => {
            this.setup.scene.add(object3d);
            console.log('Loading complete: ' + modelName);
            reportProgress({ detail: { text: 'Loading of [' + modelName + '] was successfully completed.' } });

        };

        const onLoadMtl = (mtlParseResult: MTLLoader.MaterialCreator) => {
            objLoader.setMaterials(mtlParseResult);
            objLoader.load('./models/obj/main/verify/verify.obj', (object) => {
                object.position.y = -100;
                this.setup.scene.add(object);
            });

            objLoader2.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
            objLoader2.load('./models/obj/main/verify/verify.obj', callbackOnLoad);
        };

        const mtlLoader = new MTLLoader();
        mtlLoader.load('./models/obj/main/verify/verify.mtl', onLoadMtl);
    }

}
