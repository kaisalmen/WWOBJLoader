export class TransferableUtils {
    static walkMesh(rootNode: any, callback: Function): void;
    static packageBufferGeometry(bufferGeometry: BufferGeometry, meshName: string, geometryType: number, materialNames?: string[]): MeshMessageStructure;
}
export class MeshMessageStructure {
    static cloneMessageStructure(input: object | MeshMessageStructure): MeshMessageStructure;
    static copyTypedArray(arrayIn: ArrayBuffer, arrayOut: ArrayBuffer): void;
    constructor(cmd: string, meshName: string);
    main: {
        cmd: string;
        type: string;
        meshName: string;
        progress: {
            numericalValue: number;
        };
        params: {
            geometryType: number;
        };
        materials: {
            multiMaterial: boolean;
            materialNames: any[];
            materialGroups: any[];
        };
        buffers: {
            vertices: any;
            indices: any;
            colors: any;
            normals: any;
            uvs: any;
            skinIndex: any;
            skinWeight: any;
        };
    };
    transferables: {
        vertex: any;
        index: any;
        color: any;
        normal: any;
        uv: any;
        skinIndex: any;
        skinWeight: any;
    };
    postMessage(postMessageImpl: object): void;
}
import { BufferGeometry } from "../../../../../build/three.module.js";
