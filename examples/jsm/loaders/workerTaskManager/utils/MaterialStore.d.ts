export class MaterialStore {
    constructor(createDefaultMaterials: any);
    materials: {};
    addMaterials(newMaterials: any, forceOverrideExisting: any): void;
    getMaterials(): Object;
    getMaterial(materialName: string): Material;
    clearMaterials(): void;
}
import { Material } from "../../../../../build/three.module.js";
