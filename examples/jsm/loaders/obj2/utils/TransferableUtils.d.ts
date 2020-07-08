export class TransferableUtils {
    static walkMesh(rootNode: Object3D, callback: Function): void;
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
            materialNames: string[];
            materialGroups: object[];
        };
        buffers: {
            vertices: ArrayBuffer;
            indices: ArrayBuffer;
            colors: ArrayBuffer;
            normals: ArrayBuffer;
            uvs: ArrayBuffer;
            skinIndex: ArrayBuffer;
            skinWeight: ArrayBuffer;
        };
    };
    transferables: {
        vertex: ArrayBuffer[];
        index: ArrayBuffer[];
        color: ArrayBuffer[];
        normal: ArrayBuffer[];
        uv: ArrayBuffer[];
        skinIndex: ArrayBuffer[];
        skinWeight: ArrayBuffer[];
    };
    postMessage(postMessageImpl: object): void;
}
import { Object3D } from "../../../../../build/three.module.js";
import { BufferGeometry } from "../../../../../build/three.module.js";
