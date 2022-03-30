import {
    DataTransportPayload,
    MeshTransportPayload,
    MeshTransportPayloadUtils,
    WorkerTaskManagerDefaultWorker
} from "three-wtm";

class WTMModuleExampleNoThree extends WorkerTaskManagerDefaultWorker {

    constructor() {
        super();
        this._context = {
            initPayload: undefined
        }
    }

    init(payload) {
        this._context.initPayload = payload;
        const initAnswer = new DataTransportPayload('initComplete', payload.id, payload.name);
        self.postMessage(initAnswer);
    }

    execute(payload) {
        const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(this._context.initPayload, true);
        const geometry = mtp.bufferGeometry;

        geometry.name = 'tmProto' + payload.id;

        let vertexArray = geometry.getAttribute('position').array;
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] + 10 * (Math.random() - 0.5);
        }

        const sender = new MeshTransportPayload('execComplete', payload.id);
        MeshTransportPayloadUtils.setBufferGeometry(sender, geometry, 2);

        let randArray = new Uint8Array(3);
        self.crypto.getRandomValues(randArray);
        sender.params.color = {
            r: randArray[0] / 255,
            g: randArray[1] / 255,
            b: randArray[2] / 255
        };
        const packed = MeshTransportPayloadUtils.packMeshTransportPayload(sender, false);
        self.postMessage(packed.payload, packed.transferables);
    }
}

const worker = new WTMModuleExampleNoThree();
self.onmessage = message => worker.comRouting(message);
