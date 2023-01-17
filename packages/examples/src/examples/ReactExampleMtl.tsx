import React from 'react';
import ReactDOM from 'react-dom/client';
import { useLoader, Canvas } from '@react-three/fiber';
import { Object3D } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { MtlObjBridge } from 'wwobjloader2';
import { OBJLoader2React } from './utils/ReactHelper.js';

function Model(_props: {}) {
	const obj = useLoader(
		OBJLoader2React,
		'./models/obj/main/female02/female02.obj',
		(loader) => {
			const mtlLoader = new MTLLoader();
			mtlLoader.load(
				'./models/obj/main/female02/female02.mtl',
				(mtl) => {
					loader.setModelName('female02');
					loader.setMaterials(
						MtlObjBridge.addMaterialsFromMtlLoader(mtl)
					);
				}
			);
		}
	);

	return (
		<group>
			${(obj as Object3D).children.map(
				(mesh: Object3D, i: number) => <primitive object={mesh} key={i} />
			)}
		</group>);
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
	(<Canvas camera={{ position: [0, 175, 300] }}>
		<Model/>
		<ambientLight />
		<gridHelper args={[1200, 60, 0xff4444, 0x404040]} />
	</Canvas>
));
