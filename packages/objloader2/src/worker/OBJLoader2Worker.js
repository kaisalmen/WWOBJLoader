import {
    WorkerTaskManagerDefaultWorker,
    MaterialsTransportPayloadUtils,
    MeshTransportPayload,
    MeshTransportPayloadUtils,
    DataTransportPayload,
    DataTransportPayloadUtils,
    ObjectManipulator,
    MaterialsTransportPayload
} from 'three-wtm';
import { OBJLoader2Parser } from '../OBJLoader2';

class OBJLoader2Worker extends WorkerTaskManagerDefaultWorker {

    _localData = {
        /** @type {OBJLoader2Parser} */
        parser: new OBJLoader2Parser(),
        buffer: undefined
    };

    constructor() {
        super();

        this._localData.parser._onMeshAlter = (mesh, materialMetaInfo) => {
            const materialTP = new MaterialsTransportPayload();
            materialTP.multiMaterialNames = materialMetaInfo.multiMaterialNames;

            // only makes sense if materials are newly created, what they currently are not
            /*
                        if (materialTP.multiMaterialNames.size > 0) {
                            const material = mesh.material;
                            MaterialUtils.addMaterial(materialTP.materials, material.name, material, false, false);
                        }
                        materialTP.cloneInstructions = materialMetaInfo.cloneInstructions;
                        MaterialsTransportPayloadUtils.cleanMaterials();
            */
            const meshTP = new MeshTransportPayload('assetAvailable', materialMetaInfo.objectId);
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
            dataTransport.postMessage(dTP);
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
    }

    _processPayload(payload) {
        if (payload.type === 'MaterialsTransportPayload') {
            const materialsTransportPayload = Object.assign(new MaterialsTransportPayload(), payload);
            MaterialsTransportPayloadUtils.unpackMaterialsTransportPayload(materialsTransportPayload, payload);
            this._localData.parser.materials = materialsTransportPayload.materials;
        }
        ObjectManipulator.applyProperties(this._localData.parser, payload.params, false);
        this._localData.buffer = payload.buffers?.get('modelData');
    }

}

const worker = new OBJLoader2Worker();
self.onmessage = message => worker.comRouting(message);
