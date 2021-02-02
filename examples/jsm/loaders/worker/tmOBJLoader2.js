/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2 } from "../OBJLoader2.js";
import { ObjectManipulator } from "../workerTaskManager/utils/TransferableUtils.js";
import { WorkerTaskManagerDefaultRouting } from "../workerTaskManager/comm/worker/defaultRouting.js";

const OBJ2LoaderWorker = {

	init: function ( context, id, config ) {

		context.obj2 = {
			objParser: new OBJLoader2(),
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
		context.obj2.buffer = config.buffers[ 'modelData' ];

		if ( context.obj2.buffer ) {
			context.obj2.objParser.objectId = config.id;
			context.obj2.objParser._execute( context.obj2.buffer );
		}

	}

};

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, OBJ2LoaderWorker, 'init', 'execute' ), false );

export { OBJ2LoaderWorker };
