'use strict';

import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

import { GUI } from 'lil-gui';
import {
    WorkerTypeDefinition,
    WorkerTaskManager,
    DataTransportPayload,
    MaterialStore,
    MeshTransportPayload,
    MeshTransportPayloadUtils,
    MaterialsTransportPayloadUtils
} from 'three-wtm';

/**
 * The aim of this example is to show all possible ways how to use the {@link WorkerTaskManager}:
 * - Standard Workers with dependency loading
 * - Module Workers with and without additional dependencies
 * - It also allows to use OBJLoader in wrapper (tmOBJLoader.js with and without modules.
 *
 * Via dat.gui it is possible to control various parameters of the example:
 * - The quantity of workers created for each task (1-32, default: 4)
 * - The absolute overall count of task executions (10^3-10^7, default: 10^6)
 * - The maximum amount of task executions per loop (=number of promises returned, 1-10000, default: 1000)
 * - How many meshes shall be kept as otherwise the continuous loading will (100-10000, default: 750)
 *
 * The tasks perform the same loading operation over and over again.
 * This is not what you want to do in a real-world loading scenario,
 * but it is very helpful to demonstrate:
 * - A good CPU utilization can be achieved permanently if the selected amount of workers match the logical CPUs available
 * - No memory is leaked, by the workers
 * - It can be extended or altered to test new worker implementations
 */
class PotentiallyInfiniteExample {

    constructor(elementToBindTo) {
        this.renderer = null;
        this.canvas = elementToBindTo;
        this.aspectRatio = 1;

        this.scene = null;
        this.cameraDefaults = {
            posCamera: new THREE.Vector3(1000.0, 1000.0, 1000.0),
            posCameraTarget: new THREE.Vector3(0, 0, 0),
            near: 0.1,
            far: 10000,
            fov: 45
        };
        this.camera = null;
        this.cameraTarget = this.cameraDefaults.posCameraTarget;
        this.controls = null;

        this.workerTaskManager = null;

        this.taskDescriptions = new Map();
        this.tasksToUse = [];
        this.executions = [];
        this.objectsUsed = new Map();
        this.meshesAdded = [];
        this.meshCount = 0;
        this.removeCount = 50;
        this.numberOfMeshesToKeep = 750;
        this.overallExecutionCount = 1000000;

        // overall executions: maxPerLoop * loopCount
        this.maxPerLoop = 1000;
        // number of Promises kept in one go
        this.loopCount = this.overallExecutionCount / this.maxPerLoop;
        this.abort = false;
        this.reset = null;

        // sphere positions
        this.baseFactor = 750;
        this.baseVectorX = new THREE.Vector3(1, 0, 0);
        this.baseVectorY = new THREE.Vector3(0, 1, 0);
        this.baseVectorZ = new THREE.Vector3(0, 0, 1);
    }

    _recalcExecutionNumbers() {
        this.loopCount = this.overallExecutionCount / this.maxPerLoop;
    }

