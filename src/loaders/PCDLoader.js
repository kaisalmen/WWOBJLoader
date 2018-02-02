/**
 * @author Filipe Caixeta / http://filipecaixeta.com.br
 * @author Mugen87 / https://github.com/Mugen87
 * @author Kai Salmen / https://kaisalmen.de / https://github.com/kaisalmen.de
 *
 * Description: A THREE loader for PCD ascii and binary files.
 *
 * Limitations: Compressed binary files are not supported.
 *
 */

THREE.PCDLoader = function ( manager, logger ) {
	THREE.LoaderSupport.LoaderBase.call( this, manager, logger );

	this.fileLoader = new THREE.FileLoader( this.manager );
	this.fileLoader.setResponseType( 'arraybuffer' );
	this.workerSupport = null;

	var materials = this.builder.getMaterials();
	var defaultPointMaterial = materials[ 'defaultPointMaterial' ];
	defaultPointMaterial.color.setHex( Math.random() * 0xffffff );
};

THREE.PCDLoader.prototype = Object.create( THREE.LoaderSupport.LoaderBase.prototype );
THREE.PCDLoader.prototype.constructor = THREE.PCDLoader;

THREE.PCDLoader.prototype.load = function ( url, onLoad, onProgress, onError, useAsync ) {
	var scope = this;

	this.fileLoader.setPath( this.path );
	this.fileLoader.load( url, function ( data ) {

		if ( useAsync ) {

			scope.parseAsync( data, onLoad );

		} else {

			onLoad(
				{
					detail: {
						loaderRootNode: scope.parse( data ),
						modelName: scope.modelName,
						instanceNo: scope.instanceNo
					}
				}
			);

		}

	}, onProgress, onError );

};

THREE.PCDLoader.prototype.run = function ( prepData, workerSupportExternal ) {
	var Validator =THREE.LoaderSupport.Validator;
	THREE.LoaderSupport.LoaderBase.prototype._applyPrepData.call( this, prepData );
	if ( Validator.isValid( workerSupportExternal ) ) this.workerSupport = workerSupportExternal;

	var checkFiles = function ( resources ) {
		if ( resources.length < 1 ) return null;
		var resource = resources[ 0 ];
		if ( ! Validator.isValid( resource.name ) ) return null;

		var result;
		if ( Validator.isValid( resource.content ) ) {

			if ( resource.extension === 'PCD' ) {

				// fast-fail on bad type
				if ( ! ( resource.content instanceof Uint8Array ) ) throw 'Provided content is not of type arraybuffer! Aborting...';
				result = resource;

			} else {

				throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			}

		} else {

			// fast-fail on bad type
			if ( ! ( typeof( resource.name ) === 'string' || resource.name instanceof String ) ) throw 'Provided file is not properly defined! Aborting...';
			if ( resource.extension === 'PCD' ) {

				result = resource;

			} else {

				throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			}
		}
		return result;
	};

	var available = checkFiles( prepData.resources );
	if ( Validator.isValid( available.content ) ) {

		if ( prepData.useAsync ) {

			this.parseAsync( available.content, this.callbacks.onLoad );

		} else {

			this.parse( available.content );

		}

	} else {

		this.setPath( available.path );
		this.load( available.name, this.callbacks.onLoad, null, null, prepData.useAsync );

	}
};

THREE.PCDLoader.prototype.parse = function ( data ) {
	var scope = this;
	var parser = new THREE.PCDLoader.Parser();

	var loaderRootNode = null;
	var onMeshLoaded = function ( payload ) {
		var meshes = scope.builder.processPayload( payload );
		// no mesh alteration, therefore short-cut
		loaderRootNode = meshes[ 0 ];
	};
	parser.setCallbackBuilder( onMeshLoaded );

	// parse header (always ascii format)
	parser.parse( data );

	return loaderRootNode;
};

