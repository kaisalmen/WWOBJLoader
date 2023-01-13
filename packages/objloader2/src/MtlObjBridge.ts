import { Material } from 'three';

export type AssetLoaderPartialType = {
	setMaterials: (materials: { [key: string]: Material }) => void;
}

export type MaterialCreatorPartialType = {
	materials: { [key: string]: Material };
	preload(): void;
}

class MtlObjBridge {

	/**
	 *
	 * @param processResult
	 * @param assetLoader
	 */
	static link(processResult: MaterialCreatorPartialType, assetLoader: AssetLoaderPartialType) {
		if (typeof assetLoader.setMaterials === 'function') {
			assetLoader.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(processResult));
		}
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
