import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/worker/helloWorldWorkerModule.ts'),
            name: 'helloWorldWorkerStandard',
            fileName: () => 'helloWorldWorkerStandard.js',
            formats: ['iife']
        },
        outDir: 'dist',
        emptyOutDir: false
    }
});

export default config;