    resetAppContext() {
        this.workerTaskManager = new WorkerTaskManager();
        this.workerTaskManager.setVerbose(true);

        // configure all task that shall be usable on register to the WorkerTaskManager
        this.taskDescriptions.clear();
        this.taskDescriptions.set('simpleBlobWorker', {
            id: 0,
            name: 'simpleBlobWorker',
            use: true,
            module: true,
            blob: true,
            workerUrl: simpleWorkerBlobURL
        });
        this.taskDescriptions.set('tmProtoExampleModule', {
            id: 1,
            name: 'tmProtoExampleModule',
            use: true,
            module: true,
            blob: false,
            workerUrl: new URL('./worker/tmModuleExample.js', import.meta.url)
        });
        this.taskDescriptions.set('tmProtoExampleModuleNoThree', {
            id: 2,
            name: 'tmProtoExampleModuleNoThree',
            use: true,
            module: true,
            blob: false,
            workerUrl: new URL('./worker/tmModuleExampleNoThree.js', import.meta.url)
        });
        this.taskDescriptions.set('tmOBJLoader2Module', {
            id: 3,
            name: 'tmOBJLoader2Module',
            modelName: 'female02',
            use: false,
            module: true,
            blob: false,
            workerUrl: new URL('wwobjloader2/OBJLoader2Worker', import.meta.url),
            filenameMtl: '../models/obj/main/female02/female02.mtl',
            filenameObj: '../models/obj/main/female02/female02.obj',
            materialStore: new MaterialStore(true)
        });
        this.taskDescriptions.set('tmOBJLoader2Standard', {
            id: 4,
            name: 'tmOBJLoader2Standard',
            modelName: 'male02',
            use: false,
            module: false,
            blob: false,
            workerUrl: new URL('wwobjloader2/OBJLoader2WorkerStandard', import.meta.url),
            filenameMtl: '../models/obj/main/male02/male02.mtl',
            filenameObj: '../models/obj/main/male02/male02.obj',
            materialStore: new MaterialStore(true),
        });

        this.tasksToUse = [];
        this.executions = [];
        this.objectsUsed = new Map();

        if (this.reset !== null) {

            this._deleteMeshRange(this.meshesAdded.length);
            this.reset();
            this.reset = null;

        }
        this.meshesAdded = [];
        this.meshCount = 0;
        this.removeCount = 50;
        this.numberOfMeshesToKeep = 750;

        this.overallExecutionCount = 1000000;

        // overall executions: maxPerLoop * loopCount
        this.maxPerLoop = 1000;
        // number of Promises kept in one go
        this.loopCount = this.overallExecutionCount / this.maxPerLoop;
        this.abort = false;

        // sphere positions
        this.baseFactor = 750;
        this.baseVectorX = new THREE.Vector3(1, 0, 0);
        this.baseVectorY = new THREE.Vector3(0, 1, 0);
        this.baseVectorZ = new THREE.Vector3(0, 0, 1);
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

        const helper = new THREE.GridHelper(1000, 30, 0xFF4444, 0x404040);
        this.scene.add(helper);
    }

