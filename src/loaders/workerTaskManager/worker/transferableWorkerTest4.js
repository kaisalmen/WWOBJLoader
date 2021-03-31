import { TorusKnotBufferGeometry } from "three";
import { WorkerTaskManagerDefaultRouting } from "./defaultRouting.js";
import { GeometryTransport } from "../utils/TransportUtils.js";

const TransferableWorkerTest4 = {

	init: function ( context, id, config ) {
		context.postMessage( { cmd: "init", id: id } );
	},

	execute: function ( context, id, config ) {
		let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, config.params.segments, config.params.segments );
		bufferGeometry.name = config.params.name;

		new GeometryTransport( config.params.name, config.id ).setGeometry( bufferGeometry, 2 ).package( false ).postMessage( context );
	}
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, TransferableWorkerTest4, 'init', 'execute' ), false );

export { TransferableWorkerTest4 }
