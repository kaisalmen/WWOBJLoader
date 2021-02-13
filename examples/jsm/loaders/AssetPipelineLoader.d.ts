export class AssetPipelineLoader {
    static ASSET_PIPELINE_LOADER_VERSION: string;
    constructor(name: any, assetPipeline: any);
    name: any;
    assetPipeline: any;
    baseObject3d: any;
    onComplete: Function | null;
    setBaseObject3d(baseObject3d: any): AssetPipelineLoader;
    setOnComplete(onComplete: Function): void;
    run(): AssetPipelineLoader;
}
export class AssetPipeline {
    name: string | null;
    onComplete: any;
    assetTasks: Map<any, any>;
    addAssetTask(assetTask: AssetTask): AssetPipeline;
    initPipeline(name: string, onComplete: any): AssetPipeline;
    runPipeline(baseObject3d: any): AssetPipeline;
}
export class AssetTask {
    constructor(name: any);
    name: any;
    resourceDescriptor: ResourceDescriptor | undefined;
    assetLoader: {
        ref: null;
        instance: null;
        config: {};
        processFunctionName: string;
    };
    relations: {
        before: null;
        after: null;
    };
    linker: boolean;
    processResult: any;
    getName(): string;
    setProcessFunctionName(processFunctionName: string): AssetTask;
    setResourceDescriptor(resourceDescriptor: ResourceDescriptor): AssetTask;
    getResourceDescriptor(): ResourceDescriptor;
    setTaskBefore(assetTask: any): void;
    setTaskAfter(assetTask: any): void;
    setLinker(linker: any): void;
    isLinker(): boolean;
    getProcessResult(): any;
    setAssetHandler(assetHandler: any, assetHandlerConfig: any): AssetTask;
    init(): void;
    loadResource(): Promise<ResourceDescriptor | undefined>;
    process(): void;
}
import { ResourceDescriptor } from "./pipeline/utils/ResourceDescriptor.js";
