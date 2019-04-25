/**
 * @author Kai Salmen / www.kaisalmen.de
 */

export { CodeBuilderInstructions }


const CodeBuilderInstructions = function ( parserName, providesThree ) {
	this.parserName = parserName;
	this.providesThree = providesThree === true;
	this.codeInstructions = [];
	this.defaultGeometryType = 0;
	this.containsMeshDisassembler = false;
	this.usesMeshDisassembler = false;
};

CodeBuilderInstructions.prototype = {

	constructor: CodeBuilderInstructions,

	addCodeFragment: function( codeFragment ) {
		this.codeInstructions.push( {
			type: 'serializedCode',
			code: codeFragment
		} );
	},

	addLibrary: function( libraryPath, resourcePath ) {
		this.codeInstructions.push( {
			type: 'lib',
			libraryPath: libraryPath,
			resourcePath: resourcePath
		} );
	},

	getCodeInstructions: function() {
		return this.codeInstructions;
	}
};