/**
 * @author Kai Salmen / www.kaisalmen.de
 */

export { MtlObjBridge }


const MtlObjBridge = function () {
};

MtlObjBridge.prototype = {

	constructor: MtlObjBridge,

	parse: function( previousResult, nextAssetTask ) {
		let assetHandler = nextAssetTask.assetHandler.instance;
		if ( typeof assetHandler.addMaterials === 'function' ) {

			assetHandler.addMaterialsFromMtlLoader( previousResult );

		}
	}
};