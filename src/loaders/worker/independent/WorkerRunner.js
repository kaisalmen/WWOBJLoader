/**
 * @author Kai Salmen / www.kaisalmen.de
 */

//import { MeshTransmitter } from "../../util/MeshTransmitter.js";
import { ObjectManipulator } from "./ObjectManipulator.js";


/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 * @constructor
 */
const WorkerRunner = function ( parser ) {
	this.resourceDescriptors = [];
	this.logging = {
		enabled: false,
		debug: false
	};
	this.parser = parser;

	let scope = this;
	let scopedRunner = function( event ) {
		scope.processMessage( event.data );
	};
	self.addEventListener( 'message', scopedRunner, false );
};

WorkerRunner.prototype = {

	constructor: WorkerRunner,

	/**
	 * Configures the Parser implementation according the supplied configuration object.
	 *
	 * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 */
	processMessage: function ( payload ) {
		let scope = this;

		if ( payload.logging ) {
			this.logging.enabled = payload.logging.enabled === true;
			this.logging.debug = payload.logging.debug === true;
		}
		if ( payload.data.resourceDescriptors && this.resourceDescriptors.length === 0 ) {

			for ( let name in payload.data.resourceDescriptors ) {

				this.resourceDescriptors.push( payload.data.resourceDescriptors[ name ] );

			}

		}

		if ( payload.cmd === 'loadFile' ) {
			console.warn( '\"loadFile\" inside worker is currently disabled.');
/*
			let resourceDescriptorCurrent = this.resourceDescriptors[ payload.params.index ];
			let fileLoadingExecutor = new FileLoadingExecutor( payload.params.instanceNo, payload.params.description );

			let callbackProgress = function ( text ) {
				if ( scope.logging.enabled && scope.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
			};
			let callbackError = function ( message ) {
				console.error( message );
			};
			fileLoadingExecutor
			.setPath( payload.params.path )
			.setCallbacks( callbackProgress, callbackError );

			let confirmFileLoaded = function ( content, completedIndex ) {
				if ( content !== undefined && content !== null) {

					scope.resourceDescriptors[ completedIndex ].content = content;

				}
				self.postMessage( {
					cmd: 'confirm',
					type: 'fileLoaded',
					params: {
						index: completedIndex
					}
				} );
			};
			fileLoadingExecutor.loadFile( resourceDescriptorCurrent, payload.params.index, confirmFileLoaded );
*/
		} else if ( payload.cmd === 'parse' ) {

			let callbacks = {
				callbackOnAssetAvailable: function ( payload ) {
					self.postMessage( payload );
				},
				callbackOnProgress: function ( text ) {
					if ( scope.logging.enabled && scope.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
//			let parser = new Parser();
			let parser = this.parser;
			if ( typeof parser[ 'setLogging' ] === 'function' ) {

				parser.setLogging( this.logging.enabled, this.logging.debug );

			}
			ObjectManipulator.applyProperties( parser, payload.params );
			ObjectManipulator.applyProperties( parser, payload.materials );
			ObjectManipulator.applyProperties( parser, callbacks );

			let arraybuffer;
			if ( payload.params && payload.params.index !== undefined && payload.params.index !== null) {

				arraybuffer = this.resourceDescriptors[ payload.params.index ].content;

			} else {

				arraybuffer = payload.data.input;

			}

			let parseFunctionName = 'parse';
			if ( typeof parser.getParseFunctionName === 'function' ) parseFunctionName = parser.getParseFunctionName();
			if ( payload.usesMeshDisassembler ) {
/*
				let object3d = parser[ parseFunctionName ] ( arraybuffer, payload.data.options );
				let meshTransmitter = new MeshTransmitter();

				meshTransmitter.setDefaultGeometryType( payload.defaultGeometryType );
				meshTransmitter.setCallbackDataReceiver( callbacks.callbackOnAssetAvailable );
				meshTransmitter.walkMesh( object3d );
*/
			} else {

				parser[ parseFunctionName ] ( arraybuffer, payload.data.options );

			}
			if ( this.logging.enabled ) console.log( 'WorkerRunner: Run complete!' );

			self.postMessage( {
				cmd: 'completeOverall',
				msg: 'WorkerRunner completed run.'
			} );

		} else {

			console.error( 'WorkerRunner: Received unknown command: ' + payload.cmd );

		}
	}
};

export { WorkerRunner }
