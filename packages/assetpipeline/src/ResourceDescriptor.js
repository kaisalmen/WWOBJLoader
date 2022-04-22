/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import * as fflate from 'fflate';

/**
 * Encapsulates a url and derived values (filename, extension and path and stores the {@link ArrayBufer}
 * loaded from the resource described by the url.
 */
class ResourceDescriptor {

	/**
	 * Creates a new instance of {@link ResourceDescriptor}.
	 *
	 * @param {string} url URL as text
	 */
	constructor ( url ) {

		this.url = new URL( url, window.location.href );
		this.path = './';
		this.filename = url;
		this.extension = null;

		let urlParts = this.url.href.split( '/' );
		if ( urlParts.length > 2 ) {

			this.filename = urlParts[ urlParts.length - 1 ];
			let urlPartsPath = urlParts.slice( 0, urlParts.length - 1 ).join( '/' ) + '/';
			if ( urlPartsPath !== undefined ) this.path = urlPartsPath;

		}
		let filenameParts = this.filename.split( '.' );
		if ( filenameParts.length > 1 ) this.extension = filenameParts[ filenameParts.length - 1 ];

		/** @type {ArrayBuffer} */
		this.buffer = null;
		this.needStringOutput = false;
		this.compressed = false;

	}

	/**
	 * Returns the URL.
	 * @return {URL}
	 */
	getUrl() {

		return this.url;

	}

	/**
	 * Returns ths path from the base of the URL to the file
	 * @return {string}
	 */
	getPath () {

		return this.path;

	}

	/**
	 * Returns the filename.
	 * @return {string}
	 */
	getFilename () {

		return this.filename;

	}

	/**
	 * Returns the file extension if it was found
	 * @return {null|string}
	 */
	getExtension () {

		return this.extension;

	}

	/**
	 * Allows to set if the buffer should be converted to string which is possible via {@link getBufferAsString}.
	 *
	 * @param {boolean} needStringOutput
 	 * @return {ResourceDescriptor}
	 */
	setNeedStringOutput ( needStringOutput ) {

		this.needStringOutput = needStringOutput;
		return this;

	}

	/**
	 * Tells if buffer should be returned as string.
	 * @return {boolean}
	 */
	isNeedStringOutput () {

		return this.needStringOutput;

	}

	/**
	 *
	 * @param {boolean} compressed
	 * @return {ResourceDescriptor}
	 */
	setCompressed ( compressed ) {

		this.compressed = compressed;
		return this;

	}

	/**
	 * Tells if the resource is compressed
	 * @return {boolean}
	 */
	isCompressed () {

		return this.compressed;

	}

	/**
	 * Set the buffer after loading. It will be decompressed if {@link isCompressed} is true.
	 * @param {ArrayBuffer} buffer
	 * @return {ResourceDescriptor}
	 */
	setBuffer ( buffer ) {

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
		if ( this.isCompressed() ) {

			this.buffer = fflate.gunzipSync( new Uint8Array( buffer ) ); // eslint-disable-line no-undef

		}
		else {

			this.buffer = buffer;

		}
		return this;

	}

	/**
	 * Returns the buffer.
	 *
	 * @return {ArrayBuffer}
	 */
	getBuffer () {

		return this.buffer;

	}

	/**
	 * Returns the buffer as string by using {@link TextDecoder}.
	 *
	 * @return {string}
	 */
	getBufferAsString () {

		return new TextDecoder("utf-8" ).decode( this.buffer ) ;

	}

}

export { ResourceDescriptor }
