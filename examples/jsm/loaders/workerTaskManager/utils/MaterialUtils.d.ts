export class MaterialUtils {
    static addMaterial(materialsObject: object, material: Material | MaterialCloneInstruction, materialName: string, force: boolean, log?: any): void;
    static getMaterialsJSON(materialsObject: any): Object;
    static cloneMaterial(materials: any, materialCloneInstruction: MaterialCloneInstruction, log?: boolean | undefined): any;
}
export class MaterialCloneInstruction {
    constructor(materialNameOrg: string, materialNameNew: string, haveVertexColors: boolean, flatShading: boolean);
    materialNameOrg: string;
    materialProperties: {
        name: string;
        vertexColors: number;
        flatShading: boolean;
    };
}
import { Material } from "../../../../../build/three.module.js";
