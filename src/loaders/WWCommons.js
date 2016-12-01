/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) {
	var THREE = {}
}

if ( THREE.WebWorker === undefined ) {

	THREE.WebWorker = {
		Commons: {
			paths: {
				threejsPath: '../../../../node_modules/three/build/three.min.js',
				objLoaderPath: './OBJLoader2.js',
				mtlLoaderPath: '../../../../node_modules/three/examples/js/loaders/MTLLoader.js'
			}
		}
	}

}
