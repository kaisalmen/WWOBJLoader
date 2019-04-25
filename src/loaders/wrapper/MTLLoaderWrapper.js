/**
 * @author Kai Salmen / www.kaisalmen.de
 */

/**
 * Utility method for parsing mtl text with MTLLoader
 *
 * @param {arraybuffer|string} content MTL data as Uint8Array or String
 * @param {Object} parserConfiguration Provide additional instructions for MTL parsing:
 * 	- {String} resourcePath Relative path for texture loading
 *  - {String} [mtlName] Name given to identify the mtl file
 *  - {string} [crossOrigin] CORS value
 *  - {Object} [materialOptions] Set material loading options for MTLLoader
 *
 */
var _parseMtl = function ( content, parserConfiguration ) {
	if ( MTLLoader === undefined ) console.error( '"MTLLoader" is not available. "OBJLoader2" requires it for loading MTL files.' );
	if ( ( content === null || content === undefined ) && typeof( content ) !== 'string' && ! ( content instanceof String ) && ! ( content instanceof ArrayBuffer ) ) {

		console.error( 'Unable to parse mtl file: \"' + parserConfiguration.filename + '\". Provided content is neither a String nor an ArrayBuffer.' );

	}
	var mtlParseResult = {
		materials: [],
		materialCreator: null
	};
	if ( content !== null && content !== undefined ) {

		var mtlLoader = new MTLLoader( this.manager );
		mtlLoader.setCrossOrigin( parserConfiguration.crossOrigin );
		mtlLoader.setResourcePath( parserConfiguration.path || parserConfiguration.resourcePath );
		mtlLoader.setMaterialOptions( parserConfiguration.materialOptions );

		var contentAsText = content;
		if ( content instanceof ArrayBuffer && ( content.length > 0 || content.byteLength > 0 ) ) {

			parserConfiguration.payloadType === 'arraybuffer';
			contentAsText = LoaderUtils.decodeText( content );

		}
		mtlParseResult.materialCreator = mtlLoader.parse( contentAsText );
		if ( mtlParseResult.materialCreator !== null && mtlParseResult.materialCreator !== undefined ) {

			mtlParseResult.materialCreator.preload();
			mtlParseResult.materials = this.addMaterials( mtlParseResult.materialCreator );

		}

	}
	return mtlParseResult;
};