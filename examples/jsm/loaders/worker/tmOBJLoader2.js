/**
 * @author Kai Salmen / www.kaisalmen.de
 */

// Imports only related to worker (when standard workers (modules aren't supported) are used)
import {
	MathUtils,
	Color,
	Vector2,
	Vector3,
	Matrix3,
	Matrix4,
	Euler,
	Quaternion,
	Layers,
	Object3D,
	Box3,
	BufferAttribute,
	BufferGeometry,
	Mesh,
	Material,
	LoadingManager,
	Loader,
	MaterialLoader,
	MeshBasicMaterial,
	MeshStandardMaterial
}
from '../../../../build/three.module.js';
import {
	DataTransport,
	GeometryTransport,
	MaterialsTransport,
	MeshTransport,
	ObjectUtils,
	ObjectManipulator
} from "../workerTaskManager/utils/TransportUtils.js";
import {
	MaterialCloneInstruction,
	MaterialUtils
} from '../workerTaskManager/utils/MaterialUtils.js';
import { OBJLoader2Parser } from "../OBJLoader2.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";

const OBJ2LoaderWorker = {

	buildStandardWorkerDependencies: function ( threeJsLocation ) {
		return [
			{ url: threeJsLocation },
			{ code: '\n\n' },
			{ code: 'const MathUtils = THREE.MathUtils;\n' },
			{ code: 'const MaterialLoader = THREE.MaterialLoader;\n' },
			{ code: 'const Material = THREE.Material;\n' },
			{ code: 'const Texture = THREE.Texture;\n' },
			{ code: 'const Object3D = THREE.Object3D;\n' },
			{ code: 'const BufferAttribute = THREE.BufferAttribute;\n' },
			{ code: 'const BufferGeometry = THREE.BufferGeometry;\n' },
			{ code: 'const Mesh = THREE.Mesh;\n' },
			{ code: '\n\n' },
			{ code: ObjectUtils.serializeClass( DataTransport ) },
			{ code: ObjectUtils.serializeClass( GeometryTransport ) },
			{ code: ObjectUtils.serializeClass( MeshTransport ) },
			{ code: ObjectUtils.serializeClass( MaterialsTransport ) },
			{ code: ObjectUtils.serializeClass( MaterialUtils ) },
			{ code: ObjectUtils.serializeClass( MaterialCloneInstruction ) },
			{ code: ObjectUtils.serializeClass( OBJLoader2Parser ) },
			{ code: ObjectUtils.serializeClass( ObjectManipulator ) }
		]
/*
		return [
			{ code: 'const FrontSide = 0;\n' },
			{ code: 'const FlatShading = 1;\n' },
			{ code: 'const NormalBlending = 1;\n' },
			{ code: 'const LessEqualDepth = 3;\n' },
			{ code: 'const AddEquation = 100;\n' },
			{ code: 'const OneMinusSrcAlphaFactor = 205;\n' },
			{ code: 'const SrcAlphaFactor = 204;\n' },
			{ code: 'const AlwaysStencilFunc = 519;\n' },
			{ code: 'const KeepStencilOp = 7680;\n' },
			{ code: 'const TangentSpaceNormalMap = 0;\n' },
			{ code: 'const VertexColors = 2;\n' },
			{ code: 'const StaticDrawUsage = 35044;\n' },
			{ code: 'const MultiplyOperation = 0;\n' },
			{ code: 'const _lut = [];\n' },
			{ code: ObjectUtils.serializePrototype( MathUtils, null, 'MathUtils', false ) },
			{ code: ObjectUtils.serializeClass( Vector2 ) },
			{ code: ObjectUtils.serializeClass( Vector3 ) },
			{ code: ObjectUtils.serializeClass( Matrix3 ) },
			{ code: ObjectUtils.serializeClass( Matrix4 ) },
			{ code: ObjectUtils.serializeClass( Euler ) },
			{ code: ObjectUtils.serializeClass( Quaternion ) },
			{ code: ObjectUtils.serializeClass( Layers ) },
			{ code: 'let _object3DId = 0;\n' },
			{ code: ObjectUtils.serializePrototype( Object3D, Object3D.prototype, 'Object3D', true ) },
			{ code: 'Object3D.DefaultUp = new Vector3( 0, 1, 0 );' },
			{ code: 'Object3D.DefaultMatrixAutoUpdate = true;' },
			{ code: ObjectUtils.serializeClass( Box3 ) },
			{ code: ObjectUtils.serializePrototype( BufferAttribute, BufferAttribute.prototype, 'BufferAttribute', true ) },
			{ code: 'let _id = 0;\n' },
			{ code: 'const _m1 = new Matrix4();\n' },
			{ code: 'const _obj = new Object3D();\n' },
			{ code: 'const _offset = new Vector3();\n' },
			{ code: 'const _box = new Box3();\n' },
			{ code: 'const _boxMorphTargets = new Box3();\n' },
			{ code: 'const _vector = new Vector3();\n' },
			{ code: ObjectUtils.serializePrototype( BufferGeometry, BufferGeometry.prototype, 'BufferGeometry', true ) },
			{ code: 'const DefaultLoadingManager = new LoadingManager();' },
			{ code: LoadingManager.toString() + ';\n' },
			{ code: ObjectUtils.serializePrototype( Loader, Loader.prototype, 'Loader', true ) },
			{ code: ObjectUtils.serializePrototype( MaterialLoader, MaterialLoader.prototype, 'MaterialLoader', true ) },
			{ code: 'let materialId = 0;\n' },
			{ code: ObjectUtils.serializePrototype( Material, Material.prototype, 'Material', true ) },
			{ code: ObjectUtils.serializeClass( Color ) },
			{ code: ObjectUtils.serializePrototype( MeshStandardMaterial, MeshStandardMaterial.prototype, 'MeshStandardMaterial', true ) },
			{ code: ObjectUtils.serializePrototype( MeshBasicMaterial, MeshBasicMaterial.prototype, 'MeshBasicMaterial', true ) },
			{ code: ObjectUtils.serializePrototype( Mesh, Mesh.prototype, 'Mesh', true ) },
			{ code: ObjectUtils.serializeClass( DataTransport ) },
			{ code: ObjectUtils.serializeClass( GeometryTransport ) },
			{ code: ObjectUtils.serializeClass( MeshTransport ) },
			{ code: ObjectUtils.serializeClass( MaterialsTransport ) },
			{ code: ObjectUtils.serializeClass( MaterialUtils ) },
			{ code: ObjectUtils.serializeClass( OBJLoader2Parser ) },
			{ code: ObjectUtils.serializeClass( ObjectManipulator ) }
		];
 */
	},

	init: function ( context, id, config ) {

		const materialsTransport = new MaterialsTransport().loadData( config );
		context.obj2 = {
			parser: new OBJLoader2Parser(),
			buffer: null,
			materials: materialsTransport.getMaterials()
		}
		context.obj2.parser._onMeshAlter = ( mesh, materialMetaInfo ) => {

			const materialsTransport = new MaterialsTransport();
			materialsTransport.main.multiMaterialNames = materialMetaInfo.multiMaterialNames;

			// only makes sense if materials are newly created, what they currently are not
			if ( Object.keys( materialsTransport.main.multiMaterialNames ).length === 0 ) {

				const material = mesh.material;
				MaterialUtils.addMaterial( materialsTransport.main.materials, material, material.name, false, false );

			}
			materialsTransport.main.cloneInstructions = materialMetaInfo.cloneInstructions;
			materialsTransport.cleanMaterials();

			const meshTransport = new MeshTransport( 'assetAvailable', materialMetaInfo.objectId )
				.setProgress( materialMetaInfo.progress )
				.setParams( { modelName: materialMetaInfo.modelName } )
				.setMesh( mesh, materialMetaInfo.geometryType )
				.setMaterialsTransport( materialsTransport );

			meshTransport.postMessage( context );

		};
		context.obj2.parser.callbacks.onLoad = () => {

			const dataTransport = new DataTransport( 'execComplete', context.obj2.parser.objectId );
			dataTransport.postMessage( context );

		};
		context.obj2.parser.callbacks.onProgress = text => {
			if ( context.obj2.parser.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
		};

		ObjectManipulator.applyProperties( context.obj2.parser, materialsTransport.getParams(), false );
		const buffer = materialsTransport.getBuffer( 'modelData' )
		if ( buffer !== undefined && buffer !== null ) context.obj2.buffer = buffer;

		context.postMessage( {
			cmd: "init",
			id: id
		} );

	},

	execute: function ( context, id, config ) {

		if ( context.obj2.parser.usedBefore ) {

			context.obj2.parser._init();

		}
		context.obj2.parser.materials = context.obj2.materials;

		const dataTransport = new DataTransport().loadData( config );
		ObjectManipulator.applyProperties( context.obj2.parser, dataTransport.getParams(), false );

		const buffer = dataTransport.getBuffer( 'modelData' )
		if ( buffer !== undefined && buffer !== null ) context.obj2.buffer = buffer;

		if ( context.obj2.buffer ) {
			context.obj2.parser.objectId = dataTransport.getId();
			context.obj2.parser._execute( context.obj2.buffer );
		}

	}

};

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, OBJ2LoaderWorker, 'init', 'execute' ), false );

export { OBJ2LoaderWorker };
