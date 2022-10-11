import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';

export class OBJLoader2BasicExample {

	constructor(elementToBindTo) {
		this.renderer = null;
		this.canvas = elementToBindTo;
		this.aspectRatio = 1;

		this.scene = null;
		this.cameraDefaults = {
			posCamera: new THREE.Vector3(0.0, 175.0, 500.0),
			posCameraTarget: new THREE.Vector3(0, 0, 0),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.camera = null;
		this.cameraTarget = this.cameraDefaults.posCameraTarget;
		this.controls = null;
	}

	initGL() {
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		});
		this.renderer.setClearColor(0x050505);

		this.scene = new THREE.Scene();

		this.recalcAspectRatio();
		this.camera = new THREE.PerspectiveCamera(this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far);
		this.resetCamera();
		this.controls = new TrackballControls(this.camera, this.renderer.domElement);

		const ambientLight = new THREE.AmbientLight(0x404040);
		const directionalLight1 = new THREE.DirectionalLight(0xC0C090);
		const directionalLight2 = new THREE.DirectionalLight(0xC0C090);

		directionalLight1.position.set(- 100, - 50, 100);
		directionalLight2.position.set(100, 50, - 100);

		this.scene.add(directionalLight1);
		this.scene.add(directionalLight2);
		this.scene.add(ambientLight);

		const helper = new THREE.GridHelper(1200, 60, 0xFF4444, 0x404040);
		this.scene.add(helper);
	}

	initContent() {
		const modelName = 'female02';
		this._reportProgress({ detail: { text: 'Loading: ' + modelName } });

		const scope = this;
		const objLoader2 = new OBJLoader2();
		function callbackOnLoad(object3d) {
			scope.scene.add(object3d);
			scope._reportProgress({ detail: { text: 'Loading of [' + modelName + '] was successfully completed.' } });
		};

		const onLoadMtl = function(mtlParseResult) {
			objLoader2.setModelName(modelName);
			objLoader2.setLogging(true, true);
			objLoader2.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
			objLoader2.load('./models/obj/main/female02/female02.obj', callbackOnLoad, null, null, null);
		};

		const mtlLoader = new MTLLoader();
		mtlLoader.load('./models/obj/main/female02/female02.mtl', onLoadMtl);
	}

	_reportProgress(event) {
		let output = '';
		if (event.detail !== null && event.detail !== undefined && event.detail.text) {
			output = event.detail.text;
		}

		console.log('Progress: ' + output);
		document.getElementById('feedback').innerHTML = output;
	}

	resizeDisplayGL() {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight, false);

		this.updateCamera();
	}

	recalcAspectRatio() {
		this.aspectRatio = (this.canvas.offsetHeight === 0) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	}

	resetCamera() {
		this.camera.position.copy(this.cameraDefaults.posCamera);
		this.cameraTarget.copy(this.cameraDefaults.posCameraTarget);

		this.updateCamera();
	}

	updateCamera() {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt(this.cameraTarget);
		this.camera.updateProjectionMatrix();
	}

	render() {
		if (!this.renderer.autoClear) this.renderer.clear();
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	static executeExample(app) {
		const resizeWindow = function() {
			app.resizeDisplayGL();
		};

		const render = function() {
			requestAnimationFrame(render);
			app.render();
		};

		window.addEventListener('resize', resizeWindow, false);

		console.log('Starting initialisation phase...');
		app.initGL();
		app.resizeDisplayGL();
		app.initContent();

		render();
	}
}
