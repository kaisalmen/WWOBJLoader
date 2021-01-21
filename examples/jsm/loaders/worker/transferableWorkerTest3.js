import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";
import { TorusKnotBufferGeometry } from "../../../../build/three.module.js";

function init ( context, id, config ) {
	context.postMessage( { cmd: "init", id: id } );

}

function execute ( context, id, config ) {
	let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, config.params.segments, config.params.segments );
	bufferGeometry.name = config.params.name;

	const test3 = {
		cmd: config.params.name,
		data: bufferGeometry
	}
	context.postMessage( test3 );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