    /**
     * Registers any selected task at the {@link WorkerTaskManager} and initializes them.
     * The initialization varies. Some need task only pass dummy params others need
     * to init and send buffers to the workers
     *
     * @return {Promise<any>}
     */
    async initContent() {

        const awaiting = [];
        this.tasksToUse = [];

        let taskDescr = this.taskDescriptions.get('simpleBlobWorker');
        if (taskDescr.use) {
            this.tasksToUse.push(taskDescr);
            this.workerTaskManager.registerTask(taskDescr.name, {
                module: taskDescr.module,
                blob: taskDescr.blob,
                url: taskDescr.workerUrl
            });
            const payload = new DataTransportPayload('init', taskDescr.id, taskDescr.name);
            awaiting.push(this.workerTaskManager.initTaskType(taskDescr.name, payload));
        }
        taskDescr = this.taskDescriptions.get('tmProtoExampleModule');
        if (taskDescr.use) {
            this.tasksToUse.push(taskDescr);
            this.workerTaskManager.registerTask(taskDescr.name, {
                module: taskDescr.module,
                blob: taskDescr.blob,
                url: taskDescr.workerUrl
            });

            const payload = new DataTransportPayload('init', taskDescr.id, taskDescr.name);
            payload.params = {
                param1: 'param1value'
            };
            awaiting.push(this.workerTaskManager.initTaskType(taskDescr.name, payload));
        }
        taskDescr = this.taskDescriptions.get('tmProtoExampleModuleNoThree');
        if (taskDescr.use) {
            this.tasksToUse.push(taskDescr);
            this.workerTaskManager.registerTask(taskDescr.name, {
                module: taskDescr.module,
                blob: taskDescr.blob,
                url: taskDescr.workerUrl
            });

            const torus = new THREE.TorusBufferGeometry(25, 8, 16, 100);
            torus.name = 'torus';
            const payloadToSend = new MeshTransportPayload('init', taskDescr.id, taskDescr.name);
            MeshTransportPayloadUtils.setBufferGeometry(payloadToSend, torus, 0);
            const packed = MeshTransportPayloadUtils.packMeshTransportPayload(payloadToSend, false);
            awaiting.push(this.workerTaskManager.initTaskType(taskDescr.name, packed.payload, packed.transferables));
        }
        /*
            taskDescr = this.taskDescriptions.get( 'tmOBJLoader2Module' );
            if ( taskDescr.use ) {
                this.tasksToUse.push( taskDescr );
                this.workerTaskManager.registerTaskTypeModule( taskDescr.name, taskDescr.module );
                await this.loadObjMtl( taskDescr )
                    .then( buffer => {
                        const mt = new MaterialsTransport()
                            .addBuffer( 'modelData', buffer )
                            .setMaterials( taskDescr.materialStore.getMaterials() )
                            .cleanMaterials()
                            .package( false );
                        awaiting.push( this.workerTaskManager.initTaskType( taskDescr.name, mt.getMain(), mt.getTransferables() ).catch( e => console.error( e ) ) );
                    } );
            }
            taskDescr = this.taskDescriptions.get( 'tmOBJLoader2Standard' );
            if ( taskDescr.use ) {
                this.tasksToUse.push( taskDescr );
                this.workerTaskManager.registerTaskType( taskDescr.name, taskDescr.funcInit, taskDescr.funcExec, null, false, taskDescr.dependencies );
                await this.loadObjMtl( taskDescr )
                    .then( buffer => {
                        const mt = new MaterialsTransport()
                            .addBuffer( 'modelData', buffer )
                            .setMaterials( taskDescr.materialStore.getMaterials() )
                            .cleanMaterials()
                            .package( false );
                        awaiting.push( this.workerTaskManager.initTaskType( taskDescr.name, mt.getMain(), mt.getTransferables() ).catch( e => console.error( e ) ) );
                    } );
            }
        */
        if (awaiting.length > 0) {
            return await Promise.all(awaiting);
        }
        else {
            return new Promise((resolve, reject) => { reject('No task type has been configured'); });
        }
    }

    /** Only once needed for OBJ/MTL initialization */
    async loadObjMtl(taskDescr) {
        const fileLoader = new THREE.FileLoader();
        fileLoader.setResponseType('arraybuffer');

        const loadMtl = new Promise(resolve => {
            const mtlLoader = new MTLLoader();
            mtlLoader.load(taskDescr.filenameMtl, resolve);
        });
        await loadMtl.then(materialCreator => {
            materialCreator.preload();
            taskDescr.materialStore.addMaterials(materialCreator.materials, false);
        });
        return await fileLoader.loadAsync(taskDescr.filenameObj);
    }

    /**
     * Once all tasks are initialized a number of tasks (maxPerLoop) are enqueued.
     * This is repeated a configured number of times (loopCount) or the abort flag is set.
     * @return {Promise<void>}
     */
    async executeWorkers() {
        if (this.tasksToUse.length === 0) throw "No Tasks have been selected. Aborting..."

        console.time('start');
        let globalCount = 0;
        let taskToUseIndex = 0;
        for (let j = 0; j < this.loopCount && !this.abort; j++) {
            console.time('Completed ' + (this.maxPerLoop + j * this.maxPerLoop));
            for (let i = 0; i < this.maxPerLoop; i++) {
                const taskDescr = this.tasksToUse[taskToUseIndex];

                const tb = new DataTransportPayload('execute', globalCount);
                tb.params = {
                    modelName: taskDescr.name
                };
                const promise = this.workerTaskManager.enqueueForExecution(taskDescr.name, tb,
                    data => this._processMessage(taskDescr, data),
                    data => this._processMessage(taskDescr, data))
                this.executions.push(promise);

                globalCount++;
                taskToUseIndex++;
                if (taskToUseIndex === this.tasksToUse.length) {
                    taskToUseIndex = 0;
                }
            }
            await Promise.all(this.executions).then(x => {
                this.executions = [];
                console.timeEnd('Completed ' + (this.maxPerLoop + j * this.maxPerLoop));
            });
        }
        this.workerTaskManager.dispose();
        console.timeEnd('start');

        if (this.reset) {
            this.resetAppContext();
        }
    }

