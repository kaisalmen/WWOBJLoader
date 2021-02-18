export class MaterialUtils {
    static addMaterial(materialsObject: any, material: Material, materialName: string, force: boolean, log?: boolean | undefined): void;
    static getMaterialsJSON(materialsObject: any): Object;
    static cloneMaterial(materials: any, materialCloneInstruction: object, log?: boolean | undefined): any;
}
import { Material } from "../../../../../build/three.module.js";
