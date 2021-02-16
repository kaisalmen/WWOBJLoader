import { WorkerTaskManagerDefaultRouting } from "./defaultRouting.js";

function init ( context, id, config ) {
	context.postMessage( { cmd: "init", id: id } );
}

function execute ( context, id, config ) {
	const test2 = {
		cmd: config.params.name,
		data: new Uint32Array( 256 * 1024 * 1024 )
	}
	context.postMessage( test2, [ test2.data.buffer ] );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
