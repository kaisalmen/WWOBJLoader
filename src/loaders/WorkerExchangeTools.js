
if ( THREE.WorkerLoader === undefined ) { THREE.WorkerLoader = {} }

/**
 *
 * @constructor
 */
THREE.WorkerLoader.WorkerExchangeTools = function () {
	this.callbackMeshBuilder = null;
};

THREE.WorkerLoader.WorkerExchangeTools.prototype = {

	constructor: THREE.WorkerLoader.WorkerExchangeTools,

	setCallbackMeshBuilder: function ( callbackMeshBuilder ) {
		this.callbackMeshBuilder = callbackMeshBuilder;
	},

	walkMesh: function ( rootNode ) {

		var scope = this;
		var _walk_ = function ( object3d ) {
			console.info( 'Walking: ' + object3d.name );

			var bufferGeometry;
			if ( object3d.hasOwnProperty( 'geometry' ) && object3d[ 'geometry' ] instanceof THREE.BufferGeometry ) {

				bufferGeometry = object3d[ 'geometry' ];
//			console.log ( bufferGeometry.attributes );
				var vertexBA = bufferGeometry.getAttribute( 'position' ) ;
				var indexBA = bufferGeometry.getIndex();
				var colorBA = bufferGeometry.getAttribute( 'color' );
				var normalBA = bufferGeometry.getAttribute( 'normal' );
				var uvBA = bufferGeometry.getAttribute( 'uv' );
				var vertexFA = ( vertexBA !== null && vertexBA !== undefined ) ? vertexBA.array: null;
				var indexUA = ( indexBA !== null && indexBA !== undefined ) ? indexBA.array: null;
				var colorFA = ( colorBA !== null && colorBA !== undefined ) ? colorBA.array: null;
				var normalFA = ( normalBA !== null && normalBA !== undefined ) ? normalBA.array: null;
				var uvFA = ( uvBA !== null && uvBA !== undefined ) ? uvBA.array: null;

				scope.callbackMeshBuilder(
					{
						cmd: 'meshData',
						progress: {
							numericalValue: 0
						},
						params: {
							meshName: object3d.name
						},
						materials: {
							multiMaterial: false,
							materialNames: [ 'defaultPointMaterial' ],
							materialGroups: []
						},
						buffers: {
							vertices: vertexFA,
							indices: indexUA,
							colors: colorFA,
							normals: normalFA,
							uvs: uvFA
						},
						// 0: mesh, 1: line, 2: point
						geometryType: 2
					},
					vertexFA !== null ?  [ vertexFA.buffer ] : null,
					indexUA !== null ?  [ indexUA.buffer ] : null,
					colorFA !== null ? [ colorFA.buffer ] : null,
					normalFA !== null ? [ normalFA.buffer ] : null,
					uvFA !== null ? [ uvFA.buffer ] : null
				);

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

	}
};