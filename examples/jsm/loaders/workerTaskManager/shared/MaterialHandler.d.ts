export class MaterialHandler {
    static getMaterialsJSON(materialsObject: any): {};
    logging: {
        enabled: boolean;
        debug: boolean;
    };
    callbacks: {
        onLoadMaterials: null;
    };
    materials: {};
    setLogging(enabled: boolean, debug: boolean): void;
    _setCallbacks(onLoadMaterials: any): void;
    createDefaultMaterials(overrideExisting: any): void;
    addPayloadMaterials(materialPayload: Object): Object;
    addMaterials(materials: any, forceOverrideExisting: any, newMaterials: any): any;
    getMaterials(): Object;
    getMaterial(materialName: string): any;
    getMaterialsJSON(): Object;
    clearMaterials(): void;
}
