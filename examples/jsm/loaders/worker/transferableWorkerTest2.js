import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";

function init ( context, id, config ) {
	context.storage = {
		whoami: id,
	};

	context.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( context, id, config ) {
	const test2 = {
		cmd: 'test2',
		data: new Uint32Array( 256 * 1024 * 1024 )
	}
	context.postMessage( test2, [ test2.data.buffer ] );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
