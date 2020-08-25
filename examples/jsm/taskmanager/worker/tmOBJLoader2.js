/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../../loaders/obj2/OBJLoader2Parser.js";
import { ObjectManipulator } from "../../taskmanager/utils/TransferableUtils.js";
import { TaskManagerDefaultRouting } from "./tmDefaultComRouting.js";

const OBJ2LoaderWorker = {

	init: function ( context, id, config ) {

		context.obj2 = {
			objParser: new OBJLoader2Parser(),
			buffer: null
		}
		if ( config.logging ) {
			context.obj2.objParser.setLogging( config.logging.enabled, config.logging.debug );
		}

		context.obj2.objParser.setCallbackOnAssetAvailable( m => {
			context.postMessage( m );
		} );
		context.obj2.objParser.setCallbackOnProgress( text => {
			if ( context.obj2.objParser.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
		} );



		ObjectManipulator.applyProperties( context.obj2.objParser, config.params, false );
		if ( config.buffer !== undefined && config.buffer !== null ) context.obj2.buffer = config.buffer;

		context.postMessage( {
			cmd: "init",
			id: id
		} );

	},

	execute: function ( context, id, config ) {

		if ( context.obj2.objParser.isUsedBefore() ) {

			context.obj2.objParser._init();

		}

		ObjectManipulator.applyProperties( context.obj2.objParser, config.params, false );
		if ( config.buffer !== undefined && config.buffer !== null ) context.obj2.buffer = config.buffer;

		context.obj2.objParser.objectId = config.id;
		context.obj2.objParser.execute( context.obj2.buffer );

	}

};

self.addEventListener( 'message', message => TaskManagerDefaultRouting.comRouting( self, message, OBJ2LoaderWorker, 'init', 'execute' ), false );

export { OBJ2LoaderWorker };
