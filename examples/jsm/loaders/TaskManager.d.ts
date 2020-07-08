export class TaskManager {
    constructor(maxParallelExecutions?: number);
    taskTypes: Map<string, WorkerTypeDefinition>;
    verbose: boolean;
    maxParallelExecutions: number;
    actualExecutionCount: number;
    storedExecutions: StoredExecution[];
    setVerbose(verbose: boolean): TaskManager;
    setMaxParallelExecutions(maxParallelExecutions: number): TaskManager;
    getMaxParallelExecutions(): number;
    supportsTaskType(taskType: string): boolean;
    registerTaskType(taskType: string, initFunction: Function, executeFunction: Function, comRoutingFunction: Function, fallback: boolean, dependencyUrls?: string[]): TaskManager;
    registerTaskTypeModule(taskType: string, workerModuleUrl: string): TaskManager;
    initTaskType(taskType: string, config: object, transferables?: Transferable[]): Promise<void | TaskWorker[]>;
    enqueueForExecution(taskType: string, config: object, transferables?: Transferable[]): Promise<any>;
    _kickExecutions(): void;
    dispose(): TaskManager;
}
declare class WorkerTypeDefinition {
    constructor(taskType: string, maximumCount: number, fallback: boolean, verbose?: boolean);
    taskType: string;
    fallback: boolean;
    verbose: boolean;
    functions: {
        init: {
            ref: Function;
            code: string;
        };
        execute: {
            ref: Function;
            code: string;
        };
        comRouting: {
            ref: Function;
            code: string;
        };
        dependencies: {
            urls: URL[];
            code: string[];
        };
        workerModuleUrl: URL;
    };
    workers: {
        code: string[];
        instances: TaskWorker[] | MockedTaskWorker[];
        available: TaskWorker[] | MockedTaskWorker[];
    };
    getTaskType(): string;
    setFunctions(initFunction: Function, executeFunction: Function, comRoutingFunction?: Function): void;
    setDependencyUrls(dependencyUrls: string[]): void;
    setWorkerModule(workerModuleUrl: string): void;
    isWorkerModule(): boolean;
    loadDependencies(): Promise<ArrayBuffer[]>;
    generateWorkerCode(dependencies: ArrayBuffer[]): Promise<string[]>;
    createWorkers(code: string): Promise<TaskWorker[]>;
    createWorkerModules(): Promise<TaskWorker[]>;
    initWorkers(instances: TaskWorker[] | MockedTaskWorker[], config: object, transferables: Transferable[]): Promise<TaskWorker[]>;
    getAvailableTask(): TaskWorker | MockedTaskWorker | undefined;
    hasTask(): boolean;
    returnAvailableTask(taskWorker: TaskWorker | MockedTaskWorker): void;
    dispose(): void;
}
declare class StoredExecution {
    constructor(taskType: string, config: object, resolve: Function, reject: Function, transferables?: Transferable[]);
    taskType: string;
    config: any;
    resolve: Function;
    reject: Function;
    transferables: Transferable[];
}
declare class TaskWorker extends Worker {
    constructor(id: number, aURL: string, options?: object);
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
    postMessage(message: string, transfer?: Transferable[]): void;
}
export {};