    /**
     * This method is invoked when {@link WorkerTaskManager} received a message from a worker.
     * @param {object} taskDescr
     * @param {object} payload Message received from worker
     * @private
     */
    _processMessage(taskDescr, payload) {
        let material;
        switch (payload.cmd) {
            case 'initComplete':
                console.log('Init Completed: ' + payload.id);
                break;

            case 'execComplete':
            case 'intermediate':
                switch (payload.type) {
                    case 'MeshTransportPayload':
                        const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(payload, false);

                        if (mtp.params.color) {
                            const color = new THREE.Color(mtp.params.color.r, mtp.params.color.g, mtp.params.color.b);
                            material = new THREE.MeshPhongMaterial({ color: color });
                        }
                        else {
                            if (mtp.materialsTransportPayload) {
                                const storedMaterials = taskDescr.materialStore ? taskDescr.materialStore.getMaterials() : new Map();
                                material = MaterialsTransportPayloadUtils.processMaterialTransport(mtp.materialsTransportPayload, storedMaterials, true);
                                if (!material) {
                                    material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
                                }
                            }
                            else {
                                const randArray = new Uint8Array(3);
                                window.crypto.getRandomValues(randArray);
                                const color = new THREE.Color();
                                color.r = randArray[0] / 255;
                                color.g = randArray[1] / 255;
                                color.b = randArray[2] / 255;
                                material = new THREE.MeshPhongMaterial({ color: color });
                            }
                        }
                        const mesh = new THREE.Mesh(mtp.bufferGeometry, material);
                        this._addMesh(mesh, mtp.id);
                        break;

                    case 'DataTransportPayload':
                        if (payload.cmd === 'execComplete') {
                            // This is the end-point for the
                            //console.log(`DataTransport: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
                        }
                        break;

                    default:
                        console.error('Provided payload.type did not match: ' + payload.cmd);
                        break;

                }
                this._cleanMeshes();
                break;

            default:
                console.error(payload.id + ': Received unknown command: ' + payload.cmd);
                break;
        }
    }

    /**
     * Add mesh at random position, but keep sub-meshes of an object together
     */
    _addMesh(mesh, id) {
        const storedPos = this.objectsUsed.get(id);
        let pos;
        if (storedPos) {
            pos = storedPos.pos;
        }
        else {
            pos = new THREE.Vector3(this.baseFactor * Math.random(), this.baseFactor * Math.random(), this.baseFactor * Math.random());
            pos.applyAxisAngle(this.baseVectorX, 2 * Math.PI * Math.random());
            pos.applyAxisAngle(this.baseVectorY, 2 * Math.PI * Math.random());
            pos.applyAxisAngle(this.baseVectorZ, 2 * Math.PI * Math.random());
            this.objectsUsed.set(id, { name: mesh.name, pos: pos });
        }
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.name = id + '' + mesh.name;
        this.scene.add(mesh);
        this.meshesAdded.push(mesh.name);
        this.meshCount++;
    }

    /**
     * Ensures that only the configured amount of meshes stay in the scene
     * @private
     */
    _cleanMeshes() {
        if (this.meshesAdded.length >= this.numberOfMeshesToKeep) {
            this._deleteMeshRange(this.removeCount);
        }
    }

