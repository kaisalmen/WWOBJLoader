export class OBJLoader2 {
    static OBJLOADER2_VERSION: string;
    constructor(manager?: any);
    parser: OBJLoader2Parser;
    materialStore: MaterialStore;
    setLogging(enabled: boolean, debug: boolean): OBJLoader2;
    setMaterialPerSmoothingGroup(materialPerSmoothingGroup: boolean): OBJLoader2;
    setUseOAsMesh(useOAsMesh: boolean): OBJLoader2;
    setUseIndices(useIndices: boolean): OBJLoader2;
    setDisregardNormals(disregardNormals: boolean): OBJLoader2;
    setModelName(modelName: string): OBJLoader2;
    getModelName(): string;
    setBaseObject3d(baseObject3d: any): OBJLoader2;
    setMaterials(materials: Object): OBJLoader2;
    setCallbackOnProgress(onProgress: Function): OBJLoader2;
    setCallbackOnError(onError: Function): OBJLoader2;
    setCallbackOnLoad(onLoad: Function): OBJLoader2;
    setCallbackOnMeshAlter(onMeshAlter?: Function | undefined): OBJLoader2;
    load(url: string, onLoad: Function, onFileLoadProgress?: Function | undefined, onError?: Function | undefined, onMeshAlter?: Function | undefined): void;
    path: string | undefined;
    parse(content: any | string): any;
}
export class OBJLoader2Parser {
    logging: {
        enabled: boolean;
        debug: boolean;
    };
    usedBefore: boolean;
    callbacks: {
        onLoad: null;
        onError: null;
        onProgress: null;
        onMeshAlter: null;
    };
    _init(): void;
    contentRef: string | Uint8Array | null | undefined;
    legacyMode: boolean | undefined;
    materials: {} | undefined;
    baseObject3d: any;
    modelName: string | undefined;
    materialPerSmoothingGroup: boolean | undefined;
    useOAsMesh: boolean | undefined;
    useIndices: boolean | undefined;
    disregardNormals: boolean | undefined;
    vertices: any[] | undefined;
    colors: any[] | undefined;
    normals: any[] | undefined;
    uvs: any[] | undefined;
    objectId: number | undefined;
    rawMesh: {
        objectName: string;
        groupName: string;
        activeMtlName: string;
        mtllibName: string;
        faceType: number;
        subGroups: never[];
        subGroupInUse: null;
        smoothingGroup: {
            splitMaterials: boolean;
            normalized: number;
            real: number;
        };
        counts: {
            doubleIndicesCount: number;
            faceCount: number;
            mtlCount: number;
            smoothingGroupCount: number;
        };
    } | undefined;
    inputObjectCount: number | undefined;
    outputObjectCount: number | undefined;
    globalCounts: {
        vertices: number;
        faces: number;
        doubleIndicesCount: number;
        lineByte: number;
        currentByte: number;
        totalBytes: number;
    } | undefined;
    _resetRawMesh(): void;
    _configure(): void;
    _execute(arrayBuffer: Uint8Array): void;
    _executeLegacy(text: string): void;
    _processLine(buffer: any, bufferPointer: any, slashesCount: any, word: any, currentByte: any): void;
    _pushSmoothingGroup(smoothingGroup: any): void;
    _checkFaceType(faceType: any): void;
    _checkSubGroup(): void;
    _buildFace(faceIndexV: any, faceIndexU: any, faceIndexN: any): void;
    _createRawMeshReport(inputObjectCount: any): string;
    _finalizeRawMesh(): {
        name: string;
        subGroups: any[];
        absoluteVertexCount: number;
        absoluteIndexCount: number;
        absoluteColorCount: number;
        absoluteNormalCount: number;
        absoluteUvCount: number;
        faceCount: number;
        doubleIndicesCount: number;
    } | null;
    _processCompletedMesh(): boolean;
    _buildMesh(result: any): void;
    _finalizeParsing(): void;
    private _onProgress;
    private _onError;
    _onAssetAvailable(mesh: any, materialMetaInfo: object): void;
    _onMeshAlter(mesh: any): void;
    _onLoad(): void;
}
import { MaterialStore } from "./utils/MaterialStore.js";
