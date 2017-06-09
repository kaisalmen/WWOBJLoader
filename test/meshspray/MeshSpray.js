/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var MeshSpray = (function () {

	var Validator = THREE.OBJLoader2.Validator;

	function MeshSpray() {
		this.wwMeshProvider = new THREE.OBJLoader2.WWMeshProvider();
		this.materials = [];
	}

	MeshSpray.prototype.prepareRun = function ( functionCodeBuilder, sceneGraphBaseNode, streamMeshes) {
		this.wwMeshProvider._validate( functionCodeBuilder );
		console.time( 'MeshSpray' );

		var scope = this;
		var scopeFuncComplete = function ( reason ) {
			scope._finalize( reason );
		};
		var scopeFuncAnnounce = function ( baseText, text ) {
			console.log( baseText, text );
		};
		this.wwMeshProvider.setCallbacks( scopeFuncAnnounce, undefined, scopeFuncComplete );
		this.wwMeshProvider.prepareRun( sceneGraphBaseNode, streamMeshes );
		this.wwMeshProvider.postMessage( {
			cmd: 'init',
			debug: this.debug,
			materialPerSmoothingGroup: false
		} );
	};

	MeshSpray.prototype.run = function () {
		var materialNames = [];
		for ( var materialName in this.materials ) {
			materialNames.push( materialName );
		}
		this.wwMeshProvider.addMaterials( this.materials );
		this.wwMeshProvider.postMessage(
			{
				cmd: 'setMaterials',
				materialNames: materialNames
			}
		);

		this.wwMeshProvider.postMessage(
			{
				cmd: 'run',
				quantity: 10
			}
		);
	};

	MeshSpray.prototype._finalize = function () {
		this.wwMeshProvider._terminate();
		console.timeEnd( 'MeshSpray' );
	};

	MeshSpray.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		var workerCode = existingWorkerCode;
		if ( Validator.isValid( workerCode ) ) return workerCode;

		console.time( 'buildWebWorkerCode' );
		var wwMeshSprayDef = (function () {

			function WWMeshSpray() {
				this.cmdState = 'created';
				this.debug = false;
				this.materialPerSmoothingGroup = false;
				this.materials = null;
				this.globalObjectCount = 0;
			}

			WWMeshSpray.prototype._finalize = function () {
				console.log( 'Global output object count: ' + this.globalObjectCount );
			};

			WWMeshSpray.prototype.init = function ( payload ) {
				this.cmdState = 'init';
				this.debug = payload.debug;
				this.materialPerSmoothingGroup = payload.materialPerSmoothingGroup;
			};

			WWMeshSpray.prototype.setMaterials = function ( payload ) {
				this.cmdState = 'setMaterials';
				this.materials = Validator.verifyInput( payload.materialNames, this.materials );
				this.materials = Validator.verifyInput( this.materials, { materials: [] } );
			};

			WWMeshSpray.prototype.run = function ( payload ) {
				this.cmdState = 'run';

				for ( var i = 0; i < payload.quantity; i++ ) {
					this.buildMesh();
				}

				this.cmdState = 'complete';
				self.postMessage( {
					cmd: this.cmdState,
					msg: null
				} );
			};

			WWMeshSpray.prototype.buildMesh = function () {
				if ( this.debug ) console.log( 'OBJLoader.buildMesh:\nInput object no.: ' + inputObjectCount );

				var absoluteVertexCount = 9;
				var absoluteColorCount = 0;
				var absoluteNormalCount = 0;
				var absoluteUvCount = 0;

				var vertexFA = new Float32Array( absoluteVertexCount );
				var colorFA = ( absoluteColorCount > 0 ) ? new Float32Array( absoluteColorCount ) : null;
				var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
				var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

				var materialDescription;
				var materialDescriptions = [];
				var materialGroups = [];

				materialDescription = {
					name: 'Gen' + this.globalObjectCount,
					flat: false,
					vertexColors: false,
					default: false
				};
				if ( this.materials[ materialDescription.name ] === null ) {

					materialDescription.default = true;
					console.warn( 'object_group "' + materialDescription.name + '" was defined without material! Assigning "defaultMaterial".' );

				}
				materialDescriptions.push( materialDescription );

				var vertices = [ 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 0.0, -1.0, 1.0 ];
				vertexFA.set( vertices, 0 );

				if ( colorFA ) {

					colorFA.set( rawObjectDescription.colors, 0 );
					materialDescription.vertexColors = true;

				}

				if ( normalFA ) {

					normalFA.set( rawObjectDescription.normals, 0 );

				}
				if ( uvFA ) {

					uvFA.set( rawObjectDescription.uvs, 0 );

				}

				self.postMessage(
					{
						cmd: 'objData',
						meshName: 'Gen' + this.globalObjectCount,
						multiMaterial: false,
						materialDescriptions: materialDescriptions,
						materialGroups: materialGroups,
						vertices: vertexFA,
						colors: colorFA,
						normals: normalFA,
						uvs: uvFA
					},
					[ vertexFA.buffer ],
					colorFA !== null ? [ colorFA.buffer ] : null,
					normalFA !== null ? [ normalFA.buffer ] : null,
					uvFA !== null ? [ uvFA.buffer ] : null
				);

				this.globalObjectCount++;
			};

			return WWMeshSpray;
		})();

		var wwMeshSprayRunnerDef = (function () {

			function WWMeshSprayRunner() {
				self.addEventListener( 'message', this.runner, false );
			}

			WWMeshSprayRunner.prototype.runner = function ( event ) {
				var payload = event.data;

				console.log( 'Command state before: ' + WWMeshSprayRef.cmdState );

				switch ( payload.cmd ) {
					case 'init':

						WWMeshSprayRef.init( payload );
						break;

					case 'setMaterials':

						WWMeshSprayRef.setMaterials( payload );
						break;

					case 'run':

						WWMeshSprayRef.run( payload );
						break;

					default:

						console.error( 'OBJLoader: Received unknown command: ' + payload.cmd );
						break;

				}

				console.log( 'Command state after: ' + WWMeshSprayRef.cmdState );
			};

			return WWMeshSprayRunner;
		})();

		workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by MeshSpray._buildWebWorkerCode\n';
		workerCode += '  */\n\n';

		// web worker construction
		workerCode += funcBuildObject( 'Validator', Validator );
		workerCode += funcBuildSingelton( 'WWMeshSpray', 'WWMeshSpray', wwMeshSprayDef );
		workerCode += 'WWMeshSprayRef = new WWMeshSpray();\n\n';
		workerCode += funcBuildSingelton( 'WWMeshSprayRunner', 'WWMeshSprayRunner', wwMeshSprayRunnerDef );
		workerCode += 'new WWMeshSprayRunner();\n\n';

		console.timeEnd( 'buildWebWorkerCode' );

		return workerCode;
	};

	return MeshSpray;

})();
