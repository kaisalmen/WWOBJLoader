export class DataTransport {
    constructor(cmd?: string | undefined, id?: string | undefined);
    main: {
        cmd: string;
        id: string | number;
        type: string;
        progress: number;
        buffers: {};
        params: {};
    };
    transferables: ArrayBuffer[];
    loadData(transportObject: object): DataTransport;
    getCmd(): string;
    getId(): string;
    setParams(params: any): DataTransport;
    getParams(): any;
    setProgress(numericalValue: number): DataTransport;
    addBuffer(name: string, buffer: ArrayBuffer): DataTransport;
    getBuffer(name: string): ArrayBuffer;
    package(cloneBuffers: boolean): DataTransport;
    getMain(): object;
    getTransferables(): [] | ArrayBuffer[];
    postMessage(postMessageImpl: object): DataTransport;
}
export class GeometryTransport extends DataTransport {
    constructor(cmd?: string | undefined, id?: string | undefined);
    getGeometryType(): number;
    setGeometry(geometry: BufferGeometry, geometryType: number): GeometryTransport;
    reconstruct(cloneBuffers: boolean): GeometryTransport;
    getBufferGeometry(): BufferGeometry | null;
    _addBufferAttributeToTransferable(input: any, cloneBuffer: any): GeometryTransport;
    _assignAttribute(attr: any, attrName: any, cloneBuffer: any): GeometryTransport;
}
export class MeshTransport extends GeometryTransport {
    constructor(cmd?: string | undefined, id?: string | undefined);
    setMaterialsTransport(materialsTransport: MaterialsTransport): MeshTransport;
    getMaterialsTransport(): MaterialsTransport;
    setMesh(mesh: any, geometryType: number): MeshTransport;
}
export class MaterialsTransport extends DataTransport {
    constructor(cmd?: string | undefined, id?: string | undefined);
    _cleanMaterial(material: any): any;
    setMaterials(materials: any): MaterialsTransport;
    getMaterials(): any;
    cleanMaterials(): MaterialsTransport;
    hasMultiMaterial(): boolean;
    getSingleMaterial(): Material | null;
    processMaterialTransport(materials: {
        [x: string]: Material;
    }, log: boolean): Material | Material[];
}
export class ObjectUtils {
    static serializePrototype(targetClass: any, targetPrototype: any, fullObjectName: any, processPrototype: any): string;
    static serializeClass(targetClass: object): string;
}
export class ObjectManipulator {
    static applyProperties(objToAlter: Object, params: Object, forceCreation: boolean): void;
}
import { BufferGeometry } from "../../../../../build/three.module.js";
import { Material } from "../../../../../build/three.module.js";
