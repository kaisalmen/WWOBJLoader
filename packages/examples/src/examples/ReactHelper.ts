import { CallbackOnLoadType, CallbackOnMeshAlterType, FileLoaderOnErrorType, FileLoaderOnProgressType, OBJLoader2 } from 'wwobjloader2';

export class OBJLoader2React extends OBJLoader2 {
	load(url: string, onLoad?: CallbackOnLoadType, onProgress?: FileLoaderOnProgressType, onError?: FileLoaderOnErrorType, onMeshAlter?: CallbackOnMeshAlterType) {
		OBJLoader2.prototype.load.call(this, url, onLoad!, onProgress, onError, onMeshAlter);
	}
}
