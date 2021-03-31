import { WorkerTaskManagerDefaultRouting } from "./defaultRouting.js";
import { TorusKnotBufferGeometry } from "three";

const TransferableWorkerTest3 = {

	init: function ( context, id, config ) {
		context.postMessage( { cmd: "init", id: id } );
	},

	execute: function ( context, id, config ) {
		let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, config.params.segments, config.params.segments );
		bufferGeometry.name = config.params.name;

		const test3 = {
			cmd: config.params.name,
			data: bufferGeometry
		}
		context.postMessage( test3 );
	}
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, TransferableWorkerTest3, 'init', 'execute' ), false );

export { TransferableWorkerTest3 }
