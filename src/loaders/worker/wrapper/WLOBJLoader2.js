/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { CodeBuilderInstructions } from "../main/CodeBuilderInstructions.js";

export { };

const WLOBJLoader2 = function () {
	this.resourcePath = '../../';
};

WLOBJLoader2.prototype = {

	constructor: WLOBJLoader2,

	/**
	 *
	 * @param {String}  resourcePath
	 */
	setResoucePath: function ( resourcePath ) {
		if ( resourcePath ) {

			this.resourcePath = resourcePath;

		}
	},

	/**
	 * This function is invoked by worker creation function.
	 *
	 * @returns {CodeBuilderInstructions}
	 */
	buildWorkerCode: function () {
		let workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by OBJLoader2.buildWorkerCode.\n';
		workerCode += '  */\n\n';
		workerCode += 'OBJLoader2 = {};\n\n';

		let codeBuilderInstructions = new CodeBuilderInstructions( 'Parser', false );
		codeBuilderInstructions.addCodeFragment( workerCode );
		codeBuilderInstructions.addLibrary( 'src/loaders/worker/independent/OBJLoader2Parser.js', this.resourcePath );
		return codeBuilderInstructions;
	}
};

export { WLOBJLoader2 }
