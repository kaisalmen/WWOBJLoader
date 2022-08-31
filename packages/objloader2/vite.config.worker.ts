import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/worker/OBJLoader2Worker.js'),
            name: 'OBJLoader2WorkerStandard',
            fileName: (format) => format === 'iife' ? 'OBJLoader2WorkerClassic.js' : 'OBJLoader2WorkerModule.js',
            formats: ['iife', 'es'],
        },
        outDir: 'lib/worker',
        emptyOutDir: false
    }
});

export default config;
