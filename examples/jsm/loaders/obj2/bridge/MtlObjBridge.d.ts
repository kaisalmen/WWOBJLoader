import {
  MaterialCreator
} from 'three/examples/jsm/loaders/MTLLoader';

export namespace MtlObjBridge {
  export function link(processResult: object, assetLoader: object): void;
  export function addMaterialsFromMtlLoader(materialCreator: MaterialCreator): object;
}
