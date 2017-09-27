OBJLoader2 and WWOBJLoader2 for three.js
===

[![Latest NPM release](https://img.shields.io/npm/v/wwobjloader2.svg)](https://www.npmjs.com/package/wwobjloader2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/WWOBJLoader/blob/master/LICENSE)

OBJLoader2 is a new loader for the OBJ file format that is additionally executable within a web worker.

Interested in recent changes? Check the [CHANGELOG](CHANGELOG.md).

## Repository structure / NPM content
The directory structure is organized as follows:
- **build**: Contains build libraries and documentation (NPM only)
- **src**: Contains the sources for the loaders
- **test**: Contains Tests/HTML examples
- **resource**: Contains OBJs, MTLs and textures (GitHub only)

## Building
**This only applies to GitHub:** Before you can start to play around some post-checkout initialization steps have to be performed.<br>
**[npm](https://nodejs.org)** and **[gulp](http://gulpjs.com/)** must be installed on your local platform. They are required for retrieving dependencies and for building combined source bundles and the documentation. 
After checkout run:<br>
```bash
npm update
```

You require gulp to be able to build the bundles. If you have not yet installed the cli, execute this:<br>
```bash
npm install --global gulp-cli
```

From the project's root run `gulp` to create The documentation in directory **build/docs** and the bundles in directory **build**:
 - **OBJLoader2[.min].js**: Contains all code required for the loader to work
 - **LoaderSupport[.min].js**: Consists of common support functions, worker control and worker director code


## Implementation Overview
Version 2.0.0 introduced substantial enhancements and chances especially but not only to the way the web worker execution of the parser is performed:
- `OBJLoader2` and `WWOBJLoader2` have been fused. Worker based asynchronous execution of the loader is now handled by `parseAsync`, `load` with `useAsync` flag or `run` which is used for batch processing (see example **OBJLoader2 usage options** below). Common functionality independent of OBJ parsing has been moved to package `THREE.LoaderSupport` located in `LoaderSupport.js`. The Parser can either be executed directly or it is run inside a web worker (`THREE.LoaderSupport.WorkerSupport` handles the building and execution). Raw results are passed to a common mesh builder function. These support classes can be used to transform other Loaders to support asynchronous parsing. 

### Features
`OBJLoader2` contains all features of the existing `OBJLoader` and it has to . These are some interesting POIs:
- `OBJLoader2.parse` method accepts arraybuffer or string as input. Text processing is approx. 15-20 pecent slower
- `OBJLoader2.parseAsync` only accepts arraybuffer as input as buffer is passed to worker.
- Face N-Gons are now support supported
- Indexed rendering is now available, but `OBJLoader2` must it must be switched on via `setUseIndices` (see example **OBJLoader2 basic usage** below).
- `OBJLoader2` must now be re-instantiated every time it is used, but caching of worker code via `WorkerSupport` and `LoaderDirector` is available
- `ConsoleLogger` now encapsulates all console logging. Logging can be fully deactivated or switched to debug mode (issue #15)
- progress callbacks provide numerical values to indicate overall progress of download or parsing (issue #16) 
- "o name" (object), "g name" (group) and new vertex definition without any other declaration lead to new object creation
- Multi-Materials are created when needed
- Flat smoothing defined by "s 0" or "s off" is supported and Multi-Material is created when one object/group defines both smoothing groups equal and not equal to zero.


### Directing the symphony
`LoaderDirector` is able to create a configurable amount of `OBJLoader2` via reflection just by providing parameters. It is now able to direct all loaders that over automation via `run` and use `WorkerSupport` to allow running the `Parser` in a web worker. An instruction queue is fed and all workers created will work to deplete it once they have been started.


### Web Worker Support
`LoaderSupport` offers utility functions used to serialize existing code into strings that are used to build the web worker code. Any loader that uses it must provide a function that builds the parser code (for example see `buildCode` inside `OBJLoader2.parseAsync`). `WorkerSupport` provides wrapper code to create the web worker and to organize communication with it. Configuration of the Parser inside the worker is handled by a configuration object that configures the parser identical to synchronous usage.

## Examples:
[OBJLoader2 basic usage](https://kaisalmen.de/proto/test/objloader2/main.src.html)<br>
[OBJLoader2 usage options](https://kaisalmen.de/proto/test/wwobjloader2/main.src.html)<br>
[OBJLoader2 Stage](https://kaisalmen.de/proto/test/wwobjloader2stage/main.src.html)<br>
[LoaderDirector - Mesh Spray](https://kaisalmen.de/proto/test/meshspray/main.src.html)<br>
[LoaderDirector Parallels Demo](https://kaisalmen.de/proto/test/wwparallels/main.src.html)<br>

## Models and resources

Use gulp to download missing resources (OBJ, MTL files and textures):
```bash
gulp get-resources
```

Have fun!

Kai
