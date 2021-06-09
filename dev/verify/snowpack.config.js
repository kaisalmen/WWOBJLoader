// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

// This is bundled with npm package to allow direct usage

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"public": "/",
		"node_modules/three": "/node_modules/three",
		"node_modules/three-wtm": "/node_modules/three-wtm",
		"node_modules/wwobjloader2": "/node_modules/wwobjloader2"
	},
	plugins: [
		/* ... */
	],
	packageOptions: {
		source: "local"
	},
	devOptions: {
		open: "none",
		port: 8086
	},
	buildOptions: {
		/* ... */
	},
	optimize: {
		/* ... */
	},
	exclude: [
		/* ... */
	]
};
