/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { TransferableUtils } from "../workerTaskManager/utils/TransferableUtils.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";


function init ( context, id, config ) {

	context.config = config;
	context.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( context, id, config ) {

	let geometry = TransferableUtils.reconstructBufferGeometry( context.config.geometry, true );
	geometry.name = 'tmProto' + config.id;
	let vertexArray = geometry.getAttribute( 'position' ).array;
	for ( let i = 0; i < vertexArray.length; i++ ) {

		vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

	}
	const payload = TransferableUtils.packageBufferGeometry( geometry, config.id, 1, false, [ 'defaultLineMaterial' ] );
	let randArray = new Uint8Array( 3 );
	context.crypto.getRandomValues( randArray );
	payload.main.params.color = {
		r: randArray[ 0 ] / 255,
		g: randArray[ 1 ] / 255,
		b: randArray[ 2 ] / 255
	};

	payload.postMessage( context );

}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );
