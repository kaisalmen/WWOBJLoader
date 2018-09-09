/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WLPCDLoader = function ( manager ) {
	THREE.PCDLoader.call( this, manager );
	this.basePath = '../';
	this.url = '';
};

WLPCDLoader.prototype = Object.create( THREE.PCDLoader.prototype );
WLPCDLoader.prototype.constructor = WLPCDLoader;

WLPCDLoader.prototype.setBasePath = function ( basePath ) {
	this.basePath = basePath;
};

WLPCDLoader.prototype.setUrl = function ( url ) {
	this.url = url;
};

WLPCDLoader.prototype.getParseFunctionName = function () {
	return '_parse';
};

WLPCDLoader.prototype._parse = function ( data ) {
	return this.parse( data, this.url );
};

WLPCDLoader.prototype.buildWorkerCode = function ( codeSerializer ) {
	var workerCode = codeSerializer.serializeClass( 'THREE.PCDLoader', THREE.PCDLoader );
	var pcdInclude = [ 'setBasePath', 'setUrl', 'getParseFunctionName', '_parse' ];
	workerCode += codeSerializer.serializeClass( 'WLPCDLoader', WLPCDLoader, 'WLPCDLoader', 'THREE.PCDLoader', null, pcdInclude );
	return {
		code: workerCode,
		parserName: 'WLPCDLoader',
		usesMeshDisassembler: true,
		defaultGeometryType: 2,
		libs: {
			locations: [
				'node_modules/three/build/three.min.js'
			],
			path: this.basePath
		},
		provideThree: true
	}
};