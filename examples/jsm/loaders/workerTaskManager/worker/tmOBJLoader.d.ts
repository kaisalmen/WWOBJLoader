export namespace OBJLoaderWorker {
    function buildStandardWorkerDependencies(threeJsLocation: any, objLoaderLocation: any): ({
        url: any;
        code?: undefined;
    } | {
        code: string;
        url?: undefined;
    })[];
    function init(context: any, id: any, config: any): void;
    function execute(context: any, id: any, config: any): void;
}
