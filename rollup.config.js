import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { name, dependencies, devDependencies } from './package.json';

const copyConfig = {
  targets: buildCopyConfig(false).concat(buildCopyConfig(true)),
  hook: 'closeBundle'
};

function buildCopyConfig(min) {
  const basedir = min ? 'build/verifymin' : 'build/verify';
  const examplesDir = basedir + '/public/examples';
  const moduleReplacer = min ? '../libs/wwobjloader2/wwobjloader2.module.min.js' : '../libs/wwobjloader2/wwobjloader2.module.js';
  const moduleReplacerWorker = min ? '../../libs/wwobjloader2/wwobjloader2.module.min.js' : '../../libs/wwobjloader2/wwobjloader2.module.js';

  // transformation instructions: Required to verify examples work with bundled lib
  const patternOBJLoader2 = new RegExp('../../dist/loaders/OBJLoader2.js', 'g');
  const patternOBJLoader2InWorker = new RegExp('../../OBJLoader2.js', 'g');
  const patternOBJLoader2Parallel = new RegExp('../../dist/loaders/OBJLoader2Parallel.js', 'g');
  const patternMtlObjBridge = new RegExp('../../dist/loaders/utils/MtlObjBridge.js', 'g');
  const patternTmOBJ2Loader = new RegExp('../../dist/loaders/workerTaskManager/worker/tmOBJLoader2.js', 'g');
  return [
    {
      src: 'public/index.html',
      dest: basedir + '/public'
    },
    {
      src: 'public/examples/webgl_loader_obj2.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternMtlObjBridge, moduleReplacer);
        return str.replace(patternOBJLoader2, moduleReplacer);
      }
    },
    {
      src: 'public/examples/webgl_loader_obj2_options.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternMtlObjBridge, moduleReplacer);
        str = str.replace(patternOBJLoader2, moduleReplacer);
        return str.replace(patternOBJLoader2Parallel, moduleReplacer);
      }
    },
    {
      src: 'public/examples/webgl_loader_obj2_workermodulesupport.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternOBJLoader2Parallel, moduleReplacer);
      }
    },
    {
      src: 'public/examples/wtm_potentially_infinite.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternTmOBJ2Loader, moduleReplacer);
      }
    },
    {
      src: min ? 'dev/verify/min/snowpack.config.js' : 'dev/verify/snowpack.config.js',
      dest: basedir
    },
    {
      src: 'public/examples/main.css',
      dest: examplesDir
    },
    {
      src: 'public/examples/models/obj/main/*',
      dest: examplesDir + '/models/obj/main'
    },
    {
      src: 'src/loaders/workerTaskManager/worker/*',
      dest: examplesDir + '/worker/',
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternOBJLoader2InWorker, moduleReplacerWorker);
      }
    },
    {
      src: 'node_modules/three',
      dest: basedir + '/libs'
    },
    {
      src: min ? 'build/wwobjloader2.module.min.js' : 'build/wwobjloader2.module.js',
      dest: basedir + '/libs/wwobjloader2'
    }
  ]
};

const terserConfig = {
  keep_classnames: true,
  module: true
}

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
        plugins: [
            terser(terserConfig)
        ]
      },
      {
        format: 'es',
        file: `build/${name}.module.js`,
      },
      {
        format: 'es',
        file: `build/${name}.module.min.js`,
        plugins: [
            terser(terserConfig)
        ]
      }
    ],
    external: [ ...Object.keys(dependencies), ...Object.keys(devDependencies) ],
    plugins: [
      resolve(),
      babel(),
      copy(copyConfig)
    ]
  }
];
