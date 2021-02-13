import { TorusKnotBufferGeometry } from "../../../../build/three.module.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";
import { GeometryTransport } from "../workerTaskManager/utils/TransferableUtils.js";

function init ( context, id, config ) {
	context.postMessage( { cmd: "init", id: id } );
}

function execute ( context, id, config ) {
	let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, config.params.segments, config.params.segments );
	bufferGeometry.name = config.params.name;

	new GeometryTransport( config.params.name, config.id )
		.setGeometry( bufferGeometry, 2 )
		.package( false )
		.postMessage( context );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
