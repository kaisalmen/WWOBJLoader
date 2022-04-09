import {
    Object3D,
    Mesh,
    LineSegments,
    Points,
    MeshStandardMaterial
} from 'three';
import {
    WorkerTypeDefinition,
    MaterialUtils,
    DataTransportPayload,
    DataTransportPayloadUtils,
    MeshTransportPayloadUtils,
    MeshTransportPayload,
    MaterialsTransportPayloadUtils,
    MaterialsTransportPayload
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
    static DEFAULT_MODULE_WORKER_PATH = './worker/OBJLoader2Worker.js';
    static DEFAULT_STANDARD_WORKER_PATH = './worker/OBJLoader2WorkerStandard.js';

    /**
     *
     * @param {LoadingManager} [manager]
     */
    constructor(manager) {
        super(manager);
        this.moduleWorker = true;
        /** @type {URL} */
        this.workerUrl = OBJLoader2Parallel.getModuleWorkerDefaultUrl();
        this.taskName = 'OBJLoader2Worker';

        this.updateWorkerStory(1);
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
        return new URL(OBJLoader2Parallel.DEFAULT_MODULE_WORKER_PATH, import.meta.url);
    }

    static getStandardWorkerDefaultUrl() {
        return new URL(OBJLoader2Parallel.DEFAULT_STANDARD_WORKER_PATH, import.meta.url);
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
     * @param {arraybuffer|string} content OBJ data as Uint8Array or String
     */
    updateWorkerStory(objToParse) {
        this.workerStory = new WorkerTypeDefinition(this.taskName, 1, {
            module: this.moduleWorker,
            blob: false,
            url: this.workerUrl
        }, this.parser.logging.debug);

        const mTP = new MaterialsTransportPayload('execute', Math.floor(Math.random() * Math.floor(65536)));
        mTP.params.modelName = this.parser.modelName;
        mTP.params.useIndices = this.parser.useIndices;
        mTP.params.disregardNormals = this.parser.disregardNormals;
        mTP.params.materialPerSmoothingGroup = this.parser.materialPerSmoothingGroup;
        mTP.params.useOAsMesh = this.parser.useOAsMesh;
        mTP.materials = this.materialStore.getMaterials();
        mTP.buffers.set('modelData', objToParse);

        return mTP;
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
    parse(objToParse) {
        if (this.parser.logging.enabled) {
            console.info('Using OBJLoader2Parallel version: ' + OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION);
        }
        this._initWorkerParse(objToParse);
        let dummy = new Object3D();
        dummy.name = 'OBJLoader2ParallelDummy';
        return dummy;
    }

    async _initWorkerParse(objToParse) {
        const mTP = this.updateWorkerStory(objToParse);

        await this._initWorker()
            .then(() => {
                if (this.parser.logging.debug) {
                    console.log('OBJLoader2Parallel init was performed');
                }
                this._executeWorker(mTP)

            }).catch(e => console.error(e));
    }

    /**
     * Provide instructions on what is to be contained in the worker.
     *
     * @return {Promise<void>}
     * @private
     */
    _initWorker() {
        const dTP = new DataTransportPayload();
        dTP.params.logging = {
            enabled: this.parser.logging.enabled,
            debug: this.parser.logging.debug
        };
        return this.workerStory.initWorker(dTP);
    }

    async _executeWorker(mTP) {
        const packed = MaterialsTransportPayloadUtils.packMaterialsTransportPayload(mTP, false);

        await this.workerStory.executeWorker({
            payload: mTP,
            taskTypeName: this.taskName,
            onIntermediate: (receivedPayload) => {
                this._onLoad(receivedPayload);
            },
            onComplete: (receivedPayload) => {
                this._onLoad(receivedPayload);
                if (this.terminateWorkerOnLoad) {
                    this.workerStory.dispose();
                }
            },
            transferables: packed.transferables
        })
            .then(() => {
                console.log('Worker execution completed successfully.');
            })
            .catch(e => console.error(e));
    }

    /**
     *
     * @param {Mesh} mesh
     * @param {object} materialMetaInfo
     */
    _onLoad(asset) {
        const cmd = asset.cmd;
        if (cmd === 'intermediate') {
            if (asset.type === 'MeshTransportPayload') {
                const mTS = MeshTransportPayloadUtils.unpackMeshTransportPayload(asset, false);
                const materialsTransport = mTS.materialsTransportPayload;
                let material = MaterialsTransportPayloadUtils.processMaterialTransport(mTS.materialsTransportPayload,
                    this.materialStore.getMaterials(), this.parser.logging.enabled);
                if (!material) {
                    console.warn('Material not found!');
                    material = new MeshStandardMaterial({ color: 0xFF0000 });
                }
                let mesh;
                if (mTS.geometryType === 0) {
                    mesh = new Mesh(mTS.bufferGeometry, material);
                }
                else if (mTS.geometryType === 1) {
                    mesh = new LineSegments(mTS.bufferGeometry, material);
                }
                else {
                    mesh = new Points(mTS.bufferGeometry, material);
                }
                this.parser._onMeshAlter(mesh);
                this.parser.baseObject3d.add(mesh);
            }
            else {
                console.error('Received unknown asset.type: ' + asset.type);
            }
        }
        else if (cmd === 'execComplete') {
            if (asset.type === 'DataTransportPayload') {
                const dTS = new DataTransportPayload()
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