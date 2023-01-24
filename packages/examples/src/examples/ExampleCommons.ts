import { AmbientLight, DirectionalLight, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";

export type CameraDefaults = {
	posCamera: THREE.Vector3;
	posCameraTarget: THREE.Vector3;
	near: number;
	far: number;
	fov: number;
};

export type ExampleDefinition = {
	render: () => void;
	run: () => void;
	getSetup(): ThreeDefaultSetup;
}

export type ProgressEventType = {
	detail: {
		text: string;
	}
}

export function reportProgress(event: ProgressEventType) {
	console.log(`Progress: ${event.detail.text}`);
	document.getElementById('feedback')!.innerHTML = event.detail.text;
}

export function executeExample(app: ExampleDefinition) {
	window.addEventListener('resize', () => resizeDisplayGL(app.getSetup()), false);

	console.log('Starting initialisation phase...');
	resizeDisplayGL(app.getSetup());

	const requestRender = () => {
		requestAnimationFrame(requestRender);
		app.render();
	};
	requestRender();

	app.run();
}

export type ThreeDefaultSetup = {
	renderer: THREE.WebGLRenderer;
	canvas: HTMLElement;
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	cameraTarget: THREE.Vector3;
	cameraDefaults: CameraDefaults;
	controls?: TrackballControls;
}

export function createThreeDefaultSetup(elementToBindTo: HTMLElement | null, cameraDefaults: CameraDefaults): ThreeDefaultSetup {
	if (elementToBindTo === null) {
		throw Error('Bad element HTML given as canvas.');
	}

	const setup = {} as ThreeDefaultSetup;
	setup.canvas = elementToBindTo;
	setup.renderer = new WebGLRenderer({
		canvas: setup.canvas,
		antialias: true
	});
	setup.renderer.setClearColor(0x050505);

	setup.scene = new Scene();

	setup.cameraDefaults = cameraDefaults;
	setup.cameraTarget = setup.cameraDefaults.posCameraTarget;
	setup.camera = new PerspectiveCamera(setup.cameraDefaults.fov, recalcAspectRatio(setup.canvas),
		setup.cameraDefaults.near, setup.cameraDefaults.far);
	resetCamera(setup);

	setup.controls = new TrackballControls(setup.camera, setup.renderer.domElement);

	const ambientLight = new AmbientLight(0x404040);
	const directionalLight1 = new DirectionalLight(0xC0C090);
	const directionalLight2 = new DirectionalLight(0xC0C090);

	directionalLight1.position.set(- 100, - 50, 100);
	directionalLight2.position.set(100, 50, - 100);

	setup.scene.add(directionalLight1);
	setup.scene.add(directionalLight2);
	setup.scene.add(ambientLight);

	const helper = new GridHelper(1200, 60, 0xFF4444, 0x404040);
	helper.name = 'grid';
	setup.scene.add(helper);

	return setup;
}

export function recalcAspectRatio(htmlElement: HTMLElement) {
	return (htmlElement.offsetHeight === 0) ? 1 : htmlElement.offsetWidth / htmlElement.offsetHeight;
}

export function resetCamera(setup: ThreeDefaultSetup) {
	setup.camera.position.copy(setup.cameraDefaults.posCamera);
	setup.cameraTarget.copy(setup.cameraDefaults.posCameraTarget);
	updateCamera(setup);
}

export function updateCamera(setup: ThreeDefaultSetup) {
	setup.camera.aspect = recalcAspectRatio(setup.canvas);
	setup.camera.lookAt(setup.cameraTarget);
	setup.camera.updateProjectionMatrix();
}

export function resizeDisplayGL(setup: ThreeDefaultSetup) {
	setup.controls!.handleResize();
	setup.renderer.setSize(setup.canvas.offsetWidth, setup.canvas.offsetHeight, false);
	updateCamera(setup);
}

export function renderDefault(setup: ThreeDefaultSetup) {
	if (!setup.renderer.autoClear) {
		setup.renderer.clear();
	}
	setup.controls?.update();
	setup.renderer.render(setup.scene, setup.camera);
}
