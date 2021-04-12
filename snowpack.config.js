// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"src": "/dist",
		"public": "/",
		"node_modules/three/build": "/libs/three",
		"node_modules/three/examples/js/loaders": "/libs/loaders"
	},
	plugins: [
		/* ... */
	],
	packageOptions: {
		source: "local"
	},
	devOptions: {
		open: "none"
	},
	buildOptions: {
		/* ... */
	},
	optimize: {
/*
		bundle: true,
		minify: false,
		treeshake: false,
		target: 'es2020',
		splitting: false,
		preload: false,
		entrypoints: ['public/index.html'], // "auto",
		sourcemap: 'external',
		manifest: false
 */
	},
	exclude: [
		'**/*.sh',
		'**/*/*.d.ts',
		'**/*.tgz',
		'**/archive/**',
		'**/dev/*',
		'**/public/models/draco/**/*',
		'**/public/models/gltf/**/*',
		'**/public/models/obj/misc/**/*',
		'**/src/loaders/workerTaskManager/worker/tmOBJLoader.js',
		'**/src/loaders/OBJLoader.*',
		'**/public/webgl_loader_workertaskmanager.html',
		'**/public/webgl_loader_assetpipeline_obj_stage.html',
		'**/LICENSE',
		'**/Dockerfile',
		'**/README.md',
		'**/CHANGELOG.md',
		'**/gulpfile.js',
		'**/docker-compose.yml',
		'**/declaration.tsconfig.json',
		'**/jsdoc.json'
	]
};

