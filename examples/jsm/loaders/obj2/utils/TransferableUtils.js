/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferGeometry
} from "../../../../../build/three.module.js";


class TransferableUtils {

	static createMessageStructure( meshName ) {
		return {
			main: {
				cmd: 'exec',
				type: 'mesh',
				meshName: meshName,
				progress: {
					numericalValue: 0
				},
				params: {
					// 0: mesh, 1: line, 2: point
					geometryType: 0
				},
				materials: {
					multiMaterial: false,
					materialNames: [],
					materialGroups: []
				},
				buffers: {
					vertices: null,
					indices: null,
					colors: null,
					normals: null,
					uvs: null,
					skinIndex: null,
					skinWeight: null
				}
			},
			transferables: {
				vertex: null,
				index: null,
				color: null,
				normal: null,
				uv: null,
				skinIndex: null,
				skinWeight: null
			}
		}
	}

	static walkMesh( rootNode, callback ) {
		let scope = this;
		let _walk_ = function ( object3d ) {
			console.info( 'Walking: ' + object3d.name );

			if ( object3d.hasOwnProperty( 'geometry' ) && object3d[ 'geometry' ] instanceof BufferGeometry ) {
				let payload = TransferableUtils.packageBufferGeometry( object3d[ 'geometry' ], object3d.name, 0,['TBD'] );
				callback( payload.main, payload.transferables );

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

	/**
	 *
	 * @param {BufferGeometry} bufferGeometry
	 * @param {string} meshName
	 * @param {number} geometryType
	 * @param {string[]} [materialNames]
	 */
	static packageBufferGeometry( bufferGeometry, meshName, geometryType, materialNames ) {
		let vertexBA = bufferGeometry.getAttribute( 'position' );
		let indexBA = bufferGeometry.getIndex();
		let colorBA = bufferGeometry.getAttribute( 'color' );
		let normalBA = bufferGeometry.getAttribute( 'normal' );
		let uvBA = bufferGeometry.getAttribute( 'uv' );
		let skinIndexBA = bufferGeometry.getAttribute( 'skinIndex' );
		let skinWeightBA = bufferGeometry.getAttribute( 'skinWeight' );
		let vertexFA = (vertexBA !== null && vertexBA !== undefined) ? vertexBA.array : null;
		let indexUA = (indexBA !== null && indexBA !== undefined) ? indexBA.array : null;
		let colorFA = (colorBA !== null && colorBA !== undefined) ? colorBA.array : null;
		let normalFA = (normalBA !== null && normalBA !== undefined) ? normalBA.array : null;
		let uvFA = (uvBA !== null && uvBA !== undefined) ? uvBA.array : null;
		let skinIndexFA = (skinIndexBA !== null && skinIndexBA !== undefined) ? skinIndexBA.array : null;
		let skinWeightFA = (skinWeightBA !== null && skinWeightBA !== undefined) ? skinWeightBA.array : null;


		let payload = TransferableUtils.createMessageStructure( meshName );
		payload.main.params.geometryType = geometryType;
		payload.main.materials.materialNames = materialNames;
		if ( vertexFA !== null ) {

			payload.main.buffers.vertices = vertexFA;
			payload.transferables.vertex = [ vertexFA.buffer ];

		}
		if ( indexUA !== null ) {

			payload.main.buffers.indices = indexUA;
			payload.transferables.index = [ indexUA.buffer ];

		}
		if ( colorFA !== null ) {

			payload.main.buffers.colors = colorFA;
			payload.transferables.color = [ colorFA.buffer ];

		}
		if ( normalFA !== null ) {

			payload.main.buffers.normals = normalFA;
			payload.transferables.normal = [ normalFA.buffer ];

		}
		if ( uvFA !== null ) {

			payload.main.buffers.uvs = uvFA;
			payload.transferables.uv = [ uvFA.buffer ];

		}
		if ( skinIndexFA !== null ) {

			payload.main.buffers.skinIndex = skinIndexFA;
			payload.transferables.skinIndex = [ skinIndexFA.buffer ];

		}
		if ( skinWeightFA !== null ) {

			payload.main.buffers.skinWeight = skinWeightFA;
			payload.transferables.skinWeight = [ skinWeightFA.buffer ];

		}
		return payload;
	}

	static cloneMessageStructure( input ) {

		let payload = input;
		if ( input.main.buffers.vertices !== null ) {

			let arrayOut = new Float32Array( input.main.buffers.vertices.length );
			TransferableUtils.copyTypedArray( input.main.buffers.vertices, arrayOut )
			payload.transferables.vertex = [ arrayOut.buffer ];

		}
		if ( input.main.buffers.indices !== null ) {

			let arrayOut = new Uint32Array( input.main.buffers.indices );
			TransferableUtils.copyTypedArray( input.main.buffers.indices, arrayOut );
			payload.transferables.index = [ arrayOut.buffer ];

		}
		if ( input.main.buffers.colors !== null ) {

			let arrayOut = new Float32Array( input.main.buffers.colors.length );
			TransferableUtils.copyTypedArray( input.main.buffers.colors, arrayOut )
			payload.transferables.color = [ arrayOut.buffer ];

		}
		if ( input.main.buffers.normals !== null ) {

			let arrayOut = new Float32Array( input.main.buffers.normals.length );
			TransferableUtils.copyTypedArray( input.main.buffers.normals, arrayOut )
			payload.transferables.normal = [ arrayOut.buffer ];

		}
		if ( input.main.buffers.uvs !== null ) {

			let arrayOut = new Float32Array( input.main.buffers.uvs.length );
			TransferableUtils.copyTypedArray( input.main.buffers.uvs, arrayOut )
			payload.transferables.uv = [ arrayOut.buffer ];

		}
		if ( input.main.buffers.skinIndex !== null ) {

			let arrayOut = new Float32Array( input.main.buffers.skinIndex.length );
			TransferableUtils.copyTypedArray( input.main.buffers.skinIndex, arrayOut )
			payload.transferables.skinIndex = [ arrayOut.buffer ];

		}
		if ( input.main.buffers.skinWeight !== null ) {

			let arrayOut = new Float32Array( input.main.buffers.skinWeight.length );
			TransferableUtils.copyTypedArray( input.main.buffers.skinWeight, arrayOut )
			payload.transferables.skinWeight = [ arrayOut.buffer ];

		}
		return payload;

	}

	static copyTypedArray ( arrayIn, arrayOut ) {

		for ( let i = 0; i < arrayIn.length; i++ ) arrayOut[ i ] = arrayIn[ i ];

	}

}

export { TransferableUtils }
