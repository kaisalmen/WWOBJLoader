/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	MeshStandardMaterial,
	VertexColors,
	LineBasicMaterial,
	PointsMaterial,
	BufferAttribute,
	BufferGeometry,
	DefaultLoadingManager,
	FileLoader,
	Group,
	LineSegments,
	Material,
	Mesh,
	Object3D,
	Points
} from "../../node_modules/three/build/three.module.js";

import { Parser } from "./worker/OBJLoaderParser.js";
import { CodeBuilderInstructions } from "./worker/CodeBuilderInstructions.js";

export {
	OBJLoader2,
};


/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link DefaultLoadingManager}
 */
const OBJLoader2 = function ( manager ) {
	this.manager = ( manager && manager !== null ) ? manager : DefaultLoadingManager;
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
	this.baseObject3d = new Group();

	this.callbacks = {
		onParseProgress: undefined,
		genericErrorHandler: undefined
	};

	this.materials = {};
	this._createDefaultMaterials();
};
OBJLoader2.OBJLOADER2_VERSION = '3.0.0-preview';


OBJLoader2.prototype = {

	constructor: OBJLoader2,

	printVersion: function() {
		console.info( 'Using OBJLoader2 version: ' + OBJLoader2.OBJLOADER2_VERSION );
	},

	_createDefaultMaterials: function () {
		let defaultMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';

		let defaultVertexColorMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
		defaultVertexColorMaterial.vertexColors = VertexColors;

		let defaultLineMaterial = new LineBasicMaterial();
		defaultLineMaterial.name = 'defaultLineMaterial';

		let defaultPointMaterial = new PointsMaterial( { size: 0.1 } );
		defaultPointMaterial.name = 'defaultPointMaterial';

		let defaultMaterials = {};
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
	 * @param {Object3D} baseObject3d Object already attached to scenegraph where new meshes will be attached to
	 */
	setBaseObject3d: function ( baseObject3d ) {
		this.baseObject3d = ( baseObject3d === null || baseObject3d === undefined ) ? this.baseObject3d : baseObject3d;
		return this;
	},

	/**
	 * Set materials loaded by MTLLoader as instance of {@link MTLLoader.MaterialCreator}.
	 *
	 * @param Instance of {@link MTLLoader.MaterialCreator}
	 */
	addMaterialsFromMtlLoader: function ( materialCreator ) {
		let newMaterials = {};
		if ( materialCreator !== undefined && materialCreator !== null ) {

			materialCreator.preload();
			newMaterials = this.addMaterials( materialCreator.materials );

		}
		return newMaterials;
	},

	/**
	 * Add materials as associated array.
	 *
	 * @param materials Object with named {@link Material}
	 */
	addMaterials: function ( materials ) {
		let newMaterials = {};
		if ( materials !== undefined && materials !== null && Object.keys( materials ).length > 0 ) {

			newMaterials = materials;
			for ( let newMaterialName in newMaterials ) {

				this.materials[ newMaterialName ] = newMaterials[ newMaterialName ];
				if ( this.logging.enabled ) console.info( 'Material with name "' + newMaterialName + '" was added.' );

			}

		}
		return newMaterials;
	},

	/**
	 * Instructs loaders to create indexed {@link BufferGeometry}.
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
		let content = ( text === null || text === undefined ) ? '': text;
		let event = {
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
		let output = '';
		if ( event.currentTarget && event.currentTarget.statusText !== null ) {

			output = 'Error occurred while downloading!\nurl: ' + event.currentTarget.responseURL + '\nstatus: ' + event.currentTarget.statusText;

		} else if ( typeof( event ) === 'string' || event instanceof String ) {

			output = event;

		}
		let scope = this;
		let onProgressScoped = function ( text, numericalValue ) {
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
	 */
	load: function ( url, onLoad, onFileLoadProgress, onError, onMeshAlter, parserConfiguration ) {
		let scope = this;
		if ( onError === null || onError === undefined ) {

			onError = function ( event ) {
				scope._onError( event );
			};

		}
		if ( ! url ) {

			onError( 'An invalid url was provided. Unable to continue!' );

		}
		let urlFull = new URL( url, window.location.href ).href;
		let filename = urlFull;
		let urlParts = urlFull.split( '/' );
		if ( urlParts.length > 2 ) {

			filename = urlParts[ urlParts.length - 1 ];
			let urlPartsPath = urlParts.slice( 0, urlParts.length - 1 ).join( '/' ) + '/';
			if ( urlPartsPath !== undefined && urlPartsPath !== null ) this.path = urlPartsPath;

		}
		if ( onFileLoadProgress === null || onFileLoadProgress === undefined ) {

			let numericalValueRef = 0;
			let numericalValue = 0;
			onFileLoadProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				numericalValue = event.loaded / event.total;
				if ( numericalValue > numericalValueRef ) {

					numericalValueRef = numericalValue;
					let output = 'Download of "' + url + '": ' + (numericalValue * 100).toFixed( 2 ) + '%';
					scope._onProgress( 'progressLoad', output, numericalValue );

				}
			};

		}
		this._setCallbacks( null, onMeshAlter, null );
		let fileLoaderOnLoad = function ( content ) {
			onLoad( scope.parse( content ) );
		};
		let fileLoader = new FileLoader( this.manager );
		fileLoader.setPath( this.path || this.resourcePath );
		fileLoader.setResponseType( 'arraybuffer' );
		fileLoader.load( filename, fileLoaderOnLoad, onFileLoadProgress, onError );
	},

	/**
	 * Parses OBJ data synchronously from arraybuffer or string.
	 *
	 * @param {arraybuffer|string} content OBJ data as Uint8Array or String
	 */
	parse: function ( content ) {
		// fast-fail in case of illegal data
		if ( content === null || content === undefined ) {

			throw 'Provided content is not a valid ArrayBuffer or String. Unable to continue parsing';

		}
		if ( this.logging.enabled ) {

			console.time( 'OBJLoader parse: ' + this.modelName );

		}
		let parser = new Parser();
		parser.setLogging( this.logging.enabled, this.logging.debug );
		parser.setMaterialPerSmoothingGroup( this.materialPerSmoothingGroup );
		parser.setUseOAsMesh( this.useOAsMesh );
		parser.setUseIndices( this.useIndices );
		parser.setDisregardNormals( this.disregardNormals );
		// sync code works directly on the material references
		parser.setMaterials( this.materials );

		let scope = this;
		let onMeshLoaded = function ( payload ) {

			if ( payload.cmd === 'data' && payload.type === 'mesh' ) {

				let meshes = scope._buildMeshes( payload );
				let mesh;
				for ( let i in meshes ) {

					mesh = meshes[ i ];
					scope.baseObject3d.add( mesh );

				}

			}
		};
		let onProgressScoped = function ( text, numericalValue ) {
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

			let errorMessage = 'Provided content was neither of type String nor Uint8Array! Aborting...';
			if ( this.callbacks.genericErrorHandler ) {

				this.callbacks.genericErrorHandler( errorMessage );

			}

		}
		if ( this.logging.enabled ) {

			console.timeEnd( 'OBJLoader parse: ' + this.modelName );

		}
		return this.baseObject3d;
	},

	_buildMeshes: function ( meshPayload ) {
		let meshName = meshPayload.params.meshName;

		let bufferGeometry = new BufferGeometry();
		bufferGeometry.addAttribute( 'position', new BufferAttribute( new Float32Array( meshPayload.buffers.vertices ), 3 ) );
		if ( meshPayload.buffers.indices !== null ) {

			bufferGeometry.setIndex( new BufferAttribute( new Uint32Array( meshPayload.buffers.indices ), 1 ) );

		}
		let haveVertexColors = meshPayload.buffers.colors  !== null;
		if ( haveVertexColors ) {

			bufferGeometry.addAttribute( 'color', new BufferAttribute( new Float32Array( meshPayload.buffers.colors ), 3 ) );

		}
		if ( meshPayload.buffers.normals !== null ) {

			bufferGeometry.addAttribute( 'normal', new BufferAttribute( new Float32Array( meshPayload.buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( meshPayload.buffers.uvs  !== null ) {

			bufferGeometry.addAttribute( 'uv', new BufferAttribute( new Float32Array( meshPayload.buffers.uvs ), 2 ) );

		}
		if ( meshPayload.buffers.skinIndex !== null ) {

			bufferGeometry.addAttribute( 'skinIndex', new BufferAttribute( new Uint16Array( meshPayload.buffers.skinIndex ), 4 ) );

		}
		if ( meshPayload.buffers.skinWeight !== null ) {

			bufferGeometry.addAttribute( 'skinWeight', new BufferAttribute( new Float32Array( meshPayload.buffers.skinWeight ), 4 ) );

		}

		let material, materialName, key;
		let materialNames = meshPayload.materials.materialNames;
		let createMultiMaterial = meshPayload.materials.multiMaterial;
		let multiMaterials = [];
		for ( key in materialNames ) {

			materialName = materialNames[ key ];
			material = this.materials[ materialName ];
			if ( createMultiMaterial ) multiMaterials.push( material );

		}
		if ( createMultiMaterial ) {

			material = multiMaterials;
			let materialGroups = meshPayload.materials.materialGroups;
			let materialGroup;
			for ( key in materialGroups ) {

				materialGroup = materialGroups[ key ];
				bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

			}

		}

		let meshes = [];
		let mesh;
		let callbackOnMeshAlter = this.callbacks.onMeshAlter;
		let callbackOnMeshAlterResult;
		let useOrgMesh = true;
		let geometryType = meshPayload.geometryType === null ? 0 : meshPayload.geometryType;

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

				for ( let i in callbackOnMeshAlterResult.meshes ) {

					meshes.push( callbackOnMeshAlterResult.meshes[ i ] );

				}
				useOrgMesh = false;

			}

		}
		if ( useOrgMesh ) {

			if ( meshPayload.computeBoundingSphere ) bufferGeometry.computeBoundingSphere();
			if ( geometryType === 0 ) {

				mesh = new Mesh( bufferGeometry, material );

			} else if ( geometryType === 1 ) {

				mesh = new LineSegments( bufferGeometry, material );

			} else {

				mesh = new Points( bufferGeometry, material );

			}
			mesh.name = meshName;
			meshes.push( mesh );

		}

		let progressMessage = meshPayload.params.meshName;
		if ( meshes.length > 0 ) {

			let meshNames = [];
			for ( let i in meshes ) {

				mesh = meshes[ i ];
				meshNames[ i ] = mesh.name;

			}
			progressMessage += ': Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100).toFixed( 2 ) + '%)';

		} else {

			progressMessage += ': Not adding mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100).toFixed( 2 ) + '%)';

		}
		let callbackOnParseProgress = this.callbacks.onParseProgress;
		if ( callbackOnParseProgress ) {

			callbackOnParseProgress( 'progress', progressMessage, meshPayload.progress.numericalValue );

		}
		return meshes;
	},

	buildWorkerCode: function ( codeSerializer ) {
		let workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by OBJLoader2.buildWorkerCode.\n';
		workerCode += '  */\n\n';
		workerCode += 'OBJLoader2 = {};\n\n';
//		workerCode += codeSerializer.serializeClass( 'Parser', Parser );

		let codeBuilderInstructions = new CodeBuilderInstructions( 'Parser', false );
		codeBuilderInstructions.addCodeFragment( workerCode );
		codeBuilderInstructions.addLibrary( 'src/loaders/worker/OBJLoader2Parser.js', '../../' );
		return codeBuilderInstructions;
	}
};
