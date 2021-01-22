export class TransferableUtils {
    static packageBufferGeometry(geometry: BufferGeometry, id: string, geometryType: number, cloneBuffers: boolean): MeshMessageStructure;
    static addTransferable(input: any, cloneBuffer: any, transferableArray: any): void;
    static reconstructBufferGeometry(transferredGeometry: any, cloneBuffers: any): BufferGeometry;
    static assignAttribute(bg: any, attr: any, attrName: any, cloneBuffer: any): void;
}
export class StructuredWorkerMessage {
    constructor(cmd: string);
    main: {
        cmd: string;
        type: string;
        progress: {
            numericalValue: number;
        };
        params: {};
    };
    transferables: any[];
    postMessage(postMessageImpl: object): void;
}
export class GeometryWorkerMessage extends StructuredWorkerMessage {
    constructor(cmd: string);
}
export class MaterialsWorkerMessage extends StructuredWorkerMessage {
    constructor(cmd: string);
    setMaterials(materials: any): void;
    materials: any;
    cleanAndSetMaterials(materials: any): void;
}
export class MeshMessageStructure extends GeometryWorkerMessage {
    constructor(cmd: string, id: string, meshName: string);
}
export class ObjectManipulator {
    static applyProperties(objToAlter: Object, params: Object, forceCreation: boolean): void;
}
import { BufferGeometry } from "../../../../../build/three.module.js";
