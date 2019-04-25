/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	BufferAttribute,
	BufferGeometry,
	LineBasicMaterial,
	LineSegments,
	Material,
	MaterialLoader,
	Mesh,
	MeshStandardMaterial,
	Points,
	PointsMaterial,
	VertexColors
} from "../../node_modules/three/build/three.module.js";

import { Validator } from "./util/Validator.js";

export {
	MeshReceiver,
	MeshTransmitter,
	LoadedMeshUserOverride
}


const MeshReceiver = function() {
	console.info( 'Using MeshReceiver version: ' + MeshReceiver.MESH_RECEIVER_VERSION );

	this.logging = {
		enabled: true,
		debug: false
	};

	this.callbacks = {
		onParseProgress: null,
		onMeshAlter: null,
		onLoadMaterials: null
	};
	this.materials = {};
};
MeshReceiver.MESH_RECEIVER_VERSION = '2.0.0-preview';


MeshReceiver.prototype = {

	constructor: MeshReceiver,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
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
	 *
	 */
	setBaseObject3d: function ( baseObject3d ) {
		this.baseObject3d = baseObject3d;
	},

	createDefaultMaterials: function () {
		var defaultMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';

		var defaultVertexColorMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
		defaultVertexColorMaterial.vertexColors = VertexColors;

		var defaultLineMaterial = new LineBasicMaterial();
		defaultLineMaterial.name = 'defaultLineMaterial';

		var defaultPointMaterial = new PointsMaterial( { size: 0.1 } );
		defaultPointMaterial.name = 'defaultPointMaterial';

		var runtimeMaterials = {};
		runtimeMaterials[ defaultMaterial.name ] = defaultMaterial;
		runtimeMaterials[ defaultVertexColorMaterial.name ] = defaultVertexColorMaterial;
		runtimeMaterials[ defaultLineMaterial.name ] = defaultLineMaterial;
		runtimeMaterials[ defaultPointMaterial.name ] = defaultPointMaterial;

		this.updateMaterials(
			{
				cmd: 'data',
				type: 'material',
				materials: {
					materialCloneInstructions: null,
					serializedMaterials: null,
					runtimeMaterials: runtimeMaterials
				}
			}
		);
	},

	/**
	 * Set materials loaded by any supplier of an Array of {@link Material}.
	 *
	 * @param {Material[]} materials Array of {@link Material}
	 */
	setMaterials: function ( materials ) {
		var payload = {
			cmd: 'data',
			type: 'material',
			materials: {
				materialCloneInstructions: null,
				serializedMaterials: null,
				runtimeMaterials: Validator.isValid( this.callbacks.onLoadMaterials ) ? this.callbacks.onLoadMaterials( materials ) : materials
			}
		};
		this.updateMaterials( payload );
	},

	_setCallbacks: function ( onParseProgress, onMeshAlter, onLoadMaterials ) {
		if ( Validator.isValid( onParseProgress ) ) this.callbacks.onParseProgress = onParseProgress;
		if ( Validator.isValid( onMeshAlter ) ) this.callbacks.onMeshAlter = onMeshAlter;
		if ( Validator.isValid( onLoadMaterials ) ) this.callbacks.onLoadMaterials = onLoadMaterials;
	},

	/**
	 * Delegates processing of the payload (mesh building or material update) to the corresponding functions (BW-compatibility).
	 *
	 * @param {Object} payload Raw Mesh or Material descriptions.
	 * @returns {Mesh[]} mesh Array of {@link Mesh} or null in case of material update
	 */
	processPayload: function ( payload ) {
		if ( payload.type === 'mesh' ) {

			return this.buildMeshes( payload );

		} else if ( payload.type === 'material' ) {

			this.updateMaterials( payload );
			return null;

		}
	},

	/**
	 * Builds one or multiple meshes from the data described in the payload (buffers, params, material info).
	 *
	 * @param {Object} meshPayload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 * @returns {Mesh[]} mesh Array of {@link Mesh}
	 */
	buildMeshes: function ( meshPayload ) {
		var meshName = meshPayload.params.meshName;

		var bufferGeometry = new BufferGeometry();
		bufferGeometry.addAttribute( 'position', new BufferAttribute( new Float32Array( meshPayload.buffers.vertices ), 3 ) );
		if ( Validator.isValid( meshPayload.buffers.indices ) ) {

			bufferGeometry.setIndex( new BufferAttribute( new Uint32Array( meshPayload.buffers.indices ), 1 ) );

		}
		var haveVertexColors = Validator.isValid( meshPayload.buffers.colors );
		if ( haveVertexColors ) {

			bufferGeometry.addAttribute( 'color', new BufferAttribute( new Float32Array( meshPayload.buffers.colors ), 3 ) );

		}
		if ( Validator.isValid( meshPayload.buffers.normals ) ) {

			bufferGeometry.addAttribute( 'normal', new BufferAttribute( new Float32Array( meshPayload.buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( Validator.isValid( meshPayload.buffers.uvs ) ) {

			bufferGeometry.addAttribute( 'uv', new BufferAttribute( new Float32Array( meshPayload.buffers.uvs ), 2 ) );

		}
		if ( Validator.isValid( meshPayload.buffers.skinIndex ) ) {

			bufferGeometry.addAttribute( 'skinIndex', new BufferAttribute( new Uint16Array( meshPayload.buffers.skinIndex ), 4 ) );

		}
		if ( Validator.isValid( meshPayload.buffers.skinWeight ) ) {

			bufferGeometry.addAttribute( 'skinWeight', new BufferAttribute( new Float32Array( meshPayload.buffers.skinWeight ), 4 ) );

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
		var geometryType = Validator.verifyInput( meshPayload.geometryType, 0 );
		if ( Validator.isValid( callbackOnMeshAlter ) ) {

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
			if ( Validator.isValid( callbackOnMeshAlterResult ) ) {

				if ( callbackOnMeshAlterResult.isDisregardMesh() ) {

					useOrgMesh = false;

				} else if ( callbackOnMeshAlterResult.providesAlteredMeshes() ) {

					for ( var i in callbackOnMeshAlterResult.meshes ) {

						meshes.push( callbackOnMeshAlterResult.meshes[ i ] );

					}
					useOrgMesh = false;

				}

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

		var progressMessage = meshPayload.params.meshName;
		if ( Validator.isValid( meshes ) && meshes.length > 0 ) {

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
		if ( Validator.isValid( callbackOnParseProgress ) ) {

			callbackOnParseProgress( 'progress', progressMessage, meshPayload.progress.numericalValue );

		}

		this.addToBaseObject3d( meshes );
	},

	addToBaseObject3d: function( meshes ) {
		var mesh;
		for ( var i in meshes ) {

			mesh = meshes[ i ];
			this.baseObject3d.add( mesh );

		}
	},

	/**
	 * Updates the materials with contained material objects (sync) or from alteration instructions (async).
	 s	 *
	 * @param {Object} materialPayload Material update instructions
	 */
	updateMaterials: function ( materialPayload ) {
		var material, materialName;
		var materialCloneInstructions = materialPayload.materials.materialCloneInstructions;
		if ( Validator.isValid( materialCloneInstructions ) ) {

			var materialNameOrg = materialCloneInstructions.materialNameOrg;
			if ( Validator.isValid( materialNameOrg ) ) {

				var materialOrg = this.materials[ materialNameOrg ];
				material = materialOrg.clone();

				materialName = materialCloneInstructions.materialName;
				material.name = materialName;

				var materialProperties = materialCloneInstructions.materialProperties;
				for ( var key in materialProperties ) {

					if ( material.hasOwnProperty( key ) && materialProperties.hasOwnProperty( key ) ) material[ key ] = materialProperties[ key ];

				}
				this.materials[ materialName ] = material;

			} else {

				console.info( 'Requested material "' + materialNameOrg + '" is not available!' );

			}
		}

		var materials = materialPayload.materials.serializedMaterials;
		if ( Validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {

			var loader = new MaterialLoader();
			var materialJson;
			for ( materialName in materials ) {

				materialJson = materials[ materialName ];
				if ( Validator.isValid( materialJson ) ) {

					material = loader.parse( materialJson );
					if ( this.logging.enabled ) console.info( 'De-serialized material with name "' + materialName + '" will be added.' );
					this.materials[ materialName ] = material;
				}

			}

		}

		materials = materialPayload.materials.runtimeMaterials;
		if ( Validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {

			for ( materialName in materials ) {

				material = materials[ materialName ];
				if ( this.logging.enabled ) console.info( 'Material with name "' + materialName + '" will be added.' );
				this.materials[ materialName ] = material;

			}

		}
	},

	/**
	 * Returns the mapping object of material name and corresponding jsonified material.
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
	 *
	 * @returns {Object} Map of {@link Material}
	 */
	getMaterials: function () {
		return this.materials;
	}

};


/**
 * Object to return by callback onMeshAlter. Used to disregard a certain mesh or to return one to many meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 * @param {boolean} disregardMesh=false Tell implementation that mesh(es) have been altered or added
 */
const LoadedMeshUserOverride = function( disregardMesh, alteredMesh ) {
	this.disregardMesh = disregardMesh === true;
	this.alteredMesh = alteredMesh === true;
	this.meshes = [];
};


LoadedMeshUserOverride.prototype = {

	constructor: LoadedMeshUserOverride,

	/**
	 * Add a mesh created within callback.
	 *
	 * @param {Mesh} mesh
	 */
	addMesh: function ( mesh ) {
		this.meshes.push( mesh );
		this.alteredMesh = true;
	},

	/**
	 * Answers if mesh shall be disregarded completely.
	 *
	 * @returns {boolean}
	 */
	isDisregardMesh: function () {
		return this.disregardMesh;
	},

	/**
	 * Answers if new mesh(es) were created.
	 *
	 * @returns {boolean}
	 */
	providesAlteredMeshes: function () {
		return this.alteredMesh;
	}
};


/**
 *
 * @constructor
 */
const MeshTransmitter = function () {
	this.callbackDataReceiver = null;
	this.defaultGeometryType = 2;
	this.defaultMaterials = [ 'defaultMaterial', 'defaultLineMaterial', 'defaultPointMaterial' ];
};

MeshTransmitter.MESH_TRANSMITTER_VERSION = '1.0.0-preview';


MeshTransmitter.prototype = {

	constructor: MeshTransmitter,

	setCallbackDataReceiver: function ( callbackDataReceiver ) {
		this.callbackDataReceiver = callbackDataReceiver;
	},

	setDefaultGeometryType: function ( defaultGeometryType ) {
		this.defaultGeometryType = defaultGeometryType;
	},

	walkMesh: function ( rootNode ) {
		var scope = this;
		var _walk_ = function ( object3d ) {
			console.info( 'Walking: ' + object3d.name );

			if ( object3d.hasOwnProperty( 'geometry' ) && object3d[ 'geometry' ] instanceof BufferGeometry ) {

				scope.handleBufferGeometry( object3d[ 'geometry' ], object3d.name );

			}
			if ( object3d.hasOwnProperty( 'material' ) ) {

				var mat = object3d.material;
				if ( mat.hasOwnProperty( 'materials' ) ) {

					var materials = mat.materials;
					for ( var name in materials ) {

						if ( materials.hasOwnProperty( name ) ) {

							console.log( materials[ name ] );

						}

					}
				} else {

					console.log( mat.name );

				}

			}
		};
		rootNode.traverse( _walk_ );

	},

	handleBufferGeometry: function ( bufferGeometry, objectName ) {
//			console.log ( bufferGeometry.attributes );
		var vertexBA = bufferGeometry.getAttribute( 'position' ) ;
		var indexBA = bufferGeometry.getIndex();
		var colorBA = bufferGeometry.getAttribute( 'color' );
		var normalBA = bufferGeometry.getAttribute( 'normal' );
		var uvBA = bufferGeometry.getAttribute( 'uv' );
		var skinIndexBA = bufferGeometry.getAttribute( 'skinIndex' );
		var skinWeightBA = bufferGeometry.getAttribute( 'skinWeight' );
		var vertexFA = ( vertexBA !== null && vertexBA !== undefined ) ? vertexBA.array: null;
		var indexUA = ( indexBA !== null && indexBA !== undefined ) ? indexBA.array: null;
		var colorFA = ( colorBA !== null && colorBA !== undefined ) ? colorBA.array: null;
		var normalFA = ( normalBA !== null && normalBA !== undefined ) ? normalBA.array: null;
		var uvFA = ( uvBA !== null && uvBA !== undefined ) ? uvBA.array: null;
		var skinIndexFA = ( skinIndexBA !== null && skinIndexBA !== undefined ) ? skinIndexBA.array: null;
		var skinWeightFA = ( skinWeightBA !== null && skinWeightBA !== undefined ) ? skinWeightBA.array: null;

		var materialNames = [ this.defaultMaterials[ this.defaultGeometryType ] ];
		this.callbackDataReceiver(
			{
				cmd: 'data',
				type: 'mesh',
				progress: {
					numericalValue: 0
				},
				params: {
					meshName: objectName
				},
				materials: {
					multiMaterial: false,
					materialNames: materialNames,
					materialGroups: []
				},
				buffers: {
					vertices: vertexFA,
					indices: indexUA,
					colors: colorFA,
					normals: normalFA,
					uvs: uvFA,
					skinIndex: skinIndexFA,
					skinWeight: skinWeightFA
				},
				// 0: mesh, 1: line, 2: point
				geometryType: this.defaultGeometryType
			},
			vertexFA !== null ?  [ vertexFA.buffer ] : null,
			indexUA !== null ?  [ indexUA.buffer ] : null,
			colorFA !== null ? [ colorFA.buffer ] : null,
			normalFA !== null ? [ normalFA.buffer ] : null,
			uvFA !== null ? [ uvFA.buffer ] : null,
			skinIndexFA !== null ? [ skinIndexFA.buffer ] : null,
			skinWeightFA !== null ? [ skinWeightFA.buffer ] : null
		);
	}
};