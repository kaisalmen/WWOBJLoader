/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	FileLoader
} from "../../../node_modules/three/build/three.module.js";

export {
	FileLoadingExecutor
}

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
		let payloadType = 'arraybuffer';
		if ( resourceDescriptor !== undefined && resourceDescriptor !== null ) {
			url = resourceDescriptor.url;
			payloadType = resourceDescriptor.payloadType;
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
			onCompleteFileLoading( { errorMessage, event } );
		}

		function processResourcesProxy( content ) {
			onCompleteFileLoading( null, content );
		}

		let fileLoader = new FileLoader();
		fileLoader.setResponseType( payloadType );
		fileLoader.load( url + 'asda', processResourcesProxy, scopedOnReportProgress, scopedOnReportError );

	}
};
