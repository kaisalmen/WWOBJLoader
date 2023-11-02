import {
    Object3D,
    LoadingManager
} from 'three';
import {
    DataPayload,
    WorkerTask,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageType,
    pack,
    unpack,
} from 'wtd-core';
import { CallbackOnLoadType, CallbackOnMeshAlterType, FileLoaderOnErrorType, FileLoaderOnProgressType, OBJLoader2 } from './OBJLoader2.js';
import { PreparedMeshType } from './OBJLoader2Parser.js';

/**
 * Creates a new OBJLoader2Parallel. Use it to load OBJ data from files or to parse OBJ data from arraybuffer.
 * It extends {@link OBJLoader2} with the capability to run the parser in a web worker.
 *
 * @param [LoadingManager] manager The loadingManager for the loader to use. Default is {@link LoadingManager}
 * @constructor
 */
export class OBJLoader2Parallel extends OBJLoader2 {

    static OBJLOADER2_PARALLEL_VERSION = OBJLoader2.OBJLOADER2_VERSION;
    static DEFAULT_DEV_MODULE_WORKER_PATH = './worker/OBJLoader2Worker.js';
    static DEFAULT_DEV_STANDARD_WORKER_PATH = '../lib/worker/OBJLoader2WorkerClassic.js';
    static DEFAULT_PROD_MODULE_WORKER_PATH = './worker/OBJLoader2WorkerModule.js';
    static DEFAULT_PROD_STANDARD_WORKER_PATH = './worker/OBJLoader2WorkerClassic.js';
    static TASK_NAME = 'OBJLoader2Worker';

    private moduleWorker = true;
    private workerUrl = OBJLoader2Parallel.getModuleWorkerDefaultUrl();
    private terminateWorkerOnLoad = false;
    private workerTask?: WorkerTask;

    /**
     *
     * @param {LoadingManager} [manager]
     */
    constructor(manager?: LoadingManager) {
        super(manager);
    }

    /**
     * Set whether jsm modules in workers should be used. This requires browser support
     * which is availableminall major browser apart from Firefox.
     *
     * @param {boolean} moduleWorker If the worker is a module or a standard worker
     * @param {URL} workerUrl Provide complete worker URL otherwise relative path to this module may not be correct
     * @return {OBJLoader2Parallel}
     */
    setWorkerUrl(moduleWorker: boolean, workerUrl: URL) {
        this.moduleWorker = moduleWorker === true;
        this.workerUrl = workerUrl;
        return this;
    }

    static getModuleWorkerDefaultUrl() {
        return new URL(import.meta.env.DEV ? OBJLoader2Parallel.DEFAULT_DEV_MODULE_WORKER_PATH : OBJLoader2Parallel.DEFAULT_PROD_MODULE_WORKER_PATH, import.meta.url);
    }

    static getStandardWorkerDefaultUrl() {
        return new URL(import.meta.env.DEV ? OBJLoader2Parallel.DEFAULT_DEV_STANDARD_WORKER_PATH : OBJLoader2Parallel.DEFAULT_PROD_STANDARD_WORKER_PATH, import.meta.url);
    }

    /**
     * Request termination of worker once parser is finished.
     *
     * @param {boolean} terminateWorkerOnLoad True or false.
     * @return {OBJLoader2Parallel}
     */
    setTerminateWorkerOnLoad(terminateWorkerOnLoad: boolean) {
        this.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
        return this;
    }

    /**
     * See {@link OBJLoader2.load}
     */
    load(url: string, onLoad: CallbackOnLoadType, onProgress?: FileLoaderOnProgressType,
        onError?: FileLoaderOnErrorType, onMeshAlter?: CallbackOnMeshAlterType) {
        const interceptOnLoad = (object3d: Object3D) => {
            if (object3d.name === 'OBJLoader2ParallelDummy') {
                if (this.parser.isDebugLoggingEnabled()) {
                    console.debug('Received dummy answer from OBJLoader2Parallel#parse');
                }
            }
            else {
                if (onLoad) {
                    onLoad(object3d);
                } else {
                    throw new Error('"onLoad" callback was not provided. Aborting...');
                }
            }
        };
        OBJLoader2.prototype.load.call(this, url, interceptOnLoad, onProgress, onError, onMeshAlter);
    }

