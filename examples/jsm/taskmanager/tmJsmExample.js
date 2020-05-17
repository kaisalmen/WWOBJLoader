/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import {
	TorusKnotBufferGeometry
} from "../../../build/three.module.js";

class TaskmanagerJsmWorkerExample {

	constructor( ) {
	}

	init ( id, config ) {
		self.storage = {
			whoami: id,
		};

		self.postMessage( {
			cmd: "init",
			id: id
		} );

	}

	execute ( id, config ) {

		let bufferGeometry = new TorusKnotBufferGeometry( 20, 3, 100, 64 );

		let vertexBA = bufferGeometry.getAttribute( 'position' ) ;
		let indexBA = bufferGeometry.getIndex();
		let colorBA = bufferGeometry.getAttribute( 'color' );
		let normalBA = bufferGeometry.getAttribute( 'normal' );
		let uvBA = bufferGeometry.getAttribute( 'uv' );

		let vertexArray = vertexBA.array;
		for ( let i = 0; i < vertexArray.length; i++ ) {

			vertexArray[ i ] = vertexArray[ i ] + 10 * ( Math.random() - 0.5 );

		}
		let vertexFA = vertexArray;
		let indexUA = ( indexBA !== null && indexBA !== undefined ) ? indexBA.array: null;
		let colorFA = ( colorBA !== null && colorBA !== undefined ) ? colorBA.array: null;
		let normalFA = ( normalBA !== null && normalBA !== undefined ) ? normalBA.array: null;
		let uvFA = ( uvBA !== null && uvBA !== undefined ) ? uvBA.array: null;

		self.postMessage( {
				cmd: "exec",
				id: id,
				params: {
					meshName: 'wwobj' + config.count
				},
				buffers: {
					vertices: vertexFA,
					indices: indexUA,
					colors: colorFA,
					normals: normalFA,
					uvs: uvFA,
				}
			},
			[ vertexFA.buffer ],
			indexUA !== null ?  [ indexUA.buffer ] : null,
			colorFA !== null ? [ colorFA.buffer ] : null,
			normalFA !== null ? [ normalFA.buffer ] : null,
			uvFA !== null ? [ uvFA.buffer ] : null
		);

	}

	manageCom ( message ) {
		let payload = message.data;
		if ( payload.cmd === 'init' ) {

			this.init( payload.id, payload.config );

		}
		else if ( payload.cmd === 'execute' ) {

			this.execute( payload.id, payload.config );

		}
	}

}

const runner = new TaskmanagerJsmWorkerExample();
let scopedRunner = function ( event ) {

	runner.manageCom( event );

};
self.addEventListener( 'message', scopedRunner, false );
