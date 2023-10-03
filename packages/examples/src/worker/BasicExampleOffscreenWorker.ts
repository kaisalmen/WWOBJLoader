import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';
import { OBJLoader2BasicExample } from '../examples/OBJLoader2BasicExample.js';
import { executeExample } from '../examples/ExampleCommons.js';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorlThreedWorker extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`HelloWorldWorker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);

    }

    execute(message: WorkerTaskMessageType) {
        console.log(`HelloWorldWorker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const dataPayload = message.payloads[0];
        const setupDefaults = {
            useTrackBall: false,
            width: dataPayload.params?.width as number,
            height: dataPayload.params?.height as number,
            pixelRatio: dataPayload.params?.pixelRatio as number
        };
        const objLoader2BasicExample = new OBJLoader2BasicExample(dataPayload.params?.drawingSurface as HTMLElement, setupDefaults,
            dataPayload.params?.modelUrl as string);
        executeExample(objLoader2BasicExample);

        const execComplete = WorkerTaskMessage.createFromExisting(message, 'execComplete');
        const transferables = execComplete.pack(false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new HelloWorlThreedWorker();
self.onmessage = message => worker.comRouting(message);
