export class OBJLoader2Parser {
    logging: {
        enabled: boolean;
        debug: boolean;
    };
    usedBefore: boolean;
    callbacks: {
        onProgress: (text: string) => void;
        onError: (errorMessage: string) => void;
        onAssetAvailable: (payload: any) => never;
        onLoad: (object3d: any, message: any) => void;
    };
    _init(): void;
    contentRef: string | Uint8Array;
    legacyMode: boolean;
    materials: any;
    materialPerSmoothingGroup: boolean;
    useOAsMesh: boolean;
    useIndices: boolean;
    disregardNormals: boolean;
    vertices: any[];
    colors: any[];
    normals: any[];
    uvs: any[];
    objectId: number;
    rawMesh: {
        objectName: string;
        groupName: string;
        activeMtlName: string;
        mtllibName: string;
        faceType: number;
        subGroups: any[];
        subGroupInUse: any;
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
    };
    inputObjectCount: number;
    outputObjectCount: number;
    globalCounts: {
        vertices: number;
        faces: number;
        doubleIndicesCount: number;
        lineByte: number;
        currentByte: number;
        totalBytes: number;
    };
    _resetRawMesh(): void;
    setMaterialPerSmoothingGroup(materialPerSmoothingGroup: boolean): OBJLoader2Parser;
    setUseOAsMesh(useOAsMesh: boolean): OBJLoader2Parser;
    setUseIndices(useIndices: boolean): OBJLoader2Parser;
    setDisregardNormals(disregardNormals: boolean): OBJLoader2Parser;
    setMaterials(materials: any): void;
    setCallbackOnAssetAvailable(onAssetAvailable: any): OBJLoader2Parser;
    setCallbackOnProgress(onProgress: Function): OBJLoader2Parser;
    setCallbackOnError(onError: Function): OBJLoader2Parser;
    setCallbackOnLoad(onLoad: Function): OBJLoader2Parser;
    setLogging(enabled: boolean, debug: boolean): OBJLoader2Parser;
    isUsedBefore(): boolean;
    _configure(): void;
    execute(arrayBuffer: Uint8Array): void;
    executeLegacy(text: string): void;
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
    };
    _processCompletedMesh(): boolean;
    _buildMesh(result: any): void;
    _finalizeParsing(): void;
}
