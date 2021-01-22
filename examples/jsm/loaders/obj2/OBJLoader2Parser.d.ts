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
    contentRef: string | Uint8Array | null | undefined;
    legacyMode: boolean | undefined;
    materials: Object | undefined;
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
    setMaterialPerSmoothingGroup(materialPerSmoothingGroup: boolean): OBJLoader2Parser;
    setUseOAsMesh(useOAsMesh: boolean): OBJLoader2Parser;
    setUseIndices(useIndices: boolean): OBJLoader2Parser;
    setDisregardNormals(disregardNormals: boolean): OBJLoader2Parser;
    setMaterials(materials: Object): void;
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
    } | null;
    _processCompletedMesh(): boolean;
    _buildMesh(result: any): void;
    _finalizeParsing(): void;
}
