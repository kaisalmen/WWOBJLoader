import {
	FileLoader,
	Loader,
	LineSegments,
	Points,
	// Parser only
	Object3D,
	Mesh,
	BufferGeometry,
	BufferAttribute,
	Material,
	LoadingManager
} from 'three';
import {
	MaterialStore,
	MaterialUtils
} from 'wtd-three-ext';
import {
	MaterialMetaInfoType,
	OBJLoader2Parser,
	PreparedMeshType
} from './OBJLoader2Parser.js';

export type CallbackOnLoadType = ((object3D: Object3D) => void) | null;
export type CallbackOnProgressMessageType = ((progressMessage: string) => void) | null;
export type CallbackOnErrorMessageType = ((error: Error) => void) | null;
export type CallbackOnMeshAlterType = ((mesh: Mesh | LineSegments | Points, object3D: Object3D) => void) | null;

export type CallbacksType = {
	onLoad: CallbackOnLoadType;
	onError: CallbackOnErrorMessageType;
	onProgress: CallbackOnProgressMessageType;
	onMeshAlter: CallbackOnMeshAlterType;
}

export type FileLoaderOnLoadType = (response: string | ArrayBuffer) => void;
export type FileLoaderOnProgressType = (request: ProgressEvent) => void;
export type FileLoaderOnErrorType = (event: ErrorEvent) => void;

/**
 * Creates a new OBJLoader2. Use it to load OBJ data from files or to parse OBJ data from arraybuffer or text.
 *
 * @param {LoadingManager} [manager] The loadingManager for the loader to use. Default is {@link LoadingManager}
 * @constructor
 */
export class OBJLoader2 extends Loader {

	static OBJLOADER2_VERSION = '5.1.0';

	protected parser = new OBJLoader2Parser();
	protected baseObject3d = new Object3D();
	protected materialStore = new MaterialStore(true);
	protected materialPerSmoothingGroup = false;
	protected useOAsMesh = false;
	protected useIndices = false;
	protected disregardNormals = false;
	protected modelName = 'noname';

	private callbacks: CallbacksType;

	/**
	 *
	 * @param {LoadingManager} [manager]
	 */
	constructor(manager: LoadingManager) {
		super(manager);
		this.callbacks = {
			onLoad: null,
			onError: null,
			onProgress: null,
			onMeshAlter: null
		};
	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 *
	 * @return {OBJLoader2}
	 */
	setLogging(enabled: boolean, debug: boolean) {
		this.parser.setLogging(enabled, debug);
		return this;
	}

	/**
	 * Tells whether a material shall be created per smoothing group.
	 *
	 * @param {boolean} materialPerSmoothingGroup=false
	 * @return {OBJLoader2}
	 */
	setMaterialPerSmoothingGroup(materialPerSmoothingGroup: boolean) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup === true;
		return this;
	}

	/**
	 * Usually 'o' is meta-information and does not result in creation of new meshes, but mesh creation on occurrence of "o" can be enforced.
	 *
	 * @param {boolean} useOAsMesh=false
	 * @return {OBJLoader2}
	 */
	setUseOAsMesh(useOAsMesh: boolean) {
		this.useOAsMesh = useOAsMesh === true;
		return this;
	}

	/**
	 * Instructs loaders to create indexed {@link BufferGeometry}.
	 *
	 * @param {boolean} useIndices=false
	 * @return {OBJLoader2}
	 */
	setUseIndices(useIndices: boolean) {
		this.useIndices = useIndices === true;
		return this;
	}

	/**
	 * Tells whether normals should be completely disregarded and regenerated.
	 *
	 * @param {boolean} disregardNormals=false
	 * @return {OBJLoader2}
	 */
	setDisregardNormals(disregardNormals: boolean) {
		this.disregardNormals = disregardNormals === true;
		return this;
	}

	/**
	 * Set the name of the model.
	 *
	 * @param {string} modelName
	 * @return {OBJLoader2}
	 */
	setModelName(modelName: string) {
		if (modelName.length > 0) {
			this.modelName = modelName;
		}
		return this;
	}

