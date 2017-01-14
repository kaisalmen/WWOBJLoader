/**
 * MeshCreator is used to transform THREE.OBJLoader2.RawObjectDescriptions to THREE.Mesh
 *
 * @class
 */
THREE.OBJLoader2.MeshCreator = (function () {

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
	 * RawObjectDescriptions are transformed to THREE.Mesh.
	 * It is ensured that rawObjectDescriptions only contain objects with vertices (no need to check).
	 * This method shall be overridden by the web worker implementation
	 * @memberOf THREE.OBJLoader2.MeshCreator
	 *
	 * @param rawObjectDescriptions
	 * @param inputObjectCount
	 * @param absoluteVertexCount
	 * @param absoluteNormalCount
	 * @param absoluteUvCount
	 */
	MeshCreator.prototype.buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {

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
		var createMultiMaterial = ( rawObjectDescriptions.length > 1 ) ? true : false;
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