    /**
     * Perform the actual deletion of meshes from the scene.
     * @param {number} deleteRange
     * @private
     */
    _deleteMeshRange(deleteRange) {
        let toBeRemoved;
        let deleteCount = 0;
        let i = 0;
        while (deleteCount < deleteRange && i < this.meshesAdded.length) {
            const meshName = this.meshesAdded[i];
            toBeRemoved = this.scene.getObjectByName(meshName);
            if (toBeRemoved) {
                toBeRemoved.geometry.dispose();
                if (toBeRemoved.material !== undefined && toBeRemoved.material !== null && toBeRemoved.material.dispose instanceof Function) {
                    toBeRemoved.material.dispose();
                }
                this.scene.remove(toBeRemoved);
                this.meshesAdded.splice(i, 1);
                deleteCount++;
            }
            else {
                i++;
                console.log('Unable to remove: ' + meshName);
            }
        }
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
}

// Simplest way to define a worker, but can't be a module worker
class SimpleBlobWorker {

    init(payload) {
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload) {
        payload.cmd = 'execComplete';
        payload.params = {
            hello: "say hello"
        };

        // burn some time
        for (let i = 0; i < 25000000; i++) {
            i++;
        }
        self.postMessage(payload);
    }

    comRouting(message) {
        const payload = message.data;
        if (payload) {
            if (payload.cmd === 'init') {
                this.init(payload);
            }
            else if (payload.cmd === 'execute') {
                this.execute(payload);
            }
        }
    }

};
const simpleWorkerDefinition = `${SimpleBlobWorker.toString()}

worker = new SimpleBlobWorker();
self.onmessage = message => worker.comRouting(message);
`;
const simpleWorkerBlobURL = WorkerTypeDefinition.createWorkerBlob([simpleWorkerDefinition]);

const app = new PotentiallyInfiniteExample(document.getElementById('example'));
app.resetAppContext();

class PotentiallyInfiniteExampleUI {

    constructor() {
        this.gui = new GUI({
            autoPlace: false,
            width: 400
        });
        const menuDiv = document.getElementById('dat');
        menuDiv.appendChild(this.gui.domElement);
    }

    /**
     * DAT UI configuration and behaviour.
     */
    tmControls = {
        controls: [],
        controlStop: null,
        controlReset: null,
        started: false,
        simpleBlobWorker: false,
        tmProtoExampleModule: false,
        tmProtoExampleModuleNoThree: false,
        tmOBJLoader2Module: false,
        tmOBJLoader2Standard: false,
        maxParallelExecutions: 0,
        overallExecutionCount: 0,
        numberOfMeshesToKeep: 0,
        maxPerLoop: 0,
        resetContent() {
            this.simpleBlobWorker = app.taskDescriptions.get('simpleBlobWorker').use;
            this.tmProtoExampleModule = app.taskDescriptions.get('tmProtoExampleModule').use;
            this.tmProtoExampleModuleNoThree = app.taskDescriptions.get('tmProtoExampleModuleNoThree').use;
            this.tmOBJLoader2Module = app.taskDescriptions.get('tmOBJLoader2Module').use;
            this.tmOBJLoader2Standard = app.taskDescriptions.get('tmOBJLoader2Standard').use;
            this.maxParallelExecutions = app.workerTaskManager.getMaxParallelExecutions();
            this.overallExecutionCount = app.overallExecutionCount;
            this.numberOfMeshesToKeep = app.numberOfMeshesToKeep;
            this.maxPerLoop = app.maxPerLoop;
            for (let control of this.controls) {
                this.enableElement(control);
                control.updateDisplay();
            }
            this.disableElement(this.controlStop);
        },
        blockEvent(event) {
            event.stopPropagation();
        },
        disableElement(elementHandle) {
            elementHandle.domElement.addEventListener('click', this.blockEvent, true);
            elementHandle.domElement.style.pointerEvents = 'none';
            elementHandle.domElement.style.opacity = 0.5;
        },
        enableElement(elementHandle) {
            elementHandle.domElement.removeEventListener('click', this.blockEvent, true);
            elementHandle.domElement.style.pointerEvents = 'auto';
            elementHandle.domElement.style.opacity = 1.0;
        },
        executeLoading() {
            this.started = true;
            for (let control of this.controls) {
                this.disableElement(control);
            }
            this.enableElement(this.controlStop);
            console.time('All tasks have been initialized');
            app.initContent().then(x => {
                console.timeEnd('All tasks have been initialized');
                app.executeWorkers();
            }).catch(x => alert(x));
        },
        stopExecution() {
            this.started = false;
            app.abort = true;
        },
        resetExecution() {
            const scope = this;
            function scopeReset() {
                scope.resetContent();
            }
            app.reset = scopeReset;
            if (this.started) {
                this.stopExecution();
            }
            else {
                app.resetAppContext();
                this.resetContent();
            }
        }
    }

