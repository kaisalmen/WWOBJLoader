export class MaterialStore {
    constructor(createDefaultMaterials: boolean);
    materials: {};
    addMaterials(newMaterials: any, forceOverrideExisting: boolean): void;
    getMaterials(): Object;
    getMaterial(materialName: string): Material;
    clearMaterials(): void;
}
import { Material } from "../../../../../build/three.module.js";
