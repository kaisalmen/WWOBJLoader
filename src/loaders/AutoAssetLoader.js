/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { ObjectManipulator } from "./util/ObjectManipulator.js";
import { FileLoadingExecutor } from "./util/FileLoadingExecutor.js";

export {
	AutoAssetLoader,
	AssetTask,
	ResourceDescriptor
}


/**
 *
 * @constructor
 */
const AutoAssetLoader = function () {
	this.assetTasks = new Map();
};
AutoAssetLoader.AUTO_ASSET_LOADER_VERSION = '1.0.0-alpha';

AutoAssetLoader.prototype = {

	constructor: AutoAssetLoader,

	/**
	 *
	 * @returns {AutoAssetLoader}
	 */
	printVersion: function() {
		console.info( 'Using AutoAssetLoader version: ' + Director.AUTO_ASSET_LOADER_VERSION );
		return this;
	},

	/**
	 *
	 * @param {AssetTask} assetTask
	 * @returns {AutoAssetLoader}
	 */
	addAssetTask: function ( assetTask ) {
		this.assetTasks.set( assetTask.getName(), assetTask );
		return this;
	},

	/**
	 *
	 * @returns {AutoAssetLoader}
	 */
	init: function () {
		this.assetTasks.forEach( function ( value, key ) {
			console.log( 'Initialising "' + key + '"...' );
			value.init();
		} );
		return this;
	},

	/**
	 *
	 * @returns {AutoAssetLoader}
	 */
	loadAssets: function () {
		async function loadResource( assetTask ) {
			let response = await FileLoadingExecutor.loadFileAsync( {
				resourceDescriptor: assetTask.getResourceDescriptor(),
				instanceNo: 0,
				description: 'loadAssets',
				reportCallback: ( report => console.log( report ) )
			} );
			return response;
		}

		async function loadResources( assetTasks ) {
			let loadPromises = [ assetTasks.size ];
			let counter = 0;
			for ( let assetTask of assetTasks.values() ) {
				loadPromises[ counter ] = await loadResource( assetTask );
				counter++;
			}

			console.log( 'Waiting for completion of loading of all assets!');
			return await Promise.all( loadPromises );
		}

		function processAssets( loadResults ) {
			console.log( 'Result of loading: ' + loadResults.length );
		}

		loadResources( this.assetTasks )
			.then( x => processAssets( x ) )
			.catch( x => console.error( x ) );

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
	this.resourceDescriptor;
	this.assetHandler = {
		ref: null,
		instance: null,
		config: {},
		processFunctionName: 'parse'
	}
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
		this.assetHandler.processFunctionName = processFunctionName;
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

	/**
	 *
	 * @param {Object} assetHandlerRef
	 * @param {Object} [loaderConfig]
	 * @returns {AssetTask}
	 */
	setAssetHandlerRef: function ( assetHandlerRef, assetHandlerConfig ) {
		this.assetHandler.ref = assetHandlerRef;
		if ( assetHandlerConfig !== undefined && assetHandlerConfig !== null ) {
			this.assetHandler.config = assetHandlerConfig;
		}
		return this;
	},

	setAssetHandler: function ( assetHandler ) {
		if ( assetHandler ) {

			this.assetHandler.instance = assetHandler;

		}
		return this;
	},

	/**
	 *
	 * @returns {AssetTask}
	 */
	init: function () {
		console.log( this.name + ': Performing init' );
		if ( this.assetHandler.instance === null && this.assetHandler.ref !== null ) {

			this.assetHandler.instance = Object.create( this.assetHandler.ref.prototype );
			this.assetHandler.ref.call( this.assetHandler.instance );
			ObjectManipulator.applyProperties( this.assetHandler.instance, this.assetHandler.config );

		}
		if ( this.assetHandler.instance !== null && typeof this.assetHandler.instance.printVersion === 'function' ) {

			this.assetHandler.instance.printVersion();

		}
		return this;
	},

	/**
	 *
	 * @param {Object} previousResult
	 * @returns {AssetTask}
	 */
	process: function ( previousResult ) {
		this.assetHandler.instance[ this.processFunctionName ]( previousResult );
		return this;
	}

};


/**
 *
 * @param {String} resourceType
 * @param {String} name
 * @param {Object} [input]
 * @constructor
 */
const ResourceDescriptor = function ( resourceType, name, input ) {
	this.name = ( name !== undefined && name !== null ) ? name : 'Unnamed_Resource';
	this.content = {
		data: null,
		resourceType: resourceType,
		payloadType: 'arraybuffer',
		result: null
	};
	this.url = null;
	this.filename = null;
	this.path;
	this.resourcePath;
	this.extension = null;
	this.async = {
		load: false,
		parse: true
	};
	this.dataOptions = {};
	this.transferables = [];

	this._init( input );
};

ResourceDescriptor.prototype = {

	constructor: ResourceDescriptor,

	_init: function ( input ) {
		input = ( input !== undefined && input !== null ) ? input : null;

		switch ( this.content.resourceType ) {
			case 'URL':
				this.url = ( input !== null ) ? input : this.name;
				this.url = new URL( this.url, window.location.href ).href;
				this.filename = this.url;
				let urlParts = this.url.split( '/' );
				if ( urlParts.length > 2 ) {

					this.filename = urlParts[ urlParts.length - 1 ];
					let urlPartsPath = urlParts.slice( 0, urlParts.length - 1 ).join( '/' ) + '/';
					if ( urlPartsPath !== undefined && urlPartsPath !== null ) this.path = urlPartsPath;

				}
				let filenameParts = this.filename.split( '.' );
				if ( filenameParts.length > 1 ) this.extension = filenameParts[ filenameParts.length - 1 ];
				this.content.data = null;
				break;

			case 'Buffer':
				this.setBuffer( input );
				break;

			case 'String':
				this.setString( input );
				break;

			case 'Metadata':
				this.content.data = 'no_content';
				break;

			default:
				throw 'An unsupported resourceType "' + this.resourceType + '" was provided! Aborting...';
				break;

		}
	},

	setString: function ( input ) {
		// fast-fail on unset input
		if ( input === null ) return;
		if ( ! ( typeof( input ) === 'string' || input instanceof String) ) this._throwError( 'Provided input is not of resourceType "String"! Aborting...' );
		this.content.resourceType = 'String';
		this.content.payloadType = 'string';
		this.content.data = input;
	},

	setBuffer: function ( buffer ) {
		// fast-fail on unset input
		if ( buffer === null ) return;
		if ( ! ( buffer instanceof ArrayBuffer ||
			buffer instanceof Int8Array ||
			buffer instanceof Uint8Array ||
			buffer instanceof Uint8ClampedArray ||
			buffer instanceof Int16Array ||
			buffer instanceof Uint16Array ||
			buffer instanceof Int32Array ||
			buffer instanceof Uint32Array ||
			buffer instanceof Float32Array ||
			buffer instanceof Float64Array ) ) {

			this._throwError( 'Provided input is neither an "ArrayBuffer" nor a "TypedArray"! Aborting...' );

		}
		this.content.resourceType = 'Buffer';
		this.content.payloadType = 'arraybuffer';
		this.content.data = buffer;
	},

	configureAsync: function ( loadAsync, parseAsync ) {
		this.async.parse = parseAsync === true;
		// Loading in Worker is currently only allowed when async parse is performed!!!!
		this.async.load = loadAsync === true && this.async.parse;

		return this;
	},

	setDataOption: function ( name, object, transferables ) {
		if ( ! Array.isArray( transferables ) ) transferables = [];
		this.dataOptions[ name ] = {
			name: name,
			object: object
		};
		if ( transferables.length > 0 ) {

			this.transferables = this.transferables.concat( transferables );

		}
	},

	setAssetHandlerResult: function ( result ) {
		this.content.result = result;
	},

	setCallbackOnProcessResult: function ( callbackOnProcessResult ) {
		this.callbackOnProcessResult = callbackOnProcessResult;
		return this;
	},

	getCallbackOnProcessResult: function ( ) {
		return this.callbackOnProcessResult;
	},

	createSendable: function () {
		let copy = new ResourceDescriptor( this.resourceType, this.name );
		copy.url = this.url;
		copy.filename = this.filename;
		copy.path = this.path;
		copy.resourcePath = this.resourcePath;
		copy.extension = this.extension;
		copy.async.load = this.async.load;
		copy.async.parse = this.async.parse;
		this.content.result = null;
		return copy;
	}
};
