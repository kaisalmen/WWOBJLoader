/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	MeshMessageStructure
} from "../loaders/obj2/utils/TransferableUtils.js";


function init ( context, id, config ) {

	context.config = config;
	context.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( context, id, config ) {

	let payload = MeshMessageStructure.cloneMessageStructure( context.config );
	let vertexArray = payload.main.buffers.vertices.buffer;
	for ( let i = 0; i < vertexArray.length; i++ ) {

		vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

	}
	payload.main.meshName = 'tmProto' + config.count;
	payload.main.params.geometryType = 1;
	payload.main.materials.materialNames = [ 'defaultLineMaterial' ];
	let randArray = new Uint8Array( 3 );
	context.crypto.getRandomValues( randArray );
	payload.main.params.color = {
		r: randArray[ 0 ] / 255,
		g: randArray[ 1 ] / 255,
		b: randArray[ 2 ] / 255
	};
	payload.postMessage( context );

}

function comRouter ( message ) {
	let payload = message.data;
	if ( payload.cmd === 'init' ) {

		init( self, payload.id, payload.config );

	}
	else if ( payload.cmd === 'execute' ) {

		execute( self, payload.id, payload.config );

	}
}

self.addEventListener( 'message', comRouter, false );
