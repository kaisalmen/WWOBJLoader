/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	Object3D,
	Mesh,
	LineSegments,
	Points,
	MeshStandardMaterial
} from 'three';
import { OBJLoader2 } from './OBJLoader2.js';
import { WorkerTaskManager } from './workerTaskManager/WorkerTaskManager.js';
import { OBJ2LoaderWorker } from './workerTaskManager/worker/tmOBJLoader2.js';
import {
	DataTransport,
	MeshTransport
} from './utils/TransportUtils.js';
import { MaterialUtils } from './utils/MaterialUtils.js';

/**
 * Creates a new OBJLoader2Parallel. Use it to load OBJ data from files or to parse OBJ data from arraybuffer.
 * It extends {@link OBJLoader2} with the capability to run the parser in a web worker.
 *
 * @param [LoadingManager] manager The loadingManager for the loader to use. Default is {@link LoadingManager}
 * @constructor
 */
class OBJLoader2Parallel extends OBJLoader2 {

	static OBJLOADER2_PARALLEL_VERSION = OBJLoader2.OBJLOADER2_VERSION;

	static DEFAULT_JSM_WORKER_PATH = './dist/loaders/workerTaskManager/worker/tmOBJLoader2.js';
	static DEFAULT_JSM_THREEJS_PATH = '../libs/three/three.min.js';

	/**
	 *
	 * @param {LoadingManager} [manager]
	 */
	constructor( manager ) {

		super( manager );
		this.executeParallel = true;
		this.preferJsmWorker = false;
		this.urls = {
			/** @type {URL} */
			jsmWorker: new URL( OBJLoader2Parallel.DEFAULT_JSM_WORKER_PATH, window.location.href ),
			/** @type {URL} */
			threejs: new URL( OBJLoader2Parallel.DEFAULT_JSM_THREEJS_PATH, window.location.href )
		};
		this.workerTaskManager = null;
		this.taskName = 'tmOBJLoader2';

	}

	/**
	 * Execution of parse in parallel via Worker is default, but normal {OBJLoader2} parsing can be enforced via false here.
	 *
	 * @param {boolean} executeParallel True or False
	 * @return {OBJLoader2Parallel}
	 */
	setExecuteParallel ( executeParallel ) {

		this.executeParallel = executeParallel === true;
		return this;

	}

	/**
	 * @param {WorkerTaskManager} workerTaskManager The {@link WorkerTaskManager}
	 * @param {string} [taskName] A specific taskName to allow distinction between legacy and module workers
	 *
	 * @return {OBJLoader2Parallel}
	 */
	setWorkerTaskManager ( workerTaskManager, taskName ) {

		this.workerTaskManager = workerTaskManager;
		if ( taskName ) this.taskName = taskName;
		return this;

	}

	/**
	 * Set whether jsm modules in workers should be used. This requires browser support which is currently only experimental.
	 *
	 * @param {boolean} preferJsmWorker True or False
	 * @param {URL} jsmWorkerUrl Provide complete jsm worker URL otherwise relative path to this module may not be correct
	 * @return {OBJLoader2Parallel}
	 */
	setJsmWorker ( preferJsmWorker, jsmWorkerUrl ) {

		this.preferJsmWorker = preferJsmWorker === true;
		if ( jsmWorkerUrl === undefined || jsmWorkerUrl === null || ! ( jsmWorkerUrl instanceof URL ) ) {
			throw 'The url to the jsm worker is not valid. Aborting...';
		}
		else {
			this.urls.jsmWorker = jsmWorkerUrl;
		}
		return this;

	}

	/**
	 * Override the default URL for three.js. This is only required when standard workers are build (preferJsmWorker=false).
	 *
	 * @param {URL} threejsUrl Provide complete three module URL otherwise relative path to this module may not be correct
	 * @return {OBJLoader2Parallel}
	 */
	setThreejsLocation ( threejsUrl ) {

		if ( threejsUrl === undefined || threejsUrl === null || ! ( threejsUrl instanceof URL ) ) {
			throw 'The url to the jsm worker is not valid. Aborting...';
		}
		else {
			this.urls.threejs = threejsUrl;
		}
		return this;

	}

	/**
	 * Request termination of worker once parser is finished.
	 *
	 * @param {boolean} terminateWorkerOnLoad True or false.
	 * @return {OBJLoader2Parallel}
	 */
	setTerminateWorkerOnLoad ( terminateWorkerOnLoad ) {

		this.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
		return this;

	}

	/**
	 * Provide instructions on what is to be contained in the worker.
	 *
	 * @param {DataTransport} dataTransport Configuration object
	 * @return {Promise<void>}
	 * @private
	 */
	async _buildWorkerCode ( dataTransport ) {

		if ( this.workerTaskManager === null || ! ( this.workerTaskManager instanceof WorkerTaskManager ) ) {

			if ( this.parser.logging.debug ) console.log( 'Needed to create new WorkerTaskManager' );
			this.workerTaskManager = new WorkerTaskManager( 1 );

		}
		if ( ! this.workerTaskManager.supportsTaskType( this.taskName ) ) {

			if ( this.preferJsmWorker ) {

				this.workerTaskManager.registerTaskTypeModule( this.taskName, this.urls.jsmWorker );

			} else {

				// build the standard worker from code imported here and don't reference three.js build with fixed path
				this.workerTaskManager.registerTaskType( this.taskName, OBJ2LoaderWorker.init, OBJ2LoaderWorker.execute,
					null, false, OBJ2LoaderWorker.buildStandardWorkerDependencies( this.urls.threejs ) );

			}
			await this.workerTaskManager.initTaskType( this.taskName, dataTransport.getMain() );

		}

	}

