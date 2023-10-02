import { FileLoader, Loader, Object3D } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { AssociatedArrayType, DataPayloadHandler } from 'wtd-core';
import { ResourceDescriptor } from './utils/ResourceDescriptor.js';

export type CallbackCompleteType = ((description: string, extra?: Object3D) => void) | null;

export type ParserType = AssociatedArrayType<unknown> & {
    parse: (data: ArrayBufferLike | string) => Object3D;
}

export type LinkType = {
    link: (data: AssociatedArrayType<unknown>, nextTask: AssociatedArrayType<unknown>) => Object3D | undefined;
}

class AssetPipelineLoader {

    private name: string;
    private assetPipeline: AssetPipeline;
    private baseObject3d: Object3D | undefined;
    private onComplete: CallbackCompleteType = null;

    constructor(name: string, assetPipeline: AssetPipeline) {
        this.name = name;
        this.assetPipeline = assetPipeline;
    }

    getName() {
        return this.name;
    }

    setBaseObject3d(baseObject3d: Object3D) {
        this.baseObject3d = baseObject3d;
        return this;
    }

    setOnComplete(onComplete: CallbackCompleteType) {
        this.onComplete = onComplete;
    }

    run() {
        this.assetPipeline.initPipeline(this.name, this.onComplete);
        if (this.baseObject3d) {
            this.assetPipeline.runPipeline(this.baseObject3d);
        } else {
            throw new Error('baseObject3d was not properly specified.');
        }

        return this;
    }

}

/**
 * The AssetPipeline defines a set of {@link AssetTask} that need to be executed one after the other and return a {@link Object3D}.
 * @constructor
 */
class AssetPipeline {

    private name: string | null = null;
    private onComplete: CallbackCompleteType = null;
    private assetTasks = new Map<string, AssetTask>();

    addAssetTask(assetTask: AssetTask) {
        this.assetTasks.set(assetTask.getName(), assetTask);
        return this;
    }

    /**
     * Init all {@link AssetTask}
     *
     * @param {string} name Name of the pipeline
     * @param {CallbackCompleteType} onComplete set callback function
     * @return {AssetPipeline}
     */
    initPipeline(name: string, onComplete: CallbackCompleteType) {
        this.name = name;
        this.onComplete = onComplete;
        let assetTaskBefore: AssetTask | null = null;
        for (const assetTask of this.assetTasks.values()) {
            if (assetTaskBefore !== null) {
                assetTask.setTaskBefore(assetTaskBefore);
                assetTaskBefore.setTaskAfter(assetTask);
            }
            assetTaskBefore = assetTask;
            assetTask.init();
        }
        return this;
    }

    /**
     * Run the pipeline: First load resources and then execute the parsing functions
     * @param {Object3D} baseObject3d
     * @return {AssetPipeline}
     */
    runPipeline(baseObject3d: Object3D) {
        const onComplete = this.onComplete ? this.onComplete : (x: string) => {
            console.log('Done loading: ' + x);
        };

        const loadResources = async (assetTasks: Map<string, AssetTask>) => {
            const loadPromises: Array<Promise<ResourceDescriptor>> = [];
            for (const assetTask of assetTasks.values()) {
                if (assetTask.getResourceDescriptor()) {
                    const promise = assetTask.loadResource();
                    loadPromises.push(promise);
                }
            }
            console.log('Waiting for completion of loading of all assets!');
            return await Promise.all(loadPromises);
        };

        loadResources(this.assetTasks)
            .then(x => processAssets(x))
            .then(x => onComplete(this.name!, x))
            .catch(x => console.error(x));

        const processAssets = (loadResults: ResourceDescriptor[]) => {
            console.log('Count of loaded resources: ' + loadResults.length);
            let assetTask;
            for (assetTask of this.assetTasks.values()) {
                // TODO: process must be async, so we can process worker based workloads
                assetTask.process();
            }
            // last assetTask
            if (assetTask && assetTask.getProcessResult()) {
                baseObject3d.add(assetTask.getProcessResult()!);
            }

            return baseObject3d;
        };

        return this;
    }

}

class AssetTask {

    private name: string;
    private resourceDescriptor: ResourceDescriptor | undefined;
    private assetLoader = {
        loader: {
            instance: undefined as ParserType | undefined,
            config: {} as AssociatedArrayType<unknown>
        },
        linker: undefined as LinkType | undefined
    };
    private relations = {
        before: undefined as AssetTask | undefined,
        after: undefined as AssetTask | undefined,
    };
    private processResult: Object3D | undefined = undefined;

    constructor(name: string) {
        this.name = name;
    }

    getName() {
        return this.name;
    }

    setResourceDescriptor(resourceDescriptor: ResourceDescriptor) {
        this.resourceDescriptor = resourceDescriptor;
        return this;
    }

    getResourceDescriptor() {
        return this.resourceDescriptor;
    }

    setTaskBefore(assetTask: AssetTask) {
        this.relations.before = assetTask;
    }

    setTaskAfter(assetTask: AssetTask) {
        this.relations.after = assetTask;
    }

    getProcessResult() {
        return this.processResult;
    }

    setLinker(linker: LinkType) {
        this.assetLoader.linker = linker;
    }

    setLoader(loader: Loader<Object3D, string> | Loader<MTLLoader.MaterialCreator>, loaderConfig?: AssociatedArrayType<string | object | boolean>) {
        const parser = loader as unknown as ParserType;
        if (typeof parser.parse === 'function') {
            this.assetLoader.loader.instance = parser;
        } else {
            throw new Error('Provide loader has now parse method! Aborting...');
        }
        this.assetLoader.loader.config = loaderConfig ?? {};
        return this;
    }

    init() {
        console.log(this.name + ': Performing init');
        DataPayloadHandler.applyProperties(this.assetLoader.loader.instance, this.assetLoader.loader.config, false);
    }

    async loadResource() {
        const fileLoader = new FileLoader();
        fileLoader.setResponseType('arraybuffer');
        if (this.resourceDescriptor) {
            const buffer = await fileLoader.loadAsync(this.resourceDescriptor.getUrl().href) as ArrayBufferLike;
            this.resourceDescriptor.setBuffer(buffer);
            return Promise.resolve(this.resourceDescriptor);
        } else {
            return Promise.reject();
        }
    }

    process() {
        if (this.assetLoader.linker) {
            const resultBefore = this.relations.before?.processResult;
            const nextTask = this.relations.after?.assetLoader.loader.instance;
            if (resultBefore) {
                this.processResult = this.assetLoader.linker.link(resultBefore as unknown as AssociatedArrayType<unknown>, nextTask!);
            }
        } else if (this.assetLoader.loader.instance) {
            if (this.resourceDescriptor?.isNeedStringOutput()) {
                const dataAsString = this.resourceDescriptor.getBufferAsString();
                this.processResult = this.assetLoader.loader.instance.parse(dataAsString);
            } else {
                const dataAsBuffer = this.resourceDescriptor?.getBuffer() as ArrayBufferLike;
                this.processResult = this.assetLoader.loader.instance.parse(dataAsBuffer);
            }
        }
    }
}

export {
    AssetPipelineLoader,
    AssetPipeline,
    AssetTask
};
