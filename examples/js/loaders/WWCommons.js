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
				threejsPath: '../../../../build/three.min.js',
				objLoaderPath: './OBJLoader3.js',
				mtlLoaderPath: './MTLLoader.js'
			}
		}
	}

}
