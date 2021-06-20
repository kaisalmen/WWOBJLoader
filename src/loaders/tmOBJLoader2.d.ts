export class OBJ2LoaderWorker {
    static buildStandardWorkerDependencies(threeJsLocation: any): ({
        url: any;
        code?: undefined;
    } | {
        code: any;
        url?: undefined;
    })[];
    static buildThreeExtraConst(): string;
    static buildUglifiedThreeExtraMapping(): any;
    static init(context: any, id: any, config: any): void;
    static execute(context: any, id: any, config: any): void;
}
