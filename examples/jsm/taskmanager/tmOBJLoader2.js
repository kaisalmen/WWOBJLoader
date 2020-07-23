/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../loaders/obj2/OBJLoader2Parser.js";
import { ObjectManipulator } from "../loaders/obj2/utils/TransferableUtils.js";
import { comRouting } from "./tmDefaultComRouting.js";


function init ( context, id, config ) {

	self.objParser = new OBJLoader2Parser();
	self.buffer = config.buffer;
	context.postMessage( {
		cmd: "init",
		id: id
	} );

}

function execute ( context, id, config ) {
/*
	let callbacks = {
		callbackOnAssetAvailable: ( m => { self.postMessage( m ); } ),
		callbackOnProgress: ( text => { console.debug( 'WorkerRunner: progress: ' + text ) } )
	};
	ObjectManipulator.applyProperties( objParser, payload.config, false );
	ObjectManipulator.applyProperties( objParser, callbacks, false );
*/
	self.objParser.setCallbackOnAssetAvailable( m => { self.postMessage( m ); } );
	self.objParser.setCallbackOnProgress( text => { console.debug( 'WorkerRunner: progress: ' + text ) } );
	self.objParser.objectId = config.id;
	self.objParser.execute( self.buffer );

}

self.addEventListener( 'message', message => comRouting(  message, init, execute ), false );
