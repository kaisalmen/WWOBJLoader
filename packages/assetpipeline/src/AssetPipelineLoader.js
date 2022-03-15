/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { FileLoader } from 'three';
import { ObjectManipulator } from 'three-wtm';
import { ResourceDescriptor } from './pipeline/utils/ResourceDescriptor.js';

/**
 *
 * @param {String} name
 * @param {AssetPipeline} assetPipeline
 * @constructor
 */
class AssetPipelineLoader {

	static ASSET_PIPELINE_LOADER_VERSION = '1.0.0-alpha';

	constructor ( name, assetPipeline ) {

		this.name = name;
		this.assetPipeline = assetPipeline;
		this.baseObject3d = undefined;
		this.onComplete = null;

		console.info( 'Using AssetPipelineLoader version: ' + AssetPipelineLoader.ASSET_PIPELINE_LOADER_VERSION );
	}

	/**
	 *
	 * @param {Object3D} baseObject3d
	 * @returns {AssetPipelineLoader}
	 */
	setBaseObject3d ( baseObject3d ) {

		this.baseObject3d = baseObject3d;
		return this;

	}

	/**
	 *
	 * @param {Function} onComplete
	 */
	setOnComplete ( onComplete ) {

		this.onComplete = onComplete;

	}

	/**
	 *
	 * @return {AssetPipelineLoader}
	 */
	run () {

		this.assetPipeline.initPipeline( this.name, this.onComplete );
		this.assetPipeline.runPipeline( this.baseObject3d );
		return this;

	}

}

/**
 * The AssetPipeline defines a set of {@link AssetTask} that need to be executed one after the other and return a {@link Object3D}.
 * @constructor
 */
class AssetPipeline {

	constructor() {

		this.name = null;
		this.onComplete = null;
		this.assetTasks = new Map();

	}

	/**
	 *
	 * @param {AssetTask} assetTask
	 * @returns {AssetPipeline}
	 */
	addAssetTask ( assetTask ) {

		this.assetTasks.set( assetTask.getName(), assetTask );
		return this;

	}

	/**
	 * Init all {@link AssetTask}
	 *
	 * @param {string} name Name of the pipeline
	 * @return {AssetPipeline}
	 */
	initPipeline ( name, onComplete) {

		this.name = name;
		this.onComplete = onComplete;
		let assetTaskBefore = null;
		this.assetTasks.forEach( function ( assetTask, key ) {

			if ( assetTaskBefore !== null ) {

				assetTask.setTaskBefore( assetTaskBefore );
				assetTaskBefore.setTaskAfter( assetTask )

			}
			assetTaskBefore = assetTask;

			assetTask.init();

		} );
		return this;

	}

	/**
	 * 	/**
	 * Run the pipeline: First load resources and then execute the parsing functions
	 * @param {Object3D} baseObject3d
	 * @return {AssetPipeline}
	 */
	runPipeline ( baseObject3d ) {

		let onComplete = x => console.log( "Done loading: " + x );
		let scope = this;
		if ( scope.onComplete !== undefined && scope.onComplete !== null ) {

			onComplete = scope.onComplete;

		}
		loadResources( this.assetTasks )
			.then( x => processAssets( x, this.assetTasks ) )
			.then( x => onComplete( scope.name, "Completed Loading" ) )
			.catch( x => console.error( x ) );


		function processAssets( loadResults, assetTasks ) {

			console.log( 'Count of loaded resources: ' + loadResults.length );
			let assetTask;
			for ( assetTask of assetTasks.values() ) {

				// TODO: process must be async, so we can process worker based workloads
				assetTask.process();

			}
			baseObject3d.add( assetTask.getProcessResult() );

		}

		async function loadResources( assetTasks ) {

			let loadPromises = [ assetTasks.size ];
			let index = 0;
			for ( let assetTask of assetTasks.values() ) {

				if ( assetTask.getResourceDescriptor() ) {

					loadPromises[ index ] = await assetTask.loadResource( assetTask.getName() );
					index ++;

				}

			}
			console.log( 'Waiting for completion of loading of all assets!');
			return await Promise.all( loadPromises );

		}
		return this;

	}

}


/**
 *
 * @param {String} name
 * @constructor
 */
class AssetTask {

	constructor ( name ) {

		this.name = name;
		this.resourceDescriptor = undefined;
		this.assetLoader = {
			ref: null,
			instance: null,
			config: {},
			processFunctionName: 'parse'
		};
		this.relations = {
			before: null,
			after: null
		};
		this.linker = false;
		this.processResult = undefined;

	}

	/**
	 *
	 * @returns {String}
	 */
	getName () {

		return this.name;

	}

	/**
	 * Change the name of the process function of the assetHandler instance. Default is "parse".
	 *
	 * @param {String} processFunctionName
	 * @returns {AssetTask}
	 */
	setProcessFunctionName ( processFunctionName ) {

		this.assetLoader.processFunctionName = processFunctionName;
		return this;

	}

	/**
	 *
	 * @param {ResourceDescriptor} resourceDescriptor
	 * @returns {AssetTask}
	 */
	setResourceDescriptor ( resourceDescriptor ) {

		this.resourceDescriptor = resourceDescriptor;
		return this;

	}

	/**
	 *
	 * @returns {ResourceDescriptor}
	 */
	getResourceDescriptor () {

		return this.resourceDescriptor;

	}

	setTaskBefore ( assetTask ) {

		this.relations.before = assetTask;

	}

	setTaskAfter ( assetTask ) {

		this.relations.after = assetTask;

	}

	setLinker ( linker ) {

		this.linker = linker;
		this.setProcessFunctionName( 'link' );

	}

	isLinker () {

		return this.linker;

	}

	getProcessResult () {

		return this.processResult;

	}

	/**
	 *
	 * @param {Object} assetHandlerRef
	 * @param {Object} [loaderConfig]
	 * @returns {AssetTask}
	 */
	setAssetHandler ( assetHandler, assetHandlerConfig ) {

		if ( assetHandler ) {

			this.assetLoader.instance = assetHandler;

		}
		if ( assetHandlerConfig !== undefined && assetHandlerConfig !== null ) {

			this.assetLoader.config = assetHandlerConfig;

		}
		return this;

	}

	/**
	 *
	 */
	init () {

		console.log( this.name + ': Performing init' );
		ObjectManipulator.applyProperties( this.assetLoader.instance, this.assetLoader.config, false );

	}

	async loadResource () {
		let fileLoader = new FileLoader();
		fileLoader.setResponseType( 'arraybuffer' );
		let buffer = await fileLoader.loadAsync( this.getResourceDescriptor().getUrl().href, report => console.log( report ) );

		this.resourceDescriptor.setBuffer( buffer );
		return this.resourceDescriptor;

	}

	/**
	 *
	 */
	process () {

		if ( ! this.isLinker() ) {

			let data = this.resourceDescriptor.isNeedStringOutput() ? this.resourceDescriptor.getBufferAsString() : this.resourceDescriptor.getBuffer();
			this.processResult = this.assetLoader.instance[ this.assetLoader.processFunctionName ]( data );

		} else {

			this.processResult = this.assetLoader.instance[ this.assetLoader.processFunctionName ](
				this.relations.before.processResult, this.relations.after.assetLoader.instance );

		}

	}

}


export {
	AssetPipelineLoader,
	AssetPipeline,
	AssetTask
}
