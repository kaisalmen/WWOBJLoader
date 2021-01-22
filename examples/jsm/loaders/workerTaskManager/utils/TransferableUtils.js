/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferGeometry,
	BufferAttribute,
	Box3,
	Sphere,
	Texture
} from "../../../../../build/three.module.js";

/**
 * Define a base structure that is used to ship data in between main and workers.
 */
class StructuredWorkerMessage {

	/**
	 * Creates a new {@link StructuredWorkerMessage}.
	 *
	 * @param {string} cmd
	 */
	constructor( cmd ) {

		this.main = {
			cmd: cmd,
			type: 'undefined',
			progress: {
				numericalValue: 0
			},
			params: {
			}
		};
		this.transferables = [];

	}

	/**
	 * Posts a message by invoking the method on the provided object.
	 *
	 * @param {object} postMessageImpl
	 */
	postMessage( postMessageImpl ) {

		postMessageImpl.postMessage( this.main, this.transferables );

	}
}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
class MaterialsWorkerMessage extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link MeshMessageStructure}.
	 *
	 * @param {string} cmd
	 */
	constructor( cmd) {
		super( cmd );
		this.main.type = 'materials';
		this.main.materials = {};
	}

	setMaterials ( materials ) {
		this.materials = materials;
	}

	cleanAndSetMaterials ( materials ) {
		for ( let material of Object.values( materials ) ) {
			Object.entries( material ).forEach( ( [key, value] ) => {
				if ( value instanceof Texture || value === null ) {
					material[ key ] = undefined;
				}
			} );
		}
		this.setMaterials( materials );
	}

}

/**
 * Define a structure that is used to ship geometry data between main and workers.
 */
class GeometryWorkerMessage extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link MeshMessageStructure}.
	 *
	 * @param {string} cmd
	 */
	constructor( cmd) {
		super( cmd );
		this.main.type = 'geometry';
		// 0: mesh, 1: line, 2: point
		this.main.params.geometryType = 0;
		this.main.geometry = {};
	}

}

/**
 * Define a structure that is used to ship mesh data between main and workers.
 */
class MeshMessageStructure extends GeometryWorkerMessage {

	/**
	 * Creates a new {@link MeshMessageStructure}.
	 *
	 * @param {string} cmd
	 * @param {string} id
	 * @param {string} meshName
	 */
	constructor( cmd, id, meshName ) {
		super( cmd );
		this.main.type = 'mesh';
		this.main.params.id = id;
		// needs to be added as we cannot inherit from both materials and geometry
		this.main.materials = {};
	}

}

/**
 * Utility class that helps to transform meshes and especially {@link BufferGeometry} to message with transferables.
 * Structure that is used to ship data in between main and workers is defined {@link MeshMessageStructure}.
 */
class TransferableUtils {

	/**
	 * Package {@link BufferGeometry} into {@link MeshMessageStructure}
	 *
	 * @param {BufferGeometry} geometry
	 * @param {string} id
	 * @param {number} geometryType
	 * @param {boolean} cloneBuffers
	 * @return {MeshMessageStructure}
	 */
	static packageBufferGeometry( geometry, id, geometryType, cloneBuffers ) {
		let vertexBA = geometry.getAttribute( 'position' );
		let normalBA = geometry.getAttribute( 'normal' );
		let uvBA = geometry.getAttribute( 'uv' );
		let colorBA = geometry.getAttribute( 'color' );
		let skinIndexBA = geometry.getAttribute( 'skinIndex' );
		let skinWeightBA = geometry.getAttribute( 'skinWeight' );
		let indexBA = geometry.getIndex();

		let payload = new MeshMessageStructure( 'execComplete', id, geometry.name );

		TransferableUtils.addTransferable( vertexBA, cloneBuffers, payload.transferables );
		TransferableUtils.addTransferable( normalBA, cloneBuffers, payload.transferables );
		TransferableUtils.addTransferable( uvBA, cloneBuffers, payload.transferables );
		TransferableUtils.addTransferable( colorBA, cloneBuffers, payload.transferables );
		TransferableUtils.addTransferable( skinIndexBA, cloneBuffers, payload.transferables );
		TransferableUtils.addTransferable( skinWeightBA, cloneBuffers, payload.transferables );

		TransferableUtils.addTransferable( indexBA, cloneBuffers, payload.transferables );

		payload.main.geometry = geometry;
		payload.main.params.geometryType = geometryType;

		return payload;
	}