	/**
	 * Returns the name of the models
	 * @return {String}
	 */
	getModelName() {
		return this.modelName;
	}

	/**
	 * Set the node where the loaded objects will be attached directly.
	 *
	 * @param {Object3D} baseObject3d Object already attached to scenegraph where new meshes will be attached to
	 * @return {OBJLoader2}
	 */
	setBaseObject3d(baseObject3d: Object3D) {
		this.baseObject3d = baseObject3d;
		return this;
	}

	/**
	 * Clears materials object and sets the new ones.
	 *
	 * @param {Object} materials Object with named materials
	 * @return {OBJLoader2}
	 */
	setMaterials(materials: Record<string, Material>) {
		this.materialStore.addMaterialsFromObject(materials, false);
		return this;
	}

	/**
	 * Register a function that is called when parsing was completed.
	 *
	 * @param {Function} onLoad
	 * @return {OBJLoader2}
	 */
	setCallbackOnLoad(onLoad: CallbackOnLoadType) {
		this.callbacks.onLoad = onLoad;
		return this;
	}

	/**
	 * Register a function that is used to report overall processing progress.
	 *
	 * @param {Function} onProgress
	 * @return {OBJLoader2}
	 */
	setCallbackOnProgress(onProgress: CallbackOnProgressMessageType) {
		this.callbacks.onProgress = onProgress;
		return this;
	}

	/**
	 * Register an error handler function that is called if errors occur. It can decide to just log or to throw an exception.
	 *
	 * @param {Function} onError
	 * @return {OBJLoader2}
	 */
	setCallbackOnError(onError: CallbackOnErrorMessageType) {
		this.callbacks.onError = onError;
		return this;
	}

	/**
	 * Register a function that is called once a single mesh is available and it could be altered by the supplied function.
	 *
	 * @param {Function} [onMeshAlter]
	 * @return {OBJLoader2}
	 */
	setCallbackOnMeshAlter(onMeshAlter: CallbackOnMeshAlterType) {
		this.callbacks.onMeshAlter = onMeshAlter;
		return this;
	}

	/**
	 * Use this convenient method to load a file at the given URL. By default the fileLoader uses an ArrayBuffer.
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {FileLoaderOnLoadType} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
	 * @param {FileLoaderOnProgressType} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {FileLoaderOnErrorType} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
	 * @param {OnMeshAlterType} [onMeshAlter] Called after every single mesh is made available by the parser
	 */
	load(url: string, onLoad: CallbackOnLoadType, onProgress?: FileLoaderOnProgressType, onError?: FileLoaderOnErrorType, onMeshAlter?: CallbackOnMeshAlterType) {
		const scope = this;
		if (!(onLoad instanceof Function)) {
			const badOnLoadError = new Error('onLoad is not a function! Aborting...');
			this._onError(badOnLoadError);
			throw badOnLoadError;
		}
		else {
			this.setCallbackOnLoad(onLoad);
		}

		if (!onError || !(onError instanceof Function)) {
			onError = function(errorEvent: ErrorEvent) {
				if (errorEvent.currentTarget) {
					let errorMessage = 'Error occurred while downloading!\nurl: ' + errorEvent.currentTarget;
					scope._onError(new Error(errorMessage));
				}
			}
		}

		if (!url) {
			onError(new ErrorEvent('An invalid url was provided. Unable to continue!'));
		}
		const urlFull = new URL(url, window.location.href).href;
		let filename = urlFull;
		const urlParts = urlFull.split('/');
		if (urlParts.length > 2) {
			filename = urlParts[urlParts.length - 1];
			let urlPartsPath = urlParts.slice(0, urlParts.length - 1).join('/') + '/';
			if (urlPartsPath !== undefined) this.path = urlPartsPath;
		}
		if (!onProgress || !(onProgress instanceof Function)) {
			let numericalValueRef = 0;
			let numericalValue = 0;
			onProgress = function(event) {
				if (!event.lengthComputable) return;

				numericalValue = event.loaded / event.total;
				if (numericalValue > numericalValueRef) {
					numericalValueRef = numericalValue;
					const output = `Download of "${url}": ${(numericalValue * 100).toFixed(2)}%`;
					scope._onProgress(output);
				}
			};
		}

		if (onMeshAlter) {
			this.setCallbackOnMeshAlter(onMeshAlter);
		}

		const fileLoaderOnLoad = function(content: string | ArrayBuffer) {
			scope.parse(content);
		};
		const fileLoader = new FileLoader(this.manager);
		fileLoader.setPath(this.path || this.resourcePath);
		fileLoader.setResponseType('arraybuffer');
		fileLoader.load(filename, fileLoaderOnLoad, onProgress, onError);
	}

