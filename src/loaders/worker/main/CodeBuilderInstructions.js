/**
 * @author Kai Salmen / www.kaisalmen.de
 */


const CodeBuilderInstructions = function () {
	this.startCode = '';
	this.codeFragments = [];
	this.importStatements = [];
	this.defaultGeometryType = 0;
};

CodeBuilderInstructions.prototype = {

	constructor: CodeBuilderInstructions,

	addStartCode: function ( startCode ) {
		this.startCode = startCode;
	},

	addCodeFragment: function ( code ) {
		this.codeFragments.push( code );
	},

	addLibraryImport: function ( libraryPath ) {
		let libraryUrl = new URL( libraryPath, window.location.href ).href;
		let code = 'importScripts( "' + libraryUrl + '" );';
		this.importStatements.push(	code );
	},

	getImportStatements: function () {
		return this.importStatements;
	},

	getCodeFragments: function () {
		return this.codeFragments;
	},

	getStartCode: function () {
		return this.startCode;
	}

};

export { CodeBuilderInstructions }
