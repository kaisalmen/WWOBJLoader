export class OBJLoader2Parallel extends OBJLoader2 {
    static OBJLOADER2_PARALLEL_VERSION: string;
    static DEFAULT_JSM_WORKER_PATH: string;
    constructor(manager: any);
    preferJsmWorker: boolean;
    jsmWorkerUrl: URL;
    executeParallel: boolean;
    taskManager: any;
    taskName: string;
    setExecuteParallel(executeParallel: boolean): OBJLoader2Parallel;
    setTaskManager(taskManager: any, taskName?: any): OBJLoader2Parallel;
    setJsmWorker(preferJsmWorker: boolean, jsmWorkerUrl: URL): OBJLoader2Parallel;
    setTerminateWorkerOnLoad(terminateWorkerOnLoad: boolean): OBJLoader2Parallel;
    terminateWorkerOnLoad: boolean;
    private _buildWorkerCode;
    _executeWorkerParse(content: any): void;
}
import { OBJLoader2 } from "./OBJLoader2.js";
