/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	MeshTransmitter
} from "../loaders/obj2/utils/MeshTransmitter.js";

self.meshTransmitter = new MeshTransmitter();
self.buffers = {};

function init ( id, config ) {
	self.buffers = config.buffers;

	self.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( id, config ) {
	console.log( self.buffers.vertices.length );

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
