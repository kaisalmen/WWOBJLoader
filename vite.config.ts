/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

// Config Hints:
// https://vitejs.dev/guide/build.html#multi-page-app

export default defineConfig(({ command }) => {
	console.log(`Running: ${command}`);
	const dirExamples = path.resolve(__dirname, 'pacakges/examples');
	return {
		build: {
			rollupOptions: {
				external: [
					'three',
					'three/examples/jsm/controls/TrackballControls',
					'three/examples/jsm/helpers/VertexNormalsHelper',
					'three/examples/jsm/loaders/MTLLoader'
				],
				input: {
					index: path.resolve(dirExamples, 'index.html'),
					obj2_basic: path.resolve(dirExamples, 'obj2_basic.html'),
					obj2parallel_basic: path.resolve(dirExamples, 'obj2parallel_basic.html'),
					obj2_options: path.resolve(dirExamples, 'obj2_options.html'),
					obj2_bugverify: path.resolve(dirExamples, 'obj2_bugverify.html'),
					obj2_react: path.resolve(dirExamples, 'obj2_react.html'),
					obj2_react_mtl: path.resolve(dirExamples, 'obj2_react-mtl.html'),
					assetpipeline: path.resolve(dirExamples, 'assetpipeline.html'),
					assetpipeline_obj_stage: path.resolve(dirExamples, 'assetpipeline_obj_stage.html')
				},
				plugins: [
				]
			}
		},
		server: {
			port: 8085,
			host: '0.0.0.0'
		}
	};
});
