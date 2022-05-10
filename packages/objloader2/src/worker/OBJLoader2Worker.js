import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskMessage,
    DataPayloadHandler
} from 'wtd-core';
import {
    MaterialsPayload,
    MaterialUtils,
    MeshPayload
} from 'wtd-three-ext';
import { OBJLoader2Parser } from 'wwobjloader2';

class OBJLoader2Worker extends WorkerTaskDirectorDefaultWorker {

    _localData = {
        /** @type {OBJLoader2Parser} */
        parser: new OBJLoader2Parser(),
        buffer: undefined,
        materials: new Map()
    };

    constructor() {
        super();

        this._localData.parser._onMeshAlter = (mesh, materialMetaInfo) => {
            const intermediateMessage = new WorkerTaskMessage({
                cmd: 'intermediate',
                id: materialMetaInfo.objectId,
                progress: materialMetaInfo.progress
            });

            const meshPayload = new MeshPayload();
            meshPayload.params.modelName = materialMetaInfo.modelName;
            meshPayload.setMesh(mesh, materialMetaInfo.geometryType);

            const materialsPayload = new MaterialsPayload();
            materialsPayload.multiMaterialNames = materialMetaInfo.multiMaterialNames;

            // add matrial of the mesh required for proper re-construction
            MaterialUtils.addMaterial(materialsPayload.materials, mesh.material.name, mesh.material, false, false);
            materialsPayload.cloneInstructions = materialMetaInfo.cloneInstructions;
            materialsPayload.cleanMaterials();

            intermediateMessage.addPayload(meshPayload);
            intermediateMessage.addPayload(materialsPayload);

            const transferables = intermediateMessage.pack(false);
            self.postMessage(intermediateMessage, transferables);
        };

        this._localData.parser.callbacks.onLoad = () => {
            const execMessage = new WorkerTaskMessage({
                cmd: 'execComplete',
                id: this._localData.parser.objectId
            });
            // no packing required as no Transferables here
            self.postMessage(execMessage);
        };

        this._localData.parser.callbacks.onProgress = text => {
            if (this._localData.parser.logging.debug) {
                console.debug('WorkerRunner: progress: ' + text);
            }
        };
    }

    init(message) {
        const wtm = this._processMessage(message);

        if (this._localData.parser.logging.debug) {
            console.log(`OBJLoader2Worker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        }

        const initComplete = WorkerTaskMessage.createFromExisting(wtm, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message) {
        if (this._localData.parser.usedBefore) {
            this._localData.parser._init();
        }
        this._processMessage(message);

        if (this._localData.parser.logging.debug) {
            console.log(`OBJLoader2Worker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        }

        if (this._localData.buffer) {
            this._localData.parser.objectId = message.id;
            this._localData.parser._execute(this._localData.buffer);
        }
        else {
            self.postMessage(new Error('No ArrayBuffer was provided for parsing.'));
        }
    }

    _processMessage(message) {
        const wtm = WorkerTaskMessage.unpack(message, false);

        const dataPayload = wtm.payloads[0];
        if (wtm.payloads.length === 2) {
            const materialsPayload = wtm.payloads[1];
            this._localData.materials = materialsPayload.materials;
        }

        DataPayloadHandler.applyProperties(this._localData.parser, dataPayload.params, false);
        const modelData = dataPayload.buffers?.get('modelData');
        if (modelData) {
            this._localData.buffer = modelData;
        }
        // buffer material if parser is re-used
        this._localData.parser.materials = this._localData.materials;

        return wtm;
    }

}

const worker = new OBJLoader2Worker();
self.onmessage = message => worker.comRouting(message);
