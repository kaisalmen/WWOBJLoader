/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { GeometryReceiver, GeometrySender } from "../workerTaskManager/utils/TransferableUtils.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";


function init ( context, id, config ) {

	context.config = config;
	context.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( context, id, config ) {

	const receiver = new GeometryReceiver( context.config );
	const geometry = receiver.reconstruct( true ).getBufferGeometry();
	geometry.name = 'tmProto' + config.id;
	let vertexArray = geometry.getAttribute( 'position' ).array;
	for ( let i = 0; i < vertexArray.length; i++ ) {

		vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

	}

	const sender = new GeometrySender( 'execComplete', config.id );
	sender.package( geometry, 1, false );

	let randArray = new Uint8Array( 3 );
	context.crypto.getRandomValues( randArray );
	sender.main.params.color = {
		r: randArray[ 0 ] / 255,
		g: randArray[ 1 ] / 255,
		b: randArray[ 2 ] / 255
	};

	sender.postMessage( context );

}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
