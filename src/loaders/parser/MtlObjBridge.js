/**
 * @author Kai Salmen / www.kaisalmen.de
 */

export { MtlObjBridge }


const MtlObjBridge = function () {
	this.previousResult;
	this.assetHandlerInstance;
};

MtlObjBridge.prototype = {

	constructor: MtlObjBridge,

	/**
	 *
	 * @param {Object} previousResult
	 */
	setPreviousResult: function ( previousResult ) {
		this.previousResult = previousResult;
	},

	parse: function( content ) {
		if ( this.assetHandlerInstance !== undefined && this.assetHandlerInstance !== null && typeof this.assetHandlerInstance.addMaterials === 'function') {

			this.assetHandlerInstance.addMaterials( this.previousResult );

		}
	},

	/**
	 * Allows to set
	 *
	 * @param {Object} assetHandlerInstance
	 */
	setNextAssetHandlerInstance: function ( assetHandlerInstance ) {
		this.assetHandlerInstance = assetHandlerInstance;
	}

};