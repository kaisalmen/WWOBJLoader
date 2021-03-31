import { WorkerTaskManagerDefaultRouting } from "./defaultRouting.js";

const TransferableWorkerTest1 = {

	init: function ( context, id, config ) {
		context.postMessage( { cmd: "init", id: id } );
	},

	execute: function ( context, id, config ) {
		const test1 = {
			cmd: config.params.name,
			data: new Uint32Array( 256 * 1024 * 1024 )
		}
		context.postMessage( test1 );
	}
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, TransferableWorkerTest1, 'init', 'execute' ), false );

export { TransferableWorkerTest1 }
