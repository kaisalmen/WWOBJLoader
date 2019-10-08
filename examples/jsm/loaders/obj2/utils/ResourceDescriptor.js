/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

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
		input: null,
		inputDataOptions: null,
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
				this.content.input = null;
				break;

			case 'Buffer':
				this.setBuffer( input );
				break;

			case 'String':
				this.setString( input );
				break;

			case 'Metadata':
				this.content.input = 'no_content';
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
		this.content.input = input;
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
		this.content.input = buffer;
	},

	configureAsync: function ( loadAsync, parseAsync ) {
		this.async.parse = parseAsync === true;
		// Loading in Worker is currently only allowed when async parse is performed!!!!
		this.async.load = loadAsync === true && this.async.parse;

		return this;
	},

	setInputDataOption: function ( name, object, transferables ) {
		if ( ! Array.isArray( transferables ) ) transferables = [];
		this.content.inputDataOptions[ name ] = {
			name: name,
			object: object
		};
		if ( transferables.length > 0 ) {

			this.transferables = this.transferables.concat( transferables );

		}
	},

	setAssetLoaderResult: function ( result ) {
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

export { ResourceDescriptor }