	/**
	 * Overrides the implementation of THREE.Loader, so it supports onMeshAlter.
	 *
	 * @param {string}  url A string containing the path/URL of the file to be loaded.
	 * @param {Function} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
	 * @param {Function} [onMeshAlter] Called after every single mesh is made available by the parser} url
	 * @returns Promise
	 */
	loadAsync(url: string, onProgress?: FileLoaderOnProgressType, onMeshAlter?: CallbackOnMeshAlterType) {
		const scope = this;
		return new Promise(function(resolve, reject) {
			scope.load(url, resolve, onProgress, reject, onMeshAlter);
		});
	}

	/**
	 * Parses OBJ data synchronously from arraybuffer or string and returns the {@link Object3D}.
	 *
	 * @param {ArrayBuffer|string} content OBJ data as Uint8Array or String
	 * @return {Object3D}
	 */
	parse(objToParse: string | ArrayBuffer) {
		if (this.parser.isLoggingEnabled()) {
			console.info('Using OBJLoader2 version: ' + OBJLoader2.OBJLOADER2_VERSION);
			console.time('OBJLoader parse: ' + this.modelName);
		}

		if (objToParse instanceof ArrayBuffer) {
			if (this.parser.isLoggingEnabled()) {
				console.info('Parsing arrayBuffer...');
			}
			this.configure();
			this.parser.execute(objToParse as ArrayBufferLike);
		}
		else if (typeof (objToParse) === 'string') {
			if (this.parser.isLoggingEnabled()) {
				console.info('Parsing text...');
			}
			this.configure();
			this.parser.executeLegacy(objToParse);
		}
		else {
			this._onError(new Error('Provided objToParse was neither of type String nor Uint8Array! Aborting...'));
		}
		if (this.parser.isLoggingEnabled()) {
			console.timeEnd('OBJLoader parse: ' + this.modelName);
		}
		return this.baseObject3d;
	}

	private configure() {
		this.parser.setBulkConfig({
			materialPerSmoothingGroup: this.materialPerSmoothingGroup,
			useOAsMesh: this.useOAsMesh,
			useIndices: this.useIndices,
			disregardNormals: this.disregardNormals,
			modelName: this.modelName,
			materialNames: new Set(Array.from(this.materialStore.getMaterials().keys()))
		});

		this.parser._onAssetAvailable = (preparedMesh: PreparedMeshType) => {
			const mesh = OBJLoader2.buildThreeMesh(preparedMesh, this.materialStore.getMaterials(), this.parser.isDebugLoggingEnabled());
			if (mesh) {
				this._onMeshAlter(mesh, preparedMesh.materialMetaInfo);
				this.baseObject3d.add(mesh);
			}
		};
		this.parser._onLoad = () => {
			this._onLoad();
		};
		this.printCallbackConfig();
	}

