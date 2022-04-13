import {
    WorkerTaskManagerDefaultWorker,
    MaterialsTransportPayloadUtils,
    MeshTransportPayload,
    MeshTransportPayloadUtils,
    DataTransportPayload,
    ObjectManipulator,
    MaterialsTransportPayload,
    MaterialUtils
} from 'three-wtm';
import { OBJLoader2Parser } from 'wwobjloader2';

class OBJLoader2Worker extends WorkerTaskManagerDefaultWorker {

    _localData = {
        /** @type {OBJLoader2Parser} */
        parser: new OBJLoader2Parser(),
        buffer: undefined,
        materials: new Map()
    };

    constructor() {
        super();

        this._localData.parser._onMeshAlter = (mesh, materialMetaInfo) => {
            const materialTP = new MaterialsTransportPayload('intermediate', materialMetaInfo.objectId);
            materialTP.multiMaterialNames = materialMetaInfo.multiMaterialNames;

            // add matrial of the mesh required for proper re-construction
            MaterialUtils.addMaterial(materialTP.materials, mesh.material.name, mesh.material, false, false);
            materialTP.cloneInstructions = materialMetaInfo.cloneInstructions;
            MaterialsTransportPayloadUtils.cleanMaterials(materialTP);

            const meshTP = new MeshTransportPayload('intermediate', materialMetaInfo.objectId);
            meshTP.progress = materialMetaInfo.progress;
            meshTP.params.modelName = materialMetaInfo.modelName;
            MeshTransportPayloadUtils.setMesh(meshTP, mesh, materialMetaInfo.geometryType);
            meshTP.materialsTransportPayload = materialTP;

            const packed = MeshTransportPayloadUtils.packMeshTransportPayload(meshTP, false);
            self.postMessage(packed.payload, packed.transferables);
        };

        this._localData.parser.callbacks.onLoad = () => {
            const dTP = new DataTransportPayload('execComplete', this._localData.parser.objectId);
            // no packing required as no Transferables here
            self.postMessage(dTP);
        };

        this._localData.parser.callbacks.onProgress = text => {
            if (this._localData.parser.logging.debug) {
                console.debug('WorkerRunner: progress: ' + text);
            }
        };
    }

    init(payload) {
        console.log(`OBJLoader2Worker#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);

        this._processPayload(payload);

        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload) {
        if (this._localData.parser.usedBefore) {
            this._localData.parser._init();
        }

        this._processPayload(payload);

        if (this._localData.buffer) {
            this._localData.parser.objectId = payload.id;
            this._localData.parser._execute(this._localData.buffer);
        }
        else {
            self.postMessage(new Error('No ArrayBuffer was provided for parsing.'));
        }
    }

    _processPayload(payload) {
        if (payload.type === 'MaterialsTransportPayload') {
            const materialsTransportPayload = Object.assign(new MaterialsTransportPayload(), payload);
            MaterialsTransportPayloadUtils.unpackMaterialsTransportPayload(materialsTransportPayload, payload);
            this._localData.materials = materialsTransportPayload.materials;
        }
        ObjectManipulator.applyProperties(this._localData.parser, payload.params, false);
        const modelData = payload.buffers?.get('modelData');
        if (modelData) {
            this._localData.buffer = modelData;
        }
        // buffer material if parser is re-used
        this._localData.parser.materials = this._localData.materials;
    }

}

const worker = new OBJLoader2Worker();
self.onmessage = message => worker.comRouting(message);
