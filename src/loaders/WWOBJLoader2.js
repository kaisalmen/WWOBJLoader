/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }
if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }

importScripts( './OBJLoader2Parser.js' );

THREE.WebWorker.WWOBJLoader = (function () {

	function WWOBJLoader() {
		this.meshCreator = new THREE.WebWorker.WWMeshCreator();
		this.parser = new THREE.OBJLoader2.Parser( this.meshCreator );
		this.parser.debug = false;
		this.validated = false;
		this.cmdState = 'created';

		this.debug = false;
	}

	/**
	 * Allows to set debug mode for the parser and the meshCreatorDebug
	 *
	 * @param parserDebug
	 * @param meshCreatorDebug
	 */
	WWOBJLoader.prototype.setDebug = function ( parserDebug, meshCreatorDebug ) {
		this.parser.debug = parserDebug;
		this.meshCreator.debug = meshCreatorDebug;
	};

	/**
	 * Validate status, then parse arrayBuffer, finalize and return objGroup
	 *
	 * @param arrayBuffer
	 */
	WWOBJLoader.prototype.parse = function ( arrayBuffer ) {
		console.log( 'Parsing arrayBuffer...' );
		console.time( 'parseArrayBuffer' );

		this.validate();
		this.parser.parseArrayBuffer( arrayBuffer );
		var objGroup = this.finalize();

		console.timeEnd( 'parseArrayBuffer' );

		return objGroup;
	};

	/**
	 * Check initialization status: Used for init and re-init
	 */
	WWOBJLoader.prototype.validate = function () {
		if ( this.validated ) return;

		this.parser.validate();
		this.meshCreator.validate();

		this.validated = true;
	};

	WWOBJLoader.prototype.finalize = function () {
		console.log( 'Global output object count: ' + this.meshCreator.globalObjectCount );
		this.parser.finalize();
		this.meshCreator.finalize();
		this.validated = false;
	};

	WWOBJLoader.prototype.init = function ( payload ) {
		this.cmdState = 'init';
		this.setDebug( payload.debug, payload.debug );
	};

	WWOBJLoader.prototype.setMaterials = function ( payload ) {
		this.cmdState = 'setMaterials';
		this.meshCreator.setMaterials( payload.materialNames );
	};

	WWOBJLoader.prototype.run = function ( payload ) {
		this.cmdState = 'run';

		this.parse( payload.objAsArrayBuffer );
		console.log( 'OBJ loading complete!' );

		this.cmdState = 'complete';
		self.postMessage( {
			cmd: this.cmdState,
			msg: null
		} );
	};

	return WWOBJLoader;
})();

THREE.WebWorker.WWMeshCreator = (function () {

	function WWMeshCreator() {
		this.materials = null;
		this.debug = false;
		this.globalObjectCount = 1;
		this.validated = false;
	}

	WWMeshCreator.prototype.setMaterials = function ( materials ) {
		this.materials = ( materials == null ) ? ( this.materials == null ? { materials: [] } : this.materials ) : materials;
	};

	WWMeshCreator.prototype.setDebug = function ( debug ) {
		this.debug = ( debug == null ) ? this.debug : debug;
	};

	WWMeshCreator.prototype.validate = function () {
		if ( this.validated ) return;

		this.setMaterials( null );
		this.setDebug( null );
		this.globalObjectCount = 1;
	};

	WWMeshCreator.prototype.finalize = function () {
		this.materials = null;
		this.validated = false;
	};

	/**
	 * It is ensured that rawObjectDescriptions only contain objects with vertices (no need to check)
	 * @param rawObjectDescriptions
	 * @param inputObjectCount
	 * @param absoluteVertexCount
	 * @param absoluteNormalCount
	 * @param absoluteUvCount
	 */
	WWMeshCreator.prototype.buildMesh = function ( rawObjectDescriptions, inputObjectCount, absoluteVertexCount, absoluteNormalCount, absoluteUvCount ) {
		if ( this.debug ) console.log( 'WWOBJLoader.buildRawMeshData:\nInput object no.: ' + inputObjectCount );

		var vertexFa = new Float32Array( absoluteVertexCount );
		var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
		var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

		var rawObjectDescription;
		var materialDescription;
		var materialDescriptions = [];

		var createMultiMaterial = ( rawObjectDescriptions.length > 1 ) ? true : false;
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

		for ( var oodIndex in rawObjectDescriptions ) {
			rawObjectDescription = rawObjectDescriptions[ oodIndex ];

			materialDescription = { name: rawObjectDescription.materialName, flat: false, default: false };
			if ( this.materials[ materialDescription.name ] === null ) {

				materialDescription.default = true;
				console.warn( 'object_group "' + rawObjectDescription.objectName + '_' + rawObjectDescription.groupName + '" was defined without material! Assigning "defaultMaterial".' );

			}
			// Attach '_flat' to materialName in case flat shading is needed due to smoothingGroup 0
			if ( rawObjectDescription.smoothingGroup === 0 ) materialDescription.flat = true;

			vertexLength = rawObjectDescription.vertices.length;
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

			vertexFa.set( rawObjectDescription.vertices, vertexBAOffset );
			vertexBAOffset += vertexLength;

			if ( normalFA ) {

				normalFA.set( rawObjectDescription.normals, normalOffset );
				normalOffset += rawObjectDescription.normals.length;

			}
			if ( uvFA ) {

				uvFA.set( rawObjectDescription.uvs, uvOffset );
				uvOffset += rawObjectDescription.uvs.length;

			}
			if ( this.debug ) this.printReport( rawObjectDescription, selectedMaterialIndex );

		}

		self.postMessage( {
			cmd: 'objData',
			meshName: rawObjectDescription.objectName,
			multiMaterial: createMultiMaterial,
			materialDescriptions: materialDescriptions,
			materialGroups: materialGroups,
			vertices: vertexFa,
			normals: normalFA,
			uvs: uvFA
		}, [ vertexFa.buffer ], normalFA !== null ? [ normalFA.buffer ] : null, uvFA !== null ? [ uvFA.buffer ] : null );

		this.globalObjectCount++;
	};

	return WWMeshCreator;
})();


var implRef = new THREE.WebWorker.WWOBJLoader( this );

var runner = function ( event ) {
	var payload = event.data;

	console.log( 'Command state before: ' + implRef.cmdState );

	switch ( payload.cmd ) {
		case 'init':

			implRef.init( payload );
			break;

		case 'setMaterials':

			implRef.setMaterials( payload );
			break;

		case 'run':

			implRef.run( payload );
			break;

		default:

			console.error( 'WWOBJLoader: Received unknown command: ' + payload.cmd );
			break;

	}

	console.log( 'Command state after: ' + implRef.cmdState );
};

self.addEventListener( 'message', runner, false );
