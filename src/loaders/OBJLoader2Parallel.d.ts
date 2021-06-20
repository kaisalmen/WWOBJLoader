export class OBJLoader2Parallel extends OBJLoader2 {
    static OBJLOADER2_PARALLEL_VERSION: string;
    static DEFAULT_JSM_WORKER_PATH: string;
    static DEFAULT_JSM_THREEJS_PATH: string;
    preferJsmWorker: boolean;
    urls: {
        jsmWorker: URL;
        threejs: URL;
    };
    workerTaskManager: any;
    taskName: string;
    setWorkerTaskManager(workerTaskManager: any, taskName?: string | undefined): OBJLoader2Parallel;
    setJsmWorker(preferJsmWorker: boolean, jsmWorkerUrl: URL): OBJLoader2Parallel;
    setThreejsLocation(threejsUrl: URL): OBJLoader2Parallel;
    setTerminateWorkerOnLoad(terminateWorkerOnLoad: boolean): OBJLoader2Parallel;
    terminateWorkerOnLoad: boolean | undefined;
    private _buildWorkerCode;
    _executeWorkerParse(content: any): void;
    _onLoad(asset: any): void;
}
import { OBJLoader2 } from "./OBJLoader2.js";
