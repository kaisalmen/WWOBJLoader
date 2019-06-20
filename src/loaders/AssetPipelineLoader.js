/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { ResourceDescriptor } from "./utils/ResourceDescriptor.js";
import { FileLoadingExecutor } from "./utils/FileLoadingExecutor.js";
import { ObjectManipulator } from "./utils/ObjectManipulator.js";


/**
 *
 * @constructor
 */
const AssetPipelineLoader = function ( name ) {
	this.assetTasks = new Map();
	this.baseObject3d;
	this.name = name;
};
AssetPipelineLoader.ASSET_PIPELINE_LOADER_VERSION = '1.0.0-alpha';
console.info( 'Using AssetPipelineLoader version: ' + AssetPipelineLoader.ASSET_PIPELINE_LOADER_VERSION );

AssetPipelineLoader.prototype = {

	constructor: AssetPipelineLoader,

	/**
	 *
	 * @param {AssetTask} assetTask
	 * @returns {AssetPipelineLoader}
	 */
	addAssetTask: function ( assetTask ) {
		this.assetTasks.set( assetTask.getName(), assetTask );
		return this;
	},

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
	 * @returns {AssetPipelineLoader}
	 */
	run: function () {
		this._initAssetTasks();

		this._loadResources()
			.then( x => processAssets( x ) )
			.catch( x => console.error( x ) );

		let scope = this;
		function processAssets( loadResults ) {
			console.log( 'Count of loaded resources: ' + loadResults.length );

			let assetTask;
			for ( assetTask of scope.assetTasks.values() ) {
				assetTask.process();
			}

			scope.baseObject3d.add( assetTask.processResult );
		}

		return this;
	},

	_initAssetTasks: function () {
		let assetTaskBefore = null;
		this.assetTasks.forEach( function ( assetTask, key ) {
			if ( assetTaskBefore !== null ) {

				assetTask.setTaskBefore( assetTaskBefore );
				assetTaskBefore.setTaskAfter( assetTask )

			}
			assetTaskBefore = assetTask;

			assetTask.init();
		} );
	},

	_loadResources: async function () {
		let loadPromises = [ this.assetTasks.size ];
		let index = 0;
		for ( let assetTask of this.assetTasks.values() ) {
			if ( assetTask.getResourceDescriptor() ) {

				loadPromises[ index ] = await assetTask.loadResource( assetTask.getName() );
				index ++;

			}
		}

		console.log( 'Waiting for completion of loading of all assets!');
		return await Promise.all( loadPromises );
	}

};


/**
 *
 * @param {String} name
 * @constructor
 */
const AssetTask = function ( name ) {
	this.name = name;
	this.resourceDescriptor;
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
	this.processResult;
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
			ObjectManipulator.applyProperties( this.assetLoader.instance, this.assetLoader.config );

		}
	},

	loadResource: async function () {
		let response = await FileLoadingExecutor.loadFileAsync( {
			resourceDescriptor: this.getResourceDescriptor(),
			instanceNo: 0,
			description: 'loadAssets',
			reportCallback: ( report => console.log( report.detail.text ) )
		} );
		return response;
	},

	/**
	 *
	 */
	process: function () {
		if ( ! this.isLinker() ) {

			this.processResult = this.assetLoader.instance[ this.assetLoader.processFunctionName ]( this.resourceDescriptor.content.result );

		} else {

			this.processResult = this.assetLoader.instance[ this.assetLoader.processFunctionName ](
				this.relations.before.processResult, this.relations.after.assetLoader.instance );

		}
	}

};



export {
	AssetPipelineLoader,
	AssetTask
}
