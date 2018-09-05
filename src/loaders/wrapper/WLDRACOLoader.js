/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

THREE.DRACOLoader.prototype.decodeDracoFile = function(rawBuffer, callback, attributeUniqueIdMap, attributeTypeMap) {
	var scope = this;
	var oldFashioned = function ( module ) {
		scope.decodeDracoFileInternal( rawBuffer, module.decoder, callback,
			attributeUniqueIdMap || {}, attributeTypeMap || {});
	};
	THREE.DRACOLoader.getDecoderModule( oldFashioned );
};

THREE.DRACOLoader.getDecoderModule = function ( callback ) {
	var scope = this;
	var config = THREE.DRACOLoader.decoderConfig;

	config.onModuleLoaded = function ( decoder ) {
		scope.timeLoaded = performance.now();

		console.log( "Decoder module loaded in: " + scope.timeLoaded );
		// Module is Promise-like. Wrap before resolving to avoid loop.
		callback( { decoder: decoder } );
	};
	DracoDecoderModule( config );
};


var WLDRACOLoader = function ( manager ) {
	THREE.DRACOLoader.call( this, manager );
	this.callbackDataReceiver = null;
	this.url = 'js/libs/draco/';
};

WLDRACOLoader.prototype = Object.create( THREE.DRACOLoader.prototype );
WLDRACOLoader.prototype.constructor = WLDRACOLoader;

WLDRACOLoader.prototype.setCallbackDataReceiver = function ( callbackDataReceiver ) {
	this.callbackDataReceiver = callbackDataReceiver;
};

WLDRACOLoader.prototype.setUrl = function ( url ) {
	this.url = url;
};

WLDRACOLoader.prototype.parse = function ( arrayBuffer, options ) {
	THREE.DRACOLoader.setDecoderPath( this.url );
	THREE.DRACOLoader.setDecoderConfig( { type: 'js' } );

	var scope = this;
	var scopedOnLoad = function ( bufferGeometry ) {
		var meshTransmitter = new THREE.LoaderSupport.MeshTransmitter();

		meshTransmitter.setCallbackDataReceiver( scope.callbackDataReceiver );
		meshTransmitter.setDefaultGeometryType( 0 );
		meshTransmitter.handleBufferGeometry( bufferGeometry, 'bunny.drc' );

		// Release decoder resources.
		THREE.DRACOLoader.releaseDecoderModule();
	};

	this.decodeDracoFile( arrayBuffer, scopedOnLoad );
};

WLDRACOLoader.buildWorkerCode = function ( codeSerializer ) {
	var workerCode = codeSerializer.serializeClass( 'THREE.DRACOLoader', THREE.DRACOLoader );
	workerCode += codeSerializer.serializeClass( 'WLDracoWrapper', WLDRACOLoader, 'WLDracoWrapper', 'THREE.DRACOLoader', null, [ 'parse', 'setUrl', 'setCallbackDataReceiver' ] );
	return {
		code: workerCode,
		parserName: 'WLDracoWrapper',
		containsMeshDisassembler: true,
		usesMeshDisassembler: false,
		libs: {
			locations: [
				'node_modules/three/build/three.min.js',
				'node_modules/three/examples/js/libs/draco/draco_decoder.js'
			],
			path: '../../'
		},
		provideThree: true
	}
};
