/**
 * Use this class to load OBJ data from arraybuffer or text
 */
THREE.OBJLoader2 = (function () {

	function OBJLoader2( manager ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;

		this.path = '';
		this.fileLoader = new THREE.FileLoader( this.manager );

		this.meshCreator = new THREE.OBJLoader2.MeshCreator();
		this.parser = new THREE.OBJLoader2.Parser( this.meshCreator );

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
	 * Set the node where the loaded objects will be attached
	 *
	 * @param sceneGraphBaseNode
	 */
	OBJLoader2.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.meshCreator._setSceneGraphBaseNode( sceneGraphBaseNode );
	};

	/**
	 * Set materials loaded by MTLLoader
	 *
	 * @param materials THREE.MTLLoader.MaterialCreator.materials)
	 */
	OBJLoader2.prototype.setMaterials = function ( materials ) {
		this.meshCreator._setMaterials( materials );
	};

	/**
	 * Allows to set debug mode for the parser and the meshCreator
	 *
	 * @param parserDebug
	 * @param meshCreatorDebug
	 */
	OBJLoader2.prototype.setDebug = function ( parserDebug, meshCreatorDebug ) {
		this.parser._setDebug( parserDebug );
		this.meshCreator._setDebug( meshCreatorDebug );
	};

	/**
	 * Use this convenient method to load an OBJ file at the given URL. Per default the fileLoader uses an arraybuffer
	 *
	 * @param url
	 * @param onLoad
	 * @param onProgress
	 * @param onError
	 * @param useArrayBuffer
	 */
	OBJLoader2.prototype.load = function ( url, onLoad, onProgress, onError, useArrayBuffer ) {
		this._validate();
		this.fileLoader.setPath( this.path );
		this.fileLoader.setResponseType( ( useArrayBuffer || useArrayBuffer == null ) ? 'arraybuffer' : 'text' );

		var scope = this;
		scope.fileLoader.load( url, function ( content ) {

			// only use parseText if useArrayBuffer is explicitly set to false
			onLoad( ( useArrayBuffer || useArrayBuffer == null ) ? scope.parse( content ) : scope.parseText( content ) );

		}, onProgress, onError );
	};

	/**
	 * Default parse function: Parses OBJ file content stored in arrayBuffer and returns the sceneGraphBaseNode
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

		this._validate();
		this.parser.parseArrayBuffer( arrayBuffer );
		var sceneGraphAttach = this._finalize();

		console.timeEnd( 'parseArrayBuffer' );

		return sceneGraphAttach;
	};

	/**
	 * Legacy parse function: Parses OBJ file content stored in string and returns the sceneGraphBaseNode
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

		this._validate();
		this.parser.parseText( text );
		var sceneGraphBaseNode = this._finalize();

		console.timeEnd( 'parseText' );

		return sceneGraphBaseNode;
	};

	OBJLoader2.prototype._validate = function () {
		if ( this.validated ) return;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.FileLoader( this.manager ) : this.fileLoader;
		this.setPath( null );
		this.parser._validate();
		this.meshCreator._validate();

		this.validated = true;
	};

	OBJLoader2.prototype._finalize = function () {
		console.log( 'Global output object count: ' + this.meshCreator.globalObjectCount );

		this.parser._finalize();
		this.fileLoader = null;
		var sceneGraphBaseNode = this.meshCreator.sceneGraphBaseNode;
		this.meshCreator._finalize();
		this.validated = false;

		return sceneGraphBaseNode;
	};

	return OBJLoader2;
})();