THREE.PCDLoader.prototype.parseAsync = function ( content, onLoad ) {
	var scope = this;

	var loaderRootNode = null;
	var scopedOnLoad = function () {
		onLoad(
			{
				detail: {
					loaderRootNode: loaderRootNode,
					modelName: scope.modelName,
					instanceNo: scope.instanceNo
				}
			}
		);
	};
	var scopedOnMeshLoaded = function ( payload ) {
		var meshes = scope.builder.processPayload( payload );
		// no mesh alteration, therefore short-cut
		loaderRootNode = meshes[ 0 ];
	};

	this.workerSupport = THREE.LoaderSupport.Validator.verifyInput( this.workerSupport, new THREE.LoaderSupport.WorkerSupport() );
	var buildCode = function ( funcBuildObject, funcBuildSingleton ) {
		var workerCode = '';
		workerCode += '/**\n';
		workerCode += '  * This code was constructed by PCDLoader buildCode.\n';
		workerCode += '  */\n\n';
		workerCode += 'THREE = {\n\tLoaderSupport: {},\n\tPCDLoader: {}\n};\n\n';
		workerCode += funcBuildObject( 'THREE.LoaderSupport.Validator', THREE.LoaderSupport.Validator );
		workerCode += funcBuildObject( 'THREE.LoaderUtils', THREE.LoaderUtils );
		workerCode += funcBuildSingleton( 'THREE.PCDLoader.Parser', THREE.PCDLoader.Parser, 'Parser' );

		return workerCode;
	};
	this.workerSupport.validate( buildCode, 'THREE.PCDLoader.Parser' );
	this.workerSupport.setCallbacks( scopedOnMeshLoaded, scopedOnLoad );
	if ( scope.terminateWorkerOnLoad ) this.workerSupport.setTerminateRequested( true );

	var materialNames = [];
	this.workerSupport.run(
		{
			params: {},
			logger: {},
			materials: {
				// in async case only material names are supplied to parser
				materials: materialNames
			},
			data: {
				input: content,
				options: null
			}
		}
	);
};


THREE.PCDLoader.Parser = function () {
	this.littleEndian = true;
	this.callbackBuilder = null;
};

