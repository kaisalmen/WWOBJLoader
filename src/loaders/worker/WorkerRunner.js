/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { MeshTransmitter } from "../MeshTransfer.js"
import { ObjectManipulator } from "./util/ObjectManipulator.js";

export { WorkerRunner }


/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 * @constructor
 */
const WorkerRunner = function () {
	this.resourceDescriptors = [];
	this.logging = {
		enabled: false,
		debug: false
	};

	var scope = this;
	var scopedRunner = function( event ) {
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
		var scope = this;
		if ( payload.cmd === 'initWorker' ) {

			this.logging.enabled = payload.logging.enabled === true;
			this.logging.debug = payload.logging.debug === true;
			if ( payload.data.resourceDescriptors !== null && this.resourceDescriptors.length === 0 ) {

				for ( var name in payload.data.resourceDescriptors ) this.resourceDescriptors.push( payload.data.resourceDescriptors[ name ] );

			}
			self.postMessage( {
				cmd: 'confirm',
				type: 'initWorkerDone',
				msg: 'Worker init has been successfully performed.'
			} );

		} else if ( payload.cmd === 'loadFile' ) {
			console.warn( '\"loadFile\" inside worker is currently disabled.');
/*
			var resourceDescriptorCurrent = this.resourceDescriptors[ payload.params.index ];
			var fileLoadingExecutor = new FileLoadingExecutor( payload.params.instanceNo, payload.params.description );

			var callbackProgress = function ( text ) {
				if ( scope.logging.enabled && scope.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
			};
			var callbackError = function ( message ) {
				console.error( message );
			};
			fileLoadingExecutor
			.setPath( payload.params.path )
			.setCallbacks( callbackProgress, callbackError );

			var confirmFileLoaded = function ( content, completedIndex ) {
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

			var callbacks = {
				callbackOnAssetAvailable: function ( payload ) {
					self.postMessage( payload );
				},
				callbackOnProgress: function ( text ) {
					if ( scope.logging.enabled && scope.logging.debug ) console.debug( 'WorkerRunner: progress: ' + text );
				}
			};

			// Parser is expected to be named as such
			var parser = new Parser();
			if ( typeof parser[ 'setLogging' ] === 'function' ) {

				parser.setLogging( this.logging.enabled, this.logging.debug );

			}
			ObjectManipulator.applyProperties( parser, payload.params );
			ObjectManipulator.applyProperties( parser, payload.materials );
			ObjectManipulator.applyProperties( parser, callbacks );

			var arraybuffer;
			if ( payload.params.index !== undefined && payload.params.index !== null) {

				arraybuffer = this.resourceDescriptors[ payload.params.index ].content;

			} else {

				arraybuffer = payload.data.input;

			}

			var parseFunctionName = 'parse';
			if ( typeof parser.getParseFunctionName === 'function' ) parseFunctionName = parser.getParseFunctionName();
			if ( payload.usesMeshDisassembler ) {

				var object3d = parser[ parseFunctionName ] ( arraybuffer, payload.data.options );
				var meshTransmitter = new MeshTransmitter();

				meshTransmitter.setDefaultGeometryType( payload.defaultGeometryType );
				meshTransmitter.setCallbackDataReceiver( callbacks.callbackOnAssetAvailable );
				meshTransmitter.walkMesh( object3d );

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