    init() {
        this.bindControls();
    }

    bindControls() {
        const tmControls = this.tmControls;
        const gui = this.gui;
        const taskName0 = 'simpleBlobWorker';
        let index = 0;
        tmControls.controls[index] = gui.add(tmControls, taskName0).name('Blob Worker Standard');
        tmControls.controls[index].onChange(value => { app.taskDescriptions.get(taskName0).use = value; });

        const taskName1 = 'tmProtoExampleModule';
        index++;
        tmControls.controls[index] = gui.add(tmControls, taskName1).name('Worker Module + three');
        tmControls.controls[index].onChange(value => { app.taskDescriptions.get(taskName1).use = value; });

        const taskName2 = 'tmProtoExampleModuleNoThree';
        index++;
        tmControls.controls[index] = gui.add(tmControls, taskName2).name('Worker Module solo');
        tmControls.controls[index].onChange(value => { app.taskDescriptions.get(taskName2).use = value; });

        const taskName3 = 'tmOBJLoader2Module';
        index++;
        tmControls.controls[index] = gui.add(tmControls, taskName3).name('OBJLoader2Parser Module');
        tmControls.controls[index].onChange(value => { app.taskDescriptions.get(taskName3).use = value; });

        const taskName4 = 'tmOBJLoader2Standard';
        index++;
        tmControls.controls[index] = gui.add(tmControls, taskName4).name('OBJLoader2Parser Standard');
        tmControls.controls[index].onChange(value => { app.taskDescriptions.get(taskName4).use = value; });

        index++;
        tmControls.controls[index] = gui.add(tmControls, 'maxParallelExecutions', 1, 32).step(1).name('Maximum Parallel Executions');
        tmControls.controls[index].onChange(value => { app.workerTaskManager.setMaxParallelExecutions(value) });

        index++;
        tmControls.controls[index] = gui.add(tmControls, 'overallExecutionCount', 1000, 10000000).step(1000).name('Overall Execution Count');
        tmControls.controls[index].onChange(value => { app.overallExecutionCount = value; app._recalcExecutionNumbers() });

        index++;
        tmControls.controls[index] = gui.add(tmControls, 'maxPerLoop', 1, 10000).step(100).name('Loop executions');
        tmControls.controls[index].onChange(value => { app.maxPerLoop = value; app._recalcExecutionNumbers() });

        index++;
        tmControls.controls[index] = gui.add(tmControls, 'numberOfMeshesToKeep', 100, 10000).step(25).name('Keep N Meshes');
        tmControls.controls[index].onChange(value => { app.numberOfMeshesToKeep = value });

        index++;
        tmControls.controls[index] = gui.add(tmControls, 'executeLoading').name('Engage');
        tmControls.controls[index].domElement.id = 'startButton';

        tmControls.controlStop = gui.add(tmControls, 'stopExecution').name('Stop');
        tmControls.controlReset = gui.add(tmControls, 'resetExecution').name('Reset');

        tmControls.resetContent();
    }
}
const ui = new PotentiallyInfiniteExampleUI();
ui.init();

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

render();
