export class TransferableUtils {
    static packageBufferGeometry(geometry: BufferGeometry, id: string, geometryType: number, cloneBuffers: boolean, materialNames?: string[] | undefined): MeshMessageStructure;
    static addTransferable(input: any, cloneBuffer: any, transferableArray: any): void;
    static reconstructBufferGeometry(transferredGeometry: any, cloneBuffers: any): BufferGeometry;
    static assignAttribute(bg: any, attr: any, attrName: any, cloneBuffer: any): void;
}
export class MeshMessageStructure {
    constructor(cmd: string, id: string, meshName: string);
    main: {
        cmd: string;
        type: string;
        progress: {
            numericalValue: number;
        };
        params: {
            geometryType: number;
            id: string;
        };
        materials: {
            json: string | null;
            multiMaterial: boolean;
            materialNames: string[];
        };
        geometry: null;
    };
    transferables: any[];
    postMessage(postMessageImpl: object): void;
}
export class ObjectManipulator {
    static applyProperties(objToAlter: Object, params: Object, forceCreation: boolean): void;
}
import { BufferGeometry } from "../../../../../build/three.module.js";
