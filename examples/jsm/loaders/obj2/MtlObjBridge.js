/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import { MTLLoader } from '../MTLLoader.js';


class MtlObjBridge {

	/**
	 *
	 * @param processResult
	 * @param assetLoader
	 */
	static link ( processResult, assetLoader ) {

		if ( typeof assetLoader.addMaterials === 'function' ) {

			assetLoader.addMaterials( MtlObjBridge.addMaterialsFromMtlLoader( processResult ), true );

		}

	}

	/**
	 * Returns the array instance of {@link MTLLoader.MaterialCreator}.
	 *
	 * @param materialCreator instance of {@link MTLLoader.MaterialCreator}
	 */
	static addMaterialsFromMtlLoader( materialCreator ) {

		let newMaterials = {};
		if ( materialCreator instanceof MTLLoader.MaterialCreator ) {

			materialCreator.preload();
			newMaterials = materialCreator.materials;

		}
		return newMaterials;

	}
}

export { MtlObjBridge };
