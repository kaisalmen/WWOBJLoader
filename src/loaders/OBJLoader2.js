if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }
THREE.OBJLoader2.version = 'dev';

/**
 * Use this class to load OBJ data from files or to parse OBJ data from arraybuffer or text
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] Extension of {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader2 = (function () {

	function OBJLoader2( manager ) {
		this.manager = ( manager == null ) ? THREE.DefaultLoadingManager : manager;

		this.path = '';
		this.fileLoader = new THREE.FileLoader( this.manager );

		this.meshCreator = new MeshCreator();
		this.parser = new THREE.OBJLoader2.Parser( this.meshCreator );

		this.validated = false;
	}

	/**
	 * Base path to use
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} path The basepath
	 */
	OBJLoader2.prototype.setPath = function ( path ) {
		this.path = ( path == null ) ? this.path : path;
	};

	/**
	 * Set the node where the loaded objects will be attached
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode Scenegraph object where meshes will be attached
	 */
	OBJLoader2.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.meshCreator._setSceneGraphBaseNode( sceneGraphBaseNode );
	};

	/**
	 * Set materials loaded by MTLLoader
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {THREE.MTLLoader.MaterialCreator.materials[]} materials {@link THREE.MTLLoader.MaterialCreator.materials}
	 */
	OBJLoader2.prototype.setMaterials = function ( materials ) {
		this.meshCreator._setMaterials( materials );
	};

	/**
	 * Allows to set debug mode for the parser and the meshCreator
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {boolean} parserDebug {@link THREE.OBJLoader2.Parser} will produce debug output
	 * @param {boolean} meshCreatorDebug {@link THREE.OBJLoader2.MeshCreator} will produce debug output
	 */
	OBJLoader2.prototype.setDebug = function ( parserDebug, meshCreatorDebug ) {
		this.parser._setDebug( parserDebug );
		this.meshCreator._setDebug( meshCreatorDebug );
	};

	/**
	 * Use this convenient method to load an OBJ file at the given URL. Per default the fileLoader uses an arraybuffer
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} url URL of the file to load
	 * @param {callback} onLoad Called after loading was successfully completed
	 * @param {callback} onProgress Called to report progress of loading
	 * @param {callback} onError Called after an error occurred during loading
	 * @param {boolean} [useArrayBuffer=true] Set this to false to force string based parsing
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
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {Uint8Array} arrayBuffer OBJ data as Uint8Array
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
	 * @memberOf THREE.OBJLoader2
	 *
	 * @param {string} text OBJ data as string
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
		this.setPath();
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

	/**
	 * MeshCreator is used to transform THREE.OBJLoader2.RawObjectDescriptions to THREE.Mesh
	 *
	 * @class
	 */
	var MeshCreator = (function () {

		function MeshCreator() {
			this.sceneGraphBaseNode = null;
			this.materials = null;
			this.debug = false;
			this.globalObjectCount = 1;

			this.validated = false;
		}

		MeshCreator.prototype._setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
			this.sceneGraphBaseNode = ( sceneGraphBaseNode == null ) ? ( this.sceneGraphBaseNode == null ? new THREE.Group() : this.sceneGraphBaseNode ) : sceneGraphBaseNode;
		};

		MeshCreator.prototype._setMaterials = function ( materials ) {
			this.materials = ( materials == null ) ? ( this.materials == null ? { materials: [] } : this.materials ) : materials;
		};

		MeshCreator.prototype._setDebug = function ( debug ) {
			this.debug = ( debug == null ) ? this.debug : debug;
		};

		MeshCreator.prototype._validate = function () {
			if ( this.validated ) return;

			this._setSceneGraphBaseNode( null );
			this._setMaterials( null );
			this._setDebug( null );
			this.globalObjectCount = 1;
		};

		MeshCreator.prototype._finalize = function () {
			this.sceneGraphBaseNode = null;
			this.materials = null;
			this.validated = false;
		};

		/**
		 * This is an internal function, but due to its importance to Parser it is documented.
		 * RawObjectDescriptions are transformed to THREE.Mesh.
		 * It is ensured that rawObjectDescriptions only contain objects with vertices (no need to check).
		 * This method shall be overridden by the web worker implementation
		 *
		 * @param {THREE.OBJLoader2.RawObjectDescription[]} rawObjectDescriptions Array of descriptive information and data (vertices, normals, uvs) about the parsed object(s)
		 * @param {number} inputObjectCount Number of objects already retrieved from OBJ
		 * @param {number} absoluteVertexCount Sum of all vertices of all rawObjectDescriptions
		 * @param {number} absoluteNormalCount Sum of all normals of all rawObjectDescriptions
		 * @param {number} absoluteUvCount Sum of all uvs of all rawObjectDescriptions
		 */
		MeshCreator.prototype._buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {

			if ( this.debug ) console.log( 'MeshCreator.buildRawMeshData:\nInput object no.: ' + inputObjectCount );

			var bufferGeometry = new THREE.BufferGeometry();
			var vertexBA = new THREE.BufferAttribute( new Float32Array( absoluteVertexCount ), 3 );
			bufferGeometry.addAttribute( 'position', vertexBA );

			var normalBA;
			if ( absoluteNormalCount > 0 ) {

				normalBA = new THREE.BufferAttribute( new Float32Array( absoluteNormalCount ), 3 );
				bufferGeometry.addAttribute( 'normal', normalBA );

			}
			var uvBA;
			if ( absoluteUvCount > 0 ) {

				uvBA = new THREE.BufferAttribute( new Float32Array( absoluteUvCount ), 2 );
				bufferGeometry.addAttribute( 'uv', uvBA );

			}

			if ( this.debug ) console.log( 'Creating Multi-Material for object no.: ' + this.globalObjectCount );

			var rawObjectDescription;
			var material;
			var materialName;
			var createMultiMaterial = rawObjectDescriptions.length > 1;
			var materials = [];
			var materialIndex = 0;
			var materialIndexMapping = [];
			var selectedMaterialIndex;

			var vertexBAOffset = 0;
			var vertexGroupOffset = 0;
			var vertexLength;
			var normalOffset = 0;
			var uvOffset = 0;

			for ( var oodIndex in rawObjectDescriptions ) {
				rawObjectDescription = rawObjectDescriptions[ oodIndex ];

				materialName = rawObjectDescription.materialName;
				material = this.materials[ materialName ];
				if ( ! material ) {

					material = this.materials[ 'defaultMaterial' ];
					if ( ! material ) {

						material = new THREE.MeshStandardMaterial( { color: 0xDCF1FF} );
						material.name = 'defaultMaterial';
						this.materials[ 'defaultMaterial' ] = material;

					}
					console.warn( 'object_group "' + rawObjectDescription.objectName + '_' + rawObjectDescription.groupName + '" was defined without material! Assigning "defaultMaterial".' );

				}
				// clone material in case flat shading is needed due to smoothingGroup 0
				if ( rawObjectDescription.smoothingGroup === 0 ) {

					materialName = material.name + '_flat';
					var materialClone = this.materials[ materialName ];
					if ( ! materialClone ) {

						materialClone = material.clone();
						materialClone.name = materialName;
						materialClone.shading = THREE.FlatShading;
						this.materials[ materialName ] = name;

					}

				}

				vertexLength = rawObjectDescription.vertices.length;
				if ( createMultiMaterial ) {

					// re-use material if already used before. Reduces materials array size and eliminates duplicates
					selectedMaterialIndex = materialIndexMapping[ materialName ];
					if ( ! selectedMaterialIndex ) {

						selectedMaterialIndex = materialIndex;
						materialIndexMapping[ materialName ] = materialIndex;
						materials.push( material );
						materialIndex++;

					}

					bufferGeometry.addGroup( vertexGroupOffset, vertexLength / 3, selectedMaterialIndex );
					vertexGroupOffset += vertexLength / 3;
				}

				vertexBA.set( rawObjectDescription.vertices, vertexBAOffset );
				vertexBAOffset += vertexLength;

				if ( normalBA ) {

					normalBA.set( rawObjectDescription.normals, normalOffset );
					normalOffset += rawObjectDescription.normals.length;

				}
				if ( uvBA ) {

					uvBA.set( rawObjectDescription.uvs, uvOffset );
					uvOffset += rawObjectDescription.uvs.length;

				}
				if ( this.debug ) this._printReport( rawObjectDescription, selectedMaterialIndex );

			}
			if ( ! normalBA ) bufferGeometry.computeVertexNormals();

			if ( createMultiMaterial ) material = new THREE.MultiMaterial( materials );
			var mesh = new THREE.Mesh( bufferGeometry, material );
			this.sceneGraphBaseNode.add( mesh );

			this.globalObjectCount++;
		};

		MeshCreator.prototype._printReport = function ( rawObjectDescription, selectedMaterialIndex ) {
			console.log(
				' Output Object no.: ' + this.globalObjectCount +
				'\n objectName: ' + rawObjectDescription.objectName +
				'\n groupName: ' + rawObjectDescription.groupName +
				'\n materialName: ' + rawObjectDescription.materialName +
				'\n materialIndex: ' + selectedMaterialIndex +
				'\n smoothingGroup: ' + rawObjectDescription.smoothingGroup +
				'\n #vertices: ' + rawObjectDescription.vertices.length / 3 +
				'\n #uvs: ' + rawObjectDescription.uvs.length / 2 +
				'\n #normals: ' + rawObjectDescription.normals.length / 3
			);
		};

		return MeshCreator;
	})();

	return OBJLoader2;
})();
