export class MaterialUtils {
    static addMaterial(materialsObject: any, material: any, materialName: string, force: boolean, log?: boolean | undefined): void;
    static getMaterialsJSON(materialsObject: any): Object;
    static cloneMaterial(materials: any, materialCloneInstruction: object, log?: boolean | undefined): any;
}
