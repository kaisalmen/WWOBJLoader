import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/worker/OBJLoader2Worker.js'),
            name: 'OBJLoader2WorkerStandard',
            fileName: () => 'OBJLoader2WorkerStandard.js',
            formats: ['iife']
        },
        outDir: 'dist',
        emptyOutDir: false
    }
});

export default config;