    /**
     * See {@link OBJLoader2.parse}
     * The callback onLoad needs to be set to be able to receive the content if used in parallel mode.
     */
    parse(objToParse: ArrayBuffer) {
        if (this.parser.isLoggingEnabled()) {
            console.info('Using OBJLoader2Parallel version: ' + OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION);
        }

        this.printCallbackConfig();
        this.initWorkerParse(objToParse);
        const dummy = new Object3D();
        dummy.name = 'OBJLoader2ParallelDummy';
        return dummy;
    }

    private async initWorkerParse(objToParse: ArrayBuffer) {
        this.initWorkerTask();

        await this.initWorker()
            .then(() => {
                if (this.parser.isDebugLoggingEnabled()) {
                    console.log('OBJLoader2Parallel init was performed');
                }
                this.executeWorker(objToParse);

            }).catch((e: Error) => console.error(e));
    }

    private initWorkerTask() {
        this.workerTask = new WorkerTask(OBJLoader2Parallel.TASK_NAME, 1, {
            module: this.moduleWorker,
            blob: false,
            url: this.workerUrl
        }, this.parser.isDebugLoggingEnabled());
    }

    /**
     * Provide instructions on what is to be contained in the worker.
     *
     * @return {Promise<void>}
     * @private
     */
    private initWorker() {
        const initMessage = new WorkerTaskMessage({});
        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            logging: {
                enabled: this.parser.isLoggingEnabled(),
                debug: this.parser.isDebugLoggingEnabled()
            }
        };

        initMessage.addPayload(dataPayload);
        return this.workerTask!.initWorker(initMessage);
    }

    private async executeWorker(objToParse: ArrayBuffer) {
        const execMessage = new WorkerTaskMessage({
            id: Math.floor(Math.random() * Math.floor(65536))
        });
        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            modelName: this.modelName,
            useIndices: this.useIndices,
            disregardNormals: this.disregardNormals,
            materialPerSmoothingGroup: this.materialPerSmoothingGroup,
            useOAsMesh: this.useOAsMesh,
            logging: {
                enabled: this.parser.isLoggingEnabled(),
                debug: this.parser.isDebugLoggingEnabled()
            }
        };
        dataPayload.message.buffers?.set('modelData', objToParse);
        dataPayload.message.params.materialNames = new Set(Array.from(this.materialStore.getMaterials().keys()));

        execMessage.addPayload(dataPayload);
        const transferables = pack(execMessage.payloads, false);

        try {
            await this.workerTask?.executeWorker({
                message: execMessage,
                onIntermediateConfirm: (message) => {
                    this.onWorkerMessage(message);
                },
                onComplete: (message) => {
                    this.onWorkerMessage(message);
                    if (this.terminateWorkerOnLoad) {
                        this.workerTask!.dispose();
                    }
                },
                transferables: transferables
            });
            console.log('Worker execution completed successfully.');
        } catch (e) {
            console.error(e);
        }
    }

    /**
     *
     * @param {Mesh} mesh
     * @param {object} materialMetaInfo
     */
    private onWorkerMessage(message: WorkerTaskMessageType) {
        const wtm = unpack(message, false);
        if (wtm.cmd === WorkerTaskCommandResponse.INTERMEDIATE_CONFIRM) {

            const dataPayload = (wtm.payloads.length === 1) ? wtm.payloads[0] as DataPayload : undefined;
            if (dataPayload && dataPayload.message.params) {
                const preparedMesh = dataPayload.message.params.preparedMesh as PreparedMeshType;
                const mesh = OBJLoader2.buildThreeMesh(preparedMesh, this.materialStore.getMaterials(), this.parser.isDebugLoggingEnabled());
                if (mesh) {
                    this._onMeshAlter(mesh, preparedMesh.materialMetaInfo);
                    this.baseObject3d.add(mesh);
                }
            }
            else {
                console.error('Received intermediate message without a proper payload');
            }
        }
        else if (wtm.cmd === 'execComplete') {
            this._onLoad();
        }
        else {
            console.error(`Received unknown command: ${wtm.cmd}`);
        }
    }
}
