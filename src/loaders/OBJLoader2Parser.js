THREE.OBJLoader2.consts = {
	CODE_LF: 10,
	CODE_CR: 13,
	CODE_SPACE: 32,
	CODE_SLASH: 47,
	STRING_LF: '\n',
	STRING_CR: '\r',
	STRING_SPACE: ' ',
	STRING_SLASH: '/',
	LINE_F: 'f',
	LINE_G: 'g',
	LINE_L: 'l',
	LINE_O: 'o',
	LINE_S: 's',
	LINE_V: 'v',
	LINE_VT: 'vt',
	LINE_VN: 'vn',
	LINE_MTLLIB: 'mtllib',
	LINE_USEMTL: 'usemtl',
	/*
	 * Build Face/Quad: first element in indexArray is the line identification, therefore offset of one needs to be taken into account
	 * N-Gons are not supported
	 * Quad Faces: FaceA: 0, 1, 2  FaceB: 2, 3, 0
	 *
	 * 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal	(vertex/uv/normal)"
	 * 1: "f vertex/uv          vertex/uv           vertex/uv           (vertex/uv       )"
	 * 2: "f vertex//normal     vertex//normal      vertex//normal      (vertex//normal  )"
	 * 3: "f vertex             vertex              vertex              (vertex          )"
	 *
	 * @param indexArray
	 * @param faceType
	 */
	QUAD_INDICES_1: [ 1, 2, 3, 3, 4, 1 ],
	QUAD_INDICES_2: [ 1, 3, 5, 5, 7, 1 ],
	QUAD_INDICES_3: [ 1, 4, 7, 7, 10, 1 ],
	buildIndex: function ( materialName, smoothingGroup) {
		return materialName + '|' + smoothingGroup;
	}
};

