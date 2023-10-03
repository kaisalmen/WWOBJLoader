import {
    DataPayload,
    WorkerTask,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';

export class OBJLoader2BasicExampleOffscreen {

    async executeExample() {
        const taskName = 'OffscreenCanvasWorker';

        // register the module worker
        const dev = import.meta.env?.DEV === true;
        const url = new URL(dev ? '../worker/BasicExampleOffscreenWorker.ts' : '../worker/generated/BasicExampleOffscreenWorker-es.js', import.meta.url);
        const workerTask = new WorkerTask(taskName, 1, {
            module: true,
            blob: false,
            url
        }, true);

        try {
            const canvas = document.getElementById('example') as HTMLCanvasElement;
            const offscreen = canvas.transferControlToOffscreen();

            const initMessage = new WorkerTaskMessage({ name: taskName });
            const resultInit = await workerTask.initWorker(initMessage);
            console.log(`initTaskType then: ${resultInit}`);

            // once the init Promise returns enqueue the execution
            const execMessage = new WorkerTaskMessage({ name: taskName });
            const dataPayload = new DataPayload();
            dataPayload.params = {
                drawingSurface: offscreen,
                width: canvas.clientWidth,
                height: canvas.clientHeight,
                pixelRatio: window.devicePixelRatio,
                modelUrl: new URL('./models/obj/main/female02/female02_vertex_colors.obj', window.location.href).href
            };
            execMessage.addPayload(dataPayload);
            const resultExec = await workerTask.executeWorker({
                taskTypeName: execMessage.name,
                message: execMessage,
                transferables: [offscreen],
                onComplete: (m: WorkerTaskMessageType) => {
                    console.log('Received final command: ' + m.cmd);
                }
            });
            console.log(`enqueueWorkerExecutionPlan finished: ${resultExec}`);
        } catch (e: unknown) {
            console.error(e);
        }
    }

}
