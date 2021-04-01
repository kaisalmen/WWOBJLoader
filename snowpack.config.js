// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    "src": "/dist",
    "public": "/",
    "node_modules/three/build/": "/libs/"
  },
  plugins: [
    /* ... */
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  optimize: {
    bundle: true,
    minify: true,
    target: 'es2018',
    treeshake: true,
  },
  exclude: [
    '**/*.sh',
    '**/*/*.d.ts',
    '**/*.tgz',
    '**/archive/**',
    '**/dev/*',
    '**/examples/**',
    '**/public/models/draco/**',
    '**/public/models/gltf/**',
    '**/public/models/obj/bugs/**',
    '**/public/models/obj/verify/**',
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

