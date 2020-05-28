/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferGeometry
} from "../../../../../build/three.module.js";


class MeshTransmitter {

	static MESH_TRANSMITTER_VERSION = '1.0.0-preview';

	constructor() {

		this.defaultGeometryType = 0;
		this.defaultMaterials = [ 'defaultMaterial', 'defaultLineMaterial', 'defaultPointMaterial' ];

	}

	setDefaultGeometryType ( defaultGeometryType ) {
		this.defaultGeometryType = defaultGeometryType;
	}

	walkMesh ( rootNode ) {
		let scope = this;
		let _walk_ = function ( object3d ) {
			console.info( 'Walking: ' + object3d.name );

			if ( object3d.hasOwnProperty( 'geometry' ) && object3d[ 'geometry' ] instanceof BufferGeometry ) {

				scope.handleBufferGeometry( object3d[ 'geometry' ], object3d.name );

			}
			if ( object3d.hasOwnProperty( 'material' ) ) {

				let mat = object3d.material;
				if ( mat.hasOwnProperty( 'materials' ) ) {

					let materials = mat.materials;
					for ( let name in materials ) {

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

	}

	handleBufferGeometry ( bufferGeometry, id, meshName, handlerFunc ) {
//			console.log ( bufferGeometry.attributes );
		let vertexBA = bufferGeometry.getAttribute( 'position' ) ;
		let indexBA = bufferGeometry.getIndex();
		let colorBA = bufferGeometry.getAttribute( 'color' );
		let normalBA = bufferGeometry.getAttribute( 'normal' );
		let uvBA = bufferGeometry.getAttribute( 'uv' );
		let skinIndexBA = bufferGeometry.getAttribute( 'skinIndex' );
		let skinWeightBA = bufferGeometry.getAttribute( 'skinWeight' );
		let vertexFA = ( vertexBA !== null && vertexBA !== undefined ) ? vertexBA.array: null;
		let indexUA = ( indexBA !== null && indexBA !== undefined ) ? indexBA.array: null;
		let colorFA = ( colorBA !== null && colorBA !== undefined ) ? colorBA.array: null;
		let normalFA = ( normalBA !== null && normalBA !== undefined ) ? normalBA.array: null;
		let uvFA = ( uvBA !== null && uvBA !== undefined ) ? uvBA.array: null;
		let skinIndexFA = ( skinIndexBA !== null && skinIndexBA !== undefined ) ? skinIndexBA.array: null;
		let skinWeightFA = ( skinWeightBA !== null && skinWeightBA !== undefined ) ? skinWeightBA.array: null;

		let materialNames = [ this.defaultMaterials[ this.defaultGeometryType ] ];
		handlerFunc( {
				cmd: 'exec',
				type: 'mesh',
				id: id,
				progress: {
					numericalValue: 0
				},
				params: {
					meshName: meshName
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
		)
	}
}

export { MeshTransmitter }
