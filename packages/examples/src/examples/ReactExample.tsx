import React from 'react';
import ReactDOM from 'react-dom/client';
import { useLoader, Canvas } from '@react-three/fiber';
import { Object3D, TextureLoader } from 'three';
import { OBJLoader2React } from './ReactHelper.js';

function Model(_props: unknown) {
    const obj = useLoader(
        OBJLoader2React,
        './models/obj/main/female02/female02.obj'
    );
    const texture = useLoader(
        TextureLoader,
        './models/obj/main/female02/uv_grid_opengl.jpg'
    );

    return (
        <group>
            ${(obj as Object3D).children.map(
                (mesh: Object3D, i: number) => <primitive object={mesh} material-map={texture} key={i} />
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
