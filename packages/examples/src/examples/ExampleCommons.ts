import { AmbientLight, DirectionalLight, GridHelper, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';

export type CameraDefaults = {
    posCamera: THREE.Vector3;
    posCameraTarget: THREE.Vector3;
    near: number;
    far: number;
    fov: number;
};

export type SetupDefaults = {
    useTrackBall?: boolean;
    width?: number;
    height?: number;
    pixelRatio?: number;
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

export const reportProgress = (event: ProgressEventType) => {
    console.log(`Progress: ${event.detail.text}`);
    if (!isWorker()) {
        document.getElementById('feedback')!.innerHTML = event.detail.text;
    }
};

export const isWorker = () => {
    return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
};

export const executeExample = (app: ExampleDefinition) => {
    console.log('Starting initialisation phase...');
    if (!isWorker()) {
        window.addEventListener('resize', () => resizeDisplayGL(app.getSetup()), false);
    }
    resizeDisplayGL(app.getSetup());

    const requestRender = () => {
        requestAnimationFrame(requestRender);
        app.render();
    };
    requestRender();

    app.run();
};

export type ThreeDefaultSetup = {
    renderer: THREE.WebGLRenderer;
    canvas: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraTarget: THREE.Vector3;
    cameraDefaults: CameraDefaults;
    controls?: ArcballControls;
    setupDefaults?: SetupDefaults;
}

export const createThreeDefaultSetup = (elementToBindTo: HTMLElement | null, cameraDefaults: CameraDefaults, setupDefaults?: SetupDefaults): ThreeDefaultSetup => {
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

    let useTrackBall = true;
    if (setupDefaults) {
        setup.setupDefaults = setupDefaults;
        if (setupDefaults.pixelRatio) {
            setup.renderer.setPixelRatio(setupDefaults.pixelRatio);
        }
        if (setupDefaults.width && setupDefaults.height) {
            setup.renderer.setSize(setupDefaults.width, setupDefaults.height, false);
        }
        useTrackBall = setupDefaults?.useTrackBall === true;
    }
    setup.scene = new Scene();

    setup.cameraDefaults = cameraDefaults;
    setup.cameraTarget = setup.cameraDefaults.posCameraTarget;
    setup.camera = new PerspectiveCamera(setup.cameraDefaults.fov, recalcAspectRatio(setup.canvas, setup.setupDefaults),
        setup.cameraDefaults.near, setup.cameraDefaults.far);
    resetCamera(setup);

    if (useTrackBall) {
        setup.controls = new ArcballControls(setup.camera, setup.renderer.domElement);
    }

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
};

export const recalcAspectRatio = (htmlElement: HTMLElement, setupDefaults?: SetupDefaults) => {
    if (setupDefaults?.width && setupDefaults?.height) {
        return (setupDefaults.height === 0) ? 1 : setupDefaults.width / setupDefaults.height;
    } else {
        return (htmlElement.offsetHeight === 0) ? 1 : htmlElement.offsetWidth / htmlElement.offsetHeight;
    }
};

export const resetCamera = (setup: ThreeDefaultSetup) => {
    setup.camera.position.copy(setup.cameraDefaults.posCamera);
    setup.cameraTarget.copy(setup.cameraDefaults.posCameraTarget);
    updateCamera(setup);
};

export const updateCamera = (setup: ThreeDefaultSetup) => {
    setup.camera.aspect = recalcAspectRatio(setup.canvas, setup.setupDefaults);
    setup.camera.lookAt(setup.cameraTarget);
    setup.camera.updateProjectionMatrix();
};

export const resizeDisplayGL = (setup: ThreeDefaultSetup) => {
    setup.controls?.update();
    if (setup.setupDefaults?.width && setup.setupDefaults?.height) {
        setup.renderer.setSize(setup.setupDefaults.width, setup.setupDefaults.height, false);
    } else {
        setup.renderer.setSize(setup.canvas.offsetWidth, setup.canvas.offsetHeight, false);
    }
    updateCamera(setup);
};

export const renderDefault = (setup: ThreeDefaultSetup) => {
    if (!setup.renderer.autoClear) {
        setup.renderer.clear();
    }
    setup.controls?.update();
    setup.renderer.render(setup.scene, setup.camera);
};