	/**
	 * See {@link OBJLoader2.load}
	 */
	load ( content, onLoad, onFileLoadProgress, onError, onMeshAlter ) {

 		const scope = this;
		function interceptOnLoad( object3d, objectId ) {

			if ( object3d.name === 'OBJLoader2ParallelDummy' ) {

				if ( scope.parser.logging.enabled && scope.parser.logging.debug ) {

					console.debug( 'Received dummy answer from OBJLoader2Parallel#parse' );

				}

			} else {

				onLoad( object3d, objectId );

			}

		}
		OBJLoader2.prototype.load.call( this, content, interceptOnLoad, onFileLoadProgress, onError, onMeshAlter );

	}

	/**
	 * See {@link OBJLoader2.parse}
	 * The callback onLoad needs to be set to be able to receive the content if used in parallel mode.
	 * Fallback is possible via {@link OBJLoader2Parallel#setExecuteParallel}.
	 */
	parse ( content ) {

		if ( this.executeParallel ) {

			if ( this.parser.logging.enabled ) {

				console.info( 'Using OBJLoader2Parallel version: ' + OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION );

			}
			const dataTransport = new DataTransport().setParams( {
					logging: {
						enabled: this.parser.logging.enabled,
						debug: this.parser.logging.debug
					},
				}
			);
			this._buildWorkerCode( dataTransport )
				.then(
					x => {
						if ( this.parser.logging.debug ) console.log( 'OBJLoader2Parallel init was performed: ' + x );
						this._executeWorkerParse( content );
					}
				).catch( e => console.error( e ) );

			let dummy = new Object3D();
			dummy.name = 'OBJLoader2ParallelDummy';
			return dummy;

		} else {

			return OBJLoader2.prototype.parse.call( this, content );

		}

	}

	_executeWorkerParse ( content ) {

		const dataTransport = new DataTransport( 'execute', Math.floor( Math.random() * Math.floor( 65536 ) ) );
		dataTransport.setParams( {
				modelName: this.parser.modelName,
				useIndices: this.parser.useIndices,
				disregardNormals: this.parser.disregardNormals,
				materialPerSmoothingGroup: this.parser.materialPerSmoothingGroup,
				useOAsMesh: this.parser.useOAsMesh,
				materials: MaterialUtils.getMaterialsJSON( this.materialStore.getMaterials() )
			} )
			.addBuffer( 'modelData', content )
			.package( false );
		this.workerTaskManager.enqueueForExecution( this.taskName, dataTransport.getMain(),meshTransport => this._onAssetAvailable( meshTransport ), dataTransport.getTransferables() )
			.then( dataTransport => {
				this._onLoad( dataTransport );
				if ( this.terminateWorkerOnLoad ) this.workerTaskManager.dispose();
			} )
			.catch( e => console.error( e ) )

	}

	/**
	 *
	 * @param {Mesh} mesh
	 * @param {object} materialMetaInfo
	 */
	_onAssetAvailable ( asset ) {

		let cmd = asset.cmd;
		if ( cmd === 'assetAvailable' ) {
			let meshTransport;
			if ( asset.type === 'MeshTransport' ) {
				meshTransport = new MeshTransport().loadData( asset ).reconstruct( false );
			}
			else {
				console.error( 'Received unknown asset.type: ' + asset.type );
			}
			if ( meshTransport ) {
				const materialsTransport = meshTransport.getMaterialsTransport();
				let material = materialsTransport.processMaterialTransport( this.materialStore.getMaterials(), this.parser.logging.enabled );
				if ( material === null ) material = new MeshStandardMaterial( { color: 0xFF0000 } );

				let mesh;
				if ( meshTransport.getGeometryType() === 0 ) {

					mesh = new Mesh( meshTransport.getBufferGeometry(), material );

				} else if ( meshTransport.getGeometryType() === 1 ) {

					mesh = new LineSegments( meshTransport.getBufferGeometry(), material );

				} else {

					mesh = new Points( meshTransport.getBufferGeometry(), material );

				}
				this.parser._onMeshAlter( mesh );
				this.parser.baseObject3d.add( mesh );
			}

		}
		else {
			console.error( 'Received unknown command: ' + cmd );
		}

	}

	_onLoad ( dataTransport ) {

		if ( dataTransport.type === 'DataTransport' ) {
			dataTransport = new DataTransport().loadData( dataTransport );
		}
		else {
			console.error( 'Received unknown asset.type: ' + dataTransport.type );
		}

		if ( dataTransport instanceof DataTransport && this.parser.callbacks.onLoad !== null ) {

			this.parser.callbacks.onLoad( this.parser.baseObject3d, dataTransport.getId() );

		}

	}

}

export { OBJLoader2Parallel };
