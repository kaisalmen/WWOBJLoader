import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";

function init ( context, id, config ) {
	context.postMessage( { cmd: "init", id: id } );
}

function execute ( context, id, config ) {
	const test1 = {
		cmd: config.params.name,
		data: new Uint32Array( 256 * 1024 * 1024 )
	}
	context.postMessage( test1 );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
