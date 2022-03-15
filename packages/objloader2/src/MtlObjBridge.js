class MtlObjBridge {

	/**
	 *
	 * @param processResult
	 * @param assetLoader
	 */
	static link ( processResult, assetLoader ) {

		if ( typeof assetLoader.setMaterials === 'function' ) {

			assetLoader.setMaterials( MtlObjBridge.addMaterialsFromMtlLoader( processResult ), true );

		}

	}

	/**
	 * Returns the array instance of {@link Material}.
	 *
	 * @param materialCreator instance of MTLLoader
	 */
	static addMaterialsFromMtlLoader( materialCreator ) {

		let newMaterials = {};
		if ( materialCreator[ 'preload' ] !== undefined && materialCreator[ 'preload' ] instanceof Function ) {

			materialCreator[ 'preload' ]();
			newMaterials = materialCreator.materials;

		}
		return newMaterials;

	}
}

export { MtlObjBridge };
