/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../../loaders/obj2/OBJLoader2Parser.js";
//import { ObjectManipulator } from "../../loaders/obj2/utils/TransferableUtils.js";
import { TaskManagerDefaultRouting } from "./tmDefaultComRouting.js";

const OBJ2LoaderWorker = {

	init: function ( context, id, config ) {

		context.obj2 = {
			objParser: new OBJLoader2Parser(),
			buffer: null
		}
		context.obj2.objParser.setCallbackOnAssetAvailable( m => {
			context.postMessage( m );
		} );
		context.obj2.objParser.setCallbackOnProgress( text => {
			console.debug( 'WorkerRunner: progress: ' + text )
		} );
		if ( config.buffer !== undefined && config.buffer !== null ) context.obj2.buffer = config.buffer;

		context.postMessage( {
			cmd: "init",
			id: id
		} );

	},

	execute: function ( context, id, config ) {
		/*
			let callbacks = {
				callbackOnAssetAvailable: ( m => { self.postMessage( m ); } ),
				callbackOnProgress: ( text => { console.de bug( 'WorkerRunner: progress: ' + text ) } )
			};
			ObjectManipulator.applyProperties( objParser, payload.config, false );
			ObjectManipulator.applyProperties( objParser, callbacks, false );
		*/
		if ( config.buffer !== undefined && config.buffer !== null ) context.obj2.buffer = config.buffer;

		context.obj2.objParser.objectId = config.id;
		context.obj2.objParser.execute( context.obj2.buffer );

	}

};

self.addEventListener( 'message', message => TaskManagerDefaultRouting.comRouting( self, message, OBJ2LoaderWorker, 'init', 'execute' ), false );

export { OBJ2LoaderWorker };
