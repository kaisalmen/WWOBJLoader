/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WLDRACOLoader = function ( manager ) {
	THREE.DRACOLoader.call( this, manager );
	this.builderPath = '../';
	this.callbackDataReceiver = null;
	this.url = 'js/libs/draco/';
};

WLDRACOLoader.prototype = Object.create( THREE.DRACOLoader.prototype );
WLDRACOLoader.prototype.constructor = WLDRACOLoader;

WLDRACOLoader.prototype.setBuilderPath = function ( builderPath ) {
	this.builderPath = builderPath;
};

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

WLDRACOLoader.prototype.buildWorkerCode = function ( codeSerializer, scope ) {
	scope = ( scope === null || scope === undefined ) ? this : scope;
	var decodeDracoFile = function( rawBuffer, callback, attributeUniqueIdMap, attributeTypeMap ) {
		var dracoScope = this;
		var oldFashioned = function ( module ) {
			dracoScope.decodeDracoFileInternal( rawBuffer, module.decoder, callback,
				attributeUniqueIdMap || {}, attributeTypeMap || {});
		};
		THREE.DRACOLoader.getDecoderModule( oldFashioned );
	};

	var getDecoderModule = function ( callback ) {
		var config = THREE.DRACOLoader.decoderConfig;

		var dracoScope = this;
		config.onModuleLoaded = function ( decoder ) {
			dracoScope.timeLoaded = performance.now();

			console.log( "Decoder module loaded in: " + dracoScope.timeLoaded );
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
	workerCode += codeSerializer.serializeClass( 'WLDracoWrapper', WLDRACOLoader, 'WLDracoWrapper', 'THREE.DRACOLoader', null, [ 'setBasePath', 'setUrl', 'setCallbackDataReceiver', 'parse' ] );
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
			path: scope.builderPath
		},
		provideThree: true
	}
};



var WWDRACOLoader = function () {
	this.workerLoader = new THREE.WorkerLoader();
	this.workerSupport = new THREE.WorkerLoader.WorkerSupport()
		.setTerminateWorkerOnLoad( false );
};

WWDRACOLoader.prototype = {

	constructor: WWDRACOLoader,

	decodeDracoFile: function ( rawBuffer, callback, attributeUniqueIdMap, attributeTypeMap ) {
		var wrapperOnMesh = function ( event, override ) {
			console.log( 'wrapperOnMesh' );
		};

		var rd = new THREE.WorkerLoader.ResourceDescriptor( 'Buffer', 'DracoLoaderArrayBuffer', rawBuffer );
		var loadingTaskConfig = new THREE.WorkerLoader.LoadingTaskConfig();
		loadingTaskConfig
			.setLoaderConfig( WLDRACOLoader, {
				builderPath: '../../'
			} )
			.addResourceDescriptor( rd )
			.setCallbacksParsing( wrapperOnMesh )
			.setCallbacksPipeline( callback );

		this.workerLoader.executeLoadingTaskConfig( loadingTaskConfig, this.workerSupport );
	}
};
