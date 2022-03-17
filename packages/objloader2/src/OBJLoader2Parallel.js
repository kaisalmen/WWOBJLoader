import {
    Object3D,
    Mesh,
    LineSegments,
    Points,
    MeshStandardMaterial
} from 'three';
import {
    WorkerTaskManager,
    MaterialUtils,
    DataTransportPayload,
    DataTransportPayloadUtils,
    MeshTransportPayloadUtils,
    MeshTransportPayload
} from 'three-wtm';
import { OBJLoader2 } from './OBJLoader2';

/**
 * Creates a new OBJLoader2Parallel. Use it to load OBJ data from files or to parse OBJ data from arraybuffer.
 * It extends {@link OBJLoader2} with the capability to run the parser in a web worker.
 *
 * @param [LoadingManager] manager The loadingManager for the loader to use. Default is {@link LoadingManager}
 * @constructor
 */
class OBJLoader2Parallel extends OBJLoader2 {

    static OBJLOADER2_PARALLEL_VERSION = OBJLoader2.OBJLOADER2_VERSION;
    static DEFAULT_JSM_WORKER_PATH = './worker/OBJLoader2Worker.js';

    /**
     *
     * @param {LoadingManager} [manager]
     */
    constructor(manager) {
        super(manager);
        this.moduleWorker = true;
        /** @type {URL|undefined} */
        this.workerUrl = OBJLoader2Parallel.getModuleWorkerDefaultUrl();
        this.workerTaskManager = null;
        this.taskName = 'OBJLoader2Worker';
    }

    /**
     * @param {WorkerTaskManager} workerTaskManager The {@link WorkerTaskManager}
     * @param {string} [taskName] A specific taskName to allow distinction between legacy and module workers
     *
     * @return {OBJLoader2Parallel}
     */
    setWorkerTaskManager(workerTaskManager, taskName) {
        this.workerTaskManager = workerTaskManager;
        if (taskName) this.taskName = taskName;
        return this;
    }

    /**
     * Set whether jsm modules in workers should be used. This requires browser support
     * which is availableminall major browser apart from Firefox.
     *
     * @param {boolean} moduleWorker If the worker is a module or a standard worker
     * @param {URL} workerUrl Provide complete worker URL otherwise relative path to this module may not be correct
     * @return {OBJLoader2Parallel}
     */
    setWorkerUrl(moduleWorker, workerUrl) {
        this.moduleWorker = moduleWorker === true;
        if (workerUrl === undefined || workerUrl === null || !(workerUrl instanceof URL)) {
            throw 'The provided URL for the worker is not valid. Aborting...';
        }
        else {
            this.workerUrl = workerUrl;
        }
        return this;
    }

    static getModuleWorkerDefaultUrl() {
        return new URL(OBJLoader2Parallel.DEFAULT_JSM_WORKER_PATH, import.meta.url);
    }

    /**
     * Request termination of worker once parser is finished.
     *
     * @param {boolean} terminateWorkerOnLoad True or false.
     * @return {OBJLoader2Parallel}
     */
    setTerminateWorkerOnLoad(terminateWorkerOnLoad) {
        this.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
        return this;
    }

    /**
     * Provide instructions on what is to be contained in the worker.
     *
     * @param {DataTransportPayload} payload Configuration object
     * @return {Promise<void>}
     * @private
     */
    async _buildWorkerCode(payload) {
        if (this.workerTaskManager === null || !(this.workerTaskManager instanceof WorkerTaskManager)) {
            if (this.parser.logging.debug) console.log('Needed to create new WorkerTaskManager');
            this.workerTaskManager = new WorkerTaskManager(1);
            this.workerTaskManager.setVerbose(this.parser.logging.enabled && this.parser.logging.debug);
        }
        if (!this.workerTaskManager.supportsTaskType(this.taskName)) {
            this.workerTaskManager.registerTask(this.taskName, this.moduleWorker, this.workerUrl);
            const packed = DataTransportPayloadUtils.packDataTransportPayload(payload);

            await this.workerTaskManager.initTaskType(this.taskName, packed.payload, packed.transferables);
        }
    }

