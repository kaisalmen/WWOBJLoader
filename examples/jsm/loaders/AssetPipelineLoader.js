/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { ResourceDescriptor } from "./obj2/utils/ResourceDescriptor.js";
import { FileLoadingExecutor } from "./obj2/utils/FileLoadingExecutor.js";
import { ObjectManipulator } from "./obj2/worker/parallel/WorkerRunner.js";


/**
 *
 * @param {String} name
 * @param {AssetPipeline} assetPipeline
 * @constructor
 */
const AssetPipelineLoader = function ( name, assetPipeline ) {

	this.name = name;
	this.assetPipeline = assetPipeline;
	this.baseObject3d = undefined;
	this.onComplete = null;

};
AssetPipelineLoader.ASSET_PIPELINE_LOADER_VERSION = '1.0.0-alpha';
console.info( 'Using AssetPipelineLoader version: ' + AssetPipelineLoader.ASSET_PIPELINE_LOADER_VERSION );

AssetPipelineLoader.prototype = {

	constructor: AssetPipelineLoader,

	/**
	 *
	 * @param {Object3D} baseObject3d
	 * @returns {AssetPipelineLoader}
	 */
	setBaseObject3d: function ( baseObject3d ) {

		this.baseObject3d = baseObject3d;
		return this;

	},

	/**
	 *
	 * @param {Function} onComplete
	 */
	setOnComplete: function ( onComplete ) {

		this.onComplete = onComplete;

	},

	/**
	 *
	 * @return {AssetPipelineLoader}
	 */
	run: function () {

		this.assetPipeline.initPipeline( this.name, this.onComplete );
		this.assetPipeline.runPipeline( this.baseObject3d );
		return this;

	}

};

/**
 * The AssetPipeline defines a set of {@link AssetTask} that need to be executed one after the other and return a {@link Object3D}.
 * @constructor
 */
const AssetPipeline = function () {

	this.name = null;
	this.onComplete = null;
	this.assetTasks = new Map();

};

AssetPipeline.prototype = {

	/**
	 *
	 * @param {AssetTask} assetTask
	 * @returns {AssetPipeline}
	 */
	addAssetTask: function ( assetTask ) {

		this.assetTasks.set( assetTask.getName(), assetTask );
		return this;

	},

	/**
	 * Init all {@link AssetTask}
	 *
	 * @param {string} name Name of the pipeline
	 * @return {AssetPipeline}
	 */
	initPipeline: function ( name, onComplete) {

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

	},

	/**
	 * 	/**
	 * Run the pipeline: First load resources and then execute the parsing functions
	 * @param {Object3D} baseObject3d
	 * @return {AssetPipeline}
	 */
	runPipeline: function ( baseObject3d ) {

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

};


/**
 *
 * @param {String} name
 * @constructor
 */
const AssetTask = function ( name ) {

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
	this.objectManipulator = new ObjectManipulator();

};

AssetTask.prototype = {

	constructor: AssetTask,

	/**
	 *
	 * @returns {String}
	 */
	getName: function () {

		return this.name;

	},

	/**
	 * Change the name of the process function of the assetHandler instance. Default is "parse".
	 *
	 * @param {String} processFunctionName
	 * @returns {AssetTask}
	 */
	setProcessFunctionName: function ( processFunctionName ) {

		this.assetLoader.processFunctionName = processFunctionName;
		return this;

	},

	/**
	 *
	 * @param {ResourceDescriptor} resourceDescriptor
	 * @returns {AssetTask}
	 */
	setResourceDescriptor: function ( resourceDescriptor ) {

		this.resourceDescriptor = resourceDescriptor;
		return this;

	},

	/**
	 *
	 * @returns {ResourceDescriptor}
	 */
	getResourceDescriptor: function () {

		return this.resourceDescriptor;

	},


	setTaskBefore: function ( assetTask ) {

		this.relations.before = assetTask;

	},

	setTaskAfter: function ( assetTask ) {

		this.relations.after = assetTask;

	},

	setLinker: function ( linker ) {

		this.linker = linker;
		this.setProcessFunctionName( 'link' );

	},

	isLinker: function () {

		return this.linker;

	},

	getProcessResult: function () {

		return this.processResult;

	},

	/**
	 *
	 * @param {Object} assetHandlerRef
	 * @param {Object} [loaderConfig]
	 * @returns {AssetTask}
	 */
	setAssetHandlerRef: function ( assetHandlerRef, assetHandlerConfig ) {

		this.assetLoader.ref = assetHandlerRef;
		if ( assetHandlerConfig !== undefined && assetHandlerConfig !== null ) {
			this.assetLoader.config = assetHandlerConfig;
		}
		return this;

	},

	setAssetHandler: function ( assetHandler ) {

		if ( assetHandler ) {

			this.assetLoader.instance = assetHandler;

		}
		return this;

	},

	/**
	 *
	 */
	init: function () {

		console.log( this.name + ': Performing init' );
		if ( this.assetLoader.instance === null && this.assetLoader.ref !== null ) {

			this.assetLoader.instance = Object.create( this.assetLoader.ref.prototype );
			this.assetLoader.ref.call( this.assetLoader.instance );
			this.objectManipulator.applyProperties( this.assetLoader.instance, this.assetLoader.config, false );

		}

	},

	loadResource: async function () {

		let response = await FileLoadingExecutor.loadFileAsync( {
			resourceDescriptor: this.getResourceDescriptor(),
			instanceNo: 0,
			description: 'loadAssets',
			reportCallback: ( report => console.log( report.detail.text ) )
		} );
		this.resourceDescriptor = response;
		return response;

	},

	/**
	 *
	 */
	process: function () {

		if ( ! this.isLinker() ) {

			this.processResult = this.assetLoader.instance[ this.assetLoader.processFunctionName ]( this.resourceDescriptor.content.data );

		} else {

			this.processResult = this.assetLoader.instance[ this.assetLoader.processFunctionName ](
				this.relations.before.processResult, this.relations.after.assetLoader.instance );

		}

	}

};


export {
	AssetPipelineLoader,
	AssetPipeline,
	AssetTask
}
