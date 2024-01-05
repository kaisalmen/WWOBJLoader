import {
    RawPayload,
    WorkerTask,
    WorkerTaskMessage,
    buildDefaultEventHandlingInstructions,
    initOffscreenCanvas,
    registerCanvas,
    registerResizeHandler
} from 'wtd-core';

export class OBJLoader2BasicExampleOffscreen {

    async executeExample() {
        const taskName = 'OffscreenCanvasWorker';

        // register the module worker
        const dev = import.meta.env?.DEV === true;
        const url = new URL(dev ? '../worker/BasicExampleOffscreenWorker.ts' : '../worker/generated/BasicExampleOffscreenWorker-es.js', import.meta.url);
        const worker = new Worker(url.href, {
            type: 'module'
        });
        const workerTask = new WorkerTask({
            taskName,
            workerId: 1,
            workerConfig: {
                $type: 'WorkerConfigDirect',
                worker
            },
            verbose: true
        });

        try {
            const canvas = document.getElementById('example') as HTMLCanvasElement;

            // only create worker, but do not init
            workerTask.connectWorker();

            // delegate events from main to offscreen
            const handlingInstructions = buildDefaultEventHandlingInstructions();
            await registerCanvas(workerTask, canvas, handlingInstructions);
            registerResizeHandler(workerTask, canvas);

            // provide the canvas to the worker
            await initOffscreenCanvas(workerTask, canvas);

            // once the init Promise returns enqueue the execution
            const rawPayload = new RawPayload();
            rawPayload.message.raw = {
                modelUrl: new URL('./models/obj/main/female02/female02_vertex_colors.obj', window.location.href).href
            };
            await workerTask.executeWorker({
                message: WorkerTaskMessage.fromPayload(rawPayload),
            });
            console.log('enqueueWorkerExecutionPlan finished successfully.');
        } catch (e: unknown) {
            console.error(e);
        }
    }

}
