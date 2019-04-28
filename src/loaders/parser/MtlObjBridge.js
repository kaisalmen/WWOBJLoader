/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { MTLLoader } from "../../../node_modules/three/examples/jsm/loaders/MTLLoader.js";

export { MtlObjBridge }


const MtlObjBridge = function () {
};

MtlObjBridge.prototype = {

	constructor: MtlObjBridge,

	/**
	 *
	 * @param processResult
	 * @param assetLoader
	 */
	link: function( processResult, assetLoader ) {
		if ( typeof assetLoader.addMaterials === 'function' ) {

			assetLoader.addMaterials( this.addMaterialsFromMtlLoader( processResult ) );

		}
	},

	/**
	 * Returns the array instance of {@link MTLLoader.MaterialCreator}.
	 *
	 * @param Instance of {@link MTLLoader.MaterialCreator}
	 */
	addMaterialsFromMtlLoader: function ( materialCreator ) {
		let newMaterials = {};
		if ( materialCreator instanceof MTLLoader.MaterialCreator ) {

			materialCreator.preload();
			newMaterials = materialCreator.materials;

		}
		return newMaterials;
	},
};