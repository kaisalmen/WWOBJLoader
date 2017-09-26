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
- `OBJLoader2` and `WWOBJLoader` have been fused. Worker based asynchronous execution of the loader is now handled by `parseAsync` method. Common functionality independent of OBJ parsing has been moved to `LoaderSupport`. This enables the Parser's execution in a worker. Raw results are passed to a common mesh builder function. This functionality can now be applied to any other Loader.

#### **UPDATE REQUIRED:** Parser POIs
The parser and mesh creation functions have reached full feature parity with the existing OBJ loader. These are some interesting POIs:
- Per default `OBJLoader2` parse method requires arraybuffer as input. A fallback method for parsing text directly still exists, but it is approx. 15-20 pecent slower
- Face N-Gons are supported
- Direct re-usage of all involved classes is fully supported. I took care in resource clean-up and re-validation of status on all involved objects
- "o name" (object), "g name" (group) and new vertex definition without any other declaration lead to new object creation
- Multi-Materials are created when needed
- Flat smoothing defined by "s 0" or "s off" is supported and Multi-Material is created when one object/group defines both smoothing groups equal and not equal to zero.


#### **UPDATE REQUIRED:** Directing the symphony
`WWOBJLoader2Director` is introduced to ease usage of multiple `WWOBJLoader2`. It is able to create a configurable amount of loaders via reflection just by providing parameters. An instruction queue is fed and all workers created will work to deplete it once they have been started. The usage of `WWOBJLoader2Director` is not required.


#### **UPDATE REQUIRED:** Bundle Details
The web worker code is contained in `WWOBJLoader2.js`. At worker init a string is built from code within the class that contains all code of private classes within `WWOBJLoader2._buildWebWorkerCode`. `OBJLoader2` also provides provides a build function as `Parser` is private to it which is called by during the execution of the function. The string contains all code required for the worker to be fully functional. It is put to a blob that is used to create the worker. This reliefs the user of the loader to care about path issues and static imports within the worker are no longer required.


## Examples:
[OBJLoader2 basic usage](https://kaisalmen.de/proto/test/objloader2/main.src.html)<br>
[OBJLoader2 usage options](https://kaisalmen.de/proto/test/wwobjloader2/main.src.html)<br>
[OBJLoader2 Stage](https://kaisalmen.de/proto/test/wwobjloader2stage/main.src.html)<br>
[LoaderDirector - Mesh Spray](https://kaisalmen.de/proto/test/meshspray/main.src.html)<br>
[LoaderDirector Parallels Demo](https://kaisalmen.de/proto/test/wwparallels/main.src.html)<br>

## Models and resources

Use gulp to download missing resources (OBJ, MTL files and texutres):
```bash
gulp get-resources
```
