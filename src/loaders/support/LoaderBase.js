/**
 * Base class to be used by Loaders that provide load, parse, parseAsync and run
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 * @param {THREE.LoaderSupport.ConsoleLogger} logger logger to be used
 */
THREE.LoaderSupport.LoaderBase = (function () {

	var Validator = THREE.LoaderSupport.Validator;
	var ConsoleLogger = THREE.LoaderSupport.ConsoleLogger;

	function LoaderBase( manager, logger ) {
		this.manager = Validator.verifyInput( manager, THREE.DefaultLoadingManager );
		this.logger = Validator.verifyInput( logger, new ConsoleLogger() );

		this.fileLoader = new THREE.FileLoader( this.manager );
		this.fileLoader.setResponseType( 'arraybuffer' );

		this.modelName = '';
		this.instanceNo = 0;
		this.path = '';
		this.useIndices = false;
		this.disregardNormals = false;

		this.loaderRootNode = new THREE.Group();
		this.builder = new THREE.LoaderSupport.Builder( this.logger );
		this.callbacks = new THREE.LoaderSupport.Callbacks();
	}

	LoaderBase.prototype._applyPrepData = function ( prepData ) {
		if ( Validator.isValid( prepData ) ) {

			this.setModelName( prepData.modelName );
			this.setStreamMeshesTo( prepData.streamMeshesTo );
			this.builder.setMaterials( prepData.materials );
			this.setUseIndices( prepData.useIndices );
			this.setDisregardNormals( prepData.disregardNormals );

			this._setCallbacks( prepData.getCallbacks() );
		}
	};

	LoaderBase.prototype._setCallbacks = function ( callbacks ) {
		if ( Validator.isValid( callbacks.onProgress ) ) this.callbacks.setCallbackOnProgress( callbacks.onProgress );
		if ( Validator.isValid( callbacks.onMeshAlter ) ) this.callbacks.setCallbackOnMeshAlter( callbacks.onMeshAlter );
		if ( Validator.isValid( callbacks.onLoad ) ) this.callbacks.setCallbackOnLoad( callbacks.onLoad );
		if ( Validator.isValid( callbacks.onLoadMaterials ) ) this.callbacks.setCallbackOnLoadMaterials( callbacks.onLoadMaterials );

		this.builder._setCallbacks( this.callbacks );
	};

	/**
	 * Provides access to console logging wrapper.
	 *
	 * @returns {THREE.LoaderSupport.ConsoleLogger}
	 */
	LoaderBase.prototype.getLogger = function () {
		return this.logger;
	};

	/**
	 * Set the name of the model.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {string} modelName
	 */
	LoaderBase.prototype.setModelName = function ( modelName ) {
		this.modelName = Validator.verifyInput( modelName, this.modelName );
	};

	/**
	 * The URL of the base path.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {string} path URL
	 */
	LoaderBase.prototype.setPath = function ( path ) {
		this.path = Validator.verifyInput( path, this.path );
	};

	/**
	 * Set the node where the loaded objects will be attached directly.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {THREE.Object3D} streamMeshesTo Object already attached to scenegraph where new meshes will be attached to
	 */
	LoaderBase.prototype.setStreamMeshesTo = function ( streamMeshesTo ) {
		this.loaderRootNode = Validator.verifyInput( streamMeshesTo, this.loaderRootNode );
	};

	/**
	 * Set materials loaded by MTLLoader or any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {THREE.Material[]} materials Array of {@link THREE.Material}
	 */
	LoaderBase.prototype.setMaterials = function ( materials ) {
		this.builder.setMaterials( materials );
	};

	/**
	 * Instructs loaders to create indexed {@link THREE.BufferGeometry}.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {boolean} useIndices=false
	 */
	LoaderBase.prototype.setUseIndices = function ( useIndices ) {
		this.useIndices = useIndices === true;
	};

	/**
	 * Tells whether normals should be completely disregarded and regenerated.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {boolean} disregardNormals=false
	 */
	LoaderBase.prototype.setDisregardNormals = function ( disregardNormals ) {
		this.disregardNormals = disregardNormals === true;
	};

	/**
	 * Announce feedback which is give to the registered callbacks.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 * @private
	 *
	 * @param {string} type The type of event
	 * @param {string} text Textual description of the event
	 * @param {number} numericalValue Numerical value describing the progress
	 */
	LoaderBase.prototype.onProgress = function ( type, text, numericalValue ) {
		var content = Validator.isValid( text ) ? text: '';
		var event = {
			detail: {
				type: type,
				modelName: this.modelName,
				instanceNo: this.instanceNo,
				text: content,
				numericalValue: numericalValue
			}
		};

		if ( Validator.isValid( this.callbacks.onProgress ) ) this.callbacks.onProgress( event );

		this.logger.logDebug( content );
	};

	/**
	 * Use this convenient method to load a file at the given URL. By default the fileLoader uses an ArrayBuffer.
	 * @memberOf THREE.LoaderSupport.LoaderBase
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {callback} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {callback} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {callback} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @param {callback} [onMeshAlter] A function to be called after a new mesh raw data becomes available for alteration.
	 * @param {boolean} [useAsync] If true, uses async loading with worker, if false loads data synchronously.
	 */
	LoaderBase.prototype.load = function ( url, onLoad, onProgress, onError, onMeshAlter, useAsync ) {
		var scope = this;
		if ( ! Validator.isValid( onProgress ) ) {
			var numericalValueRef = 0;
			var numericalValue = 0;
			onProgress = function ( event ) {
				if ( ! event.lengthComputable ) return;

				numericalValue = event.loaded / event.total;
				if ( numericalValue > numericalValueRef ) {

					numericalValueRef = numericalValue;
					var output = 'Download of "' + url + '": ' + ( numericalValue * 100 ).toFixed( 2 ) + '%';
					scope.onProgress( 'progressLoad', output, numericalValue );

				}
			};
		}

		if ( ! Validator.isValid( onError ) ) {
			onError = function ( event ) {
				var output = 'Error occurred while downloading "' + url + '"';
				scope.logger.logError( output + ': ' + event );
				scope.onProgress( 'error', output, -1 );
			};
		}

		this.fileLoader.setPath( this.path );
		this.fileLoader.load( url, function ( content ) {
			if ( useAsync ) {

				scope.parseAsync( content, onLoad );

			} else {

				var callbacks = new THREE.LoaderSupport.Callbacks();
				callbacks.setCallbackOnMeshAlter( onMeshAlter );
				scope._setCallbacks( callbacks );
				onLoad(
					{
						detail: {
							loaderRootNode: scope.parse( content ),
							modelName: scope.modelName,
							instanceNo: scope.instanceNo
						}
					}
				);

			}

		}, onProgress, onError );

	};

	/**
	 * Identify files or content of interest from an Array of {@link THREE.LoaderSupport.ResourceDescriptor}.
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor[]} resources Array of {@link THREE.LoaderSupport.ResourceDescriptor}
	 * @param Object fileDesc Object describing which resources are of interest (ext, type (string or UInt8Array) and ignore (boolean))
	 * @returns {{}} Object with each "ext" and the corresponding {@link THREE.LoaderSupport.ResourceDescriptor}
	 */
	LoaderBase.prototype.checkResourceDescriptorFiles = function ( resources, fileDesc ) {
		var resource, triple, i, found;
		var result = {};

		for ( var index in resources ) {

			resource = resources[ index ];
			found = false;
			if ( ! Validator.isValid( resource.name ) ) continue;
			if ( Validator.isValid( resource.content ) ) {

				for ( i = 0; i < fileDesc.length && !found; i++ ) {

					triple = fileDesc[ i ];
					if ( resource.extension.toLowerCase() === triple.ext.toLowerCase() ) {

						if ( triple.ignore ) {

							found = true;

						} else if ( triple.type === "Uint8Array" ) {

							// fast-fail on bad type
							if ( ! ( resource.content instanceof Uint8Array ) ) throw 'Provided content is not of type arraybuffer! Aborting...';
							result[ triple.ext ] = resource;
							found = true;

						} else if ( triple.type === "String" ) {

							if ( ! (typeof(resource.content) === 'string' || resource.content instanceof String) ) throw 'Provided  content is not of type String! Aborting...';
							result[ triple.ext ] = resource;
							found = true;

						}

					}

				}
				if ( !found ) throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			} else {

				// fast-fail on bad type
				if ( ! ( typeof( resource.name ) === 'string' || resource.name instanceof String ) ) throw 'Provided file is not properly defined! Aborting...';
				for ( i = 0; i < fileDesc.length && !found; i++ ) {

					triple = fileDesc[ i ];
					if ( resource.extension.toLowerCase() === triple.ext.toLowerCase() ) {

						if ( ! triple.ignore ) result[ triple.ext ] = resource;
						found = true;

					}

				}
				if ( !found ) throw 'Unidentified resource "' + resource.name + '": ' + resource.url;

			}
		}

		return result;
	};

	return LoaderBase;
})();
