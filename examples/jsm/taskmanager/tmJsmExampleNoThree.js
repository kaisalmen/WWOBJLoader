/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	TransferableUtils
} from "../loaders/obj2/utils/TransferableUtils.js";


self.config = {};

function init ( id, config ) {

	self.config = config;
	self.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( id, config ) {

	let payload = TransferableUtils.cloneMessageStructure( self.config );
	let vertexArray = payload.main.buffers.vertices.buffer;
	for ( let i = 0; i < vertexArray.length; i++ ) {

		vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

	}
	payload.main.meshName = 'tmProto' + config.count;
	payload.main.params.geometryType = 1;
	payload.main.materials.materialNames = [ 'defaultLineMaterial' ];
	let randArray = new Uint8Array( 3 );
	self.crypto.getRandomValues( randArray );
	payload.main.params.color = {
		r: randArray[ 0 ] / 255,
		g: randArray[ 1 ] / 255,
		b: randArray[ 2 ] / 255
	};

	self.postMessage( payload.main, payload.transferables );

}

function manageCom ( message ) {
	let payload = message.data;
	if ( payload.cmd === 'init' ) {

		init( payload.id, payload.config );

	}
	else if ( payload.cmd === 'execute' ) {

		execute( payload.id, payload.config );

	}
}

self.addEventListener( 'message', manageCom, false );
