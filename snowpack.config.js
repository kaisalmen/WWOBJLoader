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
/*
      external: [
        "three",
        "three/examples/jsm/controls/TrackballControls.js",
        "three/examples/jsm/libs/dat.gui.module.js",
        "three/examples/jsm/helpers/VertexNormalsHelper.js"
      ],
*/
    source: "local"
  },
  devOptions: {
    open: "none"
  },
  buildOptions: {
    /* ... */
  },
  optimize: {
    bundle: true,
    minify: false,
    treeshake: false,
    target: 'es2020',
    splitting: false,
    preload: false,
    entrypoints: "auto", /* ['src/obj2.js', 'src/wtm.js', 'src/obj2mtl.js'], */
    sourcemap: 'external',
    manifest: false
  },
  exclude: [
    '**/*.sh',
    '**/*/*.d.ts',
    '**/*.tgz',
    '**/archive/**',
    '**/dev/*',
    '**/examples/**',
    '**/public/models/draco/**/*',
    '**/public/models/gltf/**/*',
    '**/public/models/obj/extra/**/*',
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

