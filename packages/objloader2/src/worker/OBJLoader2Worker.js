import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskMessage,
    DataPayloadHandler,
    DataPayload
} from 'wtd-core';
import {
    OBJLoader2Parser
} from '../OBJLoader2Parser.js';

class OBJLoader2Worker extends WorkerTaskDirectorDefaultWorker {

    _localData = {
        /** @type {OBJLoader2Parser} */
        parser: new OBJLoader2Parser(),
        buffer: undefined,
        materials: new Map()
    };

    constructor() {
        super();

        this._localData.parser._onAssetAvailable = preparedMesh => {
            const intermediateMessage = new WorkerTaskMessage({
                cmd: 'intermediate',
                id: preparedMesh.materialMetaInfo.objectId,
                progress: preparedMesh.materialMetaInfo.progress
            });

            const dataPayload = new DataPayload();
            dataPayload.params.preparedMesh = preparedMesh;

            if (preparedMesh.vertexFA !== null) {
                dataPayload.buffers.set('vertexFA', preparedMesh.vertexFA);
            }
            if (preparedMesh.normalFA !== null) {
                dataPayload.buffers.set('normalFA', preparedMesh.normalFA);
            }
            if (preparedMesh.uvFA !== null) {
                dataPayload.buffers.set('uvFA', preparedMesh.uvFA);
            }
            if (preparedMesh.colorFA !== null) {
                dataPayload.buffers.set('colorFA', preparedMesh.colorFA);
            }
            if (preparedMesh.indexUA !== null) {
                dataPayload.buffers.set('indexUA', preparedMesh.indexUA);
            }
            intermediateMessage.addPayload(dataPayload);

            const transferables = intermediateMessage.pack(false);
            self.postMessage(intermediateMessage, transferables);
        };

        this._localData.parser._onLoad = () => {
            const execMessage = new WorkerTaskMessage({
                cmd: 'execComplete',
                id: this._localData.parser.objectId
            });
            // no packing required as no Transferables here
            self.postMessage(execMessage);
        };

        this._localData.parser._onProgress = text => {
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
