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

WLPCDLoader.prototype._parse = function ( data ) {
	return this.parse( data, this.url );
};

WLPCDLoader.prototype.buildWorkerCode = function ( codeSerializer ) {
	var workerCode = codeSerializer.serializeClass( 'THREE.PCDLoader', THREE.PCDLoader );
	workerCode += codeSerializer.serializeClass( 'WLPCDLoader', WLPCDLoader, 'WLPCDLoader', 'THREE.PCDLoader', null, [ 'setBasePath', 'setUrl', '_parse' ] );
	return {
		code: workerCode,
		parserName: 'WLPCDLoader',
		usesMeshDisassembler: true,
		defaultGeometryType: 2,
		parseFunction: '_parse',
		libs: {
			locations: [
				'node_modules/three/build/three.min.js'
			],
			path: this.basePath
		},
		provideThree: true
	}
};