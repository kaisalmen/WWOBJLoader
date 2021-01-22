import { TorusKnotBufferGeometry } from "../../../../build/three.module.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";
import { TransferableUtils } from "../workerTaskManager/utils/TransferableUtils.js";

function init ( context, id, config ) {
	context.postMessage( { cmd: "init", id: id } );
}

function execute ( context, id, config ) {
	let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, config.params.segments, config.params.segments );
	bufferGeometry.name = config.params.name;

	const payload = TransferableUtils.packageBufferGeometry( bufferGeometry, config.id, 2, false );
	payload.main.cmd = config.params.name;
	payload.postMessage( context );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
