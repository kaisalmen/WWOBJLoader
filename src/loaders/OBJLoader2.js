if ( THREE.OBJLoader === undefined ) { THREE.OBJLoader = {} }

THREE.OBJLoader = function ( manager ) {

	console.info( 'Using THREE.OBJLoader version: ' + THREE.OBJLoader.OBJLOADER2_VERSION );

	this.validator = THREE.OBJLoader.Validator;

	this.manager = ( manager === null || manager === undefined ) ? THREE.DefaultLoadingManager : manager;
	this.logging = {
		enabled: true,
		debug: false
	};

	this.modelName = '';
	this.instanceNo = 0;
	this.path = '';
	this.useIndices = false;
	this.disregardNormals = false;
	this.materialPerSmoothingGroup = false;
	this.loaderRootNode = new THREE.Group();

	this.meshBuilder = new THREE.OBJLoader.MeshBuilder();
	this.callbacks = {
		onParseProgress: null
	};
	this.terminateWorkerOnLoad = true;
};

THREE.OBJLoader.prototype = Object.create( THREE.OBJLoader.prototype );
THREE.OBJLoader.prototype.constructor = THREE.OBJLoader;
THREE.OBJLoader.OBJLOADER2_VERSION = '3.0.0-dev';

/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader.prototype = {

	constructor: THREE.OBJLoader,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.meshBuilder.setLogging( this.logging.enabled, this.logging.debug );
	},

	/**
	 * Set the name of the model.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {string} modelName
	 */
	setModelName: function ( modelName ) {
		this.modelName = this.validator.verifyInput( modelName, this.modelName );
	},

	/**
	 * The URL of the base path.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {string} path URL
	 */
	setPath: function ( path ) {
		this.path = this.validator.verifyInput( path, this.path );
	},

	/**
	 * Set the node where the loaded objects will be attached directly.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {THREE.Object3D} streamMeshesTo Object already attached to scenegraph where new meshes will be attached to
	 */
	setStreamMeshesTo: function ( streamMeshesTo ) {
		this.loaderRootNode = this.validator.verifyInput( streamMeshesTo, this.loaderRootNode );
	},

	/**
	 * Set materials loaded by MTLLoader or any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {THREE.Material[]} materials Array of {@link THREE.Material}
	 */
	setMaterials: function ( materialsOrmaterialCreator ) {
		var materials = [];
		if ( materialsOrmaterialCreator instanceof THREE.MTLLoader.MaterialCreator ) {

			materials = this._handleMtlMaterials( materialsOrmaterialCreator );

		} else if ( Array.isArray( materialsOrmaterialCreator ) ) {

			materials = materialsOrmaterialCreator

		}
		this.meshBuilder.setMaterials( materials );
	},

	/**
	 * Instructs loaders to create indexed {@link THREE.BufferGeometry}.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {boolean} useIndices=false
	 */
	setUseIndices: function ( useIndices ) {
		this.useIndices = useIndices === true;
	},

	/**
	 * Tells whether normals should be completely disregarded and regenerated.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {boolean} disregardNormals=false
	 */
	setDisregardNormals: function ( disregardNormals ) {
		this.disregardNormals = disregardNormals === true;
	},

	/**
	 * Tells whether a material shall be created per smoothing group.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {boolean} materialPerSmoothingGroup=false
	 */
	setMaterialPerSmoothingGroup: function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup === true;
	},

	_setCallbacks: function ( onParseProgress, onMeshAlter, onLoadMaterials ) {
		if ( this.validator.isValid( onParseProgress ) ) this.callbacks.onParseProgress = onParseProgress;
		this.meshBuilder._setCallbacks( onParseProgress, onMeshAlter, onLoadMaterials );
	},

	/**
	 * Announce feedback which is give to the registered callbacks.
	 * @memberOf THREE.OBJLoader
	 * @private
	 *
	 * @param {string} type The type of event
	 * @param {string} text Textual description of the event
	 * @param {number} numericalValue Numerical value describing the progress
	 */
	_onProgress: function ( type, text, numericalValue ) {
		var content = this.validator.isValid( text ) ? text : '';
		var event = {
			detail: {
				type: type,
				modelName: this.modelName,
				instanceNo: this.instanceNo,
				text: content,
				numericalValue: numericalValue
			}
		};
		if ( this.validator.isValid( this.callbacks.onParseProgress ) ) this.callbacks.onParseProgress( event );
		if ( this.logging.enabled && this.logging.debug ) console.debug( content );
	},

	_onError: function ( event ) {
		var output = 'Error occurred while downloading!';

		if ( event.currentTarget && event.currentTarget.statusText !== null ) {

			output += '\nurl: ' + event.currentTarget.responseURL + '\nstatus: ' + event.currentTarget.statusText;

		}
		var scope = this;
		var onProgressScoped = function ( text, numericalValue ) {
//			scope._onProgress( 'error', text, numericalValue );
		};
		onProgressScoped( output, - 1 );
//		throw output;
	},

	/**
	 * Use this convenient method to load a file at the given URL. By default the fileLoader uses an ArrayBuffer.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {function} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {function} [onFileLoadProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {function} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @param {function} [onMeshAlter] A function to be called after a new mesh raw data becomes available for alteration.
	 */
	load: function ( url, onLoad, onFileLoadProgress, onError, onMeshAlter ) {

		if ( ! this.validator.isValid( onError ) ) onError = this._onError;
		if ( ! this.validator.isValid( url ) ) onError( 'An invalid url was provided. Unable to continue!' );

		// find out if we have obj or mtl extension
		var urlParts = url.split( '/' );
		var filename = url;
		var path = '';
		if ( urlParts.length > 2 ) {

			filename = urlParts[ urlParts.length - 1 ];
			var urlPartsPath = urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/';
			if ( urlPartsPath !== undefined && urlPartsPath !== null ) path = urlPartsPath;

		}

		var filenameParts = filename.split( '.' );
		var extension = null;
		if ( filenameParts.length > 1 ) extension = filenameParts[ filenameParts.length - 1 ];

		// unable to continue
		if ( extension === null ) onError( 'File with no extension was supplied. Unable to continue!' );

		var scope = this;
		if ( ! this.validator.isValid( onFileLoadProgress ) ) {
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

		var haveObj = extension.toLowerCase() === 'obj';
		if ( ! haveObj && ( extension.toLowerCase() !== 'mtl' ) ) {

			onError( 'Provided extension "' + extension + '" is not supported by "OBJLoader".' );

		}

		var fileLoaderOnLoad = function ( content ) {
			if ( haveObj ) {

				onLoad( scope.parse( content ) );

			} else {

				onLoad( scope.parseMtl( content, path, filename ) );

			}
		};


		var fileLoader = new THREE.FileLoader( this.manager );
		fileLoader.setPath( this.path );
		fileLoader.setResponseType( haveObj ? 'arraybuffer' : 'text' );
		fileLoader.load( url, fileLoaderOnLoad, onFileLoadProgress, onError );
	},

	_applyPrepData: function ( prepData ) {
		if ( this.validator.isValid( prepData ) ) {

			this.setLogging( prepData.logging.enabled, prepData.logging.debug );
			this.setModelName( prepData.modelName );
			this.setStreamMeshesTo( prepData.streamMeshesTo );
			this.meshBuilder.setMaterials( prepData.materials );
			this.setUseIndices( prepData.useIndices );
			this.setDisregardNormals( prepData.disregardNormals );
			this.setMaterialPerSmoothingGroup( prepData.materialPerSmoothingGroup );

			this._setCallbacks( prepData.getCallbacks() );

		}
	},

	/**
	 * Parses OBJ data synchronously from arraybuffer or string.
	 * @memberOf THREE.OBJLoader
	 *
	 * @param {arraybuffer|string} content OBJ data as Uint8Array or String
	 */
	parse: function ( content ) {
		// fast-fail in case of illegal data
		if ( ! this.validator.isValid( content ) ) {

			console.warn( 'Provided content is not a valid ArrayBuffer or String.' );
			return this.loaderRootNode;

		}
		if ( this.logging.enabled ) console.time( 'OBJLoader parse: ' + this.modelName );
		this.meshBuilder.init( this.loaderRootNode );

		var parser = new THREE.OBJLoader.Parser();
		parser.setLogging( this.logging.enabled, this.logging.debug );
		parser.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
		parser.setUseIndices( this.useIndices );
		parser.setDisregardNormals( this.disregardNormals );
		// sync code works directly on the material references
		parser.setMaterials( this.meshBuilder.getMaterials() );

		var scope = this;
		var onMeshLoaded = function ( payload ) {
			var meshes = scope.meshBuilder.processPayload( payload );
			var mesh;
			for ( var i in meshes ) {
				mesh = meshes[ i ];
				scope.loaderRootNode.add( mesh );
			}
		};
		parser.setCallbackMeshBuilder( onMeshLoaded );
		var onProgressScoped = function ( text, numericalValue ) {
			scope._onProgress( 'progressParse', text, numericalValue );
		};
		parser.setCallbackProgress( onProgressScoped );

		if ( content instanceof ArrayBuffer || content instanceof Uint8Array ) {

			if ( this.logging.enabled ) console.info( 'Parsing arrayBuffer...' );
			parser.parse( content );

		} else if ( typeof(content) === 'string' || content instanceof String ) {

			if ( this.logging.enabled ) console.info( 'Parsing text...' );
			parser.parseText( content );

		} else {

			throw 'Provided content was neither of type String nor Uint8Array! Aborting...';

		}
		if ( this.logging.enabled ) console.timeEnd( 'OBJLoader parse: ' + this.modelName );

		return this.loaderRootNode;
	},

	buildWorkerCode: function ( codeSerializer ) {
		var workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by THREE.OBJLoader.buildWorkerCode.\n';
		workerCode += '  */\n\n';
		workerCode += 'THREE = { OBJLoader: {} };\n\n';
		workerCode += codeSerializer.serializeClass( 'THREE.OBJLoader.Parser', THREE.OBJLoader.Parser );

		return workerCode;
	},

	/**
	 * Utility method for loading an mtl file according resource description. Provide url or content.
	 * @memberOf THREE.OBJLoader

	 * @param {String} content The file content as arraybuffer or text*
	 * @param {String} path Relative path for texture loading
	 * @param {String} [name] Name given to identify the mtl file
	 * @param {string} [crossOrigin] CORS value
	 * @param {Object} [materialOptions] Set material loading options for MTLLoader
	 */
	parseMtl: function ( content, path, name, crossOrigin, materialOptions ) {
		if ( THREE.MTLLoader === undefined ) console.error( '"THREE.MTLLoader" is not available. "THREE.OBJLoader" requires it for loading MTL files.' );
		var mtlParseResult = {
			materials: [],
			materialCreator: null
		};

		// fast-fail
		if ( this.validator.isValid( content ) ) {

			if ( name === undefined || name === null ) name = 'Unknown Filename';
			if ( this.logging.enabled ) console.time( 'Parsing MTL: ' + name );
			var mtlLoader = new THREE.MTLLoader( this.manager );
			crossOrigin = this.validator.verifyInput( crossOrigin, 'anonymous' );
			mtlLoader.setCrossOrigin( crossOrigin );
			mtlLoader.setPath( path );
			if ( this.validator.isValid( materialOptions ) ) mtlLoader.setMaterialOptions( materialOptions );

			mtlParseResult.materialCreator = mtlLoader.parse( content );
			if ( this.validator.isValid( mtlParseResult.materialCreator ) ) {

				mtlParseResult.materialCreator.preload();
				mtlParseResult.materials = this._handleMtlMaterials( mtlParseResult.materialCreator );

			}
			if ( this.logging.enabled ) console.timeEnd( 'Parsing MTL: ' + name );

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
	}
};

THREE.OBJLoader.Validator = {

	/**
	 * If given input is null or undefined, false is returned otherwise true.
	 *
	 * @param input Can be anything
	 * @returns {boolean}
	 */
	isValid: function( input ) {
		return ( input !== null && input !== undefined );
	},

	/**
	 * If given input is null or undefined, the defaultValue is returned otherwise the given input.
	 *
	 * @param input Can be anything
	 * @param defaultValue Can be anything
	 * @returns {*}
	 */
	verifyInput: function( input, defaultValue ) {
		return ( input === null || input === undefined ) ? defaultValue : input;
	}
};

/**
 * Parse OBJ data either from ArrayBuffer or string
 * @class
 */
THREE.OBJLoader.Parser = function() {
	this.callbackProgress = null;
	this.callbackMeshBuilder = null;
	this.contentRef = null;
	this.legacyMode = false;

	this.materials = {};
	this.materialPerSmoothingGroup = false;
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

THREE.OBJLoader.Parser.prototype = {

	constructor: THREE.OBJLoader.Parser,

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

	setUseIndices: function ( useIndices ) {
		this.useIndices = useIndices;
	},

	setDisregardNormals: function ( disregardNormals ) {
		this.disregardNormals = disregardNormals;
	},

	setMaterials: function ( materials ) {
		this.materials = materials;
	},

	setCallbackMeshBuilder: function ( callbackMeshBuilder ) {
		this.callbackMeshBuilder = callbackMeshBuilder;
	},

	setCallbackProgress: function ( callbackProgress ) {
		this.callbackProgress = callbackProgress;
	},

	setLogging: function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	},

	configure: function () {
		if ( this.callbackMeshBuilder === undefined || this.callbackMeshBuilder === null ) throw 'Unable to run as no callback for building meshes is set.';

		this.pushSmoothingGroup( 1 );
		if ( this.logging.enabled ) {

			var matKeys = Object.keys( this.materials );
			var matNames = (matKeys.length > 0) ? '\n\tmaterialNames:\n\t\t- ' + matKeys.join( '\n\t\t- ' ) : '\n\tmaterialNames: None';
			var printedConfig = 'OBJLoader.Parser configuration:'
				+ matNames
				+ '\n\tmaterialPerSmoothingGroup: ' + this.materialPerSmoothingGroup
				+ '\n\tuseIndices: ' + this.useIndices
				+ '\n\tdisregardNormals: ' + this.disregardNormals
				+ '\n\tcallbackMeshBuilderName: ' + this.callbackMeshBuilder.name
				+ '\n\tcallbackProgressName: ' + this.callbackProgress.name;
			console.info( printedConfig );
		}
	},

	/**
	 * Parse the provided arraybuffer
	 * @memberOf Parser
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
	 * @memberOf Parser
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
				// 'o' is pure meta-information and does not result in creation of new meshes
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

			var vertices = subGroupInUse.vertices;
			vertices.push( scope.vertices[ indexPointerV ++ ] );
			vertices.push( scope.vertices[ indexPointerV ++ ] );
			vertices.push( scope.vertices[ indexPointerV ] );

			var indexPointerC = scope.colors.length > 0 ? indexPointerV : null;
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

				throw 'Vertex Colors were detected, but vertex count and color count do not match!';

			}
			if ( this.logging.enabled && this.logging.debug ) console.debug( this.createRawMeshReport( this.inputObjectCount ) );
			this.inputObjectCount ++;

			this.buildMesh( result );
			var progressBytesPercent = this.globalCounts.currentByte / this.globalCounts.totalBytes;
			this.callbackProgress( 'Completed [o: ' + this.rawMesh.objectName + ' g:' + this.rawMesh.groupName + '] Total progress: ' + (progressBytesPercent * 100).toFixed( 2 ) + '%', progressBytesPercent );
			this.resetRawMesh();

		}
		return haveMesh;
	},

	/**
	 * SubGroups are transformed to too intermediate format that is forwarded to the MeshBuilder.
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
					cmd: 'materialData',
					materials: {
						materialCloneInstructions: materialCloneInstructions
					}
				};
				this.callbackMeshBuilder( payload );

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
		this.callbackMeshBuilder(
			{
				cmd: 'meshData',
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


THREE.OBJLoader.MeshBuilder = function() {
	console.info( 'Using THREE.OBJLoader.MeshBuilder version: ' + THREE.OBJLoader.LOADER_MESH_BUILDER_VERSION );

	this.validator = THREE.OBJLoader.Validator;

	this.logging = {
		enabled: true,
		debug: false
	};

	this.callbacks = {
		onParseProgress: null,
		onMeshAlter: null,
		onLoadMaterials: null
	};
	this.materials = [];
};
THREE.OBJLoader.LOADER_MESH_BUILDER_VERSION = '2.0.0-dev';


THREE.OBJLoader.MeshBuilder.prototype = {

	constructor: THREE.OBJLoader.MeshBuilder,

		/**
		 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
		 * @memberOf THREE.OBJLoader.MeshBuilder
		 *
		 * @param {boolean} enabled True or false.
		 * @param {boolean} debug True or false.
		 */
	setLogging:	function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
	},

	/**
	 * Initializes the MeshBuilder (currently only default material initialisation).
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 */
	init: function ( loaderRootNode ) {
		this.loaderRootNode = loaderRootNode;

		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';

		var defaultVertexColorMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
		defaultVertexColorMaterial.vertexColors = THREE.VertexColors;

		var defaultLineMaterial = new THREE.LineBasicMaterial();
		defaultLineMaterial.name = 'defaultLineMaterial';

		var defaultPointMaterial = new THREE.PointsMaterial( { size: 1 } );
		defaultPointMaterial.name = 'defaultPointMaterial';

		var runtimeMaterials = {};
		runtimeMaterials[ defaultMaterial.name ] = defaultMaterial;
		runtimeMaterials[ defaultVertexColorMaterial.name ] = defaultVertexColorMaterial;
		runtimeMaterials[ defaultLineMaterial.name ] = defaultLineMaterial;
		runtimeMaterials[ defaultPointMaterial.name ] = defaultPointMaterial;

		this.updateMaterials(
			{
				cmd: 'materialData',
				materials: {
					materialCloneInstructions: null,
					serializedMaterials: null,
					runtimeMaterials: runtimeMaterials
				}
			}
		);
	},

	/**
	 * Set materials loaded by any supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 * @param {THREE.Material[]} materials Array of {@link THREE.Material}
	 */
	setMaterials: function ( materials ) {
		var payload = {
			cmd: 'materialData',
			materials: {
				materialCloneInstructions: null,
				serializedMaterials: null,
				runtimeMaterials: this.validator.isValid( this.callbacks.onLoadMaterials ) ? this.callbacks.onLoadMaterials( materials ) : materials
			}
		};
		this.updateMaterials( payload );
	},

	_setCallbacks: function ( onParseProgress, onMeshAlter, onLoadMaterials ) {
		if ( this.validator.isValid( onParseProgress ) ) this.callbacks.onParseProgress = onParseProgress;
		if ( this.validator.isValid( onMeshAlter ) ) this.callbacks.onMeshAlter = onMeshAlter;
		if ( this.validator.isValid( onLoadMaterials ) ) this.callbacks.onLoadMaterials = onLoadMaterials;
	},

	/**
	 * Delegates processing of the payload (mesh building or material update) to the corresponding functions (BW-compatibility).
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 * @param {Object} payload Raw Mesh or Material descriptions.
	 * @returns {THREE.Mesh[]} mesh Array of {@link THREE.Mesh} or null in case of material update
	 */
	processPayload: function ( payload ) {
		if ( payload.cmd === 'meshData' ) {

			return this.buildMeshes( payload );

		} else if ( payload.cmd === 'materialData' ) {

			this.updateMaterials( payload );
			return null;

		}
	},

	/**
	 * Builds one or multiple meshes from the data described in the payload (buffers, params, material info).
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 * @param {Object} meshPayload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 * @returns {THREE.Mesh[]} mesh Array of {@link THREE.Mesh}
	 */
	buildMeshes: function ( meshPayload ) {
		var meshName = meshPayload.params.meshName;

		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.vertices ), 3 ) );
		if ( this.validator.isValid( meshPayload.buffers.indices ) ) {

			bufferGeometry.setIndex( new THREE.BufferAttribute( new Uint32Array( meshPayload.buffers.indices ), 1 ) );

		}
		var haveVertexColors = this.validator.isValid( meshPayload.buffers.colors );
		if ( haveVertexColors ) {

			bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.colors ), 3 ) );

		}
		if ( this.validator.isValid( meshPayload.buffers.normals ) ) {

			bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( this.validator.isValid( meshPayload.buffers.uvs ) ) {

			bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( meshPayload.buffers.uvs ), 2 ) );

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
		var geometryType = this.validator.verifyInput( meshPayload.geometryType, 0 );
		if ( this.validator.isValid( callbackOnMeshAlter ) ) {

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
			if ( this.validator.isValid( callbackOnMeshAlterResult ) ) {

				if ( ! callbackOnMeshAlterResult.isDisregardMesh() && callbackOnMeshAlterResult.providesAlteredMeshes() ) {

					for ( var i in callbackOnMeshAlterResult.meshes ) {

						meshes.push( callbackOnMeshAlterResult.meshes[ i ] );

					}

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

		var progressMessage;
		if ( this.validator.isValid( meshes ) && meshes.length > 0 ) {

			var meshNames = [];
			for ( var i in meshes ) {

				mesh = meshes[ i ];
				meshNames[ i ] = mesh.name;

			}
			progressMessage = 'Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName;
			progressMessage += ' (' + (meshPayload.progress.numericalValue * 100).toFixed( 2 ) + '%)';

		} else {

			progressMessage = 'Not adding mesh: ' + meshName;
			progressMessage += ' (' + (meshPayload.progress.numericalValue * 100).toFixed( 2 ) + '%)';

		}
		var callbackOnParseProgress = this.callbacks.onParseProgress;
		if ( this.validator.isValid( callbackOnParseProgress ) ) {

			var event = new CustomEvent( 'MeshBuilderEvent', {
				detail: {
					type: 'progress',
					modelName: meshPayload.params.meshName,
					text: progressMessage,
					numericalValue: meshPayload.progress.numericalValue
				}
			} );
			callbackOnParseProgress( event );

		}

		this.addToLoaderRootNode( meshes );
	},

	addToLoaderRootNode: function( meshes ) {
		var mesh;
		for ( var i in meshes ) {

			mesh = meshes[ i ];
			this.loaderRootNode.add( mesh );

		}
	},

	/**
	 * Updates the materials with contained material objects (sync) or from alteration instructions (async).
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 * @param {Object} materialPayload Material update instructions
	 */
	updateMaterials: function ( materialPayload ) {
		var material, materialName;
		var materialCloneInstructions = materialPayload.materials.materialCloneInstructions;
		if ( this.validator.isValid( materialCloneInstructions ) ) {

			var materialNameOrg = materialCloneInstructions.materialNameOrg;
			var materialOrg = this.materials[ materialNameOrg ];

			if ( this.validator.isValid( materialNameOrg ) ) {

				material = materialOrg.clone();

				materialName = materialCloneInstructions.materialName;
				material.name = materialName;

				var materialProperties = materialCloneInstructions.materialProperties;
				for ( var key in materialProperties ) {

					if ( material.hasOwnProperty( key ) && materialProperties.hasOwnProperty( key ) ) material[ key ] = materialProperties[ key ];

				}
				this.materials[ materialName ] = material;

			} else {

				console.warn( 'Requested material "' + materialNameOrg + '" is not available!' );

			}
		}

		var materials = materialPayload.materials.serializedMaterials;
		if ( this.validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {

			var loader = new THREE.MaterialLoader();
			var materialJson;
			for ( materialName in materials ) {

				materialJson = materials[ materialName ];
				if ( this.validator.isValid( materialJson ) ) {

					material = loader.parse( materialJson );
					if ( this.logging.enabled ) console.info( 'De-serialized material with name "' + materialName + '" will be added.' );
					this.materials[ materialName ] = material;
				}

			}

		}

		materials = materialPayload.materials.runtimeMaterials;
		if ( this.validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {

			for ( materialName in materials ) {

				material = materials[ materialName ];
				if ( this.logging.enabled ) console.info( 'Material with name "' + materialName + '" will be added.' );
				this.materials[ materialName ] = material;

			}

		}
	},

	/**
	 * Returns the mapping object of material name and corresponding jsonified material.
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 * @returns {Object} Map of Materials in JSON representation
	 */
	getMaterialsJSON: function () {
		var materialsJSON = {};
		var material;
		for ( var materialName in this.materials ) {

			material = this.materials[ materialName ];
			materialsJSON[ materialName ] = material.toJSON();
		}

		return materialsJSON;
	},

	/**
	 * Returns the mapping object of material name and corresponding material.
	 * @memberOf THREE.OBJLoader.MeshBuilder
	 *
	 * @returns {Object} Map of {@link THREE.Material}
	 */
	getMaterials: function () {
		return this.materials;
	}

};

