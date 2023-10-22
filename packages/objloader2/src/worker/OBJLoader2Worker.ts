import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessage,
    DataPayload,
    WorkerTaskMessageType,
    AssociatedArrayType,
    pack,
    createFromExisting,
    applyProperties,
    unpack
} from 'wtd-core';
import {
    OBJLoader2Parser
} from '../OBJLoader2Parser.js';

type LocalData = {
    debugLogging: boolean;
    params: AssociatedArrayType<unknown | string | object>;
    buffer?: ArrayBufferLike;
    materialNames: Set<string>;
}

class OBJLoader2Worker extends WorkerTaskDefaultWorker {

    private localData: LocalData = {
        params: {},
        debugLogging: false,
        materialNames: new Set<string>()
    };

    initParser(id: number) {
        const parser = new OBJLoader2Parser();
        parser._onAssetAvailable = preparedMesh => {
            const intermediateMessage = new WorkerTaskMessage({
                id,
                progress: preparedMesh.progress
            });

            const dataPayload = new DataPayload();
            if (!dataPayload.message.params) {
                dataPayload.message.params = {};
            }
            dataPayload.message.params.preparedMesh = preparedMesh;
            if (preparedMesh.vertexFA !== null) {
                dataPayload.message.buffers?.set('vertexFA', preparedMesh.vertexFA);
            }
            if (preparedMesh.normalFA !== null) {
                dataPayload.message.buffers?.set('normalFA', preparedMesh.normalFA);
            }
            if (preparedMesh.uvFA !== null) {
                dataPayload.message.buffers?.set('uvFA', preparedMesh.uvFA);
            }
            if (preparedMesh.colorFA !== null) {
                dataPayload.message.buffers?.set('colorFA', preparedMesh.colorFA);
            }
            if (preparedMesh.indexUA !== null) {
                dataPayload.message.buffers?.set('indexUA', preparedMesh.indexUA);
            }
            intermediateMessage.cmd = 'intermediate';
            intermediateMessage.addPayload(dataPayload);

            const transferables = pack(intermediateMessage.payloads, false);
            self.postMessage(intermediateMessage, transferables);
        };

        parser._onLoad = () => {
            const execMessage = new WorkerTaskMessage({ id });
            execMessage.cmd = 'execComplete';
            // no packing required as no Transferables here
            self.postMessage(execMessage);
        };

        parser._onProgress = text => {
            if (parser?.isDebugLoggingEnabled()) {
                console.debug('WorkerRunner: progress: ' + text);
            }
        };

        return parser;
    }

    init(message: WorkerTaskMessageType) {
        const wtm = this.processMessage(message);

        if (this.localData.debugLogging) {
            console.log(`OBJLoader2Worker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        }

        const initComplete = createFromExisting(wtm, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        this.processMessage(message);

        const parser = this.initParser(message.id ?? 0);

        // apply previously stored parameters (init or execute)
        applyProperties(parser, this.localData.params, false);
        if (this.localData.materialNames) {
            parser?.setMaterialNames(this.localData.materialNames);
        }

        if (parser.isDebugLoggingEnabled()) {
            console.log(`OBJLoader2Worker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        }

        if (this.localData.buffer) {
            parser.execute(this.localData.buffer);
        }
        else {
            self.postMessage(new Error('No ArrayBuffer was provided for parsing.'));
        }
    }

    private processMessage(message: WorkerTaskMessageType) {
        const wtm = unpack(message, false);
        const dataPayload = wtm.payloads[0] as DataPayload;

        applyProperties(this.localData.params, dataPayload.message.params, true);
        const modelData = dataPayload.message.buffers?.get('modelData');
        if (modelData) {
            this.localData.buffer = modelData;
        }

        if (dataPayload.message.params) {
            if (dataPayload.message.params.materialNames) {
                this.localData.materialNames = dataPayload.message.params.materialNames as Set<string>;
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logging = this.localData.params?.logging as any ?? {};
        if (Object.hasOwn(logging, 'enabled') && Object.hasOwn(logging, 'debug')) {
            this.localData.debugLogging = logging.enabled === true && logging.debug === true;
        }
        return wtm;
    }
}

const worker = new OBJLoader2Worker();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.onmessage = (message: MessageEvent<any>) => {
    worker.comRouting(message);
};
