/**
 * @author Kai Salmen / www.kaisalmen.de
 */

export { MtlObjBridge }


const MtlObjBridge = function () {
};

MtlObjBridge.prototype = {

	constructor: MtlObjBridge,

	link: function( assetTaskBefore, assetTaskAfter ) {
		let assetHandler = assetTaskAfter.assetHandler.instance;
		if ( typeof assetHandler.addMaterials === 'function' ) {

			assetHandler.addMaterialsFromMtlLoader( assetTaskBefore.getProcessResult() );

		}
	}
};