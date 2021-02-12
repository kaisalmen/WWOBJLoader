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
	MaterialUtils,
	MaterialCloneInstruction,
	MeshTransport,
	CodeUtils,
	ObjectManipulator
} from "../workerTaskManager/utils/TransferableUtils.js";
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
			{ code: CodeUtils.serializeClass( DataTransport ) },
			{ code: CodeUtils.serializeClass( GeometryTransport ) },
			{ code: CodeUtils.serializeClass( MeshTransport ) },
			{ code: CodeUtils.serializeClass( MaterialsTransport ) },
			{ code: CodeUtils.serializeClass( MaterialUtils ) },
			{ code: CodeUtils.serializeClass( MaterialCloneInstruction ) },
			{ code: CodeUtils.serializeClass( OBJLoader2Parser ) },
			{ code: CodeUtils.serializeClass( ObjectManipulator ) }
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
			{ code: CodeUtils.serializePrototype( MathUtils, null, 'MathUtils', false ) },
			{ code: CodeUtils.serializeClass( Vector2 ) },
			{ code: CodeUtils.serializeClass( Vector3 ) },
			{ code: CodeUtils.serializeClass( Matrix3 ) },
			{ code: CodeUtils.serializeClass( Matrix4 ) },
			{ code: CodeUtils.serializeClass( Euler ) },
			{ code: CodeUtils.serializeClass( Quaternion ) },
			{ code: CodeUtils.serializeClass( Layers ) },
			{ code: 'let _object3DId = 0;\n' },
			{ code: CodeUtils.serializePrototype( Object3D, Object3D.prototype, 'Object3D', true ) },
			{ code: 'Object3D.DefaultUp = new Vector3( 0, 1, 0 );' },
			{ code: 'Object3D.DefaultMatrixAutoUpdate = true;' },
			{ code: CodeUtils.serializeClass( Box3 ) },
			{ code: CodeUtils.serializePrototype( BufferAttribute, BufferAttribute.prototype, 'BufferAttribute', true ) },
			{ code: 'let _id = 0;\n' },
			{ code: 'const _m1 = new Matrix4();\n' },
			{ code: 'const _obj = new Object3D();\n' },
			{ code: 'const _offset = new Vector3();\n' },
			{ code: 'const _box = new Box3();\n' },
			{ code: 'const _boxMorphTargets = new Box3();\n' },
			{ code: 'const _vector = new Vector3();\n' },
			{ code: CodeUtils.serializePrototype( BufferGeometry, BufferGeometry.prototype, 'BufferGeometry', true ) },
			{ code: 'const DefaultLoadingManager = new LoadingManager();' },
			{ code: LoadingManager.toString() + ';\n' },
			{ code: CodeUtils.serializePrototype( Loader, Loader.prototype, 'Loader', true ) },
			{ code: CodeUtils.serializePrototype( MaterialLoader, MaterialLoader.prototype, 'MaterialLoader', true ) },
			{ code: 'let materialId = 0;\n' },
			{ code: CodeUtils.serializePrototype( Material, Material.prototype, 'Material', true ) },
			{ code: CodeUtils.serializeClass( Color ) },
			{ code: CodeUtils.serializePrototype( MeshStandardMaterial, MeshStandardMaterial.prototype, 'MeshStandardMaterial', true ) },
			{ code: CodeUtils.serializePrototype( MeshBasicMaterial, MeshBasicMaterial.prototype, 'MeshBasicMaterial', true ) },
			{ code: CodeUtils.serializePrototype( Mesh, Mesh.prototype, 'Mesh', true ) },
			{ code: CodeUtils.serializeClass( DataTransport ) },
			{ code: CodeUtils.serializeClass( GeometryTransport ) },
			{ code: CodeUtils.serializeClass( MeshTransport ) },
			{ code: CodeUtils.serializeClass( MaterialsTransport ) },
			{ code: CodeUtils.serializeClass( MaterialUtils ) },
			{ code: CodeUtils.serializeClass( OBJLoader2Parser ) },
			{ code: CodeUtils.serializeClass( ObjectManipulator ) }
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
		context.obj2.parser._onAssetAvailable = structuredWorkerMessage => {
			structuredWorkerMessage.postMessage( context );
		};
		context.obj2.parser.callbacks.onLoad = structuredWorkerMessage => {
			structuredWorkerMessage.postMessage( context );
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
