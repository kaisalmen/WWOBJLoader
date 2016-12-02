/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {}
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

importScripts( '../../node_modules/three/build/three.min.js' );
importScripts( './OBJLoader2.js' );

THREE.WebWorker.WWOBJLoader = (function () {

	WWOBJLoader.prototype = Object.create( THREE.OBJLoader.ExtendableMeshCreator.prototype );
	WWOBJLoader.prototype.constructor = WWOBJLoader;

	function WWOBJLoader() {
		THREE.OBJLoader.ExtendableMeshCreator.call( this );
		this.debug = false;
		this.objLoader = new THREE.OBJLoader();
		this.objLoader.setExtendableMeshCreator( this );

		this.cmdState = 'created';
		this.objFile = '';
		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
	}

	/**
	 * It is ensured that outputObjectDescriptions only contain objects with vertices (no need to check)
	 * @param outputObjectDescriptions
	 * @param inputObjectCount
	 * @param absoluteVertexCount
	 * @param absoluteNormalCount
	 * @param absoluteUvCount
	 */
	WWOBJLoader.prototype.buildMesh = function ( outputObjectDescriptions, inputObjectCount,
												 absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {

		if ( this.debug ) console.log( 'WWOBJLoader.buildRawMeshData:\nInput object no.: ' + inputObjectCount );

		var vertexFa = new Float32Array( absoluteVertexCount );
		var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
		var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

		var outputObjectDescription;
		var materialDescription;
		var materialDescriptions = [];

		var createMultiMaterial = ( outputObjectDescriptions.length > 1 ) ? true : false;
		var materialIndex = 0;
		var materialIndexMapping = [];
		var selectedMaterialIndex;
		var materialGroup;
		var materialGroups = [];

		var vertexBAOffset = 0;
		var vertexGroupOffset = 0;
		var vertexLength;
		var normalOffset = 0;
		var uvOffset = 0;

		for ( var oodIndex in outputObjectDescriptions ) {
			outputObjectDescription = outputObjectDescriptions[ oodIndex ];

			materialDescription = { name: outputObjectDescription.materialName, flat: false, default: false };
			if ( this.materials[ materialDescription.name ] === null ) {

				materialDescription.default = true;
				console.error( 'Material with name "' + materialDescription.name + '" defined in OBJ file was defined in material names retrieved from mtl file!' );

			}
			// Attach '_flat' to materialName in case flat shading is needed due to smoothingGroup 0
			if ( outputObjectDescription.smoothingGroup === 0 ) materialDescription.flat = true;

			vertexLength = outputObjectDescription.vertices.length;
			if ( createMultiMaterial ) {

				// re-use material if already used before. Reduces materials array size and eliminates duplicates

				selectedMaterialIndex = materialIndexMapping[ materialDescription.name ];
				if ( ! selectedMaterialIndex ) {

					selectedMaterialIndex = materialIndex;
					materialIndexMapping[ materialDescription.name ] = materialIndex;
					materialDescriptions.push( materialDescription );
					materialIndex++;

				}
				materialGroup = {
					start: vertexGroupOffset,
					count: vertexLength / 3,
					index: selectedMaterialIndex
				};
				materialGroups.push( materialGroup );
				vertexGroupOffset += vertexLength / 3;

			} else {

				materialDescriptions.push( materialDescription );

			}

			vertexFa.set( outputObjectDescription.vertices, vertexBAOffset );
			vertexBAOffset += vertexLength;

			if ( normalFA ) {

				normalFA.set( outputObjectDescription.normals, normalOffset );
				normalOffset += outputObjectDescription.normals.length;

			}
			if ( uvFA ) {

				uvFA.set( outputObjectDescription.uvs, uvOffset );
				uvOffset += outputObjectDescription.uvs.length;

			}
			if ( this.debug ) this.printReport( outputObjectDescription, selectedMaterialIndex );

		}

		self.postMessage( {
			cmd: 'objData',
			meshName: outputObjectDescription.objectName,
			multiMaterial: createMultiMaterial,
			materialDescriptions: materialDescriptions,
			materialGroups: materialGroups,
			vertices: vertexFa,
			normals: normalFA,
			uvs: uvFA
		}, [ vertexFa.buffer ], normalFA !== null ? [ normalFA.buffer ] : null, uvFA !== null ? [ uvFA.buffer ] : null );

		this.globalObjectCount++;
	};

	WWOBJLoader.prototype.init = function ( payload ) {
		this.cmdState = 'init';

		this.dataAvailable = payload.dataAvailable;
		this.objFile = payload.objFile === null ? '' : payload.objFile;
		this.objAsArrayBuffer = payload.objAsArrayBuffer;
		this.debug = payload.debug;

		// re-init OBJLoader
		this.objLoader.setPath( payload.basePath );
	};

	WWOBJLoader.prototype.initMaterials = function ( payload ) {
		this.cmdState = 'initMaterials';
		this.objLoader.setMaterials( payload.materialNames );
	};

	WWOBJLoader.prototype.run = function () {
		this.cmdState = 'run';
		var scope = this;

		var complete = function ( errorMessage ) {
			console.log( 'OBJ loading complete!' );

			scope.cmdState = 'complete';
			self.postMessage( {
				cmd: scope.cmdState,
				msg: errorMessage
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
				complete( 'Error occurred while downloading "' + scope.objFile + '".' );
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
