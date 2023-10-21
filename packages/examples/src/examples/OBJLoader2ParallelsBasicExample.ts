import { Object3D, Vector3 } from 'three';
import { OBJLoader2Parallel } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, reportProgress, ThreeDefaultSetup } from './ExampleCommons.js';

export class OBJLoader2ParalleleBasicExample implements ExampleDefinition {

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
        const modelName = 'female02_vertex';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const objLoader2Parallel = new OBJLoader2Parallel()
            .setWorkerUrl(false, new URL('./libs/worker/OBJLoader2WorkerClassic.js', window.location.href))
            .setModelName(modelName)
            .setLogging(true, true)
            .setUseIndices(true);

        const callbackOnLoad = (object3d: Object3D) => {
            this.setup.scene.add(object3d);
            reportProgress({
                detail: {
                    text: `Loading of [${modelName}] was successfully completed.`
                }
            });

        };
        const filename = './models/obj/main/female02/female02_vertex_colors.obj';
        objLoader2Parallel.load(filename, callbackOnLoad);

    }

}
