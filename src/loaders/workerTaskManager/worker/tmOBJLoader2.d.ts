export class OBJ2LoaderWorker {
    static buildStandardWorkerDependencies(threeJsLocation: any): ({
        url: any;
        code?: undefined;
    } | {
        code: string;
        url?: undefined;
    })[];
    static init(context: any, id: any, config: any): void;
    static execute(context: any, id: any, config: any): void;
}
