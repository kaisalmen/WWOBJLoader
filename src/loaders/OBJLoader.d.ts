import {
	Loader,
	LoadingManager,
	Group,
	Material
} from '../../../src/Three';

export class OBJLoader extends Loader {

	constructor( manager?: LoadingManager );
	materials: { [ key: string ]: Material };

	load( url: string, onLoad: ( group: Group ) => void, onProgress?: ( event: ProgressEvent ) => void, onError?: ( event: ErrorEvent ) => void ): void;
	loadAsync( url: string, onProgress?: ( event: ProgressEvent ) => void ): Promise<Group>;
	parse( data: string ) : Group;
	setMaterials( materials: { [ key: string ]: Material } ) : this;

}
