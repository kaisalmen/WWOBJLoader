/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

THREE.OBJLoader2 = {
	Parser: null,
	MeshCreator: null,
	RawObject: null,
	RawObjectDescription: null
};

THREE.OBJLoader2 = (function () {

	function OBJLoader2( manager ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;

		this.path = '';
		this.fileLoader = new THREE.FileLoader( this.manager );

		this.meshCreator = new THREE.OBJLoader2.MeshCreator();
		this.parser = new THREE.OBJLoader2.Parser( this.meshCreator );

		this.parser.debug = false;
		this.meshCreator.debug = false;

		this.validated = false;
	}

	/**
	 * Base path to use
	 *
	 * @param path
	 */
	OBJLoader2.prototype.setPath = function ( path ) {
		this.path = ( path == null ) ? this.path : path;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * Default is new empty THREE.Group
	 *
	 * @param sceneGraphBaseNode
	 */
	OBJLoader2.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.meshCreator.setSceneGraphBaseNode( sceneGraphBaseNode );
	};

	/**
	 * Set materials loaded by MTLLoader.
	 * Default is null.
	 *
	 * @param materials
	 */
	OBJLoader2.prototype.setMaterials = function ( materials ) {
		this.meshCreator.setMaterials( materials );
	};

	/**
	 * Allows to set debug mode for the parser and the meshCreatorDebug
	 *
	 * @param parserDebug
	 * @param meshCreatorDebug
	 */
	OBJLoader2.prototype.setDebug = function ( parserDebug, meshCreatorDebug ) {
		this.parser.debug = parserDebug;
		this.meshCreator.debug = meshCreatorDebug;
	};

	OBJLoader2.prototype.load = function ( url, onLoad, onProgress, onError, useArrayBuffer ) {
		this.validate();
		this.fileLoader.setPath( this.path );
		this.fileLoader.setResponseType( ( useArrayBuffer || useArrayBuffer == null ) ? 'arraybuffer' : 'text' );

		var scope = this;
		scope.fileLoader.load( url, function ( content ) {

			// only use parseText if useArrayBuffer is explicitly set to false
			onLoad( ( useArrayBuffer || useArrayBuffer == null ) ? scope.parse( content ) : scope.parseText( content ) );

		}, onProgress, onError );
	};

	/**
	 * Validate status, then parse arrayBuffer, finalize and return sceneGraphAttach
	 *
	 * @param arrayBuffer
	 */
	OBJLoader2.prototype.parse = function ( arrayBuffer ) {
		// fast-fail on bad type
		if ( ! ( arrayBuffer instanceof ArrayBuffer || arrayBuffer instanceof Uint8Array ) ) {

			throw 'Provided input is not of type arraybuffer! Aborting...';

		}
		console.log( 'Parsing arrayBuffer...' );
		console.time( 'parseArrayBuffer' );

		this.validate();
		this.parser.parseArrayBuffer( arrayBuffer );
		var sceneGraphAttach = this.finalize();

		console.timeEnd( 'parseArrayBuffer' );

		return sceneGraphAttach;
	};

	/**
	 * Validate status, then parse text, finalize and return sceneGraphAttach
	 *
	 * @param text
	 */
	OBJLoader2.prototype.parseText = function ( text ) {
		// fast-fail on bad type
		if ( ! ( typeof( text ) === 'string' || text instanceof String ) ) {

			throw 'Provided input is not of type String! Aborting...';

		}
		console.log( 'Parsing text...' );
		console.time( 'parseText' );

		this.validate();
		this.parser.parseText( text );
		var sceneGraphAttach = this.finalize();

		console.timeEnd( 'parseText' );

		return sceneGraphAttach;
	};

	/**
	 * Check initialization status: Used for init and re-init
	 */
	OBJLoader2.prototype.validate = function () {
		if ( this.validated ) return;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.FileLoader( this.manager ) : this.fileLoader;
		this.setPath( null );
		this.parser.validate();
		this.meshCreator.validate();

		this.validated = true;
	};

	OBJLoader2.prototype.finalize = function () {
		console.log( 'Global output object count: ' + this.meshCreator.globalObjectCount );

		this.parser.finalize();
		this.fileLoader = null;
		var sceneGraphAttach = this.meshCreator.sceneGraphBaseNode;
		this.meshCreator.finalize();
		this.validated = false;

		return sceneGraphAttach;
	};

	return OBJLoader2;
})();


