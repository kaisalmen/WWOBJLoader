import {
	TorusKnotBufferGeometry,
	Color,
	MeshPhongMaterial
} from "three";
import {
	MeshTransport,
	MaterialsTransport,
	MaterialUtils,
	WorkerTaskManagerDefaultRouting
} from "three-wtm";


const WTMModuleExample = {

	init: function ( context, id, config ) {
		context.storage = {
			whoami: id,
		};

		context.postMessage( {
			cmd: "init",
			id: id
		} );

	},

	execute: function ( context, id, config ) {

		let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, 100, 64 );
		bufferGeometry.name = 'tmProto' + config.id;

		let vertexBA = bufferGeometry.getAttribute( 'position' );
		let vertexArray = vertexBA.array;
		for ( let i = 0; i < vertexArray.length; i ++ ) {

			vertexArray[ i ] = vertexArray[ i ] + 10 * (Math.random() - 0.5);

		}

		const randArray = new Uint8Array( 3 );
		context.crypto.getRandomValues( randArray );
		const color = new Color();
		color.r = randArray[ 0 ] / 255;
		color.g = randArray[ 1 ] / 255;
		color.b = randArray[ 2 ] / 255;
		const material = new MeshPhongMaterial( { color: color } );

		const materialsTransport = new MaterialsTransport();
		MaterialUtils.addMaterial( materialsTransport.main.materials, material, 'randomColor' + config.id, false, false );
		materialsTransport.cleanMaterials();

		new MeshTransport( 'execComplete', config.id ).setGeometry( bufferGeometry, 2 ).setMaterialsTransport( materialsTransport ).package( false ).postMessage( context );

	}
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, WTMModuleExample, 'init', 'execute' ), false );

export { WTMModuleExample }