import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { name, dependencies, devDependencies } from './package.json';

// transformation instructions
const patternOBJLoader2 = new RegExp('../../dist/loaders/OBJLoader2.js', 'g');
const patternOBJLoader2Parallel = new RegExp('../../dist/loaders/OBJLoader2Parallel.js', 'g');
const patternMtlObjBridge = new RegExp('../../dist/loaders/utils/MtlObjBridge.js', 'g');
const patternOBJ2LoaderWorker = new RegExp('../../dist/loaders/workerTaskManager/worker/tmOBJLoader2.js', 'g');
const packageModule = `../npm/${name}.module.js`;

const copyConfig = {
  targets: [
    { src: 'public/index.html', dest: 'build/public' },
    {
      src: 'public/examples/webgl_loader_obj2.html',
      dest: 'build/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternMtlObjBridge, packageModule);
        return str.replace(patternOBJLoader2, packageModule);
      }
    },
    {
      src: 'public/examples/webgl_loader_obj2_options.html',
      dest: 'build/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternMtlObjBridge, packageModule);
        str = str.replace(patternOBJLoader2, packageModule);
        return str.replace(patternOBJLoader2Parallel, packageModule);
      }
    },
    {
      src: 'public/examples/webgl_loader_obj2_workermodulesupport.html',
      dest: 'build/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternOBJLoader2Parallel, packageModule);
      }
    },
    {
      src: 'public/examples/wtm_potentially_infinite.html',
      dest: 'build/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternOBJ2LoaderWorker, packageModule);
      }
    },
    {
      src: 'dev/build/snowpack.config.js',
      dest: 'build'
    },
    {
      src: 'public/examples/main.css',
      dest: 'build/public/examples'
    },
    {
      src: 'public/models/obj/female02/*',
      dest: 'build/public/examples/models/obj/female02'
    },
    {
      src: 'public/models/obj/male02/*',
      dest: 'build/public/examples/models/obj/male02'
    },
    {
      src: 'public/models/obj/ninja/*',
      dest: 'build/public/examples/models/obj/ninja'
    },
    {
      src: 'public/models/obj/cerberus/*',
      dest: 'build/public/examples/models/obj/cerberus'
    },
    {
      src: 'public/models/obj/walt/*',
      dest: 'build/public/examples/models/obj/walt'
    }
  ]
};

export default [
  // everything in one package
  {
    input: 'src/index.js',
    output: [
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
