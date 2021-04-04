import babel from '@rollup/plugin-babel';
import { terser } from "rollup-plugin-terser";
import { name, dependencies } from './package.json';

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
        file: `build/${name}.module.js`
      },
      {
        format: 'es',
        file: `build/${name}.module.min.js`,
        plugins: [terser()]
      }

    ],
    external: [ ...Object.keys(dependencies) ],
    plugins: [
      babel()
    ]
  },
/*
  // independent obj2
  {
    input: 'src/obj2.js',
    output: [
      {
        format: 'cjs',
        file: `build/obj2.common.js`,
        exports: 'auto'
      },
      {
        format: 'es',
        file: `build/obj2.module.js`
      }
    ],
    external: [ ...Object.keys(dependencies) ],
    plugins: [
      babel()
    ]
  }
 */
];
