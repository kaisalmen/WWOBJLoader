import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { name, dependencies, devDependencies } from './package.json';

// transformation instructions
const patternOBJLoader2 = new RegExp('../src/loaders/OBJLoader2.js', 'g');
const patternOBJLoader2Parallel = new RegExp('../src/loaders/OBJLoader2Parallel.js', 'g');
const patternWorkerTaskManager = new RegExp('../src/loaders/workerTaskManager/WorkerTaskManager.js', 'g');
const patternMtlObjBridge = new RegExp('../src/loaders/utils/MtlObjBridge.js', 'g');
const packageModule = '../wwobjloader2.module.js';

const copyConfig = {
  targets: [
//    { src: 'public/index.html', dest: 'build/examples' },
    {
      src: 'public/webgl_loader_obj2.html',
      dest: 'build/npm/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternMtlObjBridge, packageModule);
        str = str.replace(patternOBJLoader2, packageModule);
        return str;
      }
    },
    {
      src: 'public/webgl_loader_obj2_options.html',
      dest: 'build//npm/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternMtlObjBridge, packageModule);
        str = str.replace(patternOBJLoader2, packageModule);
        str = str.replace(patternOBJLoader2Parallel, packageModule);
        str = str.replace(patternWorkerTaskManager, packageModule);
        return str;
      }
    },
    {
      src: 'dev/build/index.html',
      dest: 'build/npm'
    },
    {
      src: 'dev/build/snowpack.config.js',
      dest: 'build'
    },
    {
      src: 'public/main.css',
      dest: 'build/npm/examples'
    },
    {
      src: 'public/models/obj/female02/*',
      dest: 'build/npm/examples/models/obj/female02'
    },
    {
      src: 'public/models/obj/male02/*',
      dest: 'build/npm/examples/models/obj/male02'
    },
    {
      src: 'public/models/obj/ninja/*',
      dest: 'build/npm/examples/models/obj/ninja'
    },
    {
      src: 'public/models/obj/cerberus/*',
      dest: 'build/npm/examples/models/obj/cerberus'
    },
    {
      src: 'public/models/obj/walt/*',
      dest: 'build/npm/examples/models/obj/walt'
    }
  ]
};

export default [
  // everything in one package
  {
    input: 'src/index.js',
    output: [
/*
      {
        format: 'cjs',
        file: `build/${name}.common.js`,
        exports: 'auto'
      },
      {
        format: 'cjs',
        file: `build/${name}.common.min.js`,
        exports: 'auto',
        plugins: [terser()]
      },
*/
      {
        format: 'es',
        file: `build/npm/${name}.module.js`,
      },
      {
        format: 'es',
        file: `build/npm/${name}.module.min.js`,
        plugins: [terser()]
      }
    ],
    external: [ ...Object.keys(dependencies), ...Object.keys(devDependencies) ],
    plugins: [
      resolve(),
      babel(),
      copy(copyConfig),
    ]
  }
];
