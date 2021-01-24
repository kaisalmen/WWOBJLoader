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
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {

		this.main = {
			cmd: cmd,
			id: id,
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

	/**
	 *
	 * @param {} materials
	 */
	cleanAndSetMaterials ( materials ) {
		let clonedMaterials = {};
		let clonedMaterial;
		for ( let material of Object.values( materials ) ) {
			clonedMaterial = material.clone();
			Object.entries( clonedMaterial ).forEach( ( [key, value] ) => {
				if ( value instanceof Texture || value === null ) {
					clonedMaterial[ key ] = undefined;
				}
			} );
			clonedMaterials[ clonedMaterial.name ] = clonedMaterial;
		}
		this.setMaterials( clonedMaterial );
	}

}

/**
 * Define a structure that is used to send geometry data between main and workers.
 */
class GeometrySender extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link GeometrySender}.
	 *
	 * @param {string} cmd
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd, id );
		this.main.type = 'geometry';
		// 0: mesh, 1: line, 2: point
		this.main.geometryType = 0;
		this.main.geometry = {};
	}

	/**
	 * Package {@link BufferGeometry}
	 *
	 * @param {BufferGeometry} geometry
	 * @param {number} geometryType
	 * @param {boolean} cloneBuffers
	 * @return {MeshSender}
	 */
	package( geometry, geometryType, cloneBuffers ) {
		this.main.geometry = geometry;
		this.main.params.geometryType = geometryType;

		let vertexBA = geometry.getAttribute( 'position' );
		let normalBA = geometry.getAttribute( 'normal' );
		let uvBA = geometry.getAttribute( 'uv' );
		let colorBA = geometry.getAttribute( 'color' );
		let skinIndexBA = geometry.getAttribute( 'skinIndex' );
		let skinWeightBA = geometry.getAttribute( 'skinWeight' );
		let indexBA = geometry.getIndex();

		TransferableUtils.addTransferable( vertexBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( normalBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( uvBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( colorBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( skinIndexBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( skinWeightBA, cloneBuffers, this.transferables );

		TransferableUtils.addTransferable( indexBA, cloneBuffers, this.transferables );

		return this;
	}
}

/**
 * Object that is used to receive geometry data between main and workers.
 */
class GeometryReceiver extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link GeometryReceiver}.
	 *
	 * @param {object} data Object that was sent from {@link GeometrySender}
	 */
	constructor( data ) {
		super( data.cmd, data.id )
		this.main.type = 'geometry';
		/**
		 * @type {number}
		 * 0: mesh, 1: line, 2: point
		 */
		this.main.geometryType = data.geometryType;
		/** @type {object} */
		this.main.transferredGeometry = data.geometry;
		/** @type {BufferGeometry} */
		this.main.bufferGeometry = null;
	}

	/**
	 * @param {boolean} cloneBuffers
	 * @return {GeometryReceiver}
	 */
	reconstruct( cloneBuffers ) {
		this.main.bufferGeometry = new BufferGeometry();

		const transferredGeometry = this.main.transferredGeometry;
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.position, 'position', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.normal, 'normal', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.uv, 'uv', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.color, 'color', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers );

		const index = transferredGeometry.index;
		if ( index !== null && index !== undefined ) {

			const indexBuffer = cloneBuffers ? index.array.slice( 0 ) : index.array;
			if ( index ) this.main.bufferGeometry.setIndex( new BufferAttribute( indexBuffer, index.itemSize, index.normalized ) );

		}
		const boundingBox = transferredGeometry.boundingBox;
		if ( boundingBox !== null ) this.main.bufferGeometry.boundingBox = Object.assign( new Box3(), boundingBox );

		const boundingSphere = transferredGeometry.boundingSphere;
		if ( boundingSphere !== null ) this.main.bufferGeometry.boundingSphere = Object.assign( new Sphere(), boundingSphere );

		this.main.bufferGeometry.uuid = transferredGeometry.uuid;
		this.main.bufferGeometry.name = transferredGeometry.name;
		this.main.bufferGeometry.type = transferredGeometry.type;
		this.main.bufferGeometry.groups = transferredGeometry.groups;
		this.main.bufferGeometry.drawRange = transferredGeometry.drawRange;
		this.main.bufferGeometry.userData = transferredGeometry.userData;

		return this;
	}

	/**
	 * @return {BufferGeometry|*}
	 */
	getBufferGeometry() {
		return this.main.bufferGeometry
	}

}

class MeshSender extends GeometrySender {

	/**
	 * Creates a new {@link MeshSender}.
	 *
	 * @param {string} cmd
	 * @param {string} [id]
	 */
	constructor( cmd, id, meshName ) {
		super( cmd, id );
		this.main.type = 'mesh';
		// needs to be added as we cannot inherit from both materials and geometry
		this.main.material = {};
	}

	/**
	 * Package {@link Mesh}
	 *
	 * @param {Mesh} mesh
	 * @param {number} geometryType
	 * @param {boolean} cloneBuffers
	 * @return {MeshSender}
	 */
	package( mesh, geometryType, cloneBuffers ) {
		super.package( mesh.geometry, geometryType, cloneBuffers );
		this.main.material = mesh.material.toJSON();

		return this;
	}
}

class MeshReceiver extends GeometryReceiver {

	/**
 	 * Creates a new {@link MeshReceiver}.
	 *
	 * @param {object} data Object that was sent from {@link MeshSender}
	 */
	constructor( data ) {
		super( data );
		this.main.type = 'mesh';
		// needs to be added as we cannot inherit from both materials and geometry
		this.main.material = data.material;
	}

	/**
	 * @param {boolean} cloneBuffers
	 * @return {MeshReceiver}
	 */
	reconstruct( cloneBuffers ) {
		super.reconstruct( cloneBuffers );

		// so far nothing needs to be done for material

		return this;
	}

}

/**
 * Utility class that helps to transform meshes and especially {@link BufferGeometry} to message with transferables.
 * Structure that is used to ship data in between main and workers is defined {@link MeshMessageStructure}.
 */
class TransferableUtils {

	static addTransferable( input, cloneBuffer, transferableArray ) {
		if ( input !== null && input !== undefined ) {

			const arrayBuffer = cloneBuffer ? input.array.slice( 0 ) : input.array;
			transferableArray.push( arrayBuffer.buffer );

		}
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
	GeometrySender,
	GeometryReceiver,
	MaterialsWorkerMessage,
	MeshSender,
	MeshReceiver,
	ObjectManipulator
}
