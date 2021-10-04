import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import modify from 'rollup-plugin-modify';
import { terser } from 'rollup-plugin-terser';
import { name, dependencies, peerDependencies, devDependencies } from './package.json';

const copyConfig = {
  targets: buildCopyConfig(false).concat(buildCopyConfig(true)),
  hook: 'closeBundle'
};

function buildCopyConfig(min) {
  const basedir = min ? 'build/verifymin' : 'build/verify';
  const examplesDir = basedir + '/public/examples';
  const snowpackConfig = min ? 'dev/verify/min/snowpack.config.js' : 'dev/verify/snowpack.config.js';
  const verifyPackageJson = min ? 'dev/verify/min/package.json' : 'dev/verify/package.json';
  const moduleReplacer = min ? 'wwobjloader2/build/wwobjloader2.module.min.js' : 'wwobjloader2';
  const tmOBJLoader2Replacer = '../node_modules/wwobjloader2/build/tmOBJLoader2.js';

  // transformation instructions: Required to verify examples work with bundled lib
  const patternOBJLoader2 = new RegExp('../../src/loaders/OBJLoader2.js', 'g');
  const patternOBJLoader2Worker = new RegExp('./OBJLoader2.js', 'g');
  const patternOBJLoader2Parallel = new RegExp('../../src/loaders/OBJLoader2Parallel.js', 'g');
  const patternMtlObjBridge = new RegExp('../../src/loaders/utils/MtlObjBridge.js', 'g');
  const patternTmOBJLoader2Html = new RegExp('/src/loaders/tmOBJLoader2.js', 'g');

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
        str = str.replace(patternTmOBJLoader2Html, tmOBJLoader2Replacer);
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
        str = str.replace(patternTmOBJLoader2Html, tmOBJLoader2Replacer);
        return str.replace(patternOBJLoader2Parallel, moduleReplacer);
      }
    },
    {
      src: 'public/examples/wtm_potentially_infinite.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternTmOBJLoader2Html, tmOBJLoader2Replacer);
      }
    },
    {
      src: snowpackConfig,
      dest: basedir
    },
    {
      src: verifyPackageJson,
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
      src: 'public/examples/worker/*',
      dest: examplesDir + '/worker'
    },
    {
      src: 'src/loaders/tmOBJLoader2.js',
      dest: 'build',
      transform: (contents, filename) => {
        let str = contents.toString();
        return str.replace(patternOBJLoader2Worker, moduleReplacer);
      }
    },
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
        plugins: [
            terser()
        ]
      },
      {
        format: 'es',
        file: `build/${name}.module.js`
      },
      {
        format: 'es',
        file: `build/${name}.module.min.js`,
        plugins: [
            terser()
        ]
      }
    ],
    external: [ ...Object.keys(peerDependencies), ...Object.keys(dependencies), ...Object.keys(devDependencies) ],
    plugins: [
      resolve(),
      babel(),
      copy(copyConfig),
      modify({
        find: /self.addEventListener.*message.*/,
        replace: ""
      })
    ]
  }
];
