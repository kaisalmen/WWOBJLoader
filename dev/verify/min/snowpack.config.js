// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

// This is bundled with npm package to allow direct usage

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"libs/wwobjloader2": "/libs/wwobjloader2",
		"public": "/",
		"libs/three": "/libs/three",
		"src": "/dist"
	},
	plugins: [
		/* ... */
	],
	packageOptions: {
		source: "local"
	},
	devOptions: {
		open: "none",
		port: 8087
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
