/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

/**
 *
 * @param {String} name
 * @constructor
 */
const ResourceDescriptor = function ( name) {
	this.name = ( name !== undefined && name !== null ) ? name : 'Unnamed_Resource';
	this.content = {
		data: null,
		dataOptions: null,
		needStringOutput: false,
		compressed: false
	};
	this.url = null;
	this.filename = null;
	this.path;
	this.resourcePath;
	this.extension = null;
	this.transferables = [];
};

ResourceDescriptor.prototype = {

	constructor: ResourceDescriptor,

	/**
	 *
	 * @param url
	 * @return {ResourceDescriptor}
	 */
	setUrl: function ( url ) {

		this.url = ( url === undefined || url === null ) ? this.name : url;
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
		return this;

	},

	/**
	 *
	 * @param needStringOutput
 	 * @return {ResourceDescriptor}
	 */
	setNeedStringOutput: function ( needStringOutput ) {

		this.content.needStringOutput = needStringOutput;
		return this;

	},

	/**
	 *
	 * @param {boolean} compressed
	 * @return {ResourceDescriptor}
	 */
	setCompressed: function ( compressed ) {

		this.content.compressed = compressed;
		return this;

	},

	/**
	 *
	 * @return {boolean}
	 */
	isCompressed: function () {

		return this.content.compressed;

	},

	/**
	 *
	 * @param buffer
	 */
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

			throw( 'Provided input is neither an "ArrayBuffer" nor a "TypedArray"! Aborting...' );

		}

		if ( this.content.needStringOutput ) {

			this.content.data = new TextDecoder("utf-8" ).decode( buffer ) ;

		}
		else {

			this.content.data = buffer;

		}

	},

	/**
	 *
	 * @param name
	 * @param object
	 * @param transferables
	 */
	setInputDataOption: function ( name, object, transferables ) {

		if ( ! Array.isArray( transferables ) ) transferables = [];
		this.content.dataOptions[ name ] = {
			name: name,
			object: object
		};
		if ( transferables.length > 0 ) {

			this.transferables = this.transferables.concat( transferables );

		}

	},

	/**
	 *
	 * @return {ResourceDescriptor}
	 */
	createSendable: function () {
		let copy = new ResourceDescriptor( this.name );
		copy.url = this.url;
		copy.filename = this.filename;
		copy.path = this.path;
		copy.resourcePath = this.resourcePath;
		copy.extension = this.extension;
		this.content.data = null;
		return copy;
	}
};

export { ResourceDescriptor }