	protected printCallbackConfig() {
		if (this.parser.isLoggingEnabled()) {
			let printedConfig = 'OBJLoader2 callback configuration:'
			if (this.callbacks.onProgress !== null) {
				printedConfig += '\n\tcallbacks.onProgress: ' + this.callbacks.onProgress.name;
			}
			if (this.callbacks.onError !== null) {
				printedConfig += '\n\tcallbacks.onError: ' + this.callbacks.onError.name;
			}
			if (this.callbacks.onMeshAlter !== null) {
				printedConfig += '\n\tcallbacks.onMeshAlter: ' + this.callbacks.onMeshAlter.name;
			}
			if (this.callbacks.onLoad !== null) {
				printedConfig += '\n\tcallbacks.onLoad: ' + this.callbacks.onLoad.name;
			}
			console.info(printedConfig);
		}
	}

	static buildThreeMesh({
		meshName: meshName,
		vertexFA: vertexFA,
		normalFA: normalFA,
		uvFA: uvFA,
		colorFA: colorFA,
		indexUA: indexUA,
		createMultiMaterial: createMultiMaterial,
		geometryGroups: geometryGroups,
		multiMaterial: multiMaterial,
		materialMetaInfo: materialMetaInfo
	}: PreparedMeshType, materials: Map<string, Material>, debugLogging: boolean): Mesh | LineSegments | Points {
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new BufferAttribute(vertexFA, 3, false));
		if (normalFA !== null) {
			geometry.setAttribute('normal', new BufferAttribute(normalFA, 3, false));
		}
		if (uvFA !== null) {
			geometry.setAttribute('uv', new BufferAttribute(uvFA, 2, false));
		}
		if (colorFA !== null) {
			geometry.setAttribute('color', new BufferAttribute(colorFA, 3, false));
		}
		if (indexUA !== null) {
			geometry.setIndex(new BufferAttribute(indexUA, 1, false));
		}

		if (geometryGroups.length > 0) {
			for (const geometryGroup of geometryGroups) {
				geometry.addGroup(geometryGroup.materialGroupOffset, geometryGroup.materialGroupLength, geometryGroup.materialIndex);
			}
		}

		// compute missing vertex normals only after indices have been added!
		if (normalFA === null) {
			geometry.computeVertexNormals();
		}

		let material;
		if (materialMetaInfo.materialCloneInstructions.length > 0) {
			for (const materialCloneInstruction of materialMetaInfo.materialCloneInstructions) {
				material = MaterialUtils.cloneMaterial(materials, materialCloneInstruction, debugLogging);
			}
		}
		else {
			material = materials.get(materialMetaInfo.materialName);
		}

		const realMultiMaterials: Material[] = [];
		if (createMultiMaterial) {
			for (let i = 0; i < multiMaterial.length; i++) {
				const currentMultiMaterial = materials.get(multiMaterial[i]);
				if (currentMultiMaterial) {
					realMultiMaterials[i] = currentMultiMaterial;
				}
			}
		}

		let mesh;
		const appliedMaterial = createMultiMaterial ? realMultiMaterials : material;
		if (materialMetaInfo.geometryType === 0) {
			mesh = new Mesh(geometry, appliedMaterial);
		}
		else if (materialMetaInfo.geometryType === 1) {
			mesh = new LineSegments(geometry, appliedMaterial);
		}
		else {
			mesh = new Points(geometry, appliedMaterial);
		}
		if (mesh) {
			mesh.name = meshName;
		}
		return mesh;
	}

	_onProgress(text: string) {
		if (this.callbacks.onProgress !== null) {
			this.callbacks.onProgress(text);
		}
		else {
			this.parser._onProgress(text);
		}
	}

	_onError(error: Error) {
		if (this.callbacks.onError !== null) {
			this.callbacks.onError(error);
		}
		else {
			this.parser._onError(error.message);
		}

	}

	_onMeshAlter(mesh: Mesh | LineSegments | Points, _materialMetaInfo?: MaterialMetaInfoType) {
		if (this.callbacks.onMeshAlter !== null) {
			this.callbacks.onMeshAlter(mesh, this.baseObject3d);
		}
	}

	_onLoad() {
		if (this.callbacks.onLoad !== null) {
			this.callbacks.onLoad(this.baseObject3d);
		}
	}

}
