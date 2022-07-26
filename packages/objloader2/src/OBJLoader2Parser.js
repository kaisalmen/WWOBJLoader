export class OBJLoader2Parser {

    constructor() {
        this.logging = {
            enabled: false,
            debug: false
        };

        this.usedBefore = false;
        this._init();
    }

    _init() {
        this.contentRef = null;
        this.legacyMode = false;

        this.materialNames = new Set();
        this.modelName = 'noname';
        this.objectId = 0;

        this.materialPerSmoothingGroup = false;
        this.useOAsMesh = false;
        this.useIndices = false;
        this.disregardNormals = false;

        this.vertices = [];
        this.colors = [];
        this.normals = [];
        this.uvs = [];

        this.rawMesh = {
            objectName: '',
            groupName: '',
            activeMtlName: '',
            mtllibName: '',

            // reset with new mesh
            faceType: - 1,
            subGroups: [],
            subGroupInUse: null,
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

        this.inputObjectCount = 1;
        this.outputObjectCount = 1;
        this.globalCounts = {
            vertices: 0,
            faces: 0,
            doubleIndicesCount: 0,
            lineByte: 0,
            currentByte: 0,
            totalBytes: 0
        };
    }

    _resetRawMesh() {
        // faces are stored according combined index of group, material and smoothingGroup (0 or not)
        this.rawMesh.subGroups = [];
        this.rawMesh.subGroupInUse = null;
        this.rawMesh.smoothingGroup.normalized = - 1;
        this.rawMesh.smoothingGroup.real = - 1;

        // this default index is required as it is possible to define faces without 'g' or 'usemtl'
        this._pushSmoothingGroup(1);

        this.rawMesh.counts.doubleIndicesCount = 0;
        this.rawMesh.counts.faceCount = 0;
        this.rawMesh.counts.mtlCount = 0;
        this.rawMesh.counts.smoothingGroupCount = 0;
    }

    _configure() {
        this.usedBefore = true;
        this._pushSmoothingGroup(1);
        if (this.logging.enabled) {
            const matNames = (this.materialNames.length > 0) ? '\n\tmaterialNames:\n\t\t- ' + this.materialNames.join('\n\t\t- ') : '\n\tmaterialNames: None';
            let printedConfig = 'OBJLoader2 Parser configuration:'
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
    _execute(arrayBuffer) {
        if (this.logging.enabled) console.time('OBJLoader2Parser.execute');
        this._configure();

        const arrayBufferView = new Uint8Array(arrayBuffer);
        this.contentRef = arrayBufferView;
        const length = arrayBufferView.byteLength;
        this.globalCounts.totalBytes = length;
        const buffer = new Array(128);

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
                    this._processLine(buffer, bufferPointer, slashesCount, word, currentByte);
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

        this._processLine(buffer, bufferPointer, slashesCount, word, currentByte);
        this._finalizeParsing();
        if (this.logging.enabled) console.timeEnd('OBJLoader2Parser.execute');
    }

    /**
     * Parse the provided text
     *
     * @param {string} text OBJ data as string
     */
    _executeLegacy(text) {
        if (this.logging.enabled) console.time('OBJLoader2Parser.executeLegacy');
        this._configure();
        this.legacyMode = true;
        this.contentRef = text;
        const length = text.length;
        this.globalCounts.totalBytes = length;
        const buffer = new Array(128);

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
                    this._processLine(buffer, bufferPointer, slashesCount, word, currentByte);
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

        this._processLine(buffer, bufferPointer, word, slashesCount);
        this._finalizeParsing();
        if (this.logging.enabled) console.timeEnd('OBJLoader2Parser.executeLegacy');
    }

    _processLine(buffer, bufferPointer, slashesCount, word, currentByte) {
        this.globalCounts.lineByte = this.globalCounts.currentByte;
        this.globalCounts.currentByte = currentByte;
        if (bufferPointer < 1) return;
        if (word.length > 0) buffer[bufferPointer++] = word;

        const reconstructString = function(content, legacyMode, start, stop) {
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
                        line += String.fromCharCode(content[i]);
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
                    this.colors.push(parseFloat(buffer[4]));
                    this.colors.push(parseFloat(buffer[5]));
                    this.colors.push(parseFloat(buffer[6]));
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

                // "f vertex ..."
                if (slashesCount === 0) {
                    this._checkFaceType(0);
                    for (i = 2, length = bufferLength; i < length; i++) {
                        this._buildFace(buffer[1]);
                        this._buildFace(buffer[i]);
                        this._buildFace(buffer[i + 1]);
                    }
                    // "f vertex/uv ..."
                }
                else if (bufferLength === slashesCount * 2) {
                    this._checkFaceType(1);
                    for (i = 3, length = bufferLength - 2; i < length; i += 2) {
                        this._buildFace(buffer[1], buffer[2]);
                        this._buildFace(buffer[i], buffer[i + 1]);
                        this._buildFace(buffer[i + 2], buffer[i + 3]);
                    }
                    // "f vertex/uv/normal ..."
                }
                else if (bufferLength * 2 === slashesCount * 3) {
                    this._checkFaceType(2);
                    for (i = 4, length = bufferLength - 3; i < length; i += 3) {
                        this._buildFace(buffer[1], buffer[2], buffer[3]);
                        this._buildFace(buffer[i], buffer[i + 1], buffer[i + 2]);
                        this._buildFace(buffer[i + 3], buffer[i + 4], buffer[i + 5]);
                    }
                    // "f vertex//normal ..."
                }
                else {
                    this._checkFaceType(3);
                    for (i = 3, length = bufferLength - 2; i < length; i += 2) {
                        this._buildFace(buffer[1], undefined, buffer[2]);
                        this._buildFace(buffer[i], undefined, buffer[i + 1]);
                        this._buildFace(buffer[i + 2], undefined, buffer[i + 3]);
                    }
                }
                break;
            case 'l':
            case 'p':
                bufferLength = bufferPointer - 1;
                if (bufferLength === slashesCount * 2) {
                    this._checkFaceType(4);
                    for (i = 1, length = bufferLength + 1; i < length; i += 2) {
                        this._buildFace(buffer[i], buffer[i + 1]);
                    }
                }
                else {
                    this._checkFaceType((lineDesignation === 'l') ? 5 : 6);
                    for (i = 1, length = bufferLength + 1; i < length; i++) {
                        this._buildFace(buffer[i]);
                    }
                }
                break;
            case 's':
                this._pushSmoothingGroup(buffer[1]);
                break;
            case 'g':
                // 'g' leads to creation of mesh if valid data (faces declaration was done before), otherwise only groupName gets set
                this._processCompletedMesh();
                this.rawMesh.groupName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte);
                break;
            case 'o':
                // 'o' is meta-information and usually does not result in creation of new meshes, but can be enforced with "useOAsMesh"
                if (this.useOAsMesh) this._processCompletedMesh();
                this.rawMesh.objectName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte);
                break;
            case 'mtllib':
                this.rawMesh.mtllibName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte);
                break;
            case 'usemtl':
                const mtlName = reconstructString(this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte);
                if (mtlName !== '' && this.rawMesh.activeMtlName !== mtlName) {
                    this.rawMesh.activeMtlName = mtlName;
                    this.rawMesh.counts.mtlCount++;
                    this._checkSubGroup();
                }
                break;
            default:
                break;
        }
    }

    _pushSmoothingGroup(smoothingGroup) {
        let smoothingGroupInt = parseInt(smoothingGroup);
        if (isNaN(smoothingGroupInt)) {
            smoothingGroupInt = smoothingGroup === 'off' ? 0 : 1;
        }

        const smoothCheck = this.rawMesh.smoothingGroup.normalized;
        this.rawMesh.smoothingGroup.normalized = this.rawMesh.smoothingGroup.splitMaterials ? smoothingGroupInt : (smoothingGroupInt === 0) ? 0 : 1;
        this.rawMesh.smoothingGroup.real = smoothingGroupInt;

        if (smoothCheck !== smoothingGroupInt) {
            this.rawMesh.counts.smoothingGroupCount++;
            this._checkSubGroup();
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
    _checkFaceType(faceType) {
        if (this.rawMesh.faceType !== faceType) {
            this._processCompletedMesh();
            this.rawMesh.faceType = faceType;
            this._checkSubGroup();
        }
    }

    _checkSubGroup() {
        const index = this.rawMesh.activeMtlName + '|' + this.rawMesh.smoothingGroup.normalized;
        this.rawMesh.subGroupInUse = this.rawMesh.subGroups[index];

        if (this.rawMesh.subGroupInUse === undefined || this.rawMesh.subGroupInUse === null) {
            this.rawMesh.subGroupInUse = {
                index: index,
                objectName: this.rawMesh.objectName,
                groupName: this.rawMesh.groupName,
                materialName: this.rawMesh.activeMtlName,
                smoothingGroup: this.rawMesh.smoothingGroup.normalized,
                vertices: [],
                indexMappingsCount: 0,
                indexMappings: [],
                indices: [],
                colors: [],
                uvs: [],
                normals: []
            };
            this.rawMesh.subGroups[index] = this.rawMesh.subGroupInUse;
        }
    }

    _buildFace(faceIndexV, faceIndexU, faceIndexN) {
        const subGroupInUse = this.rawMesh.subGroupInUse;
        const scope = this;
        const updateSubGroupInUse = function() {
            const faceIndexVi = parseInt(faceIndexV);
            let indexPointerV = 3 * (faceIndexVi > 0 ? faceIndexVi - 1 : faceIndexVi + scope.vertices.length / 3);
            let indexPointerC = scope.colors.length > 0 ? indexPointerV : null;

            const vertices = subGroupInUse.vertices;
            vertices.push(scope.vertices[indexPointerV++]);
            vertices.push(scope.vertices[indexPointerV++]);
            vertices.push(scope.vertices[indexPointerV]);

            if (indexPointerC !== null) {
                const colors = subGroupInUse.colors;
                colors.push(scope.colors[indexPointerC++]);
                colors.push(scope.colors[indexPointerC++]);
                colors.push(scope.colors[indexPointerC]);
            }

            if (faceIndexU) {
                const faceIndexUi = parseInt(faceIndexU);
                let indexPointerU = 2 * (faceIndexUi > 0 ? faceIndexUi - 1 : faceIndexUi + scope.uvs.length / 2);
                const uvs = subGroupInUse.uvs;
                uvs.push(scope.uvs[indexPointerU++]);
                uvs.push(scope.uvs[indexPointerU]);
            }

            if (faceIndexN && !scope.disregardNormals) {
                const faceIndexNi = parseInt(faceIndexN);
                let indexPointerN = 3 * (faceIndexNi > 0 ? faceIndexNi - 1 : faceIndexNi + scope.normals.length / 3);
                const normals = subGroupInUse.normals;
                normals.push(scope.normals[indexPointerN++]);
                normals.push(scope.normals[indexPointerN++]);
                normals.push(scope.normals[indexPointerN]);
            }
        };

        if (this.useIndices) {
            if (this.disregardNormals) faceIndexN = undefined;
            const mappingName = faceIndexV + (faceIndexU ? '_' + faceIndexU : '_n') + (faceIndexN ? '_' + faceIndexN : '_n');
            let indicesPointer = subGroupInUse.indexMappings[mappingName];
            if (indicesPointer === undefined || indicesPointer === null) {
                indicesPointer = this.rawMesh.subGroupInUse.vertices.length / 3;
                updateSubGroupInUse();
                subGroupInUse.indexMappings[mappingName] = indicesPointer;
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

    _createRawMeshReport(inputObjectCount) {
        return 'Input Object number: ' + inputObjectCount +
            '\n\tObject name: ' + this.rawMesh.objectName +
            '\n\tGroup name: ' + this.rawMesh.groupName +
            '\n\tMtllib name: ' + this.rawMesh.mtllibName +
            '\n\tVertex count: ' + this.vertices.length / 3 +
            '\n\tNormal count: ' + this.normals.length / 3 +
            '\n\tUV count: ' + this.uvs.length / 2 +
            '\n\tSmoothingGroup count: ' + this.rawMesh.counts.smoothingGroupCount +
            '\n\tMaterial count: ' + this.rawMesh.counts.mtlCount +
            '\n\tReal MeshOutputGroup count: ' + this.rawMesh.subGroups.length;
    }

    /**
     * Clear any empty subGroup and calculate absolute vertex, normal and uv counts
     */
    _finalizeRawMesh() {
        const meshOutputGroupTemp = [];
        let meshOutputGroup;
        let absoluteVertexCount = 0;
        let absoluteIndexMappingsCount = 0;
        let absoluteIndexCount = 0;
        let absoluteColorCount = 0;
        let absoluteNormalCount = 0;
        let absoluteUvCount = 0;
        let indices;

        for (const name in this.rawMesh.subGroups) {
            meshOutputGroup = this.rawMesh.subGroups[name];

            if (meshOutputGroup.vertices.length > 0) {
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
        let result = null;
        if (meshOutputGroupTemp.length > 0) {
            result = {
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
        }
        return result;
    }

    _processCompletedMesh() {
        const result = this._finalizeRawMesh();
        const haveMesh = result !== null;
        if (haveMesh) {
            if (this.colors.length > 0 && this.colors.length !== this.vertices.length) {
                this._onError('Vertex Colors were detected, but vertex count and color count do not match!');
            }

            if (this.logging.enabled && this.logging.debug) console.debug(this._createRawMeshReport(this.inputObjectCount));
            this.inputObjectCount++;

            const preparedMesh = this._prepareMesh(result);
            this._onAssetAvailable(preparedMesh);

            const progressBytesPercent = this.globalCounts.currentByte / this.globalCounts.totalBytes;
            this._onProgress('Completed [o: ' + this.rawMesh.objectName + ' g:' + this.rawMesh.groupName + '' +
                '] Total progress: ' + (progressBytesPercent * 100).toFixed(2) + '%');
            this._resetRawMesh();
        }
        return haveMesh;
    }

    /**
     * SubGroups are transformed to too intermediate format that is forwarded to the MeshReceiver.
     * It is ensured that SubGroups only contain objects with vertices (no need to check).
     *
     * @param result
     */
    _prepareMesh(result) {
        const meshOutputGroups = result.subGroups;

        this.globalCounts.vertices += result.absoluteVertexCount / 3;
        this.globalCounts.faces += result.faceCount;
        this.globalCounts.doubleIndicesCount += result.doubleIndicesCount;

        const vertexFA = (result.absoluteVertexCount > 0) ? new Float32Array(result.absoluteVertexCount) : null;
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
        let flatShading;
        let materialIndex = 0;
        let materialOrg, material, materialName, materialNameOrg;
        const materialMetaInfo = {
            cloneInstructions: [],
            multiMaterialNames: new Map(),
            modelName: this.modelName,
            progress: this.globalCounts.currentByte / this.globalCounts.totalBytes,
            geometryType: this.rawMesh.faceType < 4 ? 0 : (this.rawMesh.faceType === 6) ? 2 : 1
        }

        for (const oodIndex in meshOutputGroups) {
            if (!meshOutputGroups.hasOwnProperty(oodIndex)) continue;
            meshOutputGroup = meshOutputGroups[oodIndex];

            materialNameOrg = meshOutputGroup.materialName;
            flatShading = meshOutputGroup.smoothingGroup === 0;
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
            materialOrg = this.materialNames.has(materialNameOrg);
            material = this.materialNames.has(materialName);

            // both original and derived names do not lead to an existing material => need to use a default material
            if (!materialOrg && !material) {
                materialName = haveVertexColors ? 'defaultVertexColorMaterial' : 'defaultMaterial';
                material = this.materialNames.has(materialName);

                if (this.logging.enabled) {
                    console.info('object_group "' + meshOutputGroup.objectName + '_' +
                        meshOutputGroup.groupName + '" was defined with unresolvable material "' +
                        materialNameOrg + '"! Assigning "' + materialName + '".');
                }
            }

            if (!material) {
                const materialCloneInstruction = {
                    materialNameOrg: materialNameOrg,
                    materialProperties: {
                        name: materialName,
                        vertexColors: haveVertexColors ? 2 : 0,
                        flatShading: flatShading
                    }
                };
                //material = MaterialUtils.cloneMaterial(this.materials, materialCloneInstruction, this.logging.enabled && this.logging.debug);
                materialMetaInfo.cloneInstructions.push(materialCloneInstruction);
            }

            if (createMultiMaterial) {
                materialGroupLength = this.useIndices ? meshOutputGroup.indices.length : meshOutputGroup.vertices.length / 3;
                geometryGroups.push({
                    materialGroupOffset: materialGroupOffset,
                    materialGroupLength: materialGroupLength,
                    materialIndex: materialIndex
                });
                //geometry.addGroup(materialGroupOffset, materialGroupLength, materialIndex);
                //material = this.materials.get(materialName);
                multiMaterial[materialIndex] = materialName;
                materialMetaInfo.multiMaterialNames.set(materialIndex, material.name);

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
            materialMetaInfo: materialMetaInfo
        };
    }

    _finalizeParsing() {
        if (this.logging.enabled) console.info('Global output object count: ' + this.outputObjectCount);
        if (this._processCompletedMesh() && this.logging.enabled) {
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
    _onProgress(text) {
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
    _onError(errorMessage) {
        if (this.logging.enabled && this.logging.debug) {
            console.error(errorMessage);
        }
    }

    /**
     * Hook for alteration or transfer to main when parser is run in worker
     *
     * @param {Mesh} mesh
     * @param {object} materialMetaInfo
     */
    _onAssetAvailable(mesh, materialMetaInfo) {
        // empty default implementation
    }

    _onLoad() {
        // empty default implementation
    }
}
