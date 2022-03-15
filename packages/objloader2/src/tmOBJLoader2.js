import {
    Object3D,
    Material,
    Mesh,
    MathUtils,
} from 'three';
import {
    DataTransport,
    GeometryTransport,
    MaterialsTransport,
    MeshTransport,
    ObjectUtils,
    ObjectManipulator,
    MaterialUtils,
    WorkerTaskManagerDefaultRouting,
    DeUglify
} from 'three-wtm';
import { OBJLoader2Parser } from './OBJLoader2.js';

class OBJ2LoaderWorker {

    static init(context, id, config) {
        const materialsTransport = new MaterialsTransport().loadData(config);
        context.obj2 = {
            parser: new OBJLoader2Parser(),
            buffer: null,
            materials: materialsTransport.getMaterials()
        }
        context.obj2.parser._onMeshAlter = (mesh, materialMetaInfo) => {
            const materialsTransport = new MaterialsTransport();
            materialsTransport.main.multiMaterialNames = materialMetaInfo.multiMaterialNames;

            // only makes sense if materials are newly created, what they currently are not
            if (Object.keys(materialsTransport.main.multiMaterialNames).length === 0) {
                const material = mesh.material;
                MaterialUtils.addMaterial(materialsTransport.main.materials, material, material.name, false, false);
            }
            materialsTransport.main.cloneInstructions = materialMetaInfo.cloneInstructions;
            materialsTransport.cleanMaterials();

            const meshTransport = new MeshTransport('assetAvailable', materialMetaInfo.objectId)
                .setProgress(materialMetaInfo.progress)
                .setParams({ modelName: materialMetaInfo.modelName })
                .setMesh(mesh, materialMetaInfo.geometryType)
                .setMaterialsTransport(materialsTransport);

            meshTransport.postMessage(context);
        };

        context.obj2.parser.callbacks.onLoad = () => {
            const dataTransport = new DataTransport('execComplete', context.obj2.parser.objectId);
            dataTransport.postMessage(context);
        };

        context.obj2.parser.callbacks.onProgress = text => {
            if (context.obj2.parser.logging.debug) console.debug('WorkerRunner: progress: ' + text);
        };

        ObjectManipulator.applyProperties(context.obj2.parser, materialsTransport.getParams(), false);
        const buffer = materialsTransport.getBuffer('modelData')
        if (buffer !== undefined && buffer !== null) context.obj2.buffer = buffer;

        new DataTransport('init', id).postMessage(context);
    }

    static execute(context, id, config) {
        if (context.obj2.parser.usedBefore) {
            context.obj2.parser._init();
        }
        context.obj2.parser.materials = context.obj2.materials;

        const dataTransport = new DataTransport().loadData(config);
        ObjectManipulator.applyProperties(context.obj2.parser, dataTransport.getParams(), false);

        const buffer = dataTransport.getBuffer('modelData')
        if (buffer !== undefined && buffer !== null) context.obj2.buffer = buffer;

        if (context.obj2.buffer) {
            context.obj2.parser.objectId = dataTransport.getId();
            context.obj2.parser._execute(context.obj2.buffer);
        }
    }

}

self.addEventListener('message', message => WorkerTaskManagerDefaultRouting.comRouting(self, message, OBJ2LoaderWorker, 'init', 'execute'), false);

export { OBJ2LoaderWorker };
