/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	build: {
		emptyOutDir: true,
		rollupOptions: {
			external: ['three']
		},
		outDir: 'lib',
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			name: 'objloader2',
			fileName: 'objloader2',
			formats: ['es']
		}
	}
});
