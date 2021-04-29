import {
	EventDispatcher,
	Color,
	Vector2,
	Vector3,
	Matrix3,
	Matrix4,
	Euler,
	Quaternion,
	Layers,
	Object3D,
	LoadingManager,
	Loader,
	MaterialLoader,
	Material,
	BufferAttribute,
	BufferGeometry,
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
	WorkerTaskManagerDefaultRouting
} from 'three-wtm';
import { OBJLoader2Parser } from '../../OBJLoader2.js';


class OBJ2LoaderWorker {

	static buildStandardWorkerDependencies ( threeJsLocation ) {
		return [
/*
			{ code: 'const StaticDrawUsage = 35044;\n' },
			{ code: ObjectUtils.serializeClass( EventDispatcher ) },
			{ code: 'let _object3DId = 0;\n' },
			{ code: 'const _lut = [];\n' },
			{ code: ObjectUtils.serializePrototype( MathUtils, null, 'MathUtils', false ) },
			{ code: 'const generateUUID = MathUtils.generateUUID;\n' },
			{ code: ObjectUtils.serializeClass( Color ) },
			{ code: ObjectUtils.serializeClass( Vector2 ) },
			{ code: ObjectUtils.serializeClass( Vector3 ) },
			{ code: ObjectUtils.serializeClass( Matrix3 ) },
			{ code: ObjectUtils.serializeClass( Matrix4 ) },
			{ code: ObjectUtils.serializeClass( Euler ) },
			{ code: ObjectUtils.serializeClass( Quaternion ) },
			{ code: ObjectUtils.serializeClass( Layers ) },
			{ code: 'let _id = 0;\n' },
			{ code: ObjectUtils.serializeClass( Object3D ) },
			{ code: 'Object3D.DefaultUp = new Vector3(0, 1, 0);\n' },
			{ code: ObjectUtils.serializeClass( LoadingManager ) },
			{ code: 'const DefaultLoadingManager = new LoadingManager();\n' },
			{ code: ObjectUtils.serializeClass( Loader ) },
			{ code: ObjectUtils.serializeClass( Material ) },
			{ code: ObjectUtils.serializeClass( MaterialLoader ) },
			{ code: ObjectUtils.serializeClass( BufferAttribute ) },
			{ code: ObjectUtils.serializeClass( BufferGeometry ) },
			{ code: ObjectUtils.serializeClass( Mesh ) },
*/
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
			{ code: ObjectUtils.serializeClass( OBJLoader2Parser ) },
			{ code: ObjectUtils.serializeClass( ObjectManipulator ) }
		]
	}

	static init ( context, id, config ) {

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

	}

	static execute ( context, id, config ) {

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

}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, OBJ2LoaderWorker, 'init', 'execute' ), false );

export { OBJ2LoaderWorker };
