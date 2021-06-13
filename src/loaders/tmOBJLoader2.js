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

	static buildStandardWorkerDependencies ( threeJsLocation ) {
		return [
			{ url: threeJsLocation },
			{ code: DeUglify.buildThreeConst() },
			{ code: OBJ2LoaderWorker.buildThreeExtraConst() },
			{ code: '\n\n' },
			{ code: DeUglify.buildUglifiedThreeMapping() },
			{ code: OBJ2LoaderWorker.buildUglifiedThreeExtraMapping() },
			{ code: '\n\n' },
			{ code: ObjectUtils.serializeClass( DataTransport ) },
			{ code: ObjectUtils.serializeClass( GeometryTransport ) },
			{ code: ObjectUtils.serializeClass( MeshTransport ) },
			{ code: ObjectUtils.serializeClass( MaterialsTransport ) },
			{ code: ObjectUtils.serializeClass( MaterialUtils ) },
			{ code: ObjectUtils.serializeClass( OBJLoader2Parser ) },
			{ code: ObjectUtils.serializeClass( ObjectManipulator ) },
			{ code: DeUglify.buildUglifiedThreeWtmMapping() },
			{ code: '\n\n' }
		]
	}

	static buildThreeExtraConst () {
		return 'const MathUtils = THREE.MathUtils;\n' +
			'const Material = THREE.Material;\n' +
			'const Object3D = THREE.Object3D;\n' +
			'const Mesh = THREE.Mesh;\n';
	}

	static buildUglifiedThreeExtraMapping () {
		function _MathUtils () { return MathUtils; }
		function _Material () { return Material; }
		function _Object3D () { return Object3D; }
		function _Mesh () { return Mesh; }

		return DeUglify.buildUglifiedNameAssignment( _MathUtils, 'MathUtils', /_MathUtils/, false ) +
			DeUglify.buildUglifiedNameAssignment( _Material, 'Material', /_Material/, false ) +
			DeUglify.buildUglifiedNameAssignment( _Object3D, 'Object3D', /_Object3D/, false ) +
			DeUglify.buildUglifiedNameAssignment( _Mesh, 'Mesh', /_Mesh/, false );
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

		new DataTransport( 'init', id ).postMessage( context );

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
