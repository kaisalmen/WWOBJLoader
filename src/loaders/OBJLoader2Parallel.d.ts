export class OBJLoader2Parallel extends OBJLoader2 {
    static OBJLOADER2_PARALLEL_VERSION: string;
    static DEFAULT_JSM_WORKER_PATH: string;
    static DEFAULT_JSM_THREEJS_PATH: string;
    executeParallel: boolean;
    preferJsmWorker: boolean;
    urls: {
        jsmWorker: URL;
        threejs: URL;
    };
    workerTaskManager: WorkerTaskManager | null;
    taskName: string;
    setExecuteParallel(executeParallel: boolean): OBJLoader2Parallel;
    setWorkerTaskManager(workerTaskManager: WorkerTaskManager, taskName?: string | undefined): OBJLoader2Parallel;
    setJsmWorker(preferJsmWorker: boolean, jsmWorkerUrl: URL): OBJLoader2Parallel;
    setThreejsLocation(threejsUrl: URL): OBJLoader2Parallel;
    setTerminateWorkerOnLoad(terminateWorkerOnLoad: boolean): OBJLoader2Parallel;
    terminateWorkerOnLoad: boolean | undefined;
    private _buildWorkerCode;
    _executeWorkerParse(content: any): void;
    _onAssetAvailable(asset: any): void;
    _onLoad(dataTransport: any): void;
}
import { OBJLoader2 } from "./OBJLoader2.js";
import { WorkerTaskManager } from "./workerTaskManager/WorkerTaskManager.js";
