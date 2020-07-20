/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../loaders/obj2/OBJLoader2Parser.js";
import { FileLoader } from "../../../build/three.module.js";
import { ObjectManipulator } from "../loaders/obj2/utils/TransferableUtils.js";
import { comRouting } from "./tmDefaultComRouting.js";

let objParser;
let file;

const loadFile = async function ( file ) {

	let fileLoader = new FileLoader();
	fileLoader.setResponseType( 'arraybuffer' );
	return await fileLoader.loadAsync( file )

}

function init ( context, id, config ) {

	objParser = new OBJLoader2Parser();
	file = config.file;
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

	objParser.setCallbackOnAssetAvailable( m => { self.postMessage( m ); } );
	objParser.setCallbackOnProgress( text => { console.debug( 'WorkerRunner: progress: ' + text ) } );
	loadFile( file )
		.then( ab => {
			objParser.objectId = config.id;
			objParser.execute( ab )

		} )
		.catch( e => console.error( e ) );

}

self.addEventListener( 'message', message => comRouting(  message, init, execute ), false );
