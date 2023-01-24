import { Object3D, Vector3 } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, reportProgress, ThreeDefaultSetup } from './ExampleCommons.js';

export class OBJLoader2BasicExample implements ExampleDefinition {

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
		const modelName = 'female02';
		reportProgress({ detail: { text: 'Loading: ' + modelName } });

		const scope = this;
		const objLoader2 = new OBJLoader2();
		const callbackOnLoad = (object3d: Object3D) => {
			scope.setup.scene.add(object3d);
			reportProgress({
				detail: {
					text: `Loading of [${modelName}] was successfully completed.`
				}
			});
		};

		const onLoadMtl = (mtlParseResult: MTLLoader.MaterialCreator) => {
			objLoader2.setModelName(modelName);
			objLoader2.setLogging(true, true);
			objLoader2.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
			objLoader2.load('./models/obj/main/female02/female02.obj', callbackOnLoad);
		};

		const mtlLoader = new MTLLoader();
		mtlLoader.load('./models/obj/main/female02/female02.mtl', onLoadMtl);
	}

}
