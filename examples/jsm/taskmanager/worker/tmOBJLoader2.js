/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../../loaders/obj2/OBJLoader2Parser.js";
//import { ObjectManipulator } from "../../loaders/obj2/utils/TransferableUtils.js";
import { TaskManagerDefaultRouting } from "./tmDefaultComRouting.js";

const OBJ2LoaderWorker = {

	init: function ( context, id, config ) {

		context.objParser = new OBJLoader2Parser();
		context.buffer = config.buffer;
		context.postMessage( {
			cmd: "init",
			id: id
		} );

	},

	execute: function ( context, id, config ) {
		/*
			let callbacks = {
				callbackOnAssetAvailable: ( m => { self.postMessage( m ); } ),
				callbackOnProgress: ( text => { console.debug( 'WorkerRunner: progress: ' + text ) } )
			};
			ObjectManipulator.applyProperties( objParser, payload.config, false );
			ObjectManipulator.applyProperties( objParser, callbacks, false );
		*/
		if ( config.data && config.data.input === null ) {

			context.buffer = config.data.input;

		}
		context.objParser.setCallbackOnAssetAvailable( m => {
			context.postMessage( m );
		} );
		context.objParser.setCallbackOnProgress( text => {
			console.debug( 'WorkerRunner: progress: ' + text )
		} );
		context.objParser.objectId = config.id;
		context.objParser.execute( context.buffer );

	}

};

self.addEventListener( 'message', message => TaskManagerDefaultRouting.comRouting( self, message, OBJ2LoaderWorker, 'init', 'execute' ), false );

export { OBJ2LoaderWorker };
