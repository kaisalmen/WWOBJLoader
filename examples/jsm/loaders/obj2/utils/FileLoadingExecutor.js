/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	FileLoader
} from "../../../../../build/three.module.js";
import { Zlib } from "../../../libs/gunzip.module.min.js";


const FileLoadingExecutor = {

	loadFileAsync: function ( { resourceDescriptor, instanceNo, description, reportCallback } ) {
		let scope = this;
		return new Promise(( resolveFunction, rejectFunction ) => {
			scope.loadFile( { resourceDescriptor, instanceNo, description, reportCallback }, ( error, response ) => {
				if ( error ) {

					rejectFunction( error );

				}
				resolveFunction( response );
			} );
		} );
	},

	loadFile: function ( params, onCompleteFileLoading ) {
		let numericalValueRef = 0;
		let numericalValue = 0;
		let resourceDescriptor = params.resourceDescriptor;
		let url = '';
		if ( resourceDescriptor !== undefined && resourceDescriptor !== null ) {
			url = resourceDescriptor.url;
		}

		function scopedOnReportProgress( event ) {
			if ( ! event.lengthComputable ) return;

			numericalValue = event.loaded / event.total;
			if ( numericalValue > numericalValueRef ) {

				numericalValueRef = numericalValue;
				let output = 'Download of "' + url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
				if ( params.reportCallback !== undefined && params.reportCallback !== null ) {

					params.reportCallback( {
						detail: {
							type: 'progressLoad',
							modelName: params.description,
							text: output,
							instanceNo: params.instanceNo,
							numericalValue: numericalValue

						}
					} );

				}
			}
		}

		function scopedOnReportError( event ) {
			let errorMessage = 'Error occurred while downloading "' + url + '"';
			onCompleteFileLoading( { resourceDescriptor, errorMessage, event } );
		}

		function processResourcesProxy( content ) {

			let uint8array = content;
			if ( resourceDescriptor.isCompressed() ) {

				let inflate = new Zlib.Gunzip( new Uint8Array( content ) ); // eslint-disable-line no-undef
				uint8array = inflate.decompress();

			}
			resourceDescriptor.setBuffer( uint8array );
			onCompleteFileLoading( null, resourceDescriptor );

		}

		let fileLoader = new FileLoader();
		fileLoader.setResponseType( 'arraybuffer' );
		fileLoader.load( url, processResourcesProxy, scopedOnReportProgress, scopedOnReportError );

	}
};

export { FileLoadingExecutor }
