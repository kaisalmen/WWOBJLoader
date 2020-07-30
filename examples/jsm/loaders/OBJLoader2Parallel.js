/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

// Imports only related to wrapper
import { Object3D } from "../../../build/three.module.js";
import { OBJLoader2 } from "./OBJLoader2.js";

// Imports only related to worker (when standard workers (modules aren't supported) are used)
import { OBJLoader2Parser } from "./obj2/OBJLoader2Parser.js";
import { TaskManager } from "../taskmanager/TaskManager.js";
import { OBJ2LoaderWorker } from "../taskmanager/worker/tmOBJLoader2.js";


/**
 * Creates a new OBJLoader2Parallel. Use it to load OBJ data from files or to parse OBJ data from arraybuffer.
 * It extends {@link OBJLoader2} with the capability to run the parser in a web worker.
 *
 * @param [LoadingManager] manager The loadingManager for the loader to use. Default is {@link LoadingManager}
 * @constructor
 */
const OBJLoader2Parallel = function ( manager ) {

	OBJLoader2.call( this, manager );
	this.preferJsmWorker = false;
	this.initPerformed = false;
	this.jsmWorkerUrl = null;

	this.executeParallel = true;

	this.taskManager = new TaskManager();
	this.taskName = 'tmOBJLoader2';
};

OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION = '4.0.0-dev';
console.info( 'Using OBJLoader2Parallel version: ' + OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION );
OBJLoader2Parallel.DEFAULT_JSM_WORKER_PATH = './jsm/taskmanager/worker/tmOBJLoader2.js';

OBJLoader2Parallel.prototype = Object.assign( Object.create( OBJLoader2.prototype ), {

	constructor: OBJLoader2Parallel,

	/**
	 * Execution of parse in parallel via Worker is default, but normal {OBJLoader2} parsing can be enforced via false here.
	 *
	 * @param {boolean} executeParallel True or False
	 * @return {OBJLoader2Parallel}
	 */
	setExecuteParallel: function ( executeParallel ) {

		this.executeParallel = executeParallel === true;
		return this;

	},

	/**
	 *
	 * @param [TaskManager] taskManager
	 * @return {OBJLoader2}
	 */
	setTaskManager: function ( taskManager ) {

		this.taskManager = taskManager;
		return this;

	},

	/**
	 * Set whether jsm modules in workers should be used. This requires browser support which is currently only experimental.
	 * @param {boolean} preferJsmWorker True or False
	 * @param {URL} jsmWorkerUrl Provide complete jsm worker URL otherwise relative path to this module may not be correct
	 * @return {OBJLoader2Parallel}
	 */
	setJsmWorker: function ( preferJsmWorker, jsmWorkerUrl ) {

		this.preferJsmWorker = preferJsmWorker === true;
		if ( jsmWorkerUrl === undefined || jsmWorkerUrl === null ) {
			throw "The url to the jsm worker is not valid. Aborting..."
		}
		this.jsmWorkerUrl = jsmWorkerUrl;
		return this;

	},

	/**
	 * Request termination of worker once parser is finished.
	 *
	 * @param {boolean} terminateWorkerOnLoad True or false.
	 * @return {OBJLoader2Parallel}
	 */
	setTerminateWorkerOnLoad: function ( terminateWorkerOnLoad ) {

		this.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
		return this;

	},

	/**
	 * Provide instructions on what is to be contained in the worker.
	 */
	_buildWorkerCode: async function () {

		if ( ! this.taskManager.supportsTaskType( this.taskName ) ) {

			if ( this.preferJsmWorker ) {

				this.taskManager.registerTaskTypeModule( this.taskName, OBJLoader2Parallel.DEFAULT_JSM_WORKER_PATH );

			} else {

				let obj2ParserDep = 'const OBJLoader2Parser = ' + OBJLoader2Parser.toString() + ';\n\n';
				this.taskManager.registerTaskType( this.taskName, OBJ2LoaderWorker.init, OBJ2LoaderWorker.execute, null, false, [{ code: obj2ParserDep }] );

			}
			await this.taskManager.initTaskType( this.taskName, {} ).catch( e => console.error( e ) );

		}
		else {

			await new Promise( resolve => resolve( true ) );

		}
		this.initPerformed = true;
		return this.initPerformed;

	},

	/**
	 * See {@link OBJLoader2.load}
	 */
	load: function ( content, onLoad, onFileLoadProgress, onError, onMeshAlter ) {

 		let scope = this;
		function interceptOnLoad( object3d, message ) {

			if ( object3d.name === 'OBJLoader2ParallelDummy' ) {

				if ( scope.parser.logging.enabled && scope.parser.logging.debug ) {

					console.debug( 'Received dummy answer from OBJLoader2Parallel#parse' );

				}

			} else {

				onLoad( object3d, message );

			}

		}

		OBJLoader2.prototype.load.call( this, content, interceptOnLoad, onFileLoadProgress, onError, onMeshAlter );

	},

	/**
	 * See {@link OBJLoader2.parse}
	 * The callback onLoad needs to be set to be able to receive the content if used in parallel mode.
	 * Fallback is possible via {@link OBJLoader2Parallel#setExecuteParallel}.
	 */
	parse: function ( content ) {

		if ( this.executeParallel ) {

			// check if worker has been initialize before. If yes, skip init
			if ( ! this.initPerformed ) {

				this._buildWorkerCode()
					.then( x => {
						if ( this.parser.logging.debug ) console.log( 'OBJLoader2Parallel init was performed: ' + x );
						this._executeWorkerParse( content )
					} );

			}
			else {

				this._executeWorkerParse( content );

			}
			let dummy = new Object3D();
			dummy.name = 'OBJLoader2ParallelDummy';
			return dummy;

		} else {

			return OBJLoader2.prototype.parse.call( this, content );

		}

	},

	_executeWorkerParse: function ( content ) {

		// Create default materials beforehand, but do not override previously set materials (e.g. during init)
		this.materialHandler.createDefaultMaterials( false );

		let config = {
			id: 42,
			params: {
				modelName: this.modelName,
				instanceNo: this.instanceNo,
				useIndices: this.parser.useIndices,
				disregardNormals: this.parser.disregardNormals,
				materialPerSmoothingGroup: this.parser.materialPerSmoothingGroup,
				useOAsMesh: this.parser.useOAsMesh,
				materials: this.materialHandler.getMaterialsJSON()
			},
			buffer: content,
			logging: {
				enabled: this.parser.logging.enabled,
				debug: this.parser.logging.debug
			}
		};
		this.taskManager.enqueueForExecution( this.taskName, config,data => this._onAssetAvailable( data ), { buffer: content.buffer } )
			.then( data => {
				this._onAssetAvailable( data );
				this.parser.callbacks.onLoad( this.baseObject3d, 'finished' );
				if ( this.terminateWorkerOnLoad ) this.taskManager.dispose();
			} )
			.catch( e => console.error( e ) )

	}



} );

export { OBJLoader2Parallel };
