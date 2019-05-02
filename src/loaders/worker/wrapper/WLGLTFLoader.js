/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

THREE.WLGLTFLoader = function ( manager ) {
	THREE.GLTFLoader.call( this, manager );
	this.dracoBuilderPath = '../../';
	this.dracoLibsPath = '';
	this.baseObject3d = null;
};

THREE.WLGLTFLoader.prototype = Object.create( THREE.GLTFLoader.prototype );
THREE.WLGLTFLoader.prototype.constructor = THREE.WLGLTFLoader;

THREE.WLGLTFLoader.prototype.setDracoBuilderPath = function ( dracoBuilderPath ) {
	this.dracoBuilderPath = dracoBuilderPath;
};

THREE.WLGLTFLoader.prototype.setDracoLibsPath = function ( dracoLibsPath ) {
	this.dracoLibsPath = dracoLibsPath;
};

THREE.WLGLTFLoader.prototype.getParseFunctionName = function () {
	return '_parse';
};

THREE.WLGLTFLoader.prototype.setBaseObject3d = function ( baseObject3d ) {
	this.baseObject3d = baseObject3d;
};

THREE.WLGLTFLoader.prototype._parse = function ( arrayBuffer, options ) {
	var dracoLoader = new THREE.WWDRACOLoader();
	dracoLoader.setDracoBuilderPath( this.dracoBuilderPath );
	dracoLoader.setDracoLibsPath( this.dracoLibsPath );
	this.setDRACOLoader( dracoLoader );

	var scope = this;
	var scopedOnLoad = function ( gltf ) {
		var meshes = gltf.scene.children;
		var mesh;
		for ( var i in meshes ) {

			mesh = meshes[ i ];
			scope.baseObject3d.add( mesh );

		}
	};

	this.parse( arrayBuffer, this.path, scopedOnLoad );
};

