export class MeshReceiver {
    constructor(materialHandler: any);
    logging: {
        enabled: boolean;
        debug: boolean;
    };
    callbacks: {
        onProgress: null;
        onMeshAlter: null;
    };
    materialHandler: any;
    setLogging(enabled: boolean, debug: boolean): void;
    private _setCallbacks;
    buildMeshes(meshPayload: Object): Mesh[];
}
export class LoadedMeshUserOverride {
    constructor(disregardMesh: any, alteredMesh: any);
    disregardMesh: boolean;
    alteredMesh: boolean;
    meshes: any[];
    addMesh(mesh: Mesh): void;
    isDisregardMesh(): boolean;
    providesAlteredMeshes(): boolean;
}
import { Mesh } from "../../../../../build/three.module.js";
