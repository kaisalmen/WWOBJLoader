import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
    return {
        build: {
            target: ['es2022'],
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    obj2_basic: path.resolve(__dirname, 'obj2_basic.html'),
                    obj2_basic_offscreen: path.resolve(__dirname, 'obj2_basic_offscreen.html'),
                    obj2parallel_basic: path.resolve(__dirname, 'obj2parallel_basic.html'),
                    obj2_options: path.resolve(__dirname, 'obj2_options.html'),
                    obj2_obj_compare: path.resolve(__dirname, 'obj2_obj_compare.html'),
                    assetpipeline: path.resolve(__dirname, 'assetpipeline.html'),
                    obj2_react: path.resolve(__dirname, 'obj2_react.html'),
                    obj2_react_mtl: path.resolve(__dirname, 'obj2_react_mtl.html')
                },
                output: {
                    esModule: true
                }
            },
            minify: false,
            assetsInlineLimit: 128,
            outDir: path.resolve(__dirname, 'production'),
            emptyOutDir: true,
        },
        base: 'https://kaisalmen.github.io/WWOBJLoader/',
        optimizeDeps: {
            esbuildOptions: {
                target: 'es2022'
            }
        }
    };
});
