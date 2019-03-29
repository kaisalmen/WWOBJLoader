if ( ! THREE.OBJLoader2 ) { THREE.OBJLoader2 = {} }

/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader2 = function ( manager ) {
	console.info( 'Using THREE.OBJLoader2 version: ' + THREE.OBJLoader2.OBJLOADER2_VERSION );

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

//	this.dataReceiver = new THREE.MeshTransfer.MeshReceiver();
	this.materials = {};
	this.callbacks = {
		onParseProgress: undefined,
		genericErrorHandler: undefined
	};
};

THREE.OBJLoader2.prototype = Object.create( THREE.OBJLoader2.prototype );
THREE.OBJLoader2.prototype.constructor = THREE.OBJLoader2;
THREE.OBJLoader2.OBJLOADER2_VERSION = '3.0.0-preview';


THREE.OBJLoader2.prototype = {

	constructor: THREE.OBJLoader2,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
//		this.dataReceiver.setLogging( this.logging.enabled, this.logging.debug );
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
	 * @param {THREE.Material[]} materials Array of {@link THREE.Material}
	 */
	setMaterials: function ( materialsOrmaterialCreator ) {
		var materials = {};
		if ( materialsOrmaterialCreator instanceof THREE.MTLLoader.MaterialCreator ) {

			materials = this._handleMtlMaterials( materialsOrmaterialCreator );

		} else if ( Array.isArray( materialsOrmaterialCreator ) ) {

			materials = materialsOrmaterialCreator

		}
//		this.dataReceiver.setMaterials( materials );
		return this;
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
//		this.dataReceiver._setCallbacks( onParseProgress, onMeshAlter, onLoadMaterials );
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
//			this.dataReceiver.setBaseObject3d( this.baseObject3d );
//			this.dataReceiver.createDefaultMaterials();

			var parser = new THREE.OBJLoader2.Parser();
			parser.setLogging( this.logging.enabled, this.logging.debug );
			parser.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
			parser.setUseOAsMesh( this.useOAsMesh );
			parser.setUseIndices( this.useIndices );
			parser.setDisregardNormals( this.disregardNormals );
			// sync code works directly on the material references
//			parser.setMaterials( this.dataReceiver.getMaterials() );

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
/*
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
*/
		material = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
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
				this.setMaterials( mtlParseResult.materialCreator );
//				mtlParseResult.materials = this.dataReceiver.getMaterials();

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
		workerCode += 'THREE = { OBJLoader2: {} };\n\n';
		workerCode += codeSerializer.serializeClass( 'THREE.OBJLoader2.Parser', THREE.OBJLoader2.Parser );

		return {
			code: workerCode,
			parserName: 'THREE.OBJLoader2.Parser',
			provideThree: false
		}
	}
};

/**
 * Parse OBJ data either from ArrayBuffer or string
 * @class
 */
THREE.OBJLoader2.Parser = function() {
	this.callbacks = {
		onProgress: null,
		onAssetAvailable: null,
		onError: null
	};
	this.contentRef = null;
	this.legacyMode = false;

	this.materials = {};
	this.materialPerSmoothingGroup = false;
	this.useOAsMesh = false;
	this.useIndices = false;
	this.disregardNormals = false;

	this.vertices = [];
	this.colors = [];
	this.normals = [];
	this.uvs = [];

	this.rawMesh = {
		objectName: '',
		groupName: '',
		activeMtlName: '',
		mtllibName: '',

		// reset with new mesh
		faceType: - 1,
		subGroups: [],
		subGroupInUse: null,
		smoothingGroup: {
			splitMaterials: false,
			normalized: - 1,
			real: - 1
		},
		counts: {
			doubleIndicesCount: 0,
			faceCount: 0,
			mtlCount: 0,
			smoothingGroupCount: 0
		}
	};

	this.inputObjectCount = 1;
	this.outputObjectCount = 1;
	this.globalCounts = {
		vertices: 0,
		faces: 0,
		doubleIndicesCount: 0,
		lineByte: 0,
		currentByte: 0,
		totalBytes: 0
	};

	this.logging = {
		enabled: true,
		debug: false
	};
};

