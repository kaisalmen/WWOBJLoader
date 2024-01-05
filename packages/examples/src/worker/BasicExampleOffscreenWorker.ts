import {
    comRouting,
    DataPayload,
    getOffscreenCanvas,
    OffscreenPayload,
    OffscreenWorker,
    OffscreenWorkerCommandResponse,
    WorkerTaskMessage,
    WorkerTaskWorker
} from 'wtd-core';
import { OBJLoader2BasicExample } from '../examples/OBJLoader2BasicExample.js';
import { executeExample, resizeDisplayGL, setCanvasDimensions } from '../examples/ExampleCommons.js';
import { ElementProxyReceiver, proxyStart } from 'wtd-three-ext';

export class HelloWorlThreeWorker implements WorkerTaskWorker, OffscreenWorker {

    private objLoader2BasicExample?: OBJLoader2BasicExample;
    private offScreenCanvas?: OffscreenCanvas;
    private eventProxy?: ElementProxyReceiver;

    proxyStart(message: WorkerTaskMessage) {
        console.log(`Received start command: ${message.cmd}`);
        this.eventProxy = new ElementProxyReceiver();
        proxyStart(this.eventProxy);

        const proxyStartComplete = WorkerTaskMessage.createFromExisting(message, {
            overrideCmd: OffscreenWorkerCommandResponse.PROXY_START_COMPLETE
        });
        self.postMessage(proxyStartComplete);
    }

    proxyEvent(message: WorkerTaskMessage) {
        const payload = message.payloads?.[0];
        const offscreenPayload = (payload as OffscreenPayload);
        const event = offscreenPayload.message.event;
        if (event) {
            this.eventProxy?.handleEvent(event);
        }
    }

    resize(message: WorkerTaskMessage) {
        const offscreenPayload = message.payloads?.[0] as OffscreenPayload;

        if (this.objLoader2BasicExample) {
            this.objLoader2BasicExample.getSetup().canvasDimensions = setCanvasDimensions(offscreenPayload);
            resizeDisplayGL(this.objLoader2BasicExample.getSetup());
        }
    }

    initOffscreenCanvas(message: WorkerTaskMessage): void {
        const offscreenPayload = message.payloads?.[0] as OffscreenPayload;
        this.offScreenCanvas = getOffscreenCanvas(offscreenPayload);

        this.eventProxy!.merge(this.offScreenCanvas!);

        const canvasDimensions = setCanvasDimensions(offscreenPayload);
        this.objLoader2BasicExample = new OBJLoader2BasicExample(this.eventProxy! as unknown as HTMLCanvasElement,
            canvasDimensions, true);

        const initOffscreenCanvasComplete = WorkerTaskMessage.createFromExisting(message, {
            overrideCmd: OffscreenWorkerCommandResponse.INIT_OFFSCREEN_CANVAS_COMPLETE
        });
        self.postMessage(initOffscreenCanvasComplete);
    }

    execute(message: WorkerTaskMessage) {
        console.log(`HelloWorldWorker#execute: name: ${message.name} id: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const dataPayload = message.payloads[0] as DataPayload;
        this.objLoader2BasicExample!.setUrls(dataPayload.message.params?.modelUrl as string);

        executeExample(this.objLoader2BasicExample!);
    }

}

const worker = new HelloWorlThreeWorker();
self.onmessage = message => comRouting(worker, message);
