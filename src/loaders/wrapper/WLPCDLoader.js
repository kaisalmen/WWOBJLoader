/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WLPCDLoader = function ( manager ) {
	THREE.PCDLoader.call( this, manager );
};

WLPCDLoader.prototype = Object.create( THREE.PCDLoader.prototype );
WLPCDLoader.prototype.constructor = WLPCDLoader;

THREE.PCDLoader.prototype._parse = THREE.PCDLoader.prototype.parse;


WLPCDLoader.prototype.setUrl = function ( url ) {
	this.url = url;
};

WLPCDLoader.prototype.parse = function ( data ) {
	return this._parse( data, this.url );
};

WLPCDLoader.buildWorkerCode = function ( codeSerializer ) {
	var workerCode = codeSerializer.serializeClass( 'THREE.PCDLoader', THREE.PCDLoader, 'THREE.PCDLoader', null, [ 'parse' ] );
	workerCode += codeSerializer.serializeClass( 'WLPCDLoader', WLPCDLoader, 'WLPCDLoader', 'THREE.PCDLoader', null, [ 'parse', 'setUrl' ] );
	return {
		code: workerCode,
		parserName: 'WLPCDLoader',
		usesMeshDisassembler: true,
		defaultGeometryType: 2,
		libs: {
			locations: [
				'node_modules/three/build/three.min.js'
			],
			path: '../../'
		},
		provideThree: true
	}
};