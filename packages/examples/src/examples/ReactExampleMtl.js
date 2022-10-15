import { createRoot } from "https://esm.sh/react-dom/client?dev";
import React, { useState } from "https://esm.sh/react?dev";
import {
	Canvas,
	useLoader,
} from "https://esm.sh/@react-three/fiber?dev";
import htm from "https://esm.sh/htm";
import { OBJLoader2, MtlObjBridge } from "wwobjloader2";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";

const html = htm.bind(React.createElement);

function Model(props) {
	const obj = useLoader(
		OBJLoader2,
		"./models/obj/main/female02/female02.obj",
		(loader) => {
			const mtlLoader = new MTLLoader();
			mtlLoader.load(
				"./models/obj/main/female02/female02.mtl",
				(mtl) => {
					loader.setModelName("female02");
					loader.setMaterials(
						MtlObjBridge.addMaterialsFromMtlLoader(mtl)
					);
				}
			);
		}
	);

	return html`
		<group>
			${obj.children.map(
		(mesh, i) => html`
					<primitive object=${mesh} key=${i} />
				`
	)}
		</group>
	`;
}

const root = createRoot(document.getElementById("root"));
root.render(html`
	<${Canvas} camera=${{ position: [0, 175, 300] }}>
		<${Model} />
		<ambientLight />
		<gridHelper args=${[1200, 60, 0xff4444, 0x404040]} />
	<//>
`);
