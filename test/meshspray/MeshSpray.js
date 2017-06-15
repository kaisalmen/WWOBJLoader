/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var MeshSpray = (function () {

	var Validator = THREE.OBJLoader2.Validator;

	MeshSpray.prototype = Object.create( THREE.OBJLoader2.Commons.prototype );
	MeshSpray.prototype.constructor = MeshSpray;

	function MeshSpray() {
		this._init();
	}

	MeshSpray.prototype._init = function () {
		THREE.OBJLoader2.Commons.call( this );
		this.wwMeshProvider = new THREE.OBJLoader2.WWMeshProvider();
		this.materials = [];
		this.crossOrigin = null;
		this.requestTerminate = false;
		this.instanceNo = 0;

	};

	MeshSpray.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	MeshSpray.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	MeshSpray.prototype._validate = function () {
		this.wwMeshProvider._validate( this._buildWebWorkerCode, 'WWMeshSpray' );
		this.requestTerminate = false;
	};

	MeshSpray.prototype.prepareRun = function ( runParams ) {
		console.time( 'MeshSpray' );
		this._validate();

		var scope = this;
		var scopeFuncComplete = function ( reason ) {
			scope._finalize( reason );
		};
		var scopeFuncAnnounce = function ( baseText, text ) {
			scope._announceProgress( baseText, text );
		};
		this.wwMeshProvider.setCallbacks( scopeFuncAnnounce, undefined, scopeFuncComplete );
		this.wwMeshProvider.prepareRun( runParams.sceneGraphBaseNode, runParams.streamMeshes );
		this.wwMeshProvider.postMessage( {
			cmd: 'init',
			debug: this.debug,
			materialPerSmoothingGroup: false,
			quantity: Validator.verifyInput( runParams.quantity, 1 )
		} );
	};

	MeshSpray.prototype.run = function () {
		var materialNames = [];
		var vertexColorMaterial = new THREE.MeshBasicMaterial( {
			color: 0xDCF1FF,
			side: THREE.DoubleSide,
			vertexColors: THREE.VertexColors,
			name: 'vertexColorMaterial'
		} );
		this.materials[ vertexColorMaterial.name ] = vertexColorMaterial;

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
				dimension: 200
			}
		);
	};

	MeshSpray.prototype._finalize = function ( reason ) {
		var index;
		var callback;

		if ( reason === 'complete' ) {

			for ( index in this.callbacks.completedLoading ) {

				callback = this.callbacks.completedLoading[ index ];
				callback( this.instanceNo );

			}

		} else if ( reason === 'error' ) {

			for ( index in this.callbacks.errorWhileLoading ) {

				callback = this.callbacks.errorWhileLoading[ index ];
				callback( this.instanceNo );

			}

		}
		if ( reason === 'terminate' ) {

			if ( this.wwMeshProvider.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			console.log( 'Finalize is complete. Terminating application on request!' );

			this.wwMeshProvider._terminate();
		}
		console.timeEnd( 'MeshSpray' );
	};

	MeshSpray.prototype._buildWebWorkerCode = function ( funcBuildObject, funcBuildSingelton, existingWorkerCode ) {
		var workerCode = existingWorkerCode;
		if ( Validator.isValid( workerCode ) ) return workerCode;

		var wwMeshSprayDef = (function () {

			function WWMeshSpray() {
				this.cmdState = 'created';
				this.debug = false;
				this.materialPerSmoothingGroup = false;
				this.materials = null;
				this.globalObjectCount = 0;
				this.quantity = 1;

				this.sizeFactor = 0.5;
				this.localOffsetFactor = 1.0;
			}

			WWMeshSpray.prototype._finalize = function () {
				console.log( 'Global output object count: ' + this.globalObjectCount );
			};

			WWMeshSpray.prototype.init = function ( payload ) {
				this.cmdState = 'init';
				this.debug = payload.debug;
				this.materialPerSmoothingGroup = payload.materialPerSmoothingGroup;
				this.quantity = payload.quantity
			};

			WWMeshSpray.prototype.setMaterials = function ( payload ) {
				this.cmdState = 'setMaterials';
				this.materials = Validator.verifyInput( payload.materialNames, this.materials );
				this.materials = Validator.verifyInput( this.materials, { materials: [] } );
			};

			WWMeshSpray.prototype.run = function ( payload ) {
				this.cmdState = 'run';

				this.buildMesh( payload.dimension );

				this.cmdState = 'complete';
				self.postMessage( {
					cmd: this.cmdState,
					msg: null
				} );
			};

			WWMeshSpray.prototype.buildMesh = function ( dimension ) {
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

				var baseTriangle = [ 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 0.0, -1.0, 1.0 ];
				var vertices = [];
				var colors = [];
				var normals = [];
				var uvs = [];

				var dimensionHalf = dimension / 2;
				var fixedOffsetX;
				var fixedOffsetY;
				var fixedOffsetZ;
				// complete triagle
				var sizeVaring = this.sizeFactor * Math.random();
				// local coords offset
				var localOffsetFactor = this.localOffsetFactor;

				for ( var i = 0; i < this.quantity; i++ ) {
					sizeVaring = this.sizeFactor * Math.random();
					fixedOffsetX = dimension * Math.random() - dimensionHalf;
					fixedOffsetY = dimension * Math.random() - dimensionHalf;
					fixedOffsetZ = dimension * Math.random() - dimensionHalf;
					for ( var j = 0; j < baseTriangle.length; j += 3 ) {
						vertices.push( baseTriangle[ j ] * sizeVaring + localOffsetFactor * Math.random() + fixedOffsetX );
						vertices.push( baseTriangle[ j + 1 ] * sizeVaring + localOffsetFactor * Math.random() + fixedOffsetY );
						vertices.push( baseTriangle[ j + 2 ] * sizeVaring + localOffsetFactor * Math.random() + fixedOffsetZ );
						colors.push( Math.random() );
						colors.push( Math.random() );
						colors.push( Math.random() );
					}
				}

				var absoluteVertexCount = vertices.length;
				var absoluteColorCount = colors.length;
				var absoluteNormalCount = 0;
				var absoluteUvCount = 0;

				var vertexFA = new Float32Array( absoluteVertexCount );
				var colorFA = ( absoluteColorCount > 0 ) ? new Float32Array( absoluteColorCount ) : null;
				var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
				var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

				vertexFA.set( vertices, 0 );
				colorFA.set( colors, 0 );

				if ( colorFA ) {

					colorFA.set( colors, 0 );
					materialDescription.vertexColors = true;

				}

				if ( normalFA ) {

					normalFA.set( normals, 0 );

				}
				if ( uvFA ) {

					uvFA.set( uvs, 0 );

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

		workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by MeshSpray._buildWebWorkerCode\n';
		workerCode += '  */\n\n';

		// web worker construction
		workerCode += funcBuildObject( 'Validator', Validator );
		workerCode += funcBuildSingelton( 'WWMeshSpray', 'WWMeshSpray', wwMeshSprayDef );

		return workerCode;
	};

	return MeshSpray;

})();