THREE.OBJLoader2.Parser = (function () {

	function Parser( meshCreator ) {
		this.meshCreator = meshCreator;
		this.rawObject = null;
		this.inputObjectCount = 1;
	}

	Parser.prototype.validate = function () {
		this.rawObject = new THREE.OBJLoader2.RawObject();
		this.inputObjectCount = 1;
	};

	Parser.prototype.parseArrayBuffer = function ( arrayBuffer ) {
		var arrayBufferView = new Uint8Array( arrayBuffer );
		var length = arrayBufferView.byteLength;
		var buffer = new Array( 32 );
		var bufferPointer = 0;
		var slashes = new Array( 32 );
		var slashesPointer = 0;
		var reachedFaces = false;
		var code;
		var word = '';
		for ( var i = 0; i < length; i++ ) {

			code = arrayBufferView[ i ];
			switch ( code ) {
				case THREE.OBJLoader2.consts.CODE_SPACE:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case THREE.OBJLoader2.consts.CODE_SLASH:
					slashes[ slashesPointer++ ] = i;
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case THREE.OBJLoader2.consts.CODE_LF:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					reachedFaces = this.processLine( buffer, bufferPointer, slashes, slashesPointer, reachedFaces );
					slashesPointer = 0;
					bufferPointer = 0;
					break;

				case THREE.OBJLoader2.consts.CODE_CR:
					break;

				default:
					word += String.fromCharCode( code );
					break;
			}
		}
	};

	Parser.prototype.parseText = function ( text ) {
		var length = text.length;
		var buffer = new Array( 32 );
		var bufferPointer = 0;
		var slashes = new Array( 32 );
		var slashesPointer = 0;
		var reachedFaces = false;
		var char;
		var word = '';
		for ( var i = 0; i < length; i++ ) {

			char = text[ i ];
			switch ( char ) {
				case THREE.OBJLoader2.consts.STRING_SPACE:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case THREE.OBJLoader2.consts.STRING_SLASH:
					slashes[ slashesPointer++ ] = i;
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case THREE.OBJLoader2.consts.STRING_LF:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					reachedFaces = this.processLine( buffer, bufferPointer, slashes, slashesPointer, reachedFaces );
					slashesPointer = 0;
					bufferPointer = 0;
					break;

				case THREE.OBJLoader2.consts.STRING_CR:
					break;

				default:
					word += char;
			}
		}
	};

	Parser.prototype.processLine = function ( buffer, bufferPointer, slashes, slashesPointer, reachedFaces ) {
		if ( bufferPointer < 1 ) return reachedFaces;

		var bufferLength = bufferPointer - 1;
		switch ( buffer[ 0 ] ) {
			case THREE.OBJLoader2.consts.LINE_V:

				// object complete instance required if reached faces already (= reached next block of v)
				if ( reachedFaces ) {

					this.processCompletedObject( null, this.rawObject.groupName );
					reachedFaces = false;

				}
				this.rawObject.pushVertex( buffer );
				break;

			case THREE.OBJLoader2.consts.LINE_VT:
				this.rawObject.pushUv( buffer );
				break;

			case THREE.OBJLoader2.consts.LINE_VN:
				this.rawObject.pushNormal( buffer );
				break;

			case THREE.OBJLoader2.consts.LINE_F:
				reachedFaces = true;
				/*
				 * 0: "f vertex/uv/normal ..."
				 * 1: "f vertex/uv ..."
				 * 2: "f vertex//normal ..."
				 * 3: "f vertex ..."
				 */
				var haveQuad = bufferLength % 4 === 0;
				if ( slashesPointer > 1 && ( slashes[ 1 ] - slashes[ 0 ] ) === 1 ) {

					if ( haveQuad ) {
						this.rawObject.buildQuadVVn( buffer );
					} else {
						this.rawObject.buildFaceVVn( buffer );
					}

				} else if ( bufferLength === slashesPointer * 2 ) {

					if ( haveQuad ) {
						this.rawObject.buildQuadVVt( buffer );
					} else {
						this.rawObject.buildFaceVVt( buffer );
					}

				} else if ( bufferLength * 2 === slashesPointer * 3 ) {

					if ( haveQuad ) {
						this.rawObject.buildQuadVVtVn( buffer );
					} else {
						this.rawObject.buildFaceVVtVn( buffer );
					}

				} else {

					if ( haveQuad ) {
						this.rawObject.buildQuadV( buffer );
					} else {
						this.rawObject.buildFaceV( buffer );
					}

				}
				break;

			case THREE.OBJLoader2.consts.LINE_L:
				if ( bufferLength === slashesPointer * 2 ) {

					this.rawObject.buildLineVvt( buffer );

				} else {

					this.rawObject.buildLineV( buffer );

				}
				break;

			case THREE.OBJLoader2.consts.LINE_S:
				this.rawObject.pushSmoothingGroup( buffer[ 1 ] );
				break;

			case THREE.OBJLoader2.consts.LINE_G:
				this.processCompletedGroup( buffer[ 1 ] );
				break;

			case THREE.OBJLoader2.consts.LINE_O:
				if ( this.rawObject.vertices.length > 0 ) {

					this.processCompletedObject( buffer[ 1 ], null );
					reachedFaces = false;

				} else {

					this.rawObject.pushObject( buffer[ 1 ] );

				}
				break;

			case THREE.OBJLoader2.consts.LINE_MTLLIB:
				this.rawObject.pushMtllib( buffer[ 1 ] );
				break;

			case THREE.OBJLoader2.consts.LINE_USEMTL:
				this.rawObject.pushUsemtl( buffer[ 1 ] );
				break;

			default:
				break;
		}
		return reachedFaces;
	};

	Parser.prototype.processCompletedObject = function ( objectName, groupName ) {
		this.rawObject.finalize( this.meshCreator, this.inputObjectCount, this.debug );
		this.inputObjectCount++;
		this.rawObject = this.rawObject.newInstanceFromObject( objectName, groupName );
	};

	Parser.prototype.processCompletedGroup = function ( groupName ) {
		var notEmpty = this.rawObject.finalize( this.meshCreator, this.inputObjectCount, this.debug );
		if ( notEmpty ) {

			this.inputObjectCount ++;
			this.rawObject = this.rawObject.newInstanceFromGroup( groupName );

		} else {

			// if a group was set that did not lead to object creation in finalize, then the group name has to be updated
			this.rawObject.pushGroup( groupName );

		}
	};

	Parser.prototype.finalize = function () {
		this.rawObject.finalize( this.meshCreator, this.inputObjectCount, this.debug );
		this.inputObjectCount++;
	};

	return Parser;
})();

