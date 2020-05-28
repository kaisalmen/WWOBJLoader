/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	TorusKnotBufferGeometry
} from "../../../build/three.module.js";
import {
	MeshTransmitter
} from "../loaders/obj2/utils/MeshTransmitter.js";

const meshTransmitter = new MeshTransmitter();

function init ( id, config ) {
		self.storage = {
			whoami: id,
		};

		self.postMessage( {
			cmd: "init",
			id: id
		} );

	}

function execute ( id, config ) {

	let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, 100, 64 );

	let vertexBA = bufferGeometry.getAttribute( 'position' ) ;
	let vertexArray = vertexBA.array;
	for ( let i = 0; i < vertexArray.length; i++ ) {

		vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

	}

	meshTransmitter.handleBufferGeometry( bufferGeometry, id, 'wwobj' + config.count, self.postMessage );

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
