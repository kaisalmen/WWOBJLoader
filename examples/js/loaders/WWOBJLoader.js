/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

importScripts( './WWCommons.js' );
importScripts( THREE.WebWorker.Commons.paths.threejsPath );
importScripts( THREE.WebWorker.Commons.paths.objLoaderPath );
importScripts( THREE.WebWorker.Commons.paths.mtlLoaderPath );

THREE.WebWorker.WWOBJLoader = (function () {

	WWOBJLoader.prototype = Object.create( THREE.OBJLoader.prototype, {
		constructor: {
			configurable: true,
			enumerable: true,
			value: WWOBJLoader,
			writable: true
		}
	} );

	function WWOBJLoader() {
		THREE.OBJLoader.call( this );
		this.cmdState = 'created';
		this.debug = false;

		this.basePath = '';
		this.objFile = '';
		this.dataAvailable = false;
		this.objAsArrayBuffer = null;

		this.setLoadAsArrayBuffer( true );
		this.setWorkInline( true );

		this.counter = 0;
	}

	WWOBJLoader.prototype._buildSingleMesh = function ( object, material ) {
		// Fast-Fail: Skip o/g line declarations that did not follow with any faces
		if ( object.geometry.vertices.length === 0 ) return null;

		this.counter ++;

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
			uvs: uvsOut,
		}, [ verticesOut.buffer ], [ normalsOut.buffer ], [ uvsOut.buffer ] );

		return null;
	};


	WWOBJLoader.prototype.init = function ( payload ) {
		this.cmdState = 'init';

		this.debug = payload.debug;
		this.dataAvailable = payload.dataAvailable;
		this.basePath = payload.basePath === null ? '' : payload.basePath;
		this.objFile = payload.objFile === null ? '' : payload.objFile;

		// configure OBJLoader
		if ( payload.loadAsArrayBuffer !== undefined ) {

			this.setLoadAsArrayBuffer( payload.loadAsArrayBuffer );

		}
		if ( payload.workInline !== undefined ) {

			this.setWorkInline( payload.workInline );

		}
		this.setPath( this.basePath );

		if ( this.dataAvailable ) {

			// this must be the case, otherwise loading will fail
			this.setLoadAsArrayBuffer( true );
			this.objAsArrayBuffer = payload.objAsArrayBuffer;

		}
	};

	WWOBJLoader.prototype.initMaterials = function ( payload ) {
		this.cmdState = 'initMaterials';

		var materialsJSON = JSON.parse( payload.materials );
		var materialCreator = new THREE.MTLLoader.MaterialCreator( payload.baseUrl, payload.options );
		materialCreator.setMaterials( materialsJSON );
		materialCreator.preload();

		this.setMaterials( materialCreator );
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

			scope.dispose();
		};

		if ( scope.dataAvailable ) {

			scope.parseArrayBuffer( scope.objAsArrayBuffer );
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

			scope.load( scope.objFile, onLoad, onProgress, onError );

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