	static addTransferable( input, cloneBuffer, transferableArray ) {
		if ( input !== null && input !== undefined ) {

			const arrayBuffer = cloneBuffer ? input.array.slice( 0 ) : input.array;
			transferableArray.push( arrayBuffer.buffer );

		}
	}

	static reconstructBufferGeometry ( transferredGeometry, cloneBuffers ) {
		const geometry = new BufferGeometry();

		TransferableUtils.assignAttribute( geometry, transferredGeometry.attributes.position, 'position', cloneBuffers );
		TransferableUtils.assignAttribute( geometry, transferredGeometry.attributes.normal, 'normal', cloneBuffers );
		TransferableUtils.assignAttribute( geometry, transferredGeometry.attributes.uv, 'uv', cloneBuffers );
		TransferableUtils.assignAttribute( geometry, transferredGeometry.attributes.color, 'color', cloneBuffers );
		TransferableUtils.assignAttribute( geometry, transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers );
		TransferableUtils.assignAttribute( geometry, transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers );

		const index = transferredGeometry.index;
		if ( index !== null && index !== undefined ) {

			const indexBuffer = cloneBuffers ? index.array.slice( 0 ) : index.array;
			if ( index ) geometry.setIndex( new BufferAttribute( indexBuffer, index.itemSize, index.normalized ) );

		}

		const boundingBox = transferredGeometry.boundingBox;
		if ( boundingBox !== null ) geometry.boundingBox = Object.assign( new Box3(), boundingBox );

		const boundingSphere = transferredGeometry.boundingSphere;
		if ( boundingSphere !== null ) geometry.boundingSphere = Object.assign( new Sphere(), boundingSphere );

		geometry.uuid = transferredGeometry.uuid;
		geometry.name = transferredGeometry.name;
		geometry.type = transferredGeometry.type;
		geometry.groups = transferredGeometry.groups;
		geometry.drawRange = transferredGeometry.drawRange;
		geometry.userData = transferredGeometry.userData;

		return geometry;
	}

	static assignAttribute( bg, attr, attrName, cloneBuffer ) {
		if ( attr ) {
			const buffer = cloneBuffer ? attr.array.slice( 0 ) : attr.array;
			bg.setAttribute( attrName, new BufferAttribute( buffer, attr.itemSize, attr.normalized ) );
		}
	}

}

class ObjectManipulator {

	/**
	 * Applies values from parameter object via set functions or via direct assignment.
	 *
	 * @param {Object} objToAlter The objToAlter instance
	 * @param {Object} params The parameter object
	 * @param {boolean} forceCreation Force the creation of a property
	 */
	static applyProperties ( objToAlter, params, forceCreation ) {

		// fast-fail
		if ( objToAlter === undefined || objToAlter === null || params === undefined || params === null ) return;

		let property, funcName, values;
		for ( property in params ) {

			funcName = 'set' + property.substring( 0, 1 ).toLocaleUpperCase() + property.substring( 1 );
			values = params[ property ];

			if ( typeof objToAlter[ funcName ] === 'function' ) {

				objToAlter[ funcName ]( values );

			} else if ( objToAlter.hasOwnProperty( property ) || forceCreation ) {

				objToAlter[ property ] = values;

			}

		}

	}

}

export {
	TransferableUtils,
	StructuredWorkerMessage,
	GeometryWorkerMessage,
	MaterialsWorkerMessage,
	MeshMessageStructure,
	ObjectManipulator
}
