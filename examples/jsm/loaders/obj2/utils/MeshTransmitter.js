/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferGeometry
} from "../../../../../build/three.module.js";


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

export { MeshTransmitter }