THREE.OBJLoader2.RawObject = (function () {

	function RawObject( objectName, groupName, mtllibName ) {
		this.globalVertexOffset = 1;
		this.globalUvOffset = 1;
		this.globalNormalOffset = 1;

		this.vertices = [];
		this.normals = [];
		this.uvs = [];

		// faces are stored according combined index of group, material and smoothingGroup (0 or not)
		this.mtllibName = ( mtllibName != null ) ? mtllibName : 'none';
		this.objectName = ( objectName != null ) ? objectName : 'none';
		this.groupName = ( groupName != null ) ? groupName : 'none';
		this.activeMtlName = 'none';
		this.activeSmoothingGroup = 1;

		this.mtlCount = 0;
		this.smoothingGroupCount = 0;

		this.rawObjectDescriptions = [];
		// this default index is required as it is possible to define faces without 'g' or 'usemtl'
		var index = THREE.OBJLoader2.consts.buildIndex( this.activeMtlName, this.activeSmoothingGroup );
		this.rawObjectDescriptionInUse = new THREE.OBJLoader2.RawObjectDescription( this.objectName, this.groupName, this.activeMtlName, this.activeSmoothingGroup );
		this.rawObjectDescriptions[ index ] = this.rawObjectDescriptionInUse;
	}

	RawObject.prototype.newInstanceFromObject = function ( objectName, groupName ) {
		var newRawObject = new RawObject( objectName, groupName, this.mtllibName );

		// move indices forward
		newRawObject.globalVertexOffset = this.globalVertexOffset + this.vertices.length / 3;
		newRawObject.globalUvOffset = this.globalUvOffset + this.uvs.length / 2;
		newRawObject.globalNormalOffset = this.globalNormalOffset + this.normals.length / 3;

		return newRawObject;
	};

	RawObject.prototype.newInstanceFromGroup = function ( groupName ) {
		var newRawObject = new RawObject( this.objectName, groupName, this.mtllibName );

		// keep current buffers and indices forward
		newRawObject.vertices = this.vertices;
		newRawObject.uvs = this.uvs;
		newRawObject.normals = this.normals;
		newRawObject.globalVertexOffset = this.globalVertexOffset;
		newRawObject.globalUvOffset = this.globalUvOffset;
		newRawObject.globalNormalOffset = this.globalNormalOffset;

		return newRawObject;
	};

	RawObject.prototype.pushVertex = function ( buffer ) {
		this.vertices.push( parseFloat( buffer[ 1 ] ) );
		this.vertices.push( parseFloat( buffer[ 2 ] ) );
		this.vertices.push( parseFloat( buffer[ 3 ] ) );
	};

	RawObject.prototype.pushUv = function ( buffer ) {
		this.uvs.push( parseFloat( buffer[ 1 ] ) );
		this.uvs.push( parseFloat( buffer[ 2 ] ) );
	};

	RawObject.prototype.pushNormal = function ( buffer ) {
		this.normals.push( parseFloat( buffer[ 1 ] ) );
		this.normals.push( parseFloat( buffer[ 2 ] ) );
		this.normals.push( parseFloat( buffer[ 3 ] ) );
	};

	RawObject.prototype.pushObject = function ( objectName ) {
		this.objectName = objectName;
	};

	RawObject.prototype.pushMtllib = function ( mtllibName ) {
		this.mtllibName = mtllibName;
	};

	RawObject.prototype.pushGroup = function ( groupName ) {
		this.groupName = groupName;
		this.verifyIndex();
	};

	RawObject.prototype.pushUsemtl = function ( mtlName ) {
		if ( this.activeMtlName === mtlName || mtlName == null ) return;
		this.activeMtlName = mtlName;
		this.mtlCount++;

		this.verifyIndex();
	};

	RawObject.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
		var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
		if ( this.activeSmoothingGroup === normalized ) return;
		this.activeSmoothingGroup = normalized;
		this.smoothingGroupCount++;

		this.verifyIndex();
	};

	RawObject.prototype.verifyIndex = function () {
		var index = THREE.OBJLoader2.consts.buildIndex( this.activeMtlName, ( this.activeSmoothingGroup === 0 ) ? 0 : 1 );
		if ( this.rawObjectDescriptions[ index ] == null ) {

			this.rawObjectDescriptionInUse = this.rawObjectDescriptions[ index ] =
				new THREE.OBJLoader2.RawObjectDescription(
					this.objectName, this.groupName, this.activeMtlName, this.activeSmoothingGroup
				);

		} else {

			this.rawObjectDescriptionInUse = this.rawObjectDescriptions[ index ];

		}
	};

	RawObject.prototype.buildQuadVVtVn = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_3[ i ] ] );
			this.attachFaceVt( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_3[ i ] + 1 ] );
			this.attachFaceVn( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_3[ i ] + 2 ] );
		}
	};

	RawObject.prototype.buildQuadVVt = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_2[ i ] ] );
			this.attachFaceVt( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_2[ i ] + 1 ] );
		}
	};

	RawObject.prototype.buildQuadVVn = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_2[ i ] ] );
			this.attachFaceVn( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_2[ i ] + 1 ] );
		}
	};

	RawObject.prototype.buildQuadV = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ THREE.OBJLoader2.consts.QUAD_INDICES_1[ i ] ] );
		}
	};

	RawObject.prototype.buildFaceVVtVn = function ( indexArray ) {
		for ( var i = 1; i < 10; i += 3 ) {
			this.attachFaceV_( indexArray[ i ] );
			this.attachFaceVt( indexArray[ i + 1 ] );
			this.attachFaceVn( indexArray[ i + 2 ] );
		}
	};

	RawObject.prototype.buildFaceVVt = function ( indexArray ) {
		for ( var i = 1; i < 7; i += 2 ) {
			this.attachFaceV_( indexArray[ i ] );
			this.attachFaceVt( indexArray[ i + 1 ] );
		}
	};

	RawObject.prototype.buildFaceVVn = function ( indexArray ) {
		for ( var i = 1; i < 7; i += 2 ) {
			this.attachFaceV_( indexArray[ i ] );
			this.attachFaceVn( indexArray[ i + 1 ] );
		}
	};

	RawObject.prototype.buildFaceV = function ( indexArray ) {
		for ( var i = 1; i < 4; i ++ ) {
			this.attachFaceV_( indexArray[ i ] );
		}
	};

	RawObject.prototype.attachFaceV_ = function ( faceIndex ) {
		var faceIndexInt =  parseInt( faceIndex );
		var index = ( faceIndexInt - this.globalVertexOffset ) * 3;

		var rodiu = this.rawObjectDescriptionInUse;
		rodiu.vertices.push( this.vertices[ index++ ] );
		rodiu.vertices.push( this.vertices[ index++ ] );
		rodiu.vertices.push( this.vertices[ index ] );
	};

	RawObject.prototype.attachFaceVt = function ( faceIndex ) {
		var faceIndexInt =  parseInt( faceIndex );
		var index = ( faceIndexInt - this.globalUvOffset ) * 2;

		var rodiu = this.rawObjectDescriptionInUse;
		rodiu.uvs.push( this.uvs[ index++ ] );
		rodiu.uvs.push( this.uvs[ index ] );
	};

	RawObject.prototype.attachFaceVn = function ( faceIndex ) {
		var faceIndexInt =  parseInt( faceIndex );
		var index = ( faceIndexInt - this.globalNormalOffset ) * 3;

		var rodiu = this.rawObjectDescriptionInUse;
		rodiu.normals.push( this.normals[ index++ ] );
		rodiu.normals.push( this.normals[ index++ ] );
		rodiu.normals.push( this.normals[ index ] );
	};

	/*
	 * Support for lines with or without texture. irst element in indexArray is the line identification
	 * 0: "f vertex/uv		vertex/uv 		..."
	 * 1: "f vertex			vertex 			..."
	 */
	RawObject.prototype.buildLineVvt = function ( lineArray ) {
		var length = lineArray.length;
		for ( var i = 1; i < length; i ++ ) {
			this.vertices.push( parseInt( lineArray[ i ] ) );
			this.uvs.push( parseInt( lineArray[ i ] ) );
		}
	};

	RawObject.prototype.buildLineV = function ( lineArray ) {
		var length = lineArray.length;
		for ( var i = 1; i < length; i++ ) {
			this.vertices.push( parseInt( lineArray[ i ] ) );
		}
	};

	/**
	 * Clear any empty rawObjectDescription and calculate absolute vertex, normal and uv counts
	 */
	RawObject.prototype.finalize = function ( meshCreator, inputObjectCount, debug ) {
		var temp = this.rawObjectDescriptions;
		this.rawObjectDescriptions = [];
		var rawObjectDescription;
		var index = 0;
		var absoluteVertexCount = 0;
		var absoluteNormalCount = 0;
		var absoluteUvCount = 0;

		for ( var name in temp ) {

			rawObjectDescription = temp[ name ];
			if ( rawObjectDescription.vertices.length > 0 ) {

				if ( rawObjectDescription.objectName === 'none' ) rawObjectDescription.objectName = rawObjectDescription.groupName;
				this.rawObjectDescriptions[ index++ ] = rawObjectDescription;
				absoluteVertexCount += rawObjectDescription.vertices.length;
				absoluteUvCount += rawObjectDescription.uvs.length;
				absoluteNormalCount += rawObjectDescription.normals.length;

			}
		}

		// don not continue if no result
		var notEmpty = false;
		if ( index > 0 ) {

			if ( debug ) this.createReport( inputObjectCount, true );
			meshCreator.buildMesh(
				this.rawObjectDescriptions,
				inputObjectCount,
				absoluteVertexCount,
				absoluteNormalCount,
				absoluteUvCount
			);
			notEmpty = true;

		}
		return notEmpty;
	};

	RawObject.prototype.createReport = function ( inputObjectCount, printDirectly ) {
		var report = {
			name: this.objectName ? this.objectName : 'groups',
			mtllibName: this.mtllibName,
			vertexCount: this.vertices.length / 3,
			normalCount: this.normals.length / 3,
			uvCount: this.uvs.length / 2,
			smoothingGroupCount: this.smoothingGroupCount,
			mtlCount: this.mtlCount,
			rawObjectDescriptions: this.rawObjectDescriptions.length
		};

		if ( printDirectly ) {
			console.log( 'Input Object number: ' + inputObjectCount + ' Object name: ' + report.name );
			console.log( 'Mtllib name: ' + report.mtllibName );
			console.log( 'Vertex count: ' + report.vertexCount );
			console.log( 'Normal count: ' + report.normalCount );
			console.log( 'UV count: ' + report.uvCount );
			console.log( 'SmoothingGroup count: ' + report.smoothingGroupCount );
			console.log( 'Material count: ' + report.mtlCount );
			console.log( 'Real RawObjectDescription count: ' + report.rawObjectDescriptions );
			console.log( '' );
		}

		return report;
	};

	return RawObject;
})();

THREE.OBJLoader2.RawObjectDescription = (function () {

	function RawObjectDescription( objectName, groupName, materialName, smoothingGroup ) {
		this.objectName = objectName;
		this.groupName = groupName;
		this.materialName = materialName;
		this.smoothingGroup = smoothingGroup;
		this.vertices = [];
		this.uvs = [];
		this.normals = [];
	}

	return RawObjectDescription;
})();
