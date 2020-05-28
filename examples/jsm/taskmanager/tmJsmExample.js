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

	let payload = meshTransmitter.handleBufferGeometry( bufferGeometry, 'tmProto' + config.count, [ 'defaultPointMaterial' ], 2 );
//	let time = performance.now() + performance.timeOrigin;
	payload.main.params.color = {
		r: 0.2,
		g: 0.25 + Math.random() * 0.5,
		b: 0.2,
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
