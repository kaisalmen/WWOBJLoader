/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferGeometry,
	BufferAttribute,
	Box3,
	Sphere,
	Texture,
	Material
} from "../../../../../build/three.module.js";

/**
 * Define a base structure that is used to ship data in between main and workers.
 */
class StructuredWorkerMessage {

	/**
	 * Creates a new {@link StructuredWorkerMessage}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {

		this.main = {
			cmd: ( cmd !== undefined ) ? cmd : 'unknown',
			id: ( id !== undefined ) ? id : 0,
			type: 'undefined',
			/** @type {number} */
			progress: 0,
			params: {
			}
		};
		this.transferables = [];

	}

	/**
	 *
	 * @return {*|{cmd: string, type: string, progress: {numericalValue: number}, params: {}}|{progress: number, cmd: (string|string), id: (string|number), type: string, params: {}}}
	 */
	getMain() {
		return this.main;
	}

	/**
	 *
	 * @return {[]|any[]|*}
	 */
	getTransferables() {
		return this.transferables;
	}

	/**
	 *
	 * @param {number} numericalValue
	 */
	setProgress( numericalValue ) {
		this.main.progress = numericalValue;
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
class MaterialsTransport extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link MeshMessageStructure}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd );
		this.main.type = 'materials';
		this.main.materials = {};
	}

	/**
	 *
	 * @param materials
	 */
	setMaterials ( materials ) {
		if ( materials !== undefined && materials !== null && Object.keys( materials ).length > 0 ) this.materials = materials;
	}

	/**
	 *
	 * @param {} materials
	 */
	cleanAndSetMaterials ( materials ) {
		let clonedMaterials = {};
		let clonedMaterial;
		for ( let material of Object.values( materials ) ) {

			if ( material instanceof Material ) {

				clonedMaterial = material.clone();
				Object.entries( clonedMaterial ).forEach( ( [key, value] ) => {
					if ( value instanceof Texture || value === null ) {
						clonedMaterial[ key ] = undefined;
					}
				} );
				clonedMaterials[ clonedMaterial.name ] = clonedMaterial;

			}

		}
		this.setMaterials( clonedMaterial );
	}

}

/**
 * Define a structure that is used to send geometry data between main and workers.
 */
class GeometryTransport extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link GeometrySender}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd, id );
		this.main.type = 'geometry';
		/**
		 * @type {number}
		 * 0: mesh, 1: line, 2: point
		 */
		this.main.geometryType = 0;
		/** @type {object} */
		this.main.geometry = {};
		/** @type {BufferGeometry} */
		this.main.bufferGeometry = null;
	}

	/**
	 *
	 * @param {object} transportObject
	 *
	 * @return {GeometryTransport}
	 */
	loadData( transportObject ) {
		this.main.cmd = transportObject.cmd;
		this.main.id = transportObject.id;
		return this.setGeometry( transportObject.geometry, transportObject.geometryType );
	}

	/**
	 * Only add the {@link BufferGeometry}
	 *
	 * @param {BufferGeometry} geometry
	 * @param {number} geometryType
	 *
	 * @return {GeometryTransport}
	 */
	setGeometry( geometry, geometryType ) {
		this.main.geometry = geometry;
		this.main.params.geometryType = geometryType;
		if ( geometry instanceof BufferGeometry ) this.main.bufferGeometry = geometry;

		return this;
	}

	/**
	 * Package {@link BufferGeometry}
	 *
	 * @param {BufferGeometry} geometry
	 * @param {number} geometryType
	 * @param {boolean} cloneBuffers
	 *
	 * @return {GeometryTransport}
	 */
	package( cloneBuffers ) {
		const vertexBA = this.main.geometry.getAttribute( 'position' );
		const normalBA = this.main.geometry.getAttribute( 'normal' );
		const uvBA = this.main.geometry.getAttribute( 'uv' );
		const colorBA = this.main.geometry.getAttribute( 'color' );
		const skinIndexBA = this.main.geometry.getAttribute( 'skinIndex' );
		const skinWeightBA = this.main.geometry.getAttribute( 'skinWeight' );
		const indexBA = this.main.geometry.getIndex();

		TransferableUtils.addTransferable( vertexBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( normalBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( uvBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( colorBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( skinIndexBA, cloneBuffers, this.transferables );
		TransferableUtils.addTransferable( skinWeightBA, cloneBuffers, this.transferables );

		TransferableUtils.addTransferable( indexBA, cloneBuffers, this.transferables );

		return this;
	}

	/**
	 * @param {boolean} cloneBuffers
	 *
	 * @return {GeometryTransport}
	 */
	reconstruct( cloneBuffers ) {
		if ( this.main.bufferGeometry instanceof BufferGeometry ) return this;
		this.main.bufferGeometry = new BufferGeometry();

		const transferredGeometry = this.main.geometry;
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.position, 'position', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.normal, 'normal', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.uv, 'uv', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.color, 'color', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers );
		TransferableUtils.assignAttribute( this.main.bufferGeometry, transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers );

		const index = transferredGeometry.index;
		if ( index !== null && index !== undefined ) {

			const indexBuffer = cloneBuffers ? index.array.slice( 0 ) : index.array;
			this.main.bufferGeometry.setIndex( new BufferAttribute( indexBuffer, index.itemSize, index.normalized ) );

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
	 *
	 * @return {BufferGeometry|null}
	 */
	getBufferGeometry() {
		return this.main.bufferGeometry
	}

}

class MeshTransport extends GeometryTransport {

	/**
	 * Creates a new {@link MeshTransport}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd, id );

		this.main.type = 'mesh';
		// needs to be added as we cannot inherit from both materials and geometry
		this.main.material = {};
	}

	/**
	 *
	 * @param {object} transportObject
	 *
	 * @return {MeshTransport}
	 */
	loadData( transportObject ) {
		super.loadData( transportObject );
		this.main.meshName = transportObject.meshName;
		this.main.material = transportObject.material

		return this;
	}

	/**
	 * Only set the material.
	 *
	 * @param {Material} material
	 *
	 * @return {MeshTransport}
	 */
	setMaterial( material ) {
		if ( material instanceof Material ) this.main.material = material.toJSON();

		return this;
	}

	/**
	 *
	 * @param {Mesh} mesh
	 * @param {number} geometryType
	 *
	 * @return {MeshTransport}
	 */
	setMesh( mesh, geometryType ) {
		this.main.meshName = mesh.name;
		super.setGeometry( mesh.geometry, geometryType );
		this.setMaterial( mesh.material );

		return this;
	}

	/**
	 * Package {@link Mesh}
	 *
	 * @param {boolean} cloneBuffers
	 *
	 * @return {MeshTransport}
	 */
	package( cloneBuffers ) {
		super.package( cloneBuffers );

		return this;
	}

	/**
	 * @param {boolean} cloneBuffers
	 *
	 * @return {MeshTransport}
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
	GeometryTransport,
	MaterialsTransport,
	MeshTransport,
	ObjectManipulator
}
