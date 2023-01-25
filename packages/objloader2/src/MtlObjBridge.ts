import { Material } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { AssociatedArrayType } from 'wtd-core';
import { LinkType } from './utils/AssetPipelineLoader.js';

class MtlObjBridge implements LinkType {

	link(processResult: AssociatedArrayType<unknown>, assetLoader: AssociatedArrayType<unknown>) {
		if (typeof assetLoader.setMaterials === 'function') {
			assetLoader.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(processResult as unknown as MTLLoader.MaterialCreator));
		}
		return undefined;
	}

	/**
	 * Returns the array instance of {@link Material}.
	 *
	 * @param materialCreator instance of MTLLoader
	 */
	static addMaterialsFromMtlLoader(materialCreator: MTLLoader.MaterialCreator) {
		materialCreator.preload();
		return materialCreator.materials;
	}
}

export { MtlObjBridge };
