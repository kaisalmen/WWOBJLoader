/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	FileLoader
} from "../../../../../build/three.module.js";

/**
 * Extension of {@link FileLoader} that configures "arraybuffer" as default response type and carries a specific
 * onProgress function for {@link FileLoader#loadAsync}.
 */
class FileLoaderBufferAsync extends FileLoader {

	constructor() {
		super();
		this.setResponseType( 'arraybuffer' );
	}

	/**
	 * Load the resource defined in the first argument.
	 *
	 * @param {URL} url
	 * @param {Function} [onProgress]
	 * @return {Promise<ArrayBuffer>}
	 */
	loadFileAsync ( url, onProgress ) {
		let numericalValueRef = 0;
		let numericalValue = 0;
		function scopedOnReportProgress( event ) {

			if ( ! event.lengthComputable ) return;
			numericalValue = event.loaded / event.total;
			if ( numericalValue > numericalValueRef ) {

				numericalValueRef = numericalValue;
				let output = 'Download of "' + url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
				if ( onProgress !== undefined && onProgress !== null ) {

					onProgress( {
						detail: {
							type: 'progressLoad',
							text: output,
							numericalValue: numericalValue
						}
					} );

				}
			}
		}
		return this.loadAsync( url.href, scopedOnReportProgress );

	}

}

export { FileLoaderBufferAsync }
