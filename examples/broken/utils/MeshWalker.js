import { GeometryTransport } from "../../jsm/loaders/workerTaskManager/utils/TransportUtils.d.ts";
import {
	BufferGeometry,
	Object3D
} from "three";

class MeshWalker {

	/**
	 * Walk a mesh and on ever geometry call the callback function.
	 *
	 * @param {Object3D} rootNode
	 * @param {Function} callback
	 */
	static walkMesh( rootNode, callback ) {
		let _walk_ = function ( object3d ) {
			console.info( 'Walking: ' + object3d.name );

			if ( object3d.hasOwnProperty( 'geometry' ) && object3d[ 'geometry' ] instanceof BufferGeometry ) {
				const transport = new GeometryTransport( 'execComplete' );
				transport.package( object3d[ 'geometry' ], 0, false );
				callback( transport.main, transport.transferables );

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
}