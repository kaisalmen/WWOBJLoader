export class WorkerTaskManager {
    constructor(maxParallelExecutions?: number | undefined);
    taskTypes: Map<string, WorkerTypeDefinition>;
    verbose: boolean;
    maxParallelExecutions: number;
    actualExecutionCount: number;
    storedExecutions: StoredExecution[];
    teardown: boolean;
    setVerbose(verbose: boolean): WorkerTaskManager;
    setMaxParallelExecutions(maxParallelExecutions: number): WorkerTaskManager;
    getMaxParallelExecutions(): number;
    supportsTaskType(taskType: string): boolean;
    registerTaskType(taskType: string, initFunction: Function, executeFunction: Function, comRoutingFunction: Function, fallback: boolean, dependencyDescriptions?: Object[] | undefined): boolean;
    registerTaskTypeModule(taskType: string, workerModuleUrl: string): boolean;
    initTaskType(taskType: string, config: object, transferables?: Transferable[] | undefined): Promise<void>;
    _wait(milliseconds: any): Promise<any>;
    enqueueForExecution(taskType: string, config: object, assetAvailableFunction: Function, transferables?: Transferable[] | undefined): Promise<any>;
    _depleteExecutions(): void;
    dispose(): WorkerTaskManager;
}
declare class WorkerTypeDefinition {
    constructor(taskType: string, maximumCount: number, fallback: boolean, verbose?: boolean | undefined);
    taskType: string;
    fallback: boolean;
    verbose: boolean;
    initialised: boolean;
    functions: {
        init: Function;
        execute: Function;
        comRouting: Function;
        dependencies: {
            descriptions: Object[];
            code: string[];
        };
        workerModuleUrl: URL;
    };
    workers: {
        code: string[];
        instances: TaskWorker[] | MockedTaskWorker[];
        available: TaskWorker[] | MockedTaskWorker[];
    };
    status: {
        initStarted: boolean;
        initComplete: boolean;
    };
    getTaskType(): string;
    setFunctions(initFunction: Function, executeFunction: Function, comRoutingFunction?: Function | undefined): void;
    private _addWorkerCode;
    setDependencyDescriptions(dependencyDescriptions: Object[]): void;
    setWorkerModule(workerModuleUrl: string): void;
    isWorkerModule(): boolean;
    loadDependencies(): string[];
    createWorkers(): Promise<void>;
    createWorkerModules(): Promise<void>;
    initWorkers(config: object, transferables: Transferable[]): Promise<void>;
    getAvailableTask(): TaskWorker | MockedTaskWorker | undefined;
    hasTask(): boolean;
    returnAvailableTask(taskWorker: TaskWorker | MockedTaskWorker): void;
    dispose(): void;
}
declare class StoredExecution {
    constructor(taskType: string, config: object, assetAvailableFunction: Function, resolve: Function, reject: Function, transferables?: Transferable[] | undefined);
    taskType: string;
    config: object;
    assetAvailableFunction: Function;
    resolve: Function;
    reject: Function;
    transferables: Transferable[] | undefined;
}
declare class TaskWorker extends Worker {
    constructor(id: number, aURL: string, options?: object | undefined);
    id: number;
    getId(): number;
}
declare class MockedTaskWorker {
    constructor(id: number, initFunction: Function, executeFunction: Function);
    id: number;
    functions: {
        init: Function;
        execute: Function;
    };
    getId(): number;
    postMessage(message: string, transfer?: Transferable[] | undefined): void;
    terminate(): void;
}
export {};
