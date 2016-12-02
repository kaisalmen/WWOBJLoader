/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

THREE.OBJLoader = {
	Parser: null,
	MeshCreator: null,
	RawObject: null,
	RawObjectDescription: null,
};

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;

		this.path = '';
		this.fileLoader = new THREE.XHRLoader( this.manager );

		this.meshCreator = new THREE.OBJLoader.MeshCreator();
		this.parser = new THREE.OBJLoader.Parser( this.meshCreator );

		this.parser.debug = false;
		this.meshCreator.debug = false;

		this.validated = false;
	}

	/**
	 * Base path to use
	 *
	 * @param path
	 */
	OBJLoader.prototype.setPath = function ( path ) {
		this.path = ( path == null ) ? this.path : path;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * Default is new empty THREE.Group
	 *
	 * @param objGroup
	 */
	OBJLoader.prototype.setObjGroup = function ( objGroup ) {
		this.meshCreator.setObjGroup( objGroup );
	};

	/**
	 * Set materials loaded by MTLLoader.
	 * Default is null.
	 *
	 * @param materials
	 */
	OBJLoader.prototype.setMaterials = function ( materials ) {
		this.meshCreator.setMaterials( materials );
	};

	/**
	 * Allows to set debug mode for the parser and the meshCreatorDebug
	 *
	 * @param parserDebug
	 * @param meshCreatorDebug
	 */
	OBJLoader.prototype.setDebug = function ( parserDebug, meshCreatorDebug ) {
		this.parser.debug = parserDebug;
		this.meshCreator.debug = meshCreatorDebug;
	};

	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError, useArrayBuffer ) {
		this.validate();
		this.fileLoader.setPath( this.path );
		this.fileLoader.setResponseType( ( useArrayBuffer || useArrayBuffer == null ) ? 'arraybuffer' : 'text' );

		var scope = this;
		scope.fileLoader.load( url, function ( content ) {

			var objGroup = ( useArrayBuffer || useArrayBuffer == null ) ? scope.parse( content ) : scope.parseText( content );
			scope.fileLoader = null;
			onLoad( objGroup );

		}, onProgress, onError );
	};

	/**
	 * Validate status, then parse arrayBuffer, finalize and return objGroup
	 *
	 * @param arrayBuffer
	 */
	OBJLoader.prototype.parse = function ( arrayBuffer ) {
		// fast-fail on bad type
		if ( ! ( arrayBuffer instanceof ArrayBuffer || arrayBuffer instanceof Uint8Array ) ) {
			throw 'Provided input is not of type arraybuffer! Aborting...';
		}

		console.log( 'Parsing arrayBuffer...' );
		console.time( 'parseArrayBuffer' );

		this.validate();
		this.parser.parseArrayBuffer( arrayBuffer );
		var objGroup = this.finalize();

		console.timeEnd( 'parseArrayBuffer' );

		return objGroup;
	};

	/**
	 * Validate status, then parse text, finalize and return objGroup
	 *
	 * @param text
	 */
	OBJLoader.prototype.parseText = function ( text ) {
		// fast-fail on bad type
		if ( ! ( typeof( text ) === 'string' || text instanceof String ) ) throw 'Provided input is not of type String! Aborting...';

		console.log( 'Parsing text...' );
		console.time( 'parseText' );

		this.validate();
		this.parser.parseText( text );
		var objGroup = this.finalize();

		console.timeEnd( 'parseText' );

		return objGroup;
	};

	/**
	 * Check initialization status: Used for init and re-init
	 */
	OBJLoader.prototype.validate = function () {
		if ( this.validated ) return;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.XHRLoader( this.manager ) : this.fileLoader;
		this.setPath( null );
		this.parser.validate();
		this.meshCreator.validate();

		this.validated = true;
	};

	OBJLoader.prototype.finalize = function () {
		console.log( 'Global output object count: ' + this.meshCreator.globalObjectCount );

		this.parser.finalize();
		var objGroup = this.meshCreator.objGroup;
		this.meshCreator.finalize();
		this.validated = false;

		return objGroup;
	};

	return OBJLoader;
})();


