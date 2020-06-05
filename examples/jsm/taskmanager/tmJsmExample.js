/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	TorusKnotBufferGeometry
} from "../../../build/three.module.js";
import {
	TransferableUtils
} from "../loaders/obj2/utils/TransferableUtils.js";

function init ( id, config ) {
		self.storage = {
			whoami: id,
		};

		self.postMessage( {
			cmd: "init",
			id: id
		} );

	}

async function execute ( id, config ) {

	let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, 100, 64 );

	let vertexBA = bufferGeometry.getAttribute( 'position' ) ;
	let vertexArray = vertexBA.array;
	for ( let i = 0; i < vertexArray.length; i++ ) {

		vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

	}
	let payload = TransferableUtils.packageBufferGeometry( bufferGeometry, 'tmProto' + config.count, 2,[ 'defaultPointMaterial' ] );

	let randArray = new Uint8Array( 3 );
	self.crypto.getRandomValues( randArray );
	payload.main.params.color = {
		r: randArray[ 0 ] / 255,
		g: randArray[ 1 ] / 255,
		b: randArray[ 2 ] / 255
	};
	payload.postMessage( self );

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