    /**
     * See {@link OBJLoader2.load}
     */
    load(content, onLoad, onFileLoadProgress, onError, onMeshAlter) {
        const scope = this;
        function interceptOnLoad(object3d, objectId) {
            if (object3d.name === 'OBJLoader2ParallelDummy') {
                if (scope.parser.logging.enabled && scope.parser.logging.debug) {
                    console.debug('Received dummy answer from OBJLoader2Parallel#parse');
                }
            }
            else {
                onLoad(object3d, objectId);
            }
        }
        OBJLoader2.prototype.load.call(this, content, interceptOnLoad, onFileLoadProgress, onError, onMeshAlter);
    }

    /**
     * See {@link OBJLoader2.parse}
     * The callback onLoad needs to be set to be able to receive the content if used in parallel mode.
     */
    parse(content) {
        if (this.parser.logging.enabled) {
            console.info('Using OBJLoader2Parallel version: ' + OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION);
        }
        const dTP = new DataTransportPayload();
        dTP.params.logging = {
            enabled: this.parser.logging.enabled,
            debug: this.parser.logging.debug
        };
        this._buildWorkerCode(dTP)
            .then(() => {
                if (this.parser.logging.debug) console.log('OBJLoader2Parallel init was performed');
                this._executeWorkerParse(content);
            }).catch(e => console.error(e));
        let dummy = new Object3D();
        dummy.name = 'OBJLoader2ParallelDummy';
        return dummy;
    }

    _executeWorkerParse(content) {
        const dTP = new DataTransportPayload('execute', Math.floor(Math.random() * Math.floor(65536)));
        dTP.params.modelName = this.parser.modelName;
        dTP.params.useIndices = this.parser.useIndices;
        dTP.params.disregardNormals = this.parser.disregardNormals;
        dTP.params.materialPerSmoothingGroup = this.parser.materialPerSmoothingGroup;
        dTP.params.useOAsMesh = this.parser.useOAsMesh;
        dTP.params.materials = MaterialUtils.getMaterialsJSON(this.materialStore.getMaterials());
        dTP.buffers.set('modelData', content);
        const packed = DataTransportPayloadUtils.packDataTransportPayload(dTP);

        this.workerTaskManager.enqueueForExecution(
            this.taskName,
            packed.payload,
            receivedPayload => this._onLoad(receivedPayload),
            packed.transferables)
            .then(receivedPayload => {
                this._onLoad(receivedPayload);
                if (this.terminateWorkerOnLoad) this.workerTaskManager.dispose();
            })
            .catch(e => console.error(e))
    }

    /**
     *
     * @param {Mesh} mesh
     * @param {object} materialMetaInfo
     */
    _onLoad(asset) {
        const cmd = asset.cmd;
        if (cmd === 'assetAvailable') {
            let mTS;
            if (asset.type === 'MeshTransportPayload') {
                mTS = MeshTransportPayloadUtils.unpackMeshTransportPayload(asset, false);
            }
            else {
                console.error('Received unknown asset.type: ' + asset.type);
            }
            if (mTS) {
                const materialsTransport = mTS.getMaterialsTransport();
                let material = MaterialsTransportPayloadUtils.processMaterialTransport(mtp.materialsTransportPayload,
                    this.materialStore.getMaterials(), this.parser.logging.enabled);
                if (material === null) material = new MeshStandardMaterial({ color: 0xFF0000 });
                let mesh;
                if (meshTransport.getGeometryType() === 0) {
                    mesh = new Mesh(meshTransport.getBufferGeometry(), material);
                }
                else if (meshTransport.getGeometryType() === 1) {
                    mesh = new LineSegments(meshTransport.getBufferGeometry(), material);
                }
                else {
                    mesh = new Points(meshTransport.getBufferGeometry(), material);
                }
                this.parser._onMeshAlter(mesh);
                this.parser.baseObject3d.add(mesh);
            }
        }
        else if (cmd === 'execComplete') {
            if (asset.type === 'DataTransportPayload') {
                const dTS = new DatDataTransportPayload()
                DataTransportPayloadUtils.unpackDataTransportPayload(dTS);

                if (this.parser.callbacks.onLoad !== null) {
                    this.parser.callbacks.onLoad(this.parser.baseObject3d, dTS.id);
                }
            }
            else {
                console.error('Received unknown asset.type: ' + asset.type);
            }
        }
        else {
            console.error('Received unknown command: ' + cmd);
        }
    }

}

export { OBJLoader2Parallel };
