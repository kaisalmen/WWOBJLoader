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
		this.debug = true;
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

	WWOBJLoader.prototype.buildMesh = function ( retrievedObjectDescriptions, inputObjectCount, absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {
		var retrievedObjectDescription;
		if ( this.debug ) console.log( 'WWOBJLoader.buildRawMeshData:\nInput object no.: ' + inputObjectCount );
/*
		ignore for now
		if ( this.useMultiMaterials ) {

		} else {
 */
			for ( var index in retrievedObjectDescriptions ) {
				retrievedObjectDescription = retrievedObjectDescriptions[ index ];
				this.buildSingleMaterialMesh( retrievedObjectDescription );
			}
//		}
	};

	WWOBJLoader.prototype.buildSingleMaterialMesh = function ( retrievedObjectDescription ) {
		var verticesOut = new Float32Array( retrievedObjectDescription.vertexArray );
		var normalsOut = ( retrievedObjectDescription.normalArrayIndex > 0 ) ? new Float32Array( retrievedObjectDescription.normalArray ) : null;
		var uvsOut = ( retrievedObjectDescription.uvArrayIndex > 0 ) ? new Float32Array( retrievedObjectDescription.uvArray ) : null;

		var material;
		var materialName = retrievedObjectDescription.materialName;
		if ( this.materials !== null && this.materials instanceof THREE.MTLLoader.MaterialCreator ) material = this.materials.create( materialName );

		if ( ! material ) {

			material = new THREE.MeshStandardMaterial();
			material.name = materialName;

		}
		// clone material in case flat shading is needed due to smoothingGroup 0
		if ( retrievedObjectDescription.smoothingGroup === 0 ) {

			material = material.clone();
			materialName = materialName + '_clone';
			material.name = materialName;
			material.shading = THREE.FlatShading;
		}

		self.postMessage( {
			cmd: 'objData',
			meshName: retrievedObjectDescription.objectName,
			multiMaterial: false,
			materialName: materialName,
			materialGroups: null,
			vertices: verticesOut,
			normals: normalsOut,
			uvs: uvsOut
		}, [ verticesOut.buffer ], normalsOut !== null ? [ normalsOut.buffer ] : null, uvsOut !== null ? [ uvsOut.buffer ] : null );

		if ( this.debug ) this.printReport( retrievedObjectDescription, 0 );

		this.globalObjectCount++;
	};

	WWOBJLoader.prototype.init = function ( payload ) {
		this.cmdState = 'init';

		this.dataAvailable = payload.dataAvailable;
		this.objFile = payload.objFile === null ? '' : payload.objFile;
		this.objAsArrayBuffer = this.dataAvailable ? payload.objAsArrayBuffer : null;

		// re-init OBJLoader
		this.objLoader.validate( true, payload.basePath );
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

			var refPercentComplete = 0;
			var percentComplete = 0;
			var output;

			var onProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				percentComplete = Math.round( event.loaded / event.total * 100 );
				if ( percentComplete > refPercentComplete ) {

					refPercentComplete = percentComplete;
					output = 'Download of "' + scope.objFile + '": ' + percentComplete + '%';
					console.log( output );
					self.postMessage( {
						cmd: 'report_progress',
						output: output
					} );

				}
			};

			var onError = function ( event ) {
				console.error( event );
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
