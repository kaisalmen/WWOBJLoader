/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

// Config Hints:
// https://vitejs.dev/guide/build.html#multi-page-app

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
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
                    index: path.resolve(__dirname, 'index.html'),
                    obj2_basic: path.resolve(__dirname, 'packages/examples/obj2_basic.html'),
                    obj2parallel_basic: path.resolve(__dirname, 'packages/examples/obj2parallel_basic.html'),
                    obj2_options: path.resolve(__dirname, 'packages/examples/obj2_options.html'),
                    obj2_obj_compare: path.resolve(__dirname, 'packages/examples/obj2_obj_compare.html'),
                    obj2_bugverify: path.resolve(__dirname, 'packages/examples/obj2_bugverify.html'),
                    obj2_react: path.resolve(__dirname, 'packages/examples/obj2_react.html'),
                    obj2_react_mtl: path.resolve(__dirname, 'packages/examples/obj2_react-mtl.html'),
                    assetpipeline: path.resolve(__dirname, 'packages/examples/assetpipeline.html'),
                    assetpipeline_obj_stage: path.resolve(__dirname, 'packages/examples/assetpipeline_obj_stage.html')
                }
            }
        },
        server: {
            port: 8085,
            host: '0.0.0.0'
        },
        test: {
            passWithNoTests: true
        }
    };
});
