// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"src": "/src",
		"public": "/",
		"node_modules/three/": "/node_modules/three",
	},
	plugins: [
		/* ... */
	],
	packageOptions: {
		source: "local"
	},
	devOptions: {
		open: "none",
		port: 8085
	},
	buildOptions: {
		/* ... */
	},
	optimize: {
		/* ... */
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
		'**/public/webgl_loader_assetpipeline_obj_stage.html',
		'**/LICENSE',
		'**/Dockerfile',
		'**/README.md',
		'**/CHANGELOG.md',
		'**/docker-compose.yml',
		'**/declaration.tsconfig.json',
		'**/jsdoc.json'
	]
};

