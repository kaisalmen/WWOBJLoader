/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	LineBasicMaterial,
	MeshStandardMaterial,
	PointsMaterial,
	VertexColors
} from '../../../../../build/three.module.js';


class MaterialHandler {

	constructor() {

		this.logging = {
			enabled: false,
			debug: false
		};

		this.callbacks = {
			onLoadMaterials: null
		};
		this.materials = {};

	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging ( enabled, debug ) {

		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;

	}

	_setCallbacks ( onLoadMaterials ) {

		if ( onLoadMaterials !== undefined && onLoadMaterials !== null && onLoadMaterials instanceof Function ) {

			this.callbacks.onLoadMaterials = onLoadMaterials;

		}

	}

	/**
	 * Creates default materials and adds them to the materials object.
	 *
	 * @param overrideExisting boolean Override existing material
	 */
	createDefaultMaterials ( overrideExisting ) {

		const defaultMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';

		const defaultVertexColorMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
		defaultVertexColorMaterial.vertexColors = VertexColors;

		const defaultLineMaterial = new LineBasicMaterial();
		defaultLineMaterial.name = 'defaultLineMaterial';

		const defaultPointMaterial = new PointsMaterial( { size: 0.1 } );
		defaultPointMaterial.name = 'defaultPointMaterial';

		const runtimeMaterials = {};
		runtimeMaterials[ defaultMaterial.name ] = defaultMaterial;
		runtimeMaterials[ defaultVertexColorMaterial.name ] = defaultVertexColorMaterial;
		runtimeMaterials[ defaultLineMaterial.name ] = defaultLineMaterial;
		runtimeMaterials[ defaultPointMaterial.name ] = defaultPointMaterial;

		this.addMaterials( runtimeMaterials, overrideExisting );

	}

	/**
	 * Updates the materials with contained material objects (sync) or from alteration instructions (async).
	 *
	 * @param {Object} materialPayload Material update instructions
	 */
	addPayloadMaterials ( materialPayload ) {

		let material, materialName;
		const materialCloneInstructions = materialPayload.materials.materialCloneInstructions;
		let newMaterials = {};

		if ( materialCloneInstructions !== undefined && materialCloneInstructions !== null ) {

			let materialNameOrg = materialCloneInstructions.materialNameOrg;
			materialNameOrg = ( materialNameOrg !== undefined && materialNameOrg !== null ) ? materialNameOrg : '';
			const materialOrg = this.materials[ materialNameOrg ];
			if ( materialOrg ) {

				material = materialOrg.clone();

				materialName = materialCloneInstructions.materialName;
				material.name = materialName;

				Object.assign( material, materialCloneInstructions.materialProperties );

				this.materials[ materialName ] = material;
				newMaterials[ materialName ] = material;

			} else {

				if ( this.logging.enabled ) {

					console.info( 'Requested material "' + materialNameOrg + '" is not available!' );

				}

			}

			this.addMaterials( newMaterials, true );

		}

	}

	/**
	 * Set materials loaded by any supplier of an Array of {@link Material}.
	 *
	 * @param newMaterials Object with named {@link Material}
	 * @param forceOverrideExisting boolean Override existing material
	 */
	addMaterials ( newMaterials, forceOverrideExisting ) {

		if ( newMaterials === undefined || newMaterials === null ) newMaterials = {};
		if ( Object.keys( newMaterials ).length > 0 ) {

			let material;
			let existingMaterial;
			let force;
			for ( const materialName in newMaterials ) {

				material = newMaterials[ materialName ];
				force = forceOverrideExisting === true;
				if ( ! force ) {

					existingMaterial = this.materials[ materialName ];
					if ( existingMaterial ) {

						if ( existingMaterial.uuid !== existingMaterial.uuid ) {

							console.log( 'Same material name "' + existingMaterial.name + '" different uuid [' + existingMaterial.uuid + '|' + material.uuid + ']' );
						}

					} else {

						this.materials[ materialName ] = material;

					}

				} else {

					this.materials[ materialName ] = material;
					newMaterials[ materialName ] = material;

				}
				if ( this.logging.enabled && this.logging.debug ) {

					console.info( 'Material with name "' + materialName + '" was added.' );

				}

			}

		}
		if ( this.callbacks.onLoadMaterials ) this.callbacks.onLoadMaterials( newMaterials );

	}

	/**
	 * Returns the mapping object of material name and corresponding material.
	 *
	 * @returns {Object} Map of {@link Material}
	 */
	getMaterials () {

		return this.materials;

	}

	/**
	 *
	 * @param {String} materialName
	 * @returns {Material}
	 */
	getMaterial ( materialName ) {

		return this.materials[ materialName ];

	}

	/**
	 * Returns the mapping object of material name and corresponding jsonified material.
	 *
	 * @returns {Object} Map of Materials in JSON representation
	 */
	getMaterialsJSON () {

		return MaterialHandler.getMaterialsJSON( this.materials );

	}

	static getMaterialsJSON ( materialsObject ) {

		const materialsJSON = {};
		let material;
		for ( const materialName in materialsObject ) {

			material = materialsObject[ materialName ];
			materialsJSON[ materialName ] = material.toJSON();

		}
		return materialsJSON;

	}

	/**
	 * Removes all materials
	 */
	clearMaterials () {

		this.materials = {};

	}

}

export { MaterialHandler };
