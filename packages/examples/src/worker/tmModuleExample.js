import {
    TorusKnotBufferGeometry,
    Color,
    MeshPhongMaterial
} from "three";
import {
    MaterialUtils,
    MeshTransportPayload,
    MaterialsTransportPayload,
    MaterialsTransportPayloadUtils,
    MeshTransportPayloadUtils,
    WorkerTaskManagerDefaultWorker
} from "three-wtm";

class WTMModuleExample extends WorkerTaskManagerDefaultWorker {

    init(payload) {
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload) {
        let bufferGeometry = new TorusKnotBufferGeometry(20, 3, 100, 64);
        bufferGeometry.name = 'tmProto' + payload.id;

        let vertexBA = bufferGeometry.getAttribute('position');
        let vertexArray = vertexBA.array;
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] + 10 * (Math.random() - 0.5);
        }

        const randArray = new Uint8Array(3);
        self.crypto.getRandomValues(randArray);
        const color = new Color();
        color.r = randArray[0] / 255;
        color.g = randArray[1] / 255;
        color.b = randArray[2] / 255;
        const material = new MeshPhongMaterial({ color: color });

        const materialTP = new MaterialsTransportPayload('execComplete', payload.id);
        MaterialUtils.addMaterial(materialTP.materials, 'randomColor' + payload.id, material, false, false);
        MaterialsTransportPayloadUtils.cleanMaterials(materialTP);

        const meshTP = new MeshTransportPayload('execComplete', payload.id);
        MeshTransportPayloadUtils.setBufferGeometry(meshTP, bufferGeometry, 2);
        meshTP.materialsTransportPayload = materialTP;

        const packed = MeshTransportPayloadUtils.packMeshTransportPayload(meshTP, false);
        self.postMessage(packed.payload, packed.transferables);
    }
}

const worker = new WTMModuleExample();
self.onmessage = message => worker.comRouting(message);
