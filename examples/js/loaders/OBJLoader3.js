/**
 * @author mrdoob / http://mrdoob.com/
 */

'use strict';

THREE.OBJLoader = (function () {

	function OBJLoader( manager ) {
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.path = null;
		this.loadAsArrayBuffer = true;

		this.materials = null;

		this.reInit( true, '', null );
	}

	OBJLoader.prototype.setPath = function ( value ) {
		this.path = value;
	};

	OBJLoader.prototype.setMaterials = function ( materials ) {
		this.materials = materials;
	};

	/**
	 * When this is set the ResponseType of the XHRLoader is set to arraybuffer
	 * and parseArrayBuffer is used.
	 * @param loadAsArrayBuffer
	 */
	OBJLoader.prototype.setLoadAsArrayBuffer = function ( loadAsArrayBuffer ) {
		this.loadAsArrayBuffer = loadAsArrayBuffer;
	};

	OBJLoader.prototype.reInit = function ( loadAsArrayBuffer, path, materials ) {
		this.setPath( path );
		this.loadAsArrayBuffer = loadAsArrayBuffer;

		this.materials = materials;
	};

	// Define trim function to use once
	// Faster to just trim left side of the line. Use if available.
	var trimLeft = function ( line ) { return line.trimLeft(); };
	var trimNormal = function ( line ) { return line.trim(); };
	var trimFunction = typeof ''.trimLeft === 'function' ?  trimLeft : trimNormal;


	OBJLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {
		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setPath( this.path );
		loader.setResponseType( this.loadAsArrayBuffer ? 'arraybuffer' : 'text' );
		loader.load( url, function ( loadedContent ) {

			onLoad( scope.parse( loadedContent ) );

		}, onProgress, onError );
	};

	OBJLoader.prototype.parse = function ( loadedContent ) {

		var inputObjectStore = new InputObjectStore();
		var objectStoreResults = [];

		var debug = true;
		var scope = this;
		var callbackRequestReport = function () {
			if ( debug && inputObjectStore.inputObjectCount <= 3 ) {

				objectStoreResults[ objectStoreResults.length ] = scope.createReport( inputObjectStore.outputObjectBuilder );
				inputObjectStore.setDebug( ! debug );

			}
		};
		inputObjectStore.setCallbackRequestReport( callbackRequestReport );
//		inputObjectStore.setDebug( debug );
		inputObjectStore.outputObjectBuilder.debug = debug;

		if ( this.loadAsArrayBuffer ) {

			inputObjectStore.parseArrayBuffer( loadedContent );

		} else {

			inputObjectStore.parseString( loadedContent );

		}

		if ( debug ) {

			for ( var i = 0, length = objectStoreResults.length; i < length; i ++ ) {
				this.printSingleReport( i, objectStoreResults[ i ] );
			}

		}

		return inputObjectStore.container;
	};

	OBJLoader.prototype.createReport = function ( oobRef ) {
		return {
			name: oobRef.objectName ? oobRef.objectName : 'groups',
			mtllibName: oobRef.mtllibName,
			vertexCount: oobRef.vertices.length / 3,
			normalCount: oobRef.normals.length / 3,
			uvCount: oobRef.uvs.length / 2,
//				overallFaceTypesCount: overallFaceTypesCount,
//				overallFacesAttr: overallFacesAttr,
			objectGroupCount: oobRef.objectGroupCount,
			smoothingGroupCount: oobRef.smoothingGroupCount,
			mtlCount: oobRef.mtlCount,
			commentCount: oobRef.comments ? oobRef.comments.length : 0
		};
	};

	OBJLoader.prototype.printSingleReport = function ( index, singleResultSet ) {
		console.log( 'Object number: ' + index + ' Object name: ' + singleResultSet.name );
		console.log( 'Mtllib name: ' + singleResultSet.mtllibName );
		console.log( 'Vertex count: ' + singleResultSet.vertexCount );
		console.log( 'Normal count: ' + singleResultSet.normalCount );
		console.log( 'UV count: ' + singleResultSet.uvCount );
//				console.log( 'Faces Type counts: ' + singleResultSet.overallFaceTypesCount );
//				console.log( 'Faces attr count per type: ' + singleResultSet.overallFacesAttr );
		console.log( 'Group count: ' + singleResultSet.objectGroupCount );
		console.log( 'SmoothingGroup count: ' + singleResultSet.smoothingGroupCount );
		console.log( 'Material count: ' + singleResultSet.mtlCount );
		console.log( 'Comments count: ' + singleResultSet.commentCount );
		console.log( '' );
	};

	var InputObjectStore = (function () {

		function InputObjectStore() {
			this.outputObjectBuilder = new OutputObjectBuilder();

			// globals (per InputObjectStore)
			this.comments = new LineParserBase( '#', this.outputObjectBuilder, 'pushComment' );

			this.mtllib = new LineParserString( 'mtllib', this.outputObjectBuilder, 'pushMtllib' );
			this.vertices = new LineParserVertex( 'v', 3, this.outputObjectBuilder, 'pushVertex' );
			this.normals = new LineParserVertex( 'vn', 3, this.outputObjectBuilder, 'pushNormal' );
			this.uvs = new LineParserUv( this.outputObjectBuilder, 'pushUv' );
			this.objects = new LineParserString( 'o', this.outputObjectBuilder, 'pushObject' );
			this.groups = new LineParserString( 'g', this.outputObjectBuilder, 'pushGroup' );
			this.usemtls = new LineParserString( 'usemtl', this.outputObjectBuilder, 'pushMtl' );
			this.faces = new LineParserFace( this.outputObjectBuilder );
			this.smoothingGroups = new LineParserString( 's', this.outputObjectBuilder, 'pushSmoothingGroup' );
/*
			this.mtllib = new LineParserBase( 'mtllib', this.outputObjectBuilder );
			this.vertices = new LineParserBase( 'v', this.outputObjectBuilder );
			this.normals = new LineParserBase( 'vn', this.outputObjectBuilder );
			this.uvs = new LineParserBase( this.outputObjectBuilder );
			this.objects = new LineParserBase( 'o', this.outputObjectBuilder );
			this.groups = new LineParserBase( 'g', this.outputObjectBuilder );
			this.usemtls = new LineParserBase( 'usemtl', this.outputObjectBuilder );
			this.faces = new LineParserBase( this.outputObjectBuilder );
			this.smoothingGroups = new LineParserBase( 's', this.outputObjectBuilder );
 */
			this.parser = null;
			this.callbackRequestReport = null;

			this.reachedFaces = false;
			this.lineCount = 0;
			this.inputObjectCount = 0;

			this.container = new THREE.Group();
		}

		InputObjectStore.prototype.setCallbackRequestReport = function ( callbackRequestReport ) {
			this.callbackRequestReport = callbackRequestReport;
		};

		InputObjectStore.prototype.reset = function () {
			this.outputObjectBuilder = new OutputObjectBuilder();

			this.comments.oobRef = this.outputObjectBuilder;
			this.mtllib.oobRef = this.outputObjectBuilder;
			this.vertices.oobRef = this.outputObjectBuilder;
			this.normals.oobRef = this.outputObjectBuilder;
			this.uvs.oobRef = this.outputObjectBuilder;
			this.objects.oobRef = this.outputObjectBuilder;
			this.groups.oobRef = this.outputObjectBuilder;
			this.usemtls.oobRef = this.outputObjectBuilder;
			this.faces.oobRef = this.outputObjectBuilder;
			this.smoothingGroups.oobRef = this.outputObjectBuilder;

			this.reachedFaces = false;
		};

		InputObjectStore.prototype.setDebug = function ( debug ) {
			this.comments.debug = debug;
			this.mtllib.debug = debug;
			this.vertices.debug = debug;
			this.normals.debug = debug;
			this.uvs.debug = debug;
			this.faces.debug = debug;
			this.groups.debug = debug;
			this.objects.debug = debug;
			this.smoothingGroups.debug = debug;
			this.usemtls.debug = debug;

			this.outputObjectBuilder.debug = debug;
		};

		InputObjectStore.prototype.parseArrayBuffer = function ( arrayBuffer ) {
			console.time( 'ParseBytes' );

			var view = new Uint8Array( arrayBuffer );
			for ( var i = 0, length = view.byteLength; i < length; i ++ ) {

				this.parseCode( view [ i ] );

			}

			console.timeEnd( 'ParseBytes' );
		};

		InputObjectStore.prototype.parseString = function ( input ) {
			console.time( 'ParseString' );

			for ( var i = 0, length = input.length; i < length; i++ ) {

				this.parseCode( input[ i ].charCodeAt( 0 ) );

			}

			console.timeEnd( 'ParseString' );
		};

		/**
		 * Whenever a line type is identified processCode will either delegate code to current store or
		 * detected line a line end and then quit. If not the code will be evaluated in switch block.
		 *
		 * @param code
		 */
		InputObjectStore.prototype.parseCode = function ( code ) {
			switch ( code ) {
				case 13: // CR
					// ignore CR
					break;

				case 10: // LF
					if ( this.parser === null ) return;

					// LF => signal store end of line and reset parser to null (re-evaluate starts for next line)
					this.parser.detectedLF();
					this.parser = null;
					this.lineCount ++;
					break;

				case 118: // v
					if ( this.parser !== null ) this.parser.parseCode( code );
					break;

				case 110: // n
					this.processIdentifierCharCode( code, this.normals );
					break;

				case 116: // t
					this.processIdentifierCharCode( code, this.uvs );
					break;

				case 102: // f
					if ( this.processIdentifierCharCode( code, this.faces ) ) this.reachedFaces = true;
					break;

				case 115: // s
					this.processIdentifierCharCode( code, this.smoothingGroups );
					break;

				case 103: // g
					this.processIdentifierCharCode( code, this.groups );
					break;

				case 111: // o
					// new instance required, because "o" found and previous vertices exist
					if ( this.processIdentifierCharCode( code, this.objects ) && this.vertices.buffer.length > 0 ) this.processCompletedObject();
					break;

				case 117: // u
					this.processIdentifierCharCode( code, this.usemtls );
					break;

				case 109: // m
					this.processIdentifierCharCode( code, this.mtllib );
					break;

				case 35: // #
					this.processIdentifierCharCode( code, this.comments );
					break;

				case 32: // SPACE
					// at start of line: not needed, but after 'v' will start new vertex parsing
					if ( this.parser === null ) {

						this.parser = this.vertices;


					} else if ( this.parser === this.vertices && this.reachedFaces ) {

						// object complete instance required if reached faces already (= reached next block of v)
						this.processCompletedObject();

					} else {

						 this.parser.parseCode( code );

					}
					break;


				default:
					this.parser.parseCode( code );
					break;
			}
		};

		InputObjectStore.prototype.processIdentifierCharCode = function ( code, activeParser ) {
			if ( this.parser === null ) {

				this.parser = activeParser;
				return true;

			} else {

				this.parser.parseCode( code );
				return false;
			}
		};

		InputObjectStore.prototype.processCompletedObject = function () {
			this.outputObjectBuilder.buildRawMeshData( this.inputObjectCount );
			this.inputObjectCount++;
			if ( this.callbackRequestReport !== null ) this.callbackRequestReport();
			this.reset();
		};

		return InputObjectStore;
	})();


	var LineParserBase = (function () {

		function LineParserBase( description, oobRef, oobRefFunction  ) {
			this.oobRef = oobRef;
			this.oobRefFunction = oobRefFunction;

			// variables re-init (newLine) per input line (called by InputObjectStore)
			this.input = '';
			this.description = description ? description : 'noname: ';

			this.debug = false;
		}

		/**
		 * Per default all input is taken.
		 * Extensions behave differently by overriding this method.
		 */
		LineParserBase.prototype.parseCode = function ( code ) {
			this.input += String.fromCharCode( code );
		};

		/**
		 * Per default only the input is passed to the ObjectOutputBuilder.
		 * Extensions behave differently by overriding this method.
		 */
		LineParserBase.prototype.detectedLF = function () {
			if ( this.oobRefFunction) this.oobRef[ this.oobRefFunction ]( this.input );

			if ( this.debug ) console.log( this.description + ': ' + this.input );

			this.input = '';
		};

		return LineParserBase;
	})();


	var LineParserString = (function () {

		LineParserString.prototype = Object.create( LineParserBase.prototype );
		LineParserString.prototype.constructor = LineParserString;

		function LineParserString( description, oobRef, oobRefFunction ) {
			LineParserBase.call( this, description, oobRef, oobRefFunction );
			this.foundFirstSpace = false;
		}

		LineParserString.prototype.parseCode = function ( code ) {
			if ( this.foundFirstSpace ) {

				this.input += String.fromCharCode( code );

			} else if ( code === 32 ) {

				this.foundFirstSpace = true;
			}
		};

		LineParserString.prototype.detectedLF = function () {
			this.oobRef[this.oobRefFunction]( this.input );

			if ( this.debug ) console.log( this.description + ': ' + this.input );

			this.input = '';
			this.foundFirstSpace = false;
		};

		return LineParserString;
	})();


	var LineParserVertex = (function () {

		LineParserVertex.prototype = Object.create( LineParserBase.prototype );
		LineParserVertex.prototype.constructor = LineParserVertex;

		function LineParserVertex( type, bufferLength, oobRef, oobRefFunction ) {
			LineParserBase.call( this, type, oobRef, oobRefFunction );
			this.minInputLength = 0;
			this.buffer = new Array( bufferLength );
			this.bufferIndex = 0;
		}

		LineParserVertex.prototype.parseCode = function ( code ) {
			// "v   1.0 2.0 3.0" or
			// "vn  1.0 2.0 3.0" or

			if ( code === 32) {

				this.pushToBuffer();

			} else {

				this.input += String.fromCharCode( code );

			}
		};

		LineParserVertex.prototype.pushToBuffer = function () {
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = parseFloat( this.input );
				this.bufferIndex++;
				this.input = '';

			}
		};

		LineParserVertex.prototype.detectedLF = function () {
			this.pushToBuffer();

			if ( this.oobRefFunction ) this.oobRef[ this.oobRefFunction ]( this.buffer );
			if ( this.debug ) console.log( this.description + ': ' + this.buffer );

			this.bufferIndex = 0;
		};

		return LineParserVertex;
	})();


	var LineParserUv = (function () {

		LineParserUv.prototype = Object.create( LineParserVertex.prototype );
		LineParserUv.prototype.constructor = LineParserUv;

		function LineParserUv( oobRef, oobRefFunction ) {
			LineParserVertex.call( this, 'vt', 2, oobRef, oobRefFunction );

			// variables re-init per input line
			this.retrievedFloatCount = 0;
		}

		LineParserUv.prototype.parseCode = function ( code ) {
			// "vt  1.0 2.0 0.0" -> do not use "w"

			// w is optional for 2D textures; only required for 3D textures (not implemented)
			if ( this.retrievedFloatCount == 2 ) return;

			LineParserVertex.prototype.parseCode.call( this, code );
		};

		LineParserUv.prototype.pushToBuffer = function () {
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = parseFloat( this.input );
				this.bufferIndex++;
				this.retrievedFloatCount++;
				this.input = '';

			}
		};

		LineParserUv.prototype.detectedLF = function () {
			LineParserVertex.prototype.detectedLF.call( this );
			this.retrievedFloatCount = 0;
		};

		return LineParserUv;
	})();


	var LineParserFace = (function () {

		var DEFAULT_SHORTEST_SLASH_DISTANCE = 100;
		var TYPE_ARRAY_LENGTH_LOOKUP = [ 9, 6, 6, 3 ];

		LineParserFace.prototype = Object.create( LineParserVertex.prototype );
		LineParserFace.prototype.constructor = LineParserFace;

		function LineParserFace( oobRef ) {
			// Important: According to spec there are more than 3 value groups allowed per face desc.
			// This is currently ignored
			LineParserVertex.call( this, 'f', 9, oobRef );

			// possible types
			// 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal"
			// 1: "f vertex/uv			vertex/uv			vertex/uv"
			// 2: "f vertex//normal		vertex//normal		vertex//normal"
			// 3: "f vertex				vertex				vertex"

			// variables re-init per input line (called by InputObjectStore)
			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
		}

		LineParserFace.prototype.parseCode = function ( code ) {

			if ( code === 32 ) {

				this.pushToBuffer();

			} else if ( code === 47 ) {

				if ( this.slashCount < 2 ) {

					var distance = this.lineIndex - this.slashLast;
					if ( distance < this.shortestDistance ) {
						this.shortestDistance = distance;
					}
					this.slashLast = this.lineIndex;
					this.slashCount++;

				}
				this.pushToBuffer();

			} else {

				this.input += String.fromCharCode( code );

			}
			this.lineIndex++;
		};

		LineParserFace.prototype.pushToBuffer = function () {
			if ( this.input.length > this.minInputLength ) {

				this.buffer[ this.bufferIndex ] = parseInt( this.input, 10 );
				this.bufferIndex++;
				this.input = '';

			}
		};

		LineParserFace.prototype.detectedLF = function () {
			this.pushToBuffer();

			var type = this.slashCount === 2 ? ( this.shortestDistance === 1 ? 2 : 0 ) : ( this.slashCount === 1 ? 1 : 3 );
			this.oobRef.pushFace( type, this.bufferIndex, this.buffer );

			if ( this.debug ) console.log( 'Faces type: ' + type + ': ' + this.buffer );

			this.bufferIndex = 0;

			this.lineIndex = 0;
			this.slashCount = 0;
			this.shortestDistance = DEFAULT_SHORTEST_SLASH_DISTANCE;
			this.slashLast = 0;
		};

		LineParserFace.prototype.getTypeArrayLengthLookup = function () {
			return TYPE_ARRAY_LENGTH_LOOKUP;
		};

		return LineParserFace;
	})();


	var OutputObjectBuilder = (function () {

		function OutputObjectBuilder() {
			this.objectName;

			this.vertices = [];
			this.verticesIndex = 0;
			this.normals = [];
			this.normalsIndex = 0;
			this.uvs = [];
			this.uvsIndex = 0;
			this.comments = [];

			this.mtllibName = '';

			// faces are stored according groups and then according smoothing groups
			this.activeGroup = 'none';
			this.objectGroupCount = 0;

			this.activeMtlName = 'none';
			this.mtlCount = 0;

			this.activeSmoothingGroup = 0;
			this.smoothingGroupBufferInUse = [];
			this.smoothingGroupBufferInUseIndex = 0;
			this.smoothingGroupCount = 0;

			this.debug = false;

			this.groupMtlSmoothTriples = [];
		}

		var buildIndex = function ( groupName, mtlName, smoothingGroup ) {
			return groupName + "_" + mtlName + "_" + smoothingGroup;
		};
/*
		var GroupMtlSmoothTriple = (function () {

			function GroupMtlSmoothTriple( groupName, mtlName, smoothingGroup ) {
				this.groupName = groupName;
				this.mtlName = mtlName;
				this.smoothingGroup = smoothingGroup;
				this.faces = [];
			}

			return GroupMtlSmoothTriple;
		})();
*/
		OutputObjectBuilder.prototype.pushToBuffer = function ( source, target, targetIndex ) {
			for ( var i = 0, length = source.length; i < length; i++ ) {

				target[ targetIndex ] = source[ i ];
				targetIndex++;

			}
			return targetIndex;
		};

		OutputObjectBuilder.prototype.pushVertex = function ( vertexArray ) {
			this.verticesIndex = this.pushToBuffer( vertexArray, this.vertices, this.verticesIndex );
		};

		OutputObjectBuilder.prototype.pushNormal = function ( normalArray ) {
			this.normalsIndex = this.pushToBuffer( normalArray, this.normals, this.normalsIndex );
		};

		OutputObjectBuilder.prototype.pushUv = function ( uvArray ) {
			this.uvsIndex = this.pushToBuffer( uvArray, this.uvs, this.uvsIndex );
		};

		OutputObjectBuilder.prototype.pushComment = function ( comment ) {
			this.comments.push( comment );
		};

		OutputObjectBuilder.prototype.pushObject = function ( objectName ) {
			this.objectName = objectName;
		};

		OutputObjectBuilder.prototype.pushMtllib = function ( mtllibName ) {
			this.mtllibName = mtllibName;
		};

		OutputObjectBuilder.prototype.pushGroup = function ( groupName ) {
			if ( this.activeGroup === groupName ) return;
			this.activeGroup = groupName;
			this.objectGroupCount++;

			this.verifyIndex();
		};

		OutputObjectBuilder.prototype.pushMtl = function ( mtlName ) {
			if ( this.activeMtlName === mtlName ) return;
			this.activeMtlName = mtlName;
			this.mtlCount++;

			this.verifyIndex();
		};

		OutputObjectBuilder.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
			var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
			if ( this.activeSmoothingGroup === normalized ) return;
			this.activeSmoothingGroup = normalized;
			this.smoothingGroupCount++;

			this.verifyIndex();
		};

		OutputObjectBuilder.prototype.verifyIndex = function () {
			var index = buildIndex( this.activeGroup, this.activeMtlName, this.activeSmoothingGroup );

			if ( this.groupMtlSmoothTriples[ index ] === undefined ) {

				this.smoothingGroupBufferInUse = this.groupMtlSmoothTriples[ index ] = [];

			} else {

				this.smoothingGroupBufferInUse = this.groupMtlSmoothTriples[ index ];

			}
		};

		OutputObjectBuilder.prototype.pushFace = function ( type, count, lineBuffer ) {
			this.smoothingGroupBufferInUse[ this.smoothingGroupBufferInUseIndex ] = type;
			this.smoothingGroupBufferInUseIndex++;

			for ( var i = 0; i < count; i++ ) {
				this.smoothingGroupBufferInUse[ this.smoothingGroupBufferInUseIndex ] = lineBuffer[ i ];
				this.smoothingGroupBufferInUseIndex++;
			}
		};

		OutputObjectBuilder.prototype.buildRawMeshData = function ( index ) {
			if ( this.debug ) {

				console.log( 'buildRawMeshData: ' + index + ' name: ' + this.objectName );
				for ( var index in this.groupMtlSmoothTriples ) {
					console.log( index + ' # face infos stored: ' + this.groupMtlSmoothTriples[ index ].length );
				}

			}
		};

		return OutputObjectBuilder;
	})();

	return OBJLoader;
})();
