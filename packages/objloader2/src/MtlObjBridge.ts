import { Material } from 'three';
import { AssociatedArrayType } from 'wtd-core';
import { LinkType } from './utils/AssetPipelineLoader.js';

export type MaterialCreatorPartialType = AssociatedArrayType & {
	materials: { [key: string]: Material };
	preload(): void;
}

class MtlObjBridge implements LinkType {

	link(processResult: AssociatedArrayType, assetLoader: AssociatedArrayType) {
		if (typeof assetLoader.setMaterials === 'function') {
			assetLoader.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(processResult as MaterialCreatorPartialType));
		}
		return undefined;
	}

	/**
	 * Returns the array instance of {@link Material}.
	 *
	 * @param materialCreator instance of MTLLoader
	 */
	static addMaterialsFromMtlLoader(materialCreator: MaterialCreatorPartialType) {
		materialCreator.preload();
		return materialCreator.materials;
	}
}

export { MtlObjBridge };