THREE.OBJLoader2.Parser.prototype = {

	constructor: THREE.OBJLoader2.Parser,

	resetRawMesh: function () {
		// faces are stored according combined index of group, material and smoothingGroup (0 or not)
		this.rawMesh.subGroups = [];
		this.rawMesh.subGroupInUse = null;
		this.rawMesh.smoothingGroup.normalized = - 1;
		this.rawMesh.smoothingGroup.real = - 1;

		// this default index is required as it is possible to define faces without 'g' or 'usemtl'
		this.pushSmoothingGroup( 1 );

		this.rawMesh.counts.doubleIndicesCount = 0;
		this.rawMesh.counts.faceCount = 0;
		this.rawMesh.counts.mtlCount = 0;
		this.rawMesh.counts.smoothingGroupCount = 0;
	},

	setMaterialPerSmoothingGroup: function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup;
	},

	setUseOAsMesh: function ( useOAsMesh ) {
		this.useOAsMesh = useOAsMesh;
	},

	setUseIndices: function ( useIndices ) {
		this.useIndices = useIndices;
	},

	setDisregardNormals: function ( disregardNormals ) {
		this.disregardNormals = disregardNormals;
	},

	setMaterials: function ( materials ) {
		this.materials = materials;
	},


	setCallbackOnAssetAvailable: function ( onAssetAvailable ) {
		if ( onAssetAvailable !== null && onAssetAvailable !== undefined ) {

			this.callbacks.onAssetAvailable = onAssetAvailable;

		}
	},

	setCallbackOnProgress: function ( onProgress ) {
		if ( onProgress !== null && onProgress !== undefined ) {

			this.callbacks.onProgress = onProgress;

		}
	},

	setCallbackOnError: function ( onError ) {
		if ( onError !== null && onError !== undefined ) {

			this.callbacks.onError = onError;

		}
	},

	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	},

	configure: function () {
		if ( this.callbacks.onAssetAvailable !== null ) {

			if ( this.callbacks.onError !== null ) {

				this.callbacks.onError( 'Unable to run as no callback for building meshes is set.' );

			}

		}
		this.pushSmoothingGroup( 1 );
		if ( this.logging.enabled ) {

			var matKeys = Object.keys( this.materials );
			var matNames = (matKeys.length > 0) ? '\n\tmaterialNames:\n\t\t- ' + matKeys.join( '\n\t\t- ' ) : '\n\tmaterialNames: None';
			var printedConfig = 'OBJLoader.Parser configuration:'
				+ matNames
				+ '\n\tmaterialPerSmoothingGroup: ' + this.materialPerSmoothingGroup
				+ '\n\tuseOAsMesh: ' + this.useOAsMesh
				+ '\n\tuseIndices: ' + this.useIndices
				+ '\n\tdisregardNormals: ' + this.disregardNormals;
				if ( this.callbacks.onProgress !== null ) {
					printedConfig += '\n\tcallbacks.onProgress: ' + this.callbacks.onProgress.name;
				}
				if ( this.callbacks.onAssetAvailable !== null ) {
					printedConfig += '\n\tcallbacks.onAssetAvailable: ' + this.callbacks.onAssetAvailable.name;
				}
				if ( this.callbacks.onError !== null ) {
					printedConfig += '\n\tcallbacks.onError: ' + this.callbacks.onError.name;
				}
			console.info( printedConfig );

		}
	},

	/**
	 * Parse the provided arraybuffer
	 *
	 * @param {Uint8Array} arrayBuffer OBJ data as Uint8Array
	 */
	parse: function ( arrayBuffer ) {
		if ( this.logging.enabled ) console.time( 'OBJLoader.Parser.parse' );
		this.configure();

		var arrayBufferView = new Uint8Array( arrayBuffer );
		this.contentRef = arrayBufferView;
		var length = arrayBufferView.byteLength;
		this.globalCounts.totalBytes = length;
		var buffer = new Array( 128 );

		for ( var code, word = '', bufferPointer = 0, slashesCount = 0, i = 0; i < length; i ++ ) {

			code = arrayBufferView[ i ];
			switch ( code ) {
				// space
				case 32:
					if ( word.length > 0 ) buffer[ bufferPointer ++ ] = word;
					word = '';
					break;
				// slash
				case 47:
					if ( word.length > 0 ) buffer[ bufferPointer ++ ] = word;
					slashesCount ++;
					word = '';
					break;

				// LF
				case 10:
					if ( word.length > 0 ) buffer[ bufferPointer ++ ] = word;
					word = '';
					this.globalCounts.lineByte = this.globalCounts.currentByte;
					this.globalCounts.currentByte = i;
					this.processLine( buffer, bufferPointer, slashesCount );
					bufferPointer = 0;
					slashesCount = 0;
					break;

				// CR
				case 13:
					break;

				default:
					word += String.fromCharCode( code );
					break;
			}
		}
		this.finalizeParsing();
		if ( this.logging.enabled ) console.timeEnd( 'OBJLoader.Parser.parse' );
	},

	/**
	 * Parse the provided text
	 *
	 * @param {string} text OBJ data as string
	 */
	parseText: function ( text ) {
		if ( this.logging.enabled ) console.time( 'OBJLoader.Parser.parseText' );
		this.configure();
		this.legacyMode = true;
		this.contentRef = text;
		var length = text.length;
		this.globalCounts.totalBytes = length;
		var buffer = new Array( 128 );

		for ( var char, word = '', bufferPointer = 0, slashesCount = 0, i = 0; i < length; i ++ ) {

			char = text[ i ];
			switch ( char ) {
				case ' ':
					if ( word.length > 0 ) buffer[ bufferPointer ++ ] = word;
					word = '';
					break;

				case '/':
					if ( word.length > 0 ) buffer[ bufferPointer ++ ] = word;
					slashesCount ++;
					word = '';
					break;

				case '\n':
					if ( word.length > 0 ) buffer[ bufferPointer ++ ] = word;
					word = '';
					this.globalCounts.lineByte = this.globalCounts.currentByte;
					this.globalCounts.currentByte = i;
					this.processLine( buffer, bufferPointer, slashesCount );
					bufferPointer = 0;
					slashesCount = 0;
					break;

				case '\r':
					break;

				default:
					word += char;
			}
		}
		this.finalizeParsing();
		if ( this.logging.enabled ) console.timeEnd( 'OBJLoader.Parser.parseText' );
	},

	processLine: function ( buffer, bufferPointer, slashesCount ) {
		if ( bufferPointer < 1 ) return;

		var reconstructString = function ( content, legacyMode, start, stop ) {
			var line = '';
			if ( stop > start ) {

				var i;
				if ( legacyMode ) {

					for ( i = start; i < stop; i ++ ) line += content[ i ];

				} else {


					for ( i = start; i < stop; i ++ ) line += String.fromCharCode( content[ i ] );

				}
				line = line.trim();

			}
			return line;
		};

		var bufferLength, length, i, lineDesignation;
		lineDesignation = buffer [ 0 ];
		switch ( lineDesignation ) {
			case 'v':
				this.vertices.push( parseFloat( buffer[ 1 ] ) );
				this.vertices.push( parseFloat( buffer[ 2 ] ) );
				this.vertices.push( parseFloat( buffer[ 3 ] ) );
				if ( bufferPointer > 4 ) {

					this.colors.push( parseFloat( buffer[ 4 ] ) );
					this.colors.push( parseFloat( buffer[ 5 ] ) );
					this.colors.push( parseFloat( buffer[ 6 ] ) );

				}
				break;

			case 'vt':
				this.uvs.push( parseFloat( buffer[ 1 ] ) );
				this.uvs.push( parseFloat( buffer[ 2 ] ) );
				break;

			case 'vn':
				this.normals.push( parseFloat( buffer[ 1 ] ) );
				this.normals.push( parseFloat( buffer[ 2 ] ) );
				this.normals.push( parseFloat( buffer[ 3 ] ) );
				break;

			case 'f':
				bufferLength = bufferPointer - 1;

				// "f vertex ..."
				if ( slashesCount === 0 ) {

					this.checkFaceType( 0 );
					for ( i = 2, length = bufferLength; i < length; i ++ ) {

						this.buildFace( buffer[ 1 ] );
						this.buildFace( buffer[ i ] );
						this.buildFace( buffer[ i + 1 ] );

					}

					// "f vertex/uv ..."
				} else if ( bufferLength === slashesCount * 2 ) {

					this.checkFaceType( 1 );
					for ( i = 3, length = bufferLength - 2; i < length; i += 2 ) {

						this.buildFace( buffer[ 1 ], buffer[ 2 ] );
						this.buildFace( buffer[ i ], buffer[ i + 1 ] );
						this.buildFace( buffer[ i + 2 ], buffer[ i + 3 ] );

					}

					// "f vertex/uv/normal ..."
				} else if ( bufferLength * 2 === slashesCount * 3 ) {

					this.checkFaceType( 2 );
					for ( i = 4, length = bufferLength - 3; i < length; i += 3 ) {

						this.buildFace( buffer[ 1 ], buffer[ 2 ], buffer[ 3 ] );
						this.buildFace( buffer[ i ], buffer[ i + 1 ], buffer[ i + 2 ] );
						this.buildFace( buffer[ i + 3 ], buffer[ i + 4 ], buffer[ i + 5 ] );

					}

					// "f vertex//normal ..."
				} else {

					this.checkFaceType( 3 );
					for ( i = 3, length = bufferLength - 2; i < length; i += 2 ) {

						this.buildFace( buffer[ 1 ], undefined, buffer[ 2 ] );
						this.buildFace( buffer[ i ], undefined, buffer[ i + 1 ] );
						this.buildFace( buffer[ i + 2 ], undefined, buffer[ i + 3 ] );

					}

				}
				break;

			case 'l':
			case 'p':
				bufferLength = bufferPointer - 1;
				if ( bufferLength === slashesCount * 2 ) {

					this.checkFaceType( 4 );
					for ( i = 1, length = bufferLength + 1; i < length; i += 2 ) this.buildFace( buffer[ i ], buffer[ i + 1 ] );

				} else {

					this.checkFaceType( (lineDesignation === 'l') ? 5 : 6 );
					for ( i = 1, length = bufferLength + 1; i < length; i ++ ) this.buildFace( buffer[ i ] );

				}
				break;

			case 's':
				this.pushSmoothingGroup( buffer[ 1 ] );
				break;

			case 'g':
				// 'g' leads to creation of mesh if valid data (faces declaration was done before), otherwise only groupName gets set
				this.processCompletedMesh();
				this.rawMesh.groupName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte );
				break;

			case 'o':
				// 'o' is meta-information and usually does not result in creation of new meshes, but can be enforced with "useOAsMesh"
				if ( this.useOAsMesh ) this.processCompletedMesh();
				this.rawMesh.objectName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 2, this.globalCounts.currentByte );
				break;

			case 'mtllib':
				this.rawMesh.mtllibName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte );
				break;

			case 'usemtl':
				var mtlName = reconstructString( this.contentRef, this.legacyMode, this.globalCounts.lineByte + 7, this.globalCounts.currentByte );
				if ( mtlName !== '' && this.rawMesh.activeMtlName !== mtlName ) {

					this.rawMesh.activeMtlName = mtlName;
					this.rawMesh.counts.mtlCount ++;
					this.checkSubGroup();

				}
				break;

			default:
				break;
		}
	},

	pushSmoothingGroup: function ( smoothingGroup ) {
		var smoothingGroupInt = parseInt( smoothingGroup );
		if ( isNaN( smoothingGroupInt ) ) {
			smoothingGroupInt = smoothingGroup === "off" ? 0 : 1;
		}

		var smoothCheck = this.rawMesh.smoothingGroup.normalized;
		this.rawMesh.smoothingGroup.normalized = this.rawMesh.smoothingGroup.splitMaterials ? smoothingGroupInt : (smoothingGroupInt === 0) ? 0 : 1;
		this.rawMesh.smoothingGroup.real = smoothingGroupInt;

		if ( smoothCheck !== smoothingGroupInt ) {

			this.rawMesh.counts.smoothingGroupCount ++;
			this.checkSubGroup();

		}
	},

	/**
	 * Expanded faceTypes include all four face types, both line types and the point type
	 * faceType = 0: "f vertex ..."
	 * faceType = 1: "f vertex/uv ..."
	 * faceType = 2: "f vertex/uv/normal ..."
	 * faceType = 3: "f vertex//normal ..."
	 * faceType = 4: "l vertex/uv ..." or "l vertex ..."
	 * faceType = 5: "l vertex ..."
	 * faceType = 6: "p vertex ..."
	 */
	checkFaceType: function ( faceType ) {
		if ( this.rawMesh.faceType !== faceType ) {

			this.processCompletedMesh();
			this.rawMesh.faceType = faceType;
			this.checkSubGroup();

		}
	},

	checkSubGroup: function () {
		var index = this.rawMesh.activeMtlName + '|' + this.rawMesh.smoothingGroup.normalized;
		this.rawMesh.subGroupInUse = this.rawMesh.subGroups[ index ];

		if ( this.rawMesh.subGroupInUse === undefined || this.rawMesh.subGroupInUse === null ) {

			this.rawMesh.subGroupInUse = {
				index: index,
				objectName: this.rawMesh.objectName,
				groupName: this.rawMesh.groupName,
				materialName: this.rawMesh.activeMtlName,
				smoothingGroup: this.rawMesh.smoothingGroup.normalized,
				vertices: [],
				indexMappingsCount: 0,
				indexMappings: [],
				indices: [],
				colors: [],
				uvs: [],
				normals: []
			};
			this.rawMesh.subGroups[ index ] = this.rawMesh.subGroupInUse;

		}
	},

	buildFace: function ( faceIndexV, faceIndexU, faceIndexN ) {
		var subGroupInUse = this.rawMesh.subGroupInUse;
		var scope = this;
		var updateSubGroupInUse = function () {

			var faceIndexVi = parseInt( faceIndexV );
			var indexPointerV = 3 * (faceIndexVi > 0 ? faceIndexVi - 1 : faceIndexVi + scope.vertices.length / 3);
			var indexPointerC = scope.colors.length > 0 ? indexPointerV : null;

			var vertices = subGroupInUse.vertices;
			vertices.push( scope.vertices[ indexPointerV ++ ] );
			vertices.push( scope.vertices[ indexPointerV ++ ] );
			vertices.push( scope.vertices[ indexPointerV ] );

			if ( indexPointerC !== null ) {

				var colors = subGroupInUse.colors;
				colors.push( scope.colors[ indexPointerC ++ ] );
				colors.push( scope.colors[ indexPointerC ++ ] );
				colors.push( scope.colors[ indexPointerC ] );

			}
			if ( faceIndexU ) {

				var faceIndexUi = parseInt( faceIndexU );
				var indexPointerU = 2 * (faceIndexUi > 0 ? faceIndexUi - 1 : faceIndexUi + scope.uvs.length / 2);
				var uvs = subGroupInUse.uvs;
				uvs.push( scope.uvs[ indexPointerU ++ ] );
				uvs.push( scope.uvs[ indexPointerU ] );

			}
			if ( faceIndexN && ! scope.disregardNormals ) {

				var faceIndexNi = parseInt( faceIndexN );
				var indexPointerN = 3 * (faceIndexNi > 0 ? faceIndexNi - 1 : faceIndexNi + scope.normals.length / 3);
				var normals = subGroupInUse.normals;
				normals.push( scope.normals[ indexPointerN ++ ] );
				normals.push( scope.normals[ indexPointerN ++ ] );
				normals.push( scope.normals[ indexPointerN ] );

			}
		};

		if ( this.useIndices ) {

			if ( this.disregardNormals ) faceIndexN = undefined;
			var mappingName = faceIndexV + ( faceIndexU ? '_' + faceIndexU : '_n' ) + ( faceIndexN ? '_' + faceIndexN : '_n' );
			var indicesPointer = subGroupInUse.indexMappings[ mappingName ];
			if ( indicesPointer === undefined || indicesPointer === null ) {

				indicesPointer = this.rawMesh.subGroupInUse.vertices.length / 3;
				updateSubGroupInUse();
				subGroupInUse.indexMappings[ mappingName ] = indicesPointer;
				subGroupInUse.indexMappingsCount++;

			} else {

				this.rawMesh.counts.doubleIndicesCount++;

			}
			subGroupInUse.indices.push( indicesPointer );

		} else {

			updateSubGroupInUse();

		}
		this.rawMesh.counts.faceCount ++;
	},

	createRawMeshReport: function ( inputObjectCount ) {
		return 'Input Object number: ' + inputObjectCount +
			'\n\tObject name: ' + this.rawMesh.objectName +
			'\n\tGroup name: ' + this.rawMesh.groupName +
			'\n\tMtllib name: ' + this.rawMesh.mtllibName +
			'\n\tVertex count: ' + this.vertices.length / 3 +
			'\n\tNormal count: ' + this.normals.length / 3 +
			'\n\tUV count: ' + this.uvs.length / 2 +
			'\n\tSmoothingGroup count: ' + this.rawMesh.counts.smoothingGroupCount +
			'\n\tMaterial count: ' + this.rawMesh.counts.mtlCount +
			'\n\tReal MeshOutputGroup count: ' + this.rawMesh.subGroups.length;
	},

	/**
	 * Clear any empty subGroup and calculate absolute vertex, normal and uv counts
	 */
	finalizeRawMesh: function () {
		var meshOutputGroupTemp = [];
		var meshOutputGroup;
		var absoluteVertexCount = 0;
		var absoluteIndexMappingsCount = 0;
		var absoluteIndexCount = 0;
		var absoluteColorCount = 0;
		var absoluteNormalCount = 0;
		var absoluteUvCount = 0;
		var indices;
		for ( var name in this.rawMesh.subGroups ) {

			meshOutputGroup = this.rawMesh.subGroups[ name ];
			if ( meshOutputGroup.vertices.length > 0 ) {

				indices = meshOutputGroup.indices;
				if ( indices.length > 0 && absoluteIndexMappingsCount > 0 ) {

					for ( var i in indices ) indices[ i ] = indices[ i ] + absoluteIndexMappingsCount;

				}
				meshOutputGroupTemp.push( meshOutputGroup );
				absoluteVertexCount += meshOutputGroup.vertices.length;
				absoluteIndexMappingsCount += meshOutputGroup.indexMappingsCount;
				absoluteIndexCount += meshOutputGroup.indices.length;
				absoluteColorCount += meshOutputGroup.colors.length;
				absoluteUvCount += meshOutputGroup.uvs.length;
				absoluteNormalCount += meshOutputGroup.normals.length;

			}
		}

		// do not continue if no result
		var result = null;
		if ( meshOutputGroupTemp.length > 0 ) {

			result = {
				name: this.rawMesh.groupName !== '' ? this.rawMesh.groupName : this.rawMesh.objectName,
				subGroups: meshOutputGroupTemp,
				absoluteVertexCount: absoluteVertexCount,
				absoluteIndexCount: absoluteIndexCount,
				absoluteColorCount: absoluteColorCount,
				absoluteNormalCount: absoluteNormalCount,
				absoluteUvCount: absoluteUvCount,
				faceCount: this.rawMesh.counts.faceCount,
				doubleIndicesCount: this.rawMesh.counts.doubleIndicesCount
			};

		}
		return result;
	},

	processCompletedMesh: function () {
		var result = this.finalizeRawMesh();
		var haveMesh = result !== null;
		if ( haveMesh ) {

			if ( this.colors.length > 0 && this.colors.length !== this.vertices.length ) {

				if ( this.callbacks.onError !== null ) {

					this.callbacks.onError( 'Vertex Colors were detected, but vertex count and color count do not match!' );

				}

			}
			if ( this.logging.enabled && this.logging.debug ) console.debug( this.createRawMeshReport( this.inputObjectCount ) );
			this.inputObjectCount ++;

			this.buildMesh( result );
			var progressBytesPercent = this.globalCounts.currentByte / this.globalCounts.totalBytes;
			if ( this.callbacks.onProgress !== null ) {

				this.callbacks.onProgress( 'Completed [o: ' + this.rawMesh.objectName + ' g:' + this.rawMesh.groupName + '] Total progress: ' + (progressBytesPercent * 100).toFixed( 2 ) + '%', progressBytesPercent );

			}
			this.resetRawMesh();

		}
		return haveMesh;
	},

	/**
	 * SubGroups are transformed to too intermediate format that is forwarded to the MeshReceiver.
	 * It is ensured that SubGroups only contain objects with vertices (no need to check).
	 *
	 * @param result
	 */
	buildMesh: function ( result ) {
		var meshOutputGroups = result.subGroups;

		var vertexFA = new Float32Array( result.absoluteVertexCount );
		this.globalCounts.vertices += result.absoluteVertexCount / 3;
		this.globalCounts.faces += result.faceCount;
		this.globalCounts.doubleIndicesCount += result.doubleIndicesCount;
		var indexUA = (result.absoluteIndexCount > 0) ? new Uint32Array( result.absoluteIndexCount ) : null;
		var colorFA = (result.absoluteColorCount > 0) ? new Float32Array( result.absoluteColorCount ) : null;
		var normalFA = (result.absoluteNormalCount > 0) ? new Float32Array( result.absoluteNormalCount ) : null;
		var uvFA = (result.absoluteUvCount > 0) ? new Float32Array( result.absoluteUvCount ) : null;
		var haveVertexColors = colorFA !== null;

		var meshOutputGroup;
		var materialNames = [];

		var createMultiMaterial = (meshOutputGroups.length > 1);
		var materialIndex = 0;
		var materialIndexMapping = [];
		var selectedMaterialIndex;
		var materialGroup;
		var materialGroups = [];

		var vertexFAOffset = 0;
		var indexUAOffset = 0;
		var colorFAOffset = 0;
		var normalFAOffset = 0;
		var uvFAOffset = 0;
		var materialGroupOffset = 0;
		var materialGroupLength = 0;

		var materialOrg, material, materialName, materialNameOrg;
		// only one specific face type
		for ( var oodIndex in meshOutputGroups ) {

			if ( ! meshOutputGroups.hasOwnProperty( oodIndex ) ) continue;
			meshOutputGroup = meshOutputGroups[ oodIndex ];

			materialNameOrg = meshOutputGroup.materialName;
			if ( this.rawMesh.faceType < 4 ) {

				materialName = materialNameOrg + (haveVertexColors ? '_vertexColor' : '') + (meshOutputGroup.smoothingGroup === 0 ? '_flat' : '');


			} else {

				materialName = this.rawMesh.faceType === 6 ? 'defaultPointMaterial' : 'defaultLineMaterial';

			}
			materialOrg = this.materials[ materialNameOrg ];
			material = this.materials[ materialName ];

			// both original and derived names do not lead to an existing material => need to use a default material
			if ( ( materialOrg === undefined || materialOrg === null ) && ( material === undefined || material === null ) ) {

				var defaultMaterialName = haveVertexColors ? 'defaultVertexColorMaterial' : 'defaultMaterial';
				materialOrg = this.materials[ defaultMaterialName ];
				if ( this.logging.enabled ) console.warn( 'object_group "' + meshOutputGroup.objectName + '_' +
					meshOutputGroup.groupName + '" was defined with unresolvable material "' +
					materialNameOrg + '"! Assigning "' + defaultMaterialName + '".' );
				materialNameOrg = defaultMaterialName;

				// if names are identical then there is no need for later manipulation
				if ( materialNameOrg === materialName ) {

					material = materialOrg;
					materialName = defaultMaterialName;

				}

			}
			if ( material === undefined || material === null ) {

				var materialCloneInstructions = {
					materialNameOrg: materialNameOrg,
					materialName: materialName,
					materialProperties: {
						vertexColors: haveVertexColors ? 2 : 0,
						flatShading: meshOutputGroup.smoothingGroup === 0
					}
				};
				var payload = {
					cmd: 'data',
					type: 'material',
					materials: {
						materialCloneInstructions: materialCloneInstructions
					}
				};
				this.callbacks.onAssetAvailable( payload );

				// only set materials if they don't exist, yet
				var matCheck = this.materials[ materialName ];
				if ( matCheck === undefined || matCheck === null ) {

					this.materials[ materialName ] = materialCloneInstructions;

				}

			}

			if ( createMultiMaterial ) {

				// re-use material if already used before. Reduces materials array size and eliminates duplicates
				selectedMaterialIndex = materialIndexMapping[ materialName ];
				if ( ! selectedMaterialIndex ) {

					selectedMaterialIndex = materialIndex;
					materialIndexMapping[ materialName ] = materialIndex;
					materialNames.push( materialName );
					materialIndex ++;

				}
				materialGroupLength = this.useIndices ? meshOutputGroup.indices.length : meshOutputGroup.vertices.length / 3;
				materialGroup = {
					start: materialGroupOffset,
					count: materialGroupLength,
					index: selectedMaterialIndex
				};
				materialGroups.push( materialGroup );
				materialGroupOffset += materialGroupLength;

			} else {

				materialNames.push( materialName );

			}

			vertexFA.set( meshOutputGroup.vertices, vertexFAOffset );
			vertexFAOffset += meshOutputGroup.vertices.length;

			if ( indexUA ) {

				indexUA.set( meshOutputGroup.indices, indexUAOffset );
				indexUAOffset += meshOutputGroup.indices.length;

			}

			if ( colorFA ) {

				colorFA.set( meshOutputGroup.colors, colorFAOffset );
				colorFAOffset += meshOutputGroup.colors.length;

			}

			if ( normalFA ) {

				normalFA.set( meshOutputGroup.normals, normalFAOffset );
				normalFAOffset += meshOutputGroup.normals.length;

			}
			if ( uvFA ) {

				uvFA.set( meshOutputGroup.uvs, uvFAOffset );
				uvFAOffset += meshOutputGroup.uvs.length;

			}

			if ( this.logging.enabled && this.logging.debug ) {

				var materialIndexLine = ( selectedMaterialIndex === undefined || selectedMaterialIndex === null ) ? '' : '\n\t\tmaterialIndex: ' + selectedMaterialIndex;
				var createdReport = '\tOutput Object no.: ' + this.outputObjectCount +
					'\n\t\tgroupName: ' + meshOutputGroup.groupName +
					'\n\t\tIndex: ' + meshOutputGroup.index +
					'\n\t\tfaceType: ' + this.rawMesh.faceType +
					'\n\t\tmaterialName: ' + meshOutputGroup.materialName +
					'\n\t\tsmoothingGroup: ' + meshOutputGroup.smoothingGroup +
					materialIndexLine +
					'\n\t\tobjectName: ' + meshOutputGroup.objectName +
					'\n\t\t#vertices: ' + meshOutputGroup.vertices.length / 3 +
					'\n\t\t#indices: ' + meshOutputGroup.indices.length +
					'\n\t\t#colors: ' + meshOutputGroup.colors.length / 3 +
					'\n\t\t#uvs: ' + meshOutputGroup.uvs.length / 2 +
					'\n\t\t#normals: ' + meshOutputGroup.normals.length / 3;
				console.debug( createdReport );

			}

		}
		this.outputObjectCount ++;
		this.callbacks.onAssetAvailable(
			{
				cmd: 'data',
				type: 'mesh',
				progress: {
					numericalValue: this.globalCounts.currentByte / this.globalCounts.totalBytes
				},
				params: {
					meshName: result.name
				},
				materials: {
					multiMaterial: createMultiMaterial,
					materialNames: materialNames,
					materialGroups: materialGroups
				},
				buffers: {
					vertices: vertexFA,
					indices: indexUA,
					colors: colorFA,
					normals: normalFA,
					uvs: uvFA
				},
				// 0: mesh, 1: line, 2: point
				geometryType: this.rawMesh.faceType < 4 ? 0 : (this.rawMesh.faceType === 6) ? 2 : 1
			},
			[ vertexFA.buffer ],
			indexUA !== null ?  [ indexUA.buffer ] : null,
			colorFA !== null ? [ colorFA.buffer ] : null,
			normalFA !== null ? [ normalFA.buffer ] : null,
			uvFA !== null ? [ uvFA.buffer ] : null
		);
	},

	finalizeParsing: function () {
		if ( this.logging.enabled ) console.info( 'Global output object count: ' + this.outputObjectCount );
		if ( this.processCompletedMesh() && this.logging.enabled ) {

			var parserFinalReport = 'Overall counts: ' +
				'\n\tVertices: ' + this.globalCounts.vertices +
				'\n\tFaces: ' + this.globalCounts.faces +
				'\n\tMultiple definitions: ' + this.globalCounts.doubleIndicesCount;
			console.info( parserFinalReport );

		}
	}
};
