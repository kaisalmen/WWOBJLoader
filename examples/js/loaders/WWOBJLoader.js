/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

importScripts( './WWCommons.js' );
importScripts( THREE.WebWorker.Commons.paths.threejsPath );
importScripts( THREE.WebWorker.Commons.paths.objLoaderPath );
importScripts( THREE.WebWorker.Commons.paths.mtlLoaderPath );

THREE.WebWorker.WWOBJLoader = (function () {

	WWOBJLoader.prototype = Object.create( THREE.OBJLoader.ExtendableMeshCreator.prototype );
	WWOBJLoader.prototype.constructor = WWOBJLoader;

	function WWOBJLoader() {
		THREE.OBJLoader.ExtendableMeshCreator.call( this );
		this.objLoader = new THREE.OBJLoader();
		this.objLoader.setExtendableMeshCreator( this );

		this.cmdState = 'created';
		this.objFile = '';
		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
	}

	/**
	 * It is ensured that retrievedObjectDescriptions only contain objects with vertices (no need to check)
	 * @param retrievedObjectDescriptions
	 * @param inputObjectCount
	 * @param absoluteVertexCount
	 * @param absoluteNormalCount
	 * @param absoluteUvCount
	 */
	/*
	ExtendableMeshCreator.prototype.buildMesh = function ( retrievedObjectDescriptions, inputObjectCount,
														   absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {
		var retrievedObjectDescription;
	};
	*/

	WWOBJLoader.prototype._buildSingleMesh = function ( object, material ) {
		// Fast-Fail: Skip o/g line declarations that did not follow with any faces
		if ( object.geometry.vertices.length === 0 ) return null;

		var geometry = object.geometry;
		var objectMaterials = object.materials;

		var verticesOut = new Float32Array( geometry.vertices );
		var normalsOut = null;
		if ( geometry.normals.length > 0 ) {

			normalsOut = new Float32Array( geometry.normals );

		}
		var uvsOut = new Float32Array( geometry.uvs );


		var materialGroups = [];
		var materialNames = [];
		var multiMaterial = false;
		if ( material instanceof THREE.MultiMaterial ) {

			for ( var objectMaterial, group, i = 0, length = objectMaterials.length; i < length; i ++ ) {

				objectMaterial = objectMaterials[ i ];
				group = {
					start: objectMaterial.groupStart,
					count: objectMaterial.groupCount,
					index: i
				};
				materialGroups.push( group );

			}

			var mMaterial;
			for ( var key in material.materials ) {

				mMaterial = material.materials[ key ];
				materialNames.push( mMaterial.name );

			}
			multiMaterial = true;
		}


		self.postMessage( {
			cmd: 'objData',
			meshName: object.name,
			multiMaterial: multiMaterial,
			materialName: multiMaterial ? JSON.stringify( materialNames ) : material.name,
			materialGroups: multiMaterial ? JSON.stringify( materialGroups ) : null,
			vertices: verticesOut,
			normals: normalsOut,
			uvs: uvsOut
		}, [ verticesOut.buffer ], normalsOut !== null ? [ normalsOut.buffer ] : null, uvsOut !== null ? [ uvsOut.buffer ] : null );

		return null;
	};


	WWOBJLoader.prototype.init = function ( payload ) {
		this.cmdState = 'init';

		this.debug = payload.debug;
		this.dataAvailable = payload.dataAvailable;
		this.objFile = payload.objFile === null ? '' : payload.objFile;
		this.objAsArrayBuffer = this.dataAvailable ? payload.objAsArrayBuffer : null;

		// re-init OBJLoader
		this.objLoader.reInit( true, payload.basePath );
	};

	WWOBJLoader.prototype.initMaterials = function ( payload ) {
		this.cmdState = 'initMaterials';

		var materialsJSON = JSON.parse( payload.materials );
		var materialCreator = new THREE.MTLLoader.MaterialCreator( payload.baseUrl, payload.options );
		materialCreator.setMaterials( materialsJSON );
		materialCreator.preload();

		this.objLoader.setMaterials( materialCreator );
	};

	WWOBJLoader.prototype.run = function () {
		this.cmdState = 'run';
		var scope = this;

		var complete = function () {
			console.log( 'OBJ loading complete!' );

			scope.cmdState = 'complete';
			self.postMessage( {
				cmd: scope.cmdState
			} );
		};

		if ( scope.dataAvailable ) {

			scope.objLoader.parse( scope.objAsArrayBuffer );
			complete();

		} else {

			var onLoad = function () {
				complete();
			};

			var onProgress = function ( xhr ) {
				if ( xhr.lengthComputable ) {
					var percentComplete = xhr.loaded / xhr.total * 100;
					console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
				}
			};

			var onError = function ( xhr ) {
				console.error( xhr );
			};

			scope.objLoader.load( scope.objFile, onLoad, onProgress, onError );

		}
	};

	return WWOBJLoader;
})();

var implRef = new THREE.WebWorker.WWOBJLoader( this );

var runner = function ( event ) {
	var payload = event.data;

	console.log( 'Command state before: ' + implRef.cmdState );

	switch ( payload.cmd ) {
		case 'init':

			implRef.init( payload );
			break;

		case 'initMaterials':

			implRef.initMaterials( payload );
			break;

		case 'run':

			implRef.run();
			break;

		default:

			console.error( 'WWOBJLoader: Received unknown command: ' + payload.cmd );
			break;

	}

	console.log( 'Command state after: ' + implRef.cmdState );
};

self.addEventListener( 'message', runner, false );
