// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    "src": "/dist",
    "public": "/"
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
  exclude: [
    '**/*.sh',
    '**/*/*.d.ts',
    '**/*.tgz',
    '**/archive/**',
    '**/dev/*',
    '**/examples/**',
    '**/public/models/draco/**',
    '**/public/models/gltf/**',
    '**/src/loaders/workerTaskManager/worker/tmOBJLoader.js',
    '**/src/loaders/OBJLoader.*',
    '**/public/webgl_loader_workertaskmanager.html',
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

