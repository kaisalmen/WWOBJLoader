export namespace OBJ2LoaderWorker {
    function buildStandardWorkerDependencies(threeJsLocation: any): ({
        url: any;
        code?: undefined;
    } | {
        code: string;
        url?: undefined;
    })[];
    function init(context: any, id: any, config: any): void;
    function execute(context: any, id: any, config: any): void;
}
