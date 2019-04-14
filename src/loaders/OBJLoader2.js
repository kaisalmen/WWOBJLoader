if ( ! THREE.OBJLoader2 ) { THREE.OBJLoader2 = {} }

/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader2 = function ( manager ) {
	this.manager = ( manager && manager !== null ) ? manager : THREE.DefaultLoadingManager;
	this.logging = {
		enabled: true,
		debug: false
	};

	this.modelName = '';
	this.instanceNo = 0;
	this.path;
	this.resourcePath;
	this.useIndices = false;
	this.disregardNormals = false;
	this.materialPerSmoothingGroup = false;
	this.useOAsMesh = false;
	this.baseObject3d = new THREE.Group();

	this.callbacks = {
		onParseProgress: undefined,
		genericErrorHandler: undefined
	};

	this.materials = {};
	this._createDefaultMaterials();
};

THREE.OBJLoader2.prototype = Object.create( THREE.OBJLoader2.prototype );
THREE.OBJLoader2.prototype.constructor = THREE.OBJLoader2;
THREE.OBJLoader2.OBJLOADER2_VERSION = '3.0.0-preview';


THREE.OBJLoader2.prototype = {

	constructor: THREE.OBJLoader2,

	printVersion: function() {
		console.info( 'Using THREE.OBJLoader2 version: ' + THREE.OBJLoader2.OBJLOADER2_VERSION );
	},

	_createDefaultMaterials: function () {
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';

		var defaultVertexColorMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
		defaultVertexColorMaterial.vertexColors = THREE.VertexColors;

		var defaultLineMaterial = new THREE.LineBasicMaterial();
		defaultLineMaterial.name = 'defaultLineMaterial';

		var defaultPointMaterial = new THREE.PointsMaterial( { size: 0.1 } );
		defaultPointMaterial.name = 'defaultPointMaterial';

		var defaultMaterials = {};
		defaultMaterials[ defaultMaterial.name ] = defaultMaterial;
		defaultMaterials[ defaultVertexColorMaterial.name ] = defaultVertexColorMaterial;
		defaultMaterials[ defaultLineMaterial.name ] = defaultLineMaterial;
		defaultMaterials[ defaultPointMaterial.name ] = defaultPointMaterial;

		this.addMaterials( defaultMaterials );
	},

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		return this;
	},

	/**
	 * Set the name of the model.
	 *
	 * @param {string} modelName
	 */
	setModelName: function ( modelName ) {
		this.modelName = ( modelName === null || modelName === undefined ) ? this.modelName : modelName;
		return this;
	},

	/**
	 * The URL of the base path.
	 *
	 * @param {string} path URL
	 */
	setPath: function ( path ) {
		this.path = ( path === null || path === undefined ) ? this.path : path;
		return this;
	},


	/**
	 * Allow to specify resourcePath for dependencies of specified resource.
	 * @param {string} resourcePath
	 */
	setResourcePath: function ( resourcePath ) {
		this.resourcePath = ( resourcePath === null || resourcePath === undefined ) ? this.resourcePath : resourcePath;
	},

	/**
	 * Set the node where the loaded objects will be attached directly.
	 *
	 * @param {THREE.Object3D} baseObject3d Object already attached to scenegraph where new meshes will be attached to
	 */
	setBaseObject3d: function ( baseObject3d ) {
		this.baseObject3d = ( baseObject3d === null || baseObject3d === undefined ) ? this.baseObject3d : baseObject3d;
		return this;
	},

	/**
	 * Set materials loaded by MTLLoader or any other supplier of an Array of {@link THREE.Material}.
	 *
	 * @param Object with named {@link THREE.Material} or instance of {@link THREE.MTLLoader.MaterialCreator}
	 */
	addMaterials: function ( materialsOrmaterialCreator ) {
		var newMaterials = {};
		if ( materialsOrmaterialCreator !== undefined && materialsOrmaterialCreator !== null ) {

			if ( materialsOrmaterialCreator instanceof THREE.MTLLoader.MaterialCreator ) {

				newMaterials = this._handleMtlMaterials( materialsOrmaterialCreator );

			} else {

				newMaterials = materialsOrmaterialCreator;

			}
			if ( Object.keys( newMaterials ).length > 0 ) {

				for ( var newMaterialName in newMaterials ) {

					this.materials[ newMaterialName ] = newMaterials[ newMaterialName ];
					if ( this.logging.enabled ) console.info( 'Material with name "' + newMaterialName + '" was added.' );

				}

			}
		}
		return newMaterials;
	},

	/**
	 * Instructs loaders to create indexed {@link THREE.BufferGeometry}.
	 *
	 * @param {boolean} useIndices=false
	 */
	setUseIndices: function ( useIndices ) {
		this.useIndices = useIndices === true;
		return this;
	},

	/**
	 * Tells whether normals should be completely disregarded and regenerated.
	 *
	 * @param {boolean} disregardNormals=false
	 */
	setDisregardNormals: function ( disregardNormals ) {
		this.disregardNormals = disregardNormals === true;
		return this;
	},

	/**
	 * Tells whether a material shall be created per smoothing group.
	 *
	 * @param {boolean} materialPerSmoothingGroup=false
	 */
	setMaterialPerSmoothingGroup: function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup === true;
		return this;
	},

	/**
	 * Usually 'o' is meta-information and does not result in creation of new meshes, but mesh creation on occurrence of "o" can be enforced.
	 *
	 * @param {boolean} useOAsMesh=false
	 */
	setUseOAsMesh: function ( useOAsMesh ) {
		this.useOAsMesh = useOAsMesh === true;
		return this;
	},

	/**
	 * Register an generic error handler that is called if available instead of throwing an exception
	 * @param {Function} genericErrorHandler
	 */
	setGenericErrorHandler: function ( genericErrorHandler ) {
		if ( genericErrorHandler !== null && genericErrorHandler !== undefined ) {

			this.callbacks.genericErrorHandler = genericErrorHandler;

		}
	},


	_setCallbacks: function ( onParseProgress, onMeshAlter, onLoadMaterials ) {
		if ( onParseProgress !== null && onParseProgress !== undefined ) {

			this.callbacks.onParseProgress = onParseProgress;

		}
	},

	/**
	 * Announce feedback which is give to the registered callbacks.
	 * @private
	 *
	 * @param {string} type The type of event
	 * @param {string} text Textual description of the event
	 * @param {number} numericalValue Numerical value describing the progress
	 */
	_onProgress: function ( type, text, numericalValue ) {
		var content = ( text === null || text === undefined ) ? '': text;
		var event = {
			detail: {
				type: type,
				modelName: this.modelName,
				instanceNo: this.instanceNo,
				text: content,
				numericalValue: numericalValue
			}
		};
		if ( this.callbacks.onParseProgress ) {

			this.callbacks.onParseProgress( event );

		}
		if ( this.logging.enabled && this.logging.debug ) {

			console.log( content );

		}
	},

	_onError: function ( event ) {
		var output = '';
		if ( event.currentTarget && event.currentTarget.statusText !== null ) {

			output = 'Error occurred while downloading!\nurl: ' + event.currentTarget.responseURL + '\nstatus: ' + event.currentTarget.statusText;

		} else if ( typeof( event ) === 'string' || event instanceof String ) {

			output = event;

		}
		var scope = this;
		var onProgressScoped = function ( text, numericalValue ) {
			scope._onProgress( 'error', text, numericalValue );
		};
		onProgressScoped( output, - 1 );
		if ( this.callbacks.genericErrorHandler ) {

			this.callbacks.genericErrorHandler( output );

		}
	},

	/**
	 * Use this convenient method to load a file at the given URL. By default the fileLoader uses an ArrayBuffer.
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {function} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {function} [onFileLoadProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {function} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @param {function} [onMeshAlter] Called after worker successfully delivered a single mesh
	 * * @param {Object} parserConfiguration Provide additional instructions for MTL parsing:
	 * 	- {String} resourcePath Relative path for texture loading
	 *  - {String} [mtlName] Name given to identify the mtl file
	 *  - {string} [crossOrigin] CORS value
	 *  - {Object} [materialOptions] Set material loading options for MTLLoader
	 */
	load: function ( url, onLoad, onFileLoadProgress, onError, onMeshAlter, parserConfiguration ) {
		if ( onError === null || onError === undefined ) {

			var scope = this;
			onError = function ( event ) {
				scope._onError( event );
			};

		}
		if ( url === null || url === undefined ) {

			onError( 'An invalid url was provided. Unable to continue!' );

		}
		if ( parserConfiguration === null || parserConfiguration === undefined ) {

			parserConfiguration = {};

		}
		// find out if we have obj or mtl extension
		var urlParts = url.split( '/' );
		var filename = url;
		if ( urlParts.length > 2 ) {

			filename = urlParts.pop();
			parserConfiguration.path  = ( parserConfiguration.path === null || parserConfiguration.path === undefined ) ? urlParts.join( '/' ) + '/' : parserConfiguration.path;

		}
		parserConfiguration.payloadType = 'arraybuffer';

		var filenameParts = filename.split( '.' );
		var extension = null;
		if ( filenameParts.length > 1 ) extension = filenameParts[ filenameParts.length - 1 ];

		// unable to continue
		if ( extension === null ) onError( 'File with no extension was supplied. Unable to continue!' );
		extension = extension.toLowerCase();
		if ( extension !== 'obj' && extension !== 'mtl' ) {

			onError( 'Provided extension "' + extension + '" is not supported by "OBJLoader2".' );

		} else if ( extension === 'mtl' ) {

			parserConfiguration.payloadType = 'text';

		}
		this.setPath( parserConfiguration.path  );
		this.setResourcePath( parserConfiguration.resourcePath );

		// set default values bound to load
		parserConfiguration.filename  = ( parserConfiguration.filename === null || parserConfiguration.filename === undefined ) ? filename : parserConfiguration.filename;

		var scope = this;
		if ( onFileLoadProgress === null || onFileLoadProgress === undefined ) {

			var numericalValueRef = 0;
			var numericalValue = 0;
			onFileLoadProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				numericalValue = event.loaded / event.total;
				if ( numericalValue > numericalValueRef ) {

					numericalValueRef = numericalValue;
					var output = 'Download of "' + url + '": ' + (numericalValue * 100).toFixed( 2 ) + '%';
					scope._onProgress( 'progressLoad', output, numericalValue );

				}
			};

		}
		this._setCallbacks( null, onMeshAlter, null );

		var fileLoaderOnLoad = function ( content ) {
			onLoad( scope.parse( content, parserConfiguration ) );
		};

		var fileLoader = new THREE.FileLoader( this.manager );
		fileLoader.setPath( this.path || this.resourcePath );
		fileLoader.setResponseType( parserConfiguration.payloadType );
		fileLoader.load( filename, fileLoaderOnLoad, onFileLoadProgress, onError );
	},

	/**
	 * Parses OBJ data synchronously from arraybuffer or string.
	 *
	 * @param {arraybuffer|string} content OBJ data as Uint8Array or String
	 * @param {Object} parserConfiguration Provide additional instructions for MTL parsing:
	 * 	- {String} resourcePath Relative path for texture loading
	 *  - {String} [filename] Name given to identify the mtl file
	 *  - {string} [crossOrigin] CORS value
	 *  - {Object} [materialOptions] Set material loading options for MTLLoader
	 */
	parse: function ( content, parserConfiguration ) {
		// fast-fail in case of illegal data
		if ( content === null || content === undefined ) {

			console.warn( 'Provided content is not a valid ArrayBuffer or String.' );
			return this.baseObject3d;

		}
		if ( parserConfiguration === null || parserConfiguration === undefined ) {

			parserConfiguration = {};

		}
		parserConfiguration.filename  = ( parserConfiguration.filename === null || parserConfiguration.filename === undefined ) ? 'NoFileNameAvailable' : parserConfiguration.filename;
		parserConfiguration.crossOrigin  = ( parserConfiguration.crossOrigin === null || parserConfiguration.crossOrigin === undefined ) ? 'anonymous' : parserConfiguration.crossOrigin;
		parserConfiguration.materialOptions  = ( parserConfiguration.materialOptions === null || parserConfiguration.materialOptions === undefined ) ? {} : parserConfiguration.materialOptions;

		var parseResult;
		if ( parserConfiguration.payloadType === 'text' ) {

			if ( this.logging.enabled ) console.time( 'OBJLoader parse MTL: ' + parserConfiguration.filename );
			parseResult = this._parseMtl( content, parserConfiguration );
			if ( this.logging.enabled ) console.timeEnd( 'OBJLoader parse MTL: ' + parserConfiguration.filename );

		} else {

			if ( this.logging.enabled ) console.time( 'OBJLoader parse: ' + this.modelName );

			var parser = new THREE.OBJLoader2.Parser();
			parser.setLogging( this.logging.enabled, this.logging.debug );
			parser.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
			parser.setUseOAsMesh( this.useOAsMesh );
			parser.setUseIndices( this.useIndices );
			parser.setDisregardNormals( this.disregardNormals );
			// sync code works directly on the material references
			parser.setMaterials( this.materials );

			var scope = this;
			var onMeshLoaded = function ( payload ) {

				if ( payload.cmd === 'data' && payload.type === 'mesh' ) {

					var meshes = scope._buildMeshes( payload );
					var mesh;
					for ( var i in meshes ) {

						mesh = meshes[ i ];
						scope.baseObject3d.add( mesh );

					}

				}
			};
			var onProgressScoped = function ( text, numericalValue ) {
				scope._onProgress( 'progressParse', text, numericalValue );
			};
			parser.setCallbackOnProgress( onProgressScoped );
			parser.setCallbackOnAssetAvailable( onMeshLoaded );

			if ( content instanceof ArrayBuffer || content instanceof Uint8Array ) {

				if ( this.logging.enabled ) console.info( 'Parsing arrayBuffer...' );
				parser.parse( content );

			} else if ( typeof( content ) === 'string' || content instanceof String ) {

				if ( this.logging.enabled ) console.info( 'Parsing text...' );
				parser.parseText( content );

			} else {

				var errorMessage = 'Provided content was neither of type String nor Uint8Array! Aborting...';
				if ( this.callbacks.genericErrorHandler ) {

					this.callbacks.genericErrorHandler( errorMessage );

				}

			}
			if ( this.logging.enabled ) console.timeEnd( 'OBJLoader parse: ' + this.modelName );

			parseResult = this.baseObject3d;
		}
		return parseResult;
	},

	_buildMeshes: function ( meshPayload ) {
		var meshName = meshPayload.params.meshName;

		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.vertices ), 3 ) );
		if ( meshPayload.buffers.indices !== null ) {

			bufferGeometry.setIndex( new THREE.BufferAttribute( new Uint32Array( meshPayload.buffers.indices ), 1 ) );

		}
		var haveVertexColors = meshPayload.buffers.colors  !== null;
		if ( haveVertexColors ) {

			bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.colors ), 3 ) );

		}
		if ( meshPayload.buffers.normals !== null ) {

			bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( meshPayload.buffers.uvs  !== null ) {

			bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.uvs ), 2 ) );

		}
		if ( meshPayload.buffers.skinIndex !== null ) {

			bufferGeometry.addAttribute( 'skinIndex', new THREE.BufferAttribute( new Uint16Array( meshPayload.buffers.skinIndex ), 4 ) );

		}
		if ( meshPayload.buffers.skinWeight !== null ) {

			bufferGeometry.addAttribute( 'skinWeight', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.skinWeight ), 4 ) );

		}

		var material, materialName, key;
		var materialNames = meshPayload.materials.materialNames;
		var createMultiMaterial = meshPayload.materials.multiMaterial;
		var multiMaterials = [];
		for ( key in materialNames ) {

			materialName = materialNames[ key ];
			material = this.materials[ materialName ];
			if ( createMultiMaterial ) multiMaterials.push( material );

		}
		if ( createMultiMaterial ) {

			material = multiMaterials;
			var materialGroups = meshPayload.materials.materialGroups;
			var materialGroup;
			for ( key in materialGroups ) {

				materialGroup = materialGroups[ key ];
				bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

			}

		}

		var meshes = [];
		var mesh;
		var callbackOnMeshAlter = this.callbacks.onMeshAlter;
		var callbackOnMeshAlterResult;
		var useOrgMesh = true;
		var geometryType = meshPayload.geometryType === null ? 0 : meshPayload.geometryType;

		if ( callbackOnMeshAlter ) {

			callbackOnMeshAlterResult = callbackOnMeshAlter(
				{
					detail: {
						meshName: meshName,
						bufferGeometry: bufferGeometry,
						material: material,
						geometryType: geometryType
					}
				}
			);
		}

		if ( callbackOnMeshAlterResult ) {

			if ( callbackOnMeshAlterResult.isDisregardMesh() ) {

				useOrgMesh = false;

			} else if ( callbackOnMeshAlterResult.providesAlteredMeshes() ) {

				for ( var i in callbackOnMeshAlterResult.meshes ) {

					meshes.push( callbackOnMeshAlterResult.meshes[ i ] );

				}
				useOrgMesh = false;

			}

		}
		if ( useOrgMesh ) {

			if ( meshPayload.computeBoundingSphere ) bufferGeometry.computeBoundingSphere();
			if ( geometryType === 0 ) {

				mesh = new THREE.Mesh( bufferGeometry, material );

			} else if ( geometryType === 1 ) {

				mesh = new THREE.LineSegments( bufferGeometry, material );

			} else {

				mesh = new THREE.Points( bufferGeometry, material );

			}
			mesh.name = meshName;
			meshes.push( mesh );

		}

		var progressMessage = meshPayload.params.meshName;
		if ( meshes.length > 0 ) {

			var meshNames = [];
			for ( var i in meshes ) {

				mesh = meshes[ i ];
				meshNames[ i ] = mesh.name;

			}
			progressMessage += ': Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100).toFixed( 2 ) + '%)';

		} else {

			progressMessage += ': Not adding mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100).toFixed( 2 ) + '%)';

		}
		var callbackOnParseProgress = this.callbacks.onParseProgress;
		if ( callbackOnParseProgress ) {

			callbackOnParseProgress( 'progress', progressMessage, meshPayload.progress.numericalValue );

		}
		return meshes;
	},

	/**
	 * Utility method for parsing mtl text with MTLLoader
	 */
	_parseMtl: function ( content, parserConfiguration ) {
		if ( THREE.MTLLoader === undefined ) console.error( '"THREE.MTLLoader" is not available. "THREE.OBJLoader2" requires it for loading MTL files.' );
		if ( ( content === null || content === undefined ) && typeof( content ) !== 'string' && ! ( content instanceof String ) && ! ( content instanceof ArrayBuffer ) ) {

			console.error( 'Unable to parse mtl file: \"' + parserConfiguration.filename + '\". Provided content is neither a String nor an ArrayBuffer.' );

		}
		var mtlParseResult = {
			materials: [],
			materialCreator: null
		};
		if ( content !== null && content !== undefined ) {

			var mtlLoader = new THREE.MTLLoader( this.manager );
			mtlLoader.setCrossOrigin( parserConfiguration.crossOrigin );
			mtlLoader.setResourcePath( parserConfiguration.path || parserConfiguration.resourcePath );
			mtlLoader.setMaterialOptions( parserConfiguration.materialOptions );

			var contentAsText = content;
			if ( content instanceof ArrayBuffer && ( content.length > 0 || content.byteLength > 0 ) ) {

				parserConfiguration.payloadType === 'arraybuffer';
				contentAsText = THREE.LoaderUtils.decodeText( content );

			}
			mtlParseResult.materialCreator = mtlLoader.parse( contentAsText );
			if ( mtlParseResult.materialCreator !== null && mtlParseResult.materialCreator !== undefined ) {

				mtlParseResult.materialCreator.preload();
				mtlParseResult.materials = this.addMaterials( mtlParseResult.materialCreator );

			}

		}
		return mtlParseResult;
	},

	_handleMtlMaterials: function ( materialCreator ) {
		var materialCreatorMaterials = materialCreator.materials;
		var materials = [];
		for ( var materialName in materialCreatorMaterials ) {

			if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

				materials[ materialName ] = materialCreatorMaterials[ materialName ];

			}
		}
		return materials;
	},

	buildWorkerCode: function ( codeSerializer ) {
		var workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by THREE.OBJLoader2.buildWorkerCode.\n';
		workerCode += '  */\n\n';
		workerCode += 'THREE = {};\n\n';
		workerCode += 'if ( ! THREE.OBJLoader2 ) { THREE.OBJLoader2 = {} };\n\n';
//		workerCode += codeSerializer.serializeClass( 'THREE.OBJLoader2.Parser', THREE.OBJLoader2.Parser );

		var codeBuilderInstructions = new THREE.WorkerSupport.CodeBuilderIntructions( 'THREE.OBJLoader2.Parser', false );
		codeBuilderInstructions.addCodeFragment( workerCode );
		codeBuilderInstructions.addLibrary( 'src/loaders/worker/OBJLoader2Parser.js', '../../' );
		return codeBuilderInstructions;
	}
};
