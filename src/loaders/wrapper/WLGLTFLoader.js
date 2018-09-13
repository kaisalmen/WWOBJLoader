/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WLDRACOLoader = function ( manager ) {
	THREE.DRACOLoader.call( this, manager );
};

WLDRACOLoader.prototype = Object.create( THREE.DRACOLoader.prototype );
WLDRACOLoader.prototype.constructor = WLDRACOLoader;



var WLGLTFLoader = function ( manager ) {
	THREE.GLTFLoader.call( this, manager );
	this.callbackDataReceiver = null;
	this.builderPath = '../';
	this.url = 'js/libs/draco/';
};

WLGLTFLoader.prototype = Object.create( THREE.GLTFLoader.prototype );
WLGLTFLoader.prototype.constructor = WLGLTFLoader;

WLGLTFLoader.prototype.setBuilderPath = function ( builderPath ) {
	this.builderPath = builderPath;
};

WLGLTFLoader.prototype.setUrl = function ( url ) {
	this.url = url;
};

WLGLTFLoader.prototype.setCallbackDataReceiver = function ( callbackDataReceiver ) {
	this.callbackDataReceiver = callbackDataReceiver;
};

WLGLTFLoader.prototype.getParseFunctionName = function () {
	return '_parse';
};

WLGLTFLoader.prototype._parse = function ( arrayBuffer, options ) {
	THREE.DRACOLoader.setDecoderPath( this.url );
	THREE.DRACOLoader.setDecoderConfig( { type: 'js' } );

	var dracoLoader = new WLDRACOLoader();
	this.setDRACOLoader( dracoLoader );

	var scope = this;
	var scopedOnLoad = function ( glTF ) {
		console.log( 'Hello WLGLTFLoader' );
//		var meshTransmitter = new THREE.LoaderSupport.MeshTransmitter();

//		meshTransmitter.setCallbackDataReceiver( scope.callbackDataReceiver );
//		meshTransmitter.setDefaultGeometryType( 0 );
//		meshTransmitter.handleBufferGeometry( bufferGeometry, 'bunny.drc' );

	};

	this.parse( arrayBuffer, this.path, scopedOnLoad );

//	this.decodeDracoFile( arrayBuffer, scopedOnLoad );
};


WLGLTFLoader.prototype.buildWorkerCode = function ( codeSerializer, scope ) {
	scope = ( scope === null || scope === undefined ) ? this : scope;
	var decodeDracoFile = function(rawBuffer, callback, attributeUniqueIdMap, attributeTypeMap) {
		var scope = this;
		var oldFashioned = function ( module ) {
			scope.decodeDracoFileInternal( rawBuffer, module.decoder, callback,
				attributeUniqueIdMap || {}, attributeTypeMap || {});
		};
		THREE.DRACOLoader.getDecoderModule( oldFashioned );
	};

	var getDecoderModule = function ( callback ) {
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

	var overrideFunctions = [];
	overrideFunctions[ 'decodeDracoFile' ] = {
		fullName: 'THREE.DRACOLoader.prototype.decodeDracoFile',
		code: decodeDracoFile.toString()
	};
	overrideFunctions[ 'getDecoderModule' ] = {
		fullName: 'THREE.DRACOLoader.getDecoderModule',
		code: getDecoderModule.toString()
	};
	var workerCode = codeSerializer.serializeClass( 'THREE.DRACOLoader', THREE.DRACOLoader, 'THREE.DRACOLoader', null, null, null, overrideFunctions );
	workerCode += codeSerializer.serializeClass( 'WLDRACOLoader', WLDRACOLoader, 'WLDRACOLoader', 'THREE.DRACOLoader', null, [] );
	var gltfInclude = [ 'setBasePath', 'setUrl', 'setCallbackDataReceiver', 'getParseFunctionName', '_parse' ];
	workerCode += codeSerializer.serializeClass( 'WLGLTFLoader', WLGLTFLoader, 'WLGLTFLoader', 'THREE.GLTFLoader', null, gltfInclude );
	return {
		code: workerCode,
		parserName: 'WLGLTFLoader',
		containsMeshDisassembler: true,
		usesMeshDisassembler: false,
		parseFunction: '_parse',
		libs: {
			locations: [
				'node_modules/three/build/three.min.js',
				'node_modules/three/examples/js/libs/draco/draco_decoder.js',
				'node_modules/three/examples/js/loaders/GLTFLoader.js'
			],
			path: scope.builderPath
		},
		provideThree: true
	}
};
