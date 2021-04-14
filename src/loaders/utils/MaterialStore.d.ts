export class MaterialStore {
    constructor(createDefaultMaterials: boolean);
    materials: {};
    addMaterials(newMaterials: any, forceOverrideExisting: boolean): void;
    getMaterials(): Object;
    getMaterial(materialName: string): any;
    clearMaterials(): void;
}
