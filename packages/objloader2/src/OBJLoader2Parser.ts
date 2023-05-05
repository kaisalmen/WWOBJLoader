import { Color } from 'three';

export type RawMeshType = {
    objectName: string;
    groupName: string;
    activeMtlName: string;
    mtllibName: string;
    faceType: number;
    subGroups: Map<string, RawMeshSubGroupType>;
    subGroupInUse: RawMeshSubGroupType | undefined;
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

export type RawMeshSubGroupType = {
    index: string;
    objectName: string;
    groupName: string;
    materialName: string;
    smoothingGroup: number;
    vertices: number[];
    indexMappingsCount: 0;
    indexMappings: Map<string, number>;
    indices: number[];
    colors: number[];
    uvs: number[];
    normals: number[];
}

export type GlobalCountsType = {
    vertices: number;
    faces: number;
    doubleIndicesCount: number;
    lineByte: number;
    currentByte: number;
    totalBytes: number;
};

export type LoggingType = {
    enabled: boolean;
    debug: boolean;
};

export type MaterialMetaInfoType = {
    materialCloneInstructions: MaterialCloneInstructionType[];
    materialName: string;
    multiMaterialNames: Map<number, string>;
    modelName: string;
    geometryType: number;
}

export type MaterialCloneInstructionType = {
    materialNameOrg: string;
    materialProperties: {
        name: string;
        vertexColors: number;
        flatShading: boolean;
    }
};

export type RawMeshResultType = {
    name: string;
    subGroups: RawMeshSubGroupType[],
    absoluteVertexCount: number;
    absoluteIndexCount: number;
    absoluteColorCount: number;
    absoluteNormalCount: number;
    absoluteUvCount: number;
    faceCount: number;
    doubleIndicesCount: number;
};

export type PreparedMeshType = {
    meshName: string;
    vertexFA: Float32Array;
    normalFA: Float32Array | null;
    uvFA: Float32Array | null;
    colorFA: Float32Array | null;
    indexUA: Uint32Array | null;
    createMultiMaterial: boolean;
    geometryGroups: GeometryGroupType[];
    multiMaterial: string[];
    materialMetaInfo: MaterialMetaInfoType;
    progress: number;
};

export type GeometryGroupType = {
    materialGroupOffset: number;
    materialGroupLength: number;
    materialIndex: number;
};

export type BulkConfigType = {
    materialPerSmoothingGroup: boolean;
    useOAsMesh: boolean;
    useIndices: boolean;
    disregardNormals: boolean;
    modelName: string;
    materialNames: Set<string>;
}

export class OBJLoader2Parser {

    private logging: LoggingType;
    private usedBefore = false;
    private contentRef: string | Uint8Array = '';
    private legacyMode = false;

    private materialNames = new Set<string>();
    private modelName = 'noname';

    private materialPerSmoothingGroup = false;
    private useOAsMesh = false;
    private useIndices = false;
    private disregardNormals = false;

    private vertices: number[] = [];
    private colors: number[] = [];
    private normals: number[] = [];
    private uvs: number[] = [];

    private rawMesh: RawMeshType;

    private inputObjectCount = 1;
    private outputObjectCount = 1;
    private globalCounts: GlobalCountsType;

    constructor() {
        this.logging = this.buildDefaultLogging();
        this.rawMesh = this.buildDefaultRawMesh();
        this.globalCounts = this.buildDefaultGlobalsCount();
    }

    private buildDefaultLogging() {
        return {
            enabled: false,
            debug: false
        };
    }

    private buildDefaultRawMesh() {
        return {
            objectName: '',
            groupName: '',
            activeMtlName: '',
            mtllibName: '',

            // reset with new mesh
            faceType: - 1,
            subGroups: new Map<string, RawMeshSubGroupType>(),
            subGroupInUse: undefined,
            smoothingGroup: {
                splitMaterials: false,
                normalized: - 1,
                real: - 1
            },
            counts: {
                doubleIndicesCount: 0,
                faceCount: 0,
                mtlCount: 0,
                smoothingGroupCount: 0
            }
        };
    }

    private buildDefaultGlobalsCount() {
        return {
            vertices: 0,
            faces: 0,
            doubleIndicesCount: 0,
            lineByte: 0,
            currentByte: 0,
            totalBytes: 0
        };
    }

    setBulkConfig(config: BulkConfigType) {
        this.materialPerSmoothingGroup = config.materialPerSmoothingGroup;
        this.useOAsMesh = config.useOAsMesh;
        this.useIndices = config.useIndices;
        this.disregardNormals = config.disregardNormals;
        this.modelName = config.modelName;
        this.materialNames = config.materialNames;
    }

    /**
     * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
     *
     * @param {boolean} enabled True or false.
     * @param {boolean} debug True or false.
     */
    setLogging(enabled: boolean, debug: boolean) {
        this.logging.enabled = enabled === true;
        this.logging.debug = debug === true;
    }

    setMaterialNames(materialNames: Set<string>) {
        this.materialNames = materialNames;
    }

    isLoggingEnabled() {
        return this.logging.enabled;
    }

    isDebugLoggingEnabled() {
        return this.logging.enabled && this.logging.debug;
    }

    /**
     *
     * @returns if parser was used before
     */
    isUsedBefore() {
        return this.usedBefore;
    }

    private configure() {
        this.usedBefore = true;
        this.pushSmoothingGroup('1');
        if (this.logging.enabled) {
            const matNames = (this.materialNames.size > 0) ? '\n\tmaterialNames:\n\t\t- ' + Array.from(this.materialNames).join('\n\t\t- ') : '\n\tmaterialNames: None';
            const printedConfig = 'OBJLoader2 Parser configuration:'
                + matNames
                + '\n\tmaterialPerSmoothingGroup: ' + this.materialPerSmoothingGroup
                + '\n\tuseOAsMesh: ' + this.useOAsMesh
                + '\n\tuseIndices: ' + this.useIndices
                + '\n\tdisregardNormals: ' + this.disregardNormals;
            console.info(printedConfig);
        }
    }

    /**
     * Parse the provided arraybuffer
     *
     * @param {Uint8Array} arrayBuffer OBJ data as Uint8Array
     */
    execute(arrayBuffer: ArrayBufferLike) {
        if (this.logging.enabled) console.time('OBJLoader2Parser.execute');
        this.configure();

        const arrayBufferView = new Uint8Array(arrayBuffer);
        this.contentRef = arrayBufferView;
        const length = arrayBufferView.byteLength;
        this.globalCounts.totalBytes = length;
        const buffer = new Array<string>(128);

        let bufferPointer = 0;
        let slashesCount = 0;
        let word = '';
        let currentByte = 0;
        for (let code; currentByte < length; currentByte++) {
            code = arrayBufferView[currentByte];
            switch (code) {
                // space
                case 32:
                    if (word.length > 0) buffer[bufferPointer++] = word;
                    word = '';
                    break;
                // slash
                case 47:
                    if (word.length > 0) buffer[bufferPointer++] = word;
                    slashesCount++;
                    word = '';
                    break;
                // LF
                case 10:
                    this.processLine(buffer, bufferPointer, slashesCount, word, currentByte);
                    word = '';
                    bufferPointer = 0;
                    slashesCount = 0;
                    break;
                // CR
                case 13:
                    break;
                default:
                    word += String.fromCharCode(code);
                    break;
            }
        }

        this.processLine(buffer, bufferPointer, slashesCount, word, currentByte);
        this.finalizeParsing();
        if (this.logging.enabled) console.timeEnd('OBJLoader2Parser.execute');
    }

    /**
     * Parse the provided text
     *
     * @param {string} text OBJ data as string
     */
    executeLegacy(text: string) {
        if (this.logging.enabled) console.time('OBJLoader2Parser.executeLegacy');
        this.configure();
        this.legacyMode = true;
        this.contentRef = text;
        const length = text.length;
        this.globalCounts.totalBytes = length;
        const buffer = new Array<string>(128);

        let bufferPointer = 0;
        let slashesCount = 0;
        let word = '';
        let currentByte = 0;
        for (let char; currentByte < length; currentByte++) {
            char = text[currentByte];
            switch (char) {
                case ' ':
                    if (word.length > 0) buffer[bufferPointer++] = word;
                    word = '';
                    break;
                case '/':
                    if (word.length > 0) buffer[bufferPointer++] = word;
                    slashesCount++;
                    word = '';
                    break;
                case '\n':
                    this.processLine(buffer, bufferPointer, slashesCount, word, currentByte);
                    word = '';
                    bufferPointer = 0;
                    slashesCount = 0;
                    break;
                case '\r':
                    break;
                default:
                    word += char;
            }
        }

        this.processLine(buffer, bufferPointer, slashesCount, word, currentByte);
        this.finalizeParsing();
        if (this.logging.enabled) console.timeEnd('OBJLoader2Parser.executeLegacy');
    }

    private processLine(buffer: string[], bufferPointer: number, slashesCount: number, word: string, currentByte: number) {
        this.globalCounts.lineByte = this.globalCounts.currentByte;
        this.globalCounts.currentByte = currentByte;
        if (bufferPointer < 1) return;
        if (word.length > 0) buffer[bufferPointer++] = word;

        const reconstructString = (content: string | Uint8Array, legacyMode: boolean, start: number, stop: number) => {
            let line = '';
            if (stop > start) {
                let i;
                if (legacyMode) {
                    for (i = start; i < stop; i++) {
                        line += content[i];
                    }
                }
                else {
                    for (i = start; i < stop; i++) {
                        line += String.fromCharCode((content as Uint8Array)[i]);
                    }
                }
                line = line.trim();
            }
            return line;
        };

        let bufferLength, length, i;
        const lineDesignation = buffer[0];
        switch (lineDesignation) {
            case 'v':
                this.vertices.push(parseFloat(buffer[1]));
                this.vertices.push(parseFloat(buffer[2]));
                this.vertices.push(parseFloat(buffer[3]));
                if (bufferPointer > 4) {
                    const color = new Color();
                    color.setRGB(
                        parseFloat(buffer[4]),
                        parseFloat(buffer[5]),
                        parseFloat(buffer[6])
                    ).convertSRGBToLinear();
                    this.colors.push(color.r);
                    this.colors.push(color.g);
                    this.colors.push(color.b);
                }
                break;
            case 'vt':
                this.uvs.push(parseFloat(buffer[1]));
                this.uvs.push(parseFloat(buffer[2]));
                break;
            case 'vn':
                this.normals.push(parseFloat(buffer[1]));
                this.normals.push(parseFloat(buffer[2]));
                this.normals.push(parseFloat(buffer[3]));
                break;
            case 'f':
                bufferLength = bufferPointer - 1;

                if (slashesCount === 0) {
                    // "f vertex ..."
                    this.checkFaceType(0);
                    for (i = bufferLength - 1; i > 1; i--) {
                        this.buildFace(buffer[bufferLength]);
                        this.buildFace(buffer[i - 1]);
                        this.buildFace(buffer[i]);
                    }
                } else if (bufferLength === slashesCount * 2) {
                    // "f vertex/uv ..."
                    this.checkFaceType(1);
                    for (i = bufferLength - 2; i > 2; i -= 2) {
                        this.buildFace(buffer[bufferLength - 1], buffer[bufferLength]);
                        this.buildFace(buffer[i - 3], buffer[i - 2]);
                        this.buildFace(buffer[i - 1], buffer[i]);
                    }
                } else if (bufferLength * 2 === slashesCount * 3) {
                    // "f vertex/uv/normal ..."
                    this.checkFaceType(2);
                    for (i = bufferLength - 3; i > 3; i -= 3) {
                        this.buildFace(buffer[bufferLength - 2], buffer[bufferLength - 1], buffer[bufferLength]);
                        this.buildFace(buffer[i - 5], buffer[i - 4], buffer[i - 3]);
                        this.buildFace(buffer[i - 2], buffer[i - 1], buffer[i]);
                    }
                } else {
                    // "f vertex//normal ..."
                    this.checkFaceType(3);
                    for (i = bufferLength - 2; i > 2; i -= 2) {
                        this.buildFace(buffer[bufferLength - 1], undefined, buffer[bufferLength]);
                        this.buildFace(buffer[i - 3], undefined, buffer[i - 2]);
                        this.buildFace(buffer[i - 1], undefined, buffer[i]);
                    }
                }
                break;
            case 'l':
            case 'p':
                bufferLength = bufferPointer - 1;
                if (bufferLength === slashesCount * 2) {
                    this.checkFaceType(4);
                    for (i = 1, length = bufferLength + 1; i < length; i += 2) {
                        this.buildFace(buffer[i], buffer[i + 1]);
                    }
                }
                else {
                    this.checkFaceType((lineDesignation === 'l') ? 5 : 6);
                    for (i = 1, length = bufferLength + 1; i < length; i++) {
                        this.buildFace(buffer[i]);
                    }
                }
                break;
            case 's':
                this.pushSmoothingGroup(buffer[1]);
                break;
            case 'g':
                // 'g' leads to creation of mesh if valid data (faces declaration was done before), otherwise only groupName gets set
                this.processCompletedMesh();
                this.rawMesh.groupName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte);
                break;
            case 'o':
                // 'o' is meta-information and usually does not result in creation of new meshes, but can be enforced with "useOAsMesh"
                if (this.useOAsMesh) this.processCompletedMesh();
                this.rawMesh.objectName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte);
                break;
            case 'mtllib':
                this.rawMesh.mtllibName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte);
                break;
            case 'usemtl':
                // eslint-disable-next-line no-case-declarations
                const mtlName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte);
                if (mtlName !== '' && this.rawMesh.activeMtlName !== mtlName) {
                    this.rawMesh.activeMtlName = mtlName;
                    this.rawMesh.counts.mtlCount++;
                    this.checkSubGroup();
                }
                break;
            default:
                break;
        }
    }

    private pushSmoothingGroup(smoothingGroup: string) {
        let smoothingGroupInt = parseInt(smoothingGroup);
        if (isNaN(smoothingGroupInt)) {
            smoothingGroupInt = smoothingGroup === 'off' ? 0 : 1;
        }

        const smoothCheck = this.rawMesh.smoothingGroup.normalized;
        this.rawMesh.smoothingGroup.normalized = this.rawMesh.smoothingGroup.splitMaterials ? smoothingGroupInt : (smoothingGroupInt === 0) ? 0 : 1;
        this.rawMesh.smoothingGroup.real = smoothingGroupInt;

        if (smoothCheck !== smoothingGroupInt) {
            this.rawMesh.counts.smoothingGroupCount++;
            this.checkSubGroup();
        }
    }

    /**
     * Expanded faceTypes include all four face types, both line types and the point type
     * faceType = 0: "f vertex ..."
     * faceType = 1: "f vertex/uv ..."
     * faceType = 2: "f vertex/uv/normal ..."
     * faceType = 3: "f vertex//normal ..."
     * faceType = 4: "l vertex/uv ..." or "l vertex ..."
     * faceType = 5: "l vertex ..."
     * faceType = 6: "p vertex ..."
     */
    private checkFaceType(faceType: number) {
        if (this.rawMesh.faceType !== faceType) {
            this.processCompletedMesh();
            this.rawMesh.faceType = faceType;
            this.checkSubGroup();
        }
    }

    private checkSubGroup() {
        const index = `${this.rawMesh.activeMtlName}|${this.rawMesh.smoothingGroup.normalized}`;
        this.rawMesh.subGroupInUse = this.rawMesh.subGroups.get(index);

        if (!this.rawMesh.subGroupInUse) {
            this.rawMesh.subGroupInUse = {
                index: index,
                objectName: this.rawMesh.objectName,
                groupName: this.rawMesh.groupName,
                materialName: this.rawMesh.activeMtlName,
                smoothingGroup: this.rawMesh.smoothingGroup.normalized,
                vertices: [],
                indexMappingsCount: 0,
                indexMappings: new Map<string, number>(),
                indices: [],
                colors: [],
                uvs: [],
                normals: []
            };
            this.rawMesh.subGroups.set(index, this.rawMesh.subGroupInUse!);
        }
    }

    private buildFace(faceIndexV: string, faceIndexU?: string, faceIndexN?: string) {
        // we assume subGroupInUse is available
        const subGroupInUse = this.rawMesh.subGroupInUse!;
        const updateSubGroupInUse = () => {
            const faceIndexVi = parseInt(faceIndexV);
            let indexPointerV = 3 * (faceIndexVi > 0 ? faceIndexVi - 1 : faceIndexVi + this.vertices.length / 3);
            let indexPointerC = this.colors.length > 0 ? indexPointerV : null;

            const vertices = subGroupInUse.vertices;
            vertices.push(this.vertices[indexPointerV++]);
            vertices.push(this.vertices[indexPointerV++]);
            vertices.push(this.vertices[indexPointerV]);

            if (indexPointerC !== null) {
                const colors = subGroupInUse.colors;
                colors.push(this.colors[indexPointerC++]);
                colors.push(this.colors[indexPointerC++]);
                colors.push(this.colors[indexPointerC]);
            }

            if (faceIndexU) {
                const faceIndexUi = parseInt(faceIndexU);
                let indexPointerU = 2 * (faceIndexUi > 0 ? faceIndexUi - 1 : faceIndexUi + this.uvs.length / 2);
                const uvs = subGroupInUse.uvs;
                uvs.push(this.uvs[indexPointerU++]);
                uvs.push(this.uvs[indexPointerU]);
            }

            if (faceIndexN && !this.disregardNormals) {
                const faceIndexNi = parseInt(faceIndexN);
                let indexPointerN = 3 * (faceIndexNi > 0 ? faceIndexNi - 1 : faceIndexNi + this.normals.length / 3);
                const normals = subGroupInUse.normals;
                normals.push(this.normals[indexPointerN++]);
                normals.push(this.normals[indexPointerN++]);
                normals.push(this.normals[indexPointerN]);
            }
        };

        if (this.useIndices) {
            if (this.disregardNormals) {
                faceIndexN = undefined;
            }
            const mappingName = faceIndexV + (faceIndexU ? '_' + faceIndexU : '_n') + (faceIndexN ? '_' + faceIndexN : '_n');
            let indicesPointer = subGroupInUse.indexMappings.get(mappingName);
            if (indicesPointer === undefined || indicesPointer === null) {
                indicesPointer = this.rawMesh.subGroupInUse!.vertices.length / 3;
                updateSubGroupInUse();
                subGroupInUse.indexMappings.set(mappingName, indicesPointer);
                subGroupInUse.indexMappingsCount++;
            }
            else {
                this.rawMesh.counts.doubleIndicesCount++;
            }
            subGroupInUse.indices.push(indicesPointer);
        }
        else {
            updateSubGroupInUse();
        }
        this.rawMesh.counts.faceCount++;
    }

    private createRawMeshReport(inputObjectCount: number) {
        return `Input Object number: ${inputObjectCount}
	Object name: ${this.rawMesh.objectName}
	Group name: ${this.rawMesh.groupName}
	Mtllib name: ${this.rawMesh.mtllibName}
	Vertex count: ${this.vertices.length / 3}
	Normal count: ${this.normals.length / 3}
	UV count: ${this.uvs.length / 2}
	SmoothingGroup count: ${this.rawMesh.counts.smoothingGroupCount}
	Material count: ${this.rawMesh.counts.mtlCount}
	Real MeshOutputGroup count: ${this.rawMesh.subGroups.size}`;
    }

    /**
     * Clear any empty subGroup and calculate absolute vertex, normal and uv counts
     */
    private finalizeRawMesh(): RawMeshResultType | undefined {
        const meshOutputGroupTemp = [];
        let meshOutputGroup;
        let absoluteVertexCount = 0;
        let absoluteIndexMappingsCount = 0;
        let absoluteIndexCount = 0;
        let absoluteColorCount = 0;
        let absoluteNormalCount = 0;
        let absoluteUvCount = 0;
        let indices;

        for (const entry of this.rawMesh.subGroups.entries()) {
            meshOutputGroup = this.rawMesh.subGroups.get(entry[0]);

            if (meshOutputGroup && meshOutputGroup.vertices.length > 0) {
                indices = meshOutputGroup.indices;
                if (indices.length > 0 && absoluteIndexMappingsCount > 0) {
                    for (let i = 0; i < indices.length; i++) {
                        indices[i] = indices[i] + absoluteIndexMappingsCount;
                    }
                }

                meshOutputGroupTemp.push(meshOutputGroup);
                absoluteVertexCount += meshOutputGroup.vertices.length;
                absoluteIndexMappingsCount += meshOutputGroup.indexMappingsCount;
                absoluteIndexCount += meshOutputGroup.indices.length;
                absoluteColorCount += meshOutputGroup.colors.length;
                absoluteUvCount += meshOutputGroup.uvs.length;
                absoluteNormalCount += meshOutputGroup.normals.length;
            }
        }

        // do not continue if no result
        if (meshOutputGroupTemp.length > 0) {
            return {
                name: this.rawMesh.groupName !== '' ? this.rawMesh.groupName : this.rawMesh.objectName,
                subGroups: meshOutputGroupTemp,
                absoluteVertexCount: absoluteVertexCount,
                absoluteIndexCount: absoluteIndexCount,
                absoluteColorCount: absoluteColorCount,
                absoluteNormalCount: absoluteNormalCount,
                absoluteUvCount: absoluteUvCount,
                faceCount: this.rawMesh.counts.faceCount,
                doubleIndicesCount: this.rawMesh.counts.doubleIndicesCount
            };
        } else {
            return undefined;
        }
    }

    private processCompletedMesh() {
        const result = this.finalizeRawMesh();
        if (result) {
            if (this.colors.length > 0 && this.colors.length !== this.vertices.length) {
                this._onError('Vertex Colors were detected, but vertex count and color count do not match!');
            }

            if (this.logging.enabled && this.logging.debug) console.debug(this.createRawMeshReport(this.inputObjectCount));
            this.inputObjectCount++;

            const preparedMesh = this.createPreparedMesh(result);
            this._onAssetAvailable(preparedMesh);

            const progressBytesPercent = this.globalCounts.currentByte / this.globalCounts.totalBytes;
            this._onProgress('Completed [o: ' + this.rawMesh.objectName + ' g:' + this.rawMesh.groupName + '' +
                '] Total progress: ' + (progressBytesPercent * 100).toFixed(2) + '%');
            this.resetRawMesh();
            return true;
        }
        return false;
    }

    private resetRawMesh() {
        // faces are stored according combined index of group, material and smoothingGroup (0 or not)
        this.rawMesh.subGroups = new Map<string, RawMeshSubGroupType>();
        this.rawMesh.subGroupInUse = undefined;
        this.rawMesh.smoothingGroup.normalized = - 1;
        this.rawMesh.smoothingGroup.real = - 1;

        // this default index is required as it is possible to define faces without 'g' or 'usemtl'
        this.pushSmoothingGroup('1');

        this.rawMesh.counts.doubleIndicesCount = 0;
        this.rawMesh.counts.faceCount = 0;
        this.rawMesh.counts.mtlCount = 0;
        this.rawMesh.counts.smoothingGroupCount = 0;
    }

    /**
     * SubGroups are transformed to too intermediate format that is forwarded to the MeshReceiver.
     * It is ensured that SubGroups only contain objects with vertices (no need to check).
     *
     * @param result
     */
    private createPreparedMesh(result: RawMeshResultType): PreparedMeshType {
        const meshOutputGroups = result.subGroups;

        this.globalCounts.vertices += result.absoluteVertexCount / 3;
        this.globalCounts.faces += result.faceCount;
        this.globalCounts.doubleIndicesCount += result.doubleIndicesCount;

        if (result.absoluteVertexCount <= 0) {
            throw new Error(`Invalid vertex count: ${result.absoluteVertexCount}`);
        }
        const vertexFA = new Float32Array(result.absoluteVertexCount);
        const indexUA = (result.absoluteIndexCount > 0) ? new Uint32Array(result.absoluteIndexCount) : null;
        const colorFA = (result.absoluteColorCount > 0) ? new Float32Array(result.absoluteColorCount) : null;
        const normalFA = (result.absoluteNormalCount > 0) ? new Float32Array(result.absoluteNormalCount) : null;
        const uvFA = (result.absoluteUvCount > 0) ? new Float32Array(result.absoluteUvCount) : null;

        let meshOutputGroup;

        let vertexFAOffset = 0;
        let indexUAOffset = 0;
        let colorFAOffset = 0;
        let normalFAOffset = 0;
        let uvFAOffset = 0;
        const geometryGroups = [];
        let materialGroupOffset = 0;
        let materialGroupLength = 0;

        const createMultiMaterial = (meshOutputGroups.length > 1);
        const multiMaterial = [];
        const haveVertexColors = colorFA !== null;
        let materialIndex = 0;

        const materialMetaInfo = {
            materialCloneInstructions: [],
            materialName: '',
            multiMaterialNames: new Map<number, string>(),
            modelName: this.modelName,
            geometryType: this.rawMesh.faceType < 4 ? 0 : (this.rawMesh.faceType === 6) ? 2 : 1
        } as MaterialMetaInfoType;

        for (const oodIndex in meshOutputGroups) {
            if (!Object.prototype.hasOwnProperty.call(meshOutputGroups, oodIndex)) {
                continue;
            }
            meshOutputGroup = meshOutputGroups[oodIndex];

            let materialName;
            const materialNameOrg = meshOutputGroup.materialName;
            const flatShading = meshOutputGroup.smoothingGroup === 0;

            if (this.rawMesh.faceType < 4) {
                materialName = materialNameOrg;
                if (haveVertexColors) {
                    materialName += '_vertexColor';
                }
                if (flatShading) {
                    materialName += '_flat';
                }
            }
            else {
                materialName = this.rawMesh.faceType === 6 ? 'defaultPointMaterial' : 'defaultLineMaterial';
            }

            materialMetaInfo.materialName = materialName;
            const haveMaterialOrg = this.materialNames.has(materialNameOrg);
            const haveMaterial = this.materialNames.has(materialName);
            const useDefaultMaterial = !haveMaterialOrg && !haveMaterial;
            const cloneMaterial = useDefaultMaterial ? false : !haveMaterial;

            // both original and derived names do not lead to an existing material => need to use a default material
            if (useDefaultMaterial) {
                materialName = haveVertexColors ? 'defaultVertexColorMaterial' : 'defaultMaterial';

                if (this.logging.enabled) {
                    console.info('object_group "' + meshOutputGroup.objectName + '_' +
                        meshOutputGroup.groupName + '" was defined with unresolvable material "' +
                        materialNameOrg + '"! Assigning "' + materialName + '".');
                }
                materialMetaInfo.materialName = materialName;
            }

            // only clone
            if (cloneMaterial) {
                const materialCloneInstruction = {
                    materialNameOrg: materialNameOrg,
                    materialProperties: {
                        name: materialName,
                        vertexColors: haveVertexColors ? 2 : 0,
                        flatShading: flatShading
                    }
                };
                materialMetaInfo.materialCloneInstructions.push(materialCloneInstruction);
            }

            if (createMultiMaterial) {
                materialGroupLength = this.useIndices ? meshOutputGroup.indices.length : meshOutputGroup.vertices.length / 3;
                geometryGroups.push({
                    materialGroupOffset: materialGroupOffset,
                    materialGroupLength: materialGroupLength,
                    materialIndex: materialIndex
                });
                multiMaterial[materialIndex] = materialName;
                materialMetaInfo.multiMaterialNames.set(materialIndex, materialName);

                materialGroupOffset += materialGroupLength;
                materialIndex++;
            }

            if (vertexFA !== null) {
                vertexFA.set(meshOutputGroup.vertices, vertexFAOffset);
                vertexFAOffset += meshOutputGroup.vertices.length;
            }
            if (indexUA !== null) {
                indexUA.set(meshOutputGroup.indices, indexUAOffset);
                indexUAOffset += meshOutputGroup.indices.length;
            }

            if (colorFA !== null) {
                colorFA.set(meshOutputGroup.colors, colorFAOffset);
                colorFAOffset += meshOutputGroup.colors.length;
            }

            if (normalFA !== null) {
                normalFA.set(meshOutputGroup.normals, normalFAOffset);
                normalFAOffset += meshOutputGroup.normals.length;
            }

            if (uvFA !== null) {
                uvFA.set(meshOutputGroup.uvs, uvFAOffset);
                uvFAOffset += meshOutputGroup.uvs.length;
            }

            if (this.logging.enabled && this.logging.debug) {
                let materialIndexLine = '';
                if (materialIndex > 0) {
                    materialIndexLine = '\n\t\tmaterialIndex: ' + materialIndex;
                }

                const createdReport = '\tOutput Object no.: ' + this.outputObjectCount +
                    '\n\t\tgroupName: ' + meshOutputGroup.groupName +
                    '\n\t\tIndex: ' + meshOutputGroup.index +
                    '\n\t\tfaceType: ' + this.rawMesh.faceType +
                    '\n\t\tmaterialName: ' + meshOutputGroup.materialName +
                    '\n\t\tsmoothingGroup: ' + meshOutputGroup.smoothingGroup +
                    materialIndexLine +
                    '\n\t\tobjectName: ' + meshOutputGroup.objectName +
                    '\n\t\t#vertices: ' + meshOutputGroup.vertices.length / 3 +
                    '\n\t\t#indices: ' + meshOutputGroup.indices.length +
                    '\n\t\t#colors: ' + meshOutputGroup.colors.length / 3 +
                    '\n\t\t#uvs: ' + meshOutputGroup.uvs.length / 2 +
                    '\n\t\t#normals: ' + meshOutputGroup.normals.length / 3;
                console.debug(createdReport);
            }
        }
        this.outputObjectCount++;

        return {
            meshName: result.name,
            vertexFA: vertexFA,
            normalFA: normalFA,
            uvFA: uvFA,
            colorFA: colorFA,
            indexUA: indexUA,
            createMultiMaterial: createMultiMaterial,
            geometryGroups: geometryGroups,
            multiMaterial: multiMaterial,
            materialMetaInfo: materialMetaInfo,
            progress: this.globalCounts.currentByte / this.globalCounts.totalBytes
        };
    }

    private finalizeParsing() {
        if (this.logging.enabled) console.info('Global output object count: ' + this.outputObjectCount);
        if (this.processCompletedMesh() && this.logging.enabled) {
            const parserFinalReport = 'Overall counts: ' +
                '\n\tVertices: ' + this.globalCounts.vertices +
                '\n\tFaces: ' + this.globalCounts.faces +
                '\n\tMultiple definitions: ' + this.globalCounts.doubleIndicesCount;
            console.info(parserFinalReport);
        }
        this._onLoad();
    }

    /**
     * Announce parse progress feedback which is logged to the console.
     * @private
     *
     * @param {string} text Textual description of the event
     */
    _onProgress(text: string) {
        const message = text ? text : '';
        if (this.logging.enabled && this.logging.debug) {
            console.log(message);
        }
    }

    /**
     * Announce error feedback which is logged as error message.
     * @private
     *
     * @param {String} errorMessage The event containing the error
     */
    _onError(errorMessage: string) {
        if (this.logging.enabled && this.logging.debug) {
            console.error(errorMessage);
        }
    }

    /**
     * Hook for alteration or transfer to main when parser is run in worker
     *
     * @param {Mesh} _mesh
     * @param {object} _materialMetaInfo
     */
    _onAssetAvailable(_mesh: PreparedMeshType, _materialMetaInfo?: unknown) {
        // empty default implementation
    }

    _onLoad() {
        // empty default implementation
    }
}
