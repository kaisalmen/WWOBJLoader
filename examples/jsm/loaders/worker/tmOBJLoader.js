/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { MaterialLoader } from "../../../../src/loaders/MaterialLoader.js";
import { OBJLoader } from "../OBJLoader.js";
import { MeshTransport, TransportBase } from "../workerTaskManager/utils/TransferableUtils.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";

const OBJLoaderWorker = {

	init: function ( context, id, config ) {

		context.objLoader = {
			loader: null,
			buffer: null
		}
		context.postMessage( {
			cmd: "init",
			id: id
		} );
		if ( config.buffer !== undefined && config.buffer !== null ) context.objLoader.buffer = config.buffer;

	},

	execute: function ( context, id, config ) {

		context.objLoader.loader = new OBJLoader();
		context.objLoader.loader.objectId = config.id;
		const materialLoader = new MaterialLoader();
		let material, materialJson;
		let materialsIn = config.params.materials;
		let materialsOut = {};
		for ( let materialName in materialsIn ) {

			materialJson = materialsIn[ materialName ];
			if ( materialJson !== undefined && materialJson !== null ) {

				material = materialLoader.parse( materialJson );
//				console.info( 'De-serialized material with name "' + materialName + '" will be added.' );
				materialsOut[ materialName ] = material;

			}

		}
		context.objLoader.loader.setMaterials( materialsOut );

		const enc = new TextDecoder("utf-8");
		let meshes = context.objLoader.loader.parse( enc.decode( context.objLoader.buffer ) );
		for ( let mesh, i = 0; i < meshes.children.length; i ++ ) {

			mesh = meshes.children[ i ];
			mesh.name = mesh.name + config.id;
			new MeshTransport( 'assetAvailable', config.id )
				.setMesh( mesh, 0 )
				.package( false )
				.postMessage( context );

		}

		// signal complete
		new TransportBase( 'execComplete' ).postMessage( context );

	}

};

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, OBJLoaderWorker, 'init', 'execute' ), false );

export { OBJLoaderWorker };
