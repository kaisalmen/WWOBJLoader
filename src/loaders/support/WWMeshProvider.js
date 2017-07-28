if ( THREE.LoaderSupport.WW === undefined ) { THREE.LoaderSupport.WW = {} }

THREE.LoaderSupport.WW.MeshProvider = (function () {

	var WW_MESH_PROVIDER_VERSION = '1.0.0-dev';

	var Validator = THREE.LoaderSupport.Validator;

	function MeshProvider() {
		console.log( "Using THREE.LoaderSupport.WW.MeshProvider version: " + WW_MESH_PROVIDER_VERSION );

		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";
		if ( window.Blob === undefined  ) throw "This browser does not support Blob!";
		if ( typeof window.URL.createObjectURL !== 'function'  ) throw "This browser does not support Object creation from URL!";

		this.worker = null;
		this.workerCode = null;
		this.counter = 0;
	}

	MeshProvider.prototype.reInit = function ( forceWorkerReload, functionCodeBuilder, implClassName, existingWorkerCode ) {
		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.meshStore = [];

		this.running = false;

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		var vertexColorMaterial = new THREE.MeshBasicMaterial( { color: 0xDCF1FF } );
		vertexColorMaterial.name = 'vertexColorMaterial';
		vertexColorMaterial.vertexColors = THREE.VertexColors;
		this.materials[ vertexColorMaterial.name ] = vertexColorMaterial;

		this.callbacks = {
			onProgress: null,
			onMeshLoaded: null,
			onLoad: null
		};

		if ( forceWorkerReload ) {
			this.worker = null;
			this.workerCode = null;
			this.counter = 0;
		}

		if ( ! Validator.isValid( this.worker ) ) {

			console.log( 'Building worker code...' );
			console.time( 'buildWebWorkerCode' );
			this.workerCode = functionCodeBuilder( buildObject, buildSingelton, existingWorkerCode );
			this.workerCode += 'WWImplRef = new ' + implClassName + '();\n\n';
			this.workerCode += buildSingelton( 'WWRunner', 'WWRunner', wwRunnerDef );
			this.workerCode += 'new WWRunner();\n\n';

			var blob = new Blob( [ this.workerCode ], { type: 'text/plain' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );
			console.timeEnd( 'buildWebWorkerCode' );

			var scope = this;
			var scopeFunction = function ( e ) {
				scope._receiveWorkerMessage( e );
			};
			this.worker.addEventListener( 'message', scopeFunction, false );

		}
	};

	var buildObject = function ( fullName, object ) {
		var objectString = fullName + ' = {\n';
		var part;
		for ( var name in object ) {

			part = object[ name ];
			if ( typeof( part ) === 'string' || part instanceof String ) {

				part = part.replace( '\n', '\\n' );
				part = part.replace( '\r', '\\r' );
				objectString += '\t' + name + ': "' + part + '",\n';

			} else if ( part instanceof Array ) {

				objectString += '\t' + name + ': [' + part + '],\n';

			} else if ( Number.isInteger( part ) ) {

				objectString += '\t' + name + ': ' + part + ',\n';

			} else if ( typeof part === 'function' ) {

				objectString += '\t' + name + ': ' + part + ',\n';

			}

		}
		objectString += '}\n\n';

		return objectString;
	};

	var buildSingelton = function ( fullName, internalName, object ) {
		var objectString = fullName + ' = (function () {\n\n';
		objectString += '\t' + object.prototype.constructor.toString() + '\n\n';

		var funcString;
		var objectPart;
		for ( var name in object.prototype ) {

			objectPart = object.prototype[ name ];
			if ( typeof objectPart === 'function' ) {

				funcString = objectPart.toString();
				objectString += '\t' + internalName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

			}

		}
		objectString += '\treturn ' + internalName + ';\n';
		objectString += '})();\n\n';

		return objectString;
	};

	var wwRunnerDef = (function () {

		function WWRunner() {
			self.addEventListener( 'message', this.runner, false );
		}

		WWRunner.prototype.runner = function ( event ) {
			var payload = event.data;

			console.log( 'Command state before: ' + WWImplRef.cmdState );

			switch ( payload.cmd ) {
				case 'run':
					WWImplRef.run( payload );
					break;

				default:

					console.error( 'OBJLoader: Received unknown command: ' + payload.cmd );
					break;

			}

			console.log( 'Command state after: ' + WWImplRef.cmdState );
		};

		return WWRunner;
	})();

	MeshProvider.prototype.setCallbacks = function ( callbackOnProgress, callbackOnMeshLoaded, callbackOnLoad  ) {
		this.callbacks.onProgress = Validator.isValid( callbackOnProgress ) ? callbackOnProgress : this.callbacks.onProgress;
		this.callbacks.onMeshLoaded = Validator.isValid( callbackOnMeshLoaded ) ? callbackOnMeshLoaded : this.callbacks.meshLoaded;
		this.callbacks.onLoad = Validator.isValid( callbackOnLoad ) ? callbackOnLoad : this.callbacks.onLoad;
	};

	MeshProvider.prototype.clearAllCallbacks = function () {
		this.setCallbacks();
	};

	MeshProvider.prototype._terminate = function () {
		if ( Validator.isValid( this.worker ) ) {
			this.worker.terminate();
		}
		this.worker = null;
		this.workerCode = null;
	};

	MeshProvider.prototype.addMaterials = function ( materials ) {
		if ( Validator.isValid( materials ) ) {
			for ( var name in materials ) {
				this.materials[ name ] = materials[ name ];
			}
		}
	};

	MeshProvider.prototype.postMessage = function ( messageObject ) {
		if ( Validator.isValid( this.worker ) ) {
			this.worker.postMessage( messageObject );
		}
	};

	MeshProvider.prototype.prepareRun = function ( sceneGraphBaseNode, streamMeshes ) {
		this.running = true;
		this.sceneGraphBaseNode = sceneGraphBaseNode;
		this.streamMeshes = streamMeshes !== false;

		if ( ! this.streamMeshes ) this.meshStore = [];
	};

	MeshProvider.prototype._receiveWorkerMessage = function ( event ) {
		var payload = event.data;

		switch ( payload.cmd ) {
			case 'meshData':

				var meshName = payload.params.meshName;

				var bufferGeometry = new THREE.BufferGeometry();
				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.buffers.vertices ), 3 ) );
				var haveVertexColors = Validator.isValid( payload.buffers.colors );
				if ( haveVertexColors ) {

					bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( payload.buffers.colors ), 3 ) );

				}
				if ( Validator.isValid( payload.buffers.normals ) ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.buffers.normals ), 3 ) );

				} else {

					bufferGeometry.computeVertexNormals();

				}
				if ( Validator.isValid( payload.buffers.uvs ) ) {

					bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( payload.buffers.uvs ), 2 ) );

				}

				var materialDescriptions = payload.materials.materialDescriptions;
				var materialDescription;
				var material;
				var materialName;
				var createMultiMaterial = payload.materials.multiMaterial;
				var multiMaterials = [];

				var key;
				for ( key in materialDescriptions ) {

					materialDescription = materialDescriptions[ key ];
					material = this.materials[ materialDescription.name ];
					material = haveVertexColors ? this.materials[ 'vertexColorMaterial' ] : this.materials[ materialDescription.name ];
					if ( ! material ) material = this.materials[ 'defaultMaterial' ];

					if ( materialDescription.default ) {

						material = this.materials[ 'defaultMaterial' ];

					} else if ( materialDescription.flat ) {

						materialName = material.name + '_flat';
						var materialClone = this.materials[ materialName ];
						if ( ! materialClone ) {

							materialClone = material.clone();
							materialClone.name = materialName;
							materialClone.shading = THREE.FlatShading;
							this.materials[ materialName ] = name;

						}

					}

					if ( materialDescription.vertexColors ) material.vertexColors = THREE.VertexColors;
					if ( createMultiMaterial ) multiMaterials.push( material );

				}
				if ( createMultiMaterial ) {

					material = multiMaterials;
					var materialGroups = payload.materials.materialGroups;
					var materialGroup;
					for ( key in materialGroups ) {

						materialGroup = materialGroups[ key ];
						bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

					}

				}

				var meshes = [];
				var mesh;
				var callbackOnMeshLoaded = this.callbacks.onMeshLoaded;
				var callbackOnMeshLoadedResult;
				if ( Validator.isValid( callbackOnMeshLoaded ) ) {

					callbackOnMeshLoadedResult = callbackOnMeshLoaded( meshName, bufferGeometry, material );
					if ( Validator.isValid( callbackOnMeshLoadedResult ) && ! callbackOnMeshLoadedResult.isDisregardMesh() ) {

						if ( callbackOnMeshLoadedResult.providesAlteredMeshes() ) {

							for ( var i in callbackOnMeshLoadedResult.meshes ) {

								meshes.push( callbackOnMeshLoadedResult.meshes[ i ] );

							}

						} else {

							mesh = new THREE.Mesh( bufferGeometry, material );
							mesh.name = meshName;
							meshes.push( mesh );

						}

					} else {

						mesh = new THREE.Mesh( bufferGeometry, material );
						mesh.name = meshName;
						meshes.push( mesh );

					}

				} else {

					mesh = new THREE.Mesh( bufferGeometry, material );
					mesh.name = meshName;
					meshes.push( mesh );

				}
				if ( Validator.isValid( meshes ) && meshes.length > 0 ) {

					var meshNames = [];
					for ( var i in meshes ) {

						mesh = meshes[ i ];
						if ( this.streamMeshes ) {

							this.sceneGraphBaseNode.add( mesh );

						} else {

							this.meshStore.push( mesh );

						}
						meshNames[ i ] = mesh.name;

					}

					this.callbacks.onProgress( 'Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh (' + this.counter + '): ' + meshName );
					this.counter++;

				} else {

					this.callbacks.onProgress(  'Not adding mesh: ' + meshName );

				}
				break;

			case 'complete':

				if ( ! this.streamMeshes ) {

					for ( var meshStoreKey in this.meshStore ) {

						if ( this.meshStore.hasOwnProperty( meshStoreKey ) ) this.sceneGraphBaseNode.add( this.meshStore[ meshStoreKey ] );

					}

				}

				if ( Validator.isValid( payload.msg ) ) this.callbacks.onProgress( payload.msg );

				this._completedeRun();
				break;

			default:
				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	MeshProvider.prototype._completedeRun = function () {
		this.running = false;
		this.callbacks.onLoad( 'complete' );
	};

	return MeshProvider;
})();