THREE.PCDLoader.Parser.prototype = {

	constructor: THREE.PCDLoader.Parser,

	setCallbackBuilder: function ( callbackBuilder ) {
		this.callbackBuilder = callbackBuilder;
		if ( ! THREE.LoaderSupport.Validator.isValid( this.callbackBuilder ) ) throw 'Unable to run as no "builder" callback is set.';
	},

	parse: function ( data ) {
		var pcdHeader = this.parseHeader( data );
		this.parseData( pcdHeader, data );
	},

	parseHeader: function ( input ) {
		var data = THREE.LoaderUtils.decodeText( input );

		var result1 = data.search( /[\r\n]DATA\s(\S*)\s/i );
		var result2 = /[\r\n]DATA\s(\S*)\s/i.exec( data.substr( result1 - 1 ) );

		pcdHeader = {};
		pcdHeader.data = result2[ 1 ];
		pcdHeader.headerLen = result2[ 0 ].length + result1;
		pcdHeader.str = data.substr( 0, pcdHeader.headerLen );

		// remove comments

		pcdHeader.str = pcdHeader.str.replace( /\#.*/gi, '' );

		// parse

		pcdHeader.version = /VERSION (.*)/i.exec( pcdHeader.str );
		pcdHeader.fields = /FIELDS (.*)/i.exec( pcdHeader.str );
		pcdHeader.size = /SIZE (.*)/i.exec( pcdHeader.str );
		pcdHeader.type = /TYPE (.*)/i.exec( pcdHeader.str );
		pcdHeader.count = /COUNT (.*)/i.exec( pcdHeader.str );
		pcdHeader.width = /WIDTH (.*)/i.exec( pcdHeader.str );
		pcdHeader.height = /HEIGHT (.*)/i.exec( pcdHeader.str );
		pcdHeader.viewpoint = /VIEWPOINT (.*)/i.exec( pcdHeader.str );
		pcdHeader.points = /POINTS (.*)/i.exec( pcdHeader.str );

		// evaluate

		if ( pcdHeader.version !== null )
			pcdHeader.version = parseFloat( pcdHeader.version[ 1 ] );

		if ( pcdHeader.fields !== null )
			pcdHeader.fields = pcdHeader.fields[ 1 ].split( ' ' );

		if ( pcdHeader.type !== null )
			pcdHeader.type = pcdHeader.type[ 1 ].split( ' ' );

		if ( pcdHeader.width !== null )
			pcdHeader.width = parseInt( pcdHeader.width[ 1 ] );

		if ( pcdHeader.height !== null )
			pcdHeader.height = parseInt( pcdHeader.height[ 1 ] );

		if ( pcdHeader.viewpoint !== null )
			pcdHeader.viewpoint = pcdHeader.viewpoint[ 1 ];

		if ( pcdHeader.points !== null )
			pcdHeader.points = parseInt( pcdHeader.points[ 1 ], 10 );

		if ( pcdHeader.points === null )
			pcdHeader.points = pcdHeader.width * pcdHeader.height;

		if ( pcdHeader.size !== null ) {

			pcdHeader.size = pcdHeader.size[ 1 ].split( ' ' ).map( function ( x ) {

				return parseInt( x, 10 );

			} );

		}

		if ( pcdHeader.count !== null ) {

			pcdHeader.count = pcdHeader.count[ 1 ].split( ' ' ).map( function ( x ) {

				return parseInt( x, 10 );

			} );

		} else {

			pcdHeader.count = [];

			for ( var i = 0, l = pcdHeader.fields.length; i < l; i ++ ) {

				pcdHeader.count.push( 1 );

			}

		}

		pcdHeader.offset = {};

		var sizeSum = 0;

		for ( var i = 0, l = pcdHeader.fields.length; i < l; i ++ ) {

			if ( pcdHeader.data === 'ascii' ) {

				pcdHeader.offset[ pcdHeader.fields[ i ] ] = i;

			} else {

				pcdHeader.offset[ pcdHeader.fields[ i ] ] = sizeSum;
				sizeSum += pcdHeader.size[ i ];

			}

		}

		// for binary only
		pcdHeader.rowSize = sizeSum;

		return pcdHeader;
	},

	parseData: function ( pcdHeader, data ) {
		var position = [];
		var normal = [];
		var color = [];


		// ascii
		if ( pcdHeader.data === 'ascii' ) {

			var offset = pcdHeader.offset;
			var pcdData = textData.substr( pcdHeader.headerLen );
			var lines = pcdData.split( '\n' );

			for ( var i = 0, l = lines.length; i < l; i ++ ) {

				var line = lines[ i ].split( ' ' );

				if ( offset.x !== undefined ) {

					position.push( parseFloat( line[ offset.x ] ) );
					position.push( parseFloat( line[ offset.y ] ) );
					position.push( parseFloat( line[ offset.z ] ) );

				}

				if ( offset.rgb !== undefined ) {

					var c = new Float32Array( [ parseFloat( line[ offset.rgb ] ) ] );
					var dataview = new DataView( c.buffer, 0 );
					color.push( dataview.getUint8( 0 ) / 255.0 );
					color.push( dataview.getUint8( 1 ) / 255.0 );
					color.push( dataview.getUint8( 2 ) / 255.0 );

				}

				if ( offset.normal_x !== undefined ) {

					normal.push( parseFloat( line[ offset.normal_x ] ) );
					normal.push( parseFloat( line[ offset.normal_y ] ) );
					normal.push( parseFloat( line[ offset.normal_z ] ) );

				}

			}

		}


		// binary
		if ( pcdHeader.data === 'binary_compressed' ) {

			console.error( 'THREE.PCDLoader: binary_compressed files are not supported' );
			return;

		}

		if ( pcdHeader.data === 'binary' ) {

			var dataview = new DataView( data, pcdHeader.headerLen );
			var offset = pcdHeader.offset;

			for ( var i = 0, row = 0; i < pcdHeader.points; i ++, row += pcdHeader.rowSize ) {

				if ( offset.x !== undefined ) {

					position.push( dataview.getFloat32( row + offset.x, this.littleEndian ) );
					position.push( dataview.getFloat32( row + offset.y, this.littleEndian ) );
					position.push( dataview.getFloat32( row + offset.z, this.littleEndian ) );

				}

				if ( offset.rgb !== undefined ) {

					color.push( dataview.getUint8( row + offset.rgb + 0 ) / 255.0 );
					color.push( dataview.getUint8( row + offset.rgb + 1 ) / 255.0 );
					color.push( dataview.getUint8( row + offset.rgb + 2 ) / 255.0 );

				}

				if ( offset.normal_x !== undefined ) {

					normal.push( dataview.getFloat32( row + offset.normal_x, this.littleEndian ) );
					normal.push( dataview.getFloat32( row + offset.normal_y, this.littleEndian ) );
					normal.push( dataview.getFloat32( row + offset.normal_z, this.littleEndian ) );

				}

			}

		}

		var vertexFA = new Float32Array( position );
		var normalFA = new Float32Array( normal );
		var colorFA = new Float32Array( color );

		this.callbackBuilder(
			{
				cmd: 'meshData',
				progress: {
					numericalValue: 100
				},
				params: {},
				materials: {
					multiMaterial: false,
					materialNames: [ color.length > 0 ? 'defaultVertexColorMaterial' : 'defaultPointMaterial' ],
					materialGroups: null
				},
				buffers: {
					vertices: vertexFA,
					indices: null,
					colors: colorFA,
					normals: normalFA,
					uvs: null
				},
				computeBoundingSphere: true,
				// 0: mesh, 1: line, 2: point
				geometryType: 2
			},
			[ vertexFA.buffer ],
			null,
			THREE.LoaderSupport.Validator.isValid( colorFA ) ? [ colorFA.buffer ] : null,
			THREE.LoaderSupport.Validator.isValid( normalFA ) ? [ normalFA.buffer ] : null,
			null
		);
	}

};
