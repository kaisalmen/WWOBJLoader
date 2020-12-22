OBJLoader2 & WorkerTaskManager for three.js
===
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/WWOBJLoader/blob/dev/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/WWOBJLoader>)

## **Main branches:**

Main development now takes place on branch [dev](https://github.com/kaisalmen/WWOBJLoader/tree/dev).
<br>
Last stable release available with three.js is available on branch [stable](https://github.com/kaisalmen/WWOBJLoader/tree/stable).

***IMPORTANT: This README is outdated and will be fully updated soon.***


OBJLoader2 is a new loader for the OBJ file format that is additionally executable within a web worker.

Interested in recent changes? Check the [CHANGELOG](CHANGELOG.md).



From now on I will no longer release `OBJLoader2` and `OBJLoader2Parallel` and sub-sequent features on npm. Extensions&Updates will be made available via three.js monthly release.


## Repository structure
The directory structure now mimics the three.js directory structure to easy porting of changes:
- **examples**: Contains Tests/HTML examples
- **examples/jsm**: Contains the sources for the loaders
- **examples/models**: Contains OBJs, MTLs and textures

## Prerequisites
If you have docker & docker-compose available there is no need to install any npm related software.
From the root of the repo just do:
```shell script
docker-compose up -d --build
```
It will init all files required (build directory and src to get all used three.js code working properly) and start a [local http server on port 8085](http://localhost:8085).
Nginx configuration is stored here: `docker/nginx.conf`. Adjust according your needs and rebuild the container.
If you want to update the npm configuration, e.g. change `package.json` then do:
```shell script
docker exec -it obj2dev bash -c "cd /workspace/WWOBJLoader && npm install"
```
If you want to run something with gulp do for example:
```shell script
docker exec -it obj2dev bash -c "cd /workspace/WWOBJLoader && gulp set-versions"
```

If you don't want to use the docker environment, then you need to set-up and **[npm](https://nodejs.org)** and **[gulp](http://gulpjs.com/)** locally on your local platform.
After you have cloned this repository locally and have npm and gulp set-up, please run:<br>
```shell script
npm install
```

## Build

### Docs
From the project's root run `gulp` to create The documentation in directory **build/docs** and set the versions. No more bundling is performed.
 
### Models and resources
Use gulp to download missing resources (OBJ, MTL files and textures):
```shell script
gulp get-resources
```


## Implementation Overview
***NOT YET UPDATED!***
 
### Features
`OBJLoader2` has all OBJ parsing capabilities of the existing `OBJLoader` and in addition to worker-processing it features indexed rendering including vertex reduction. Please see the following list of features:
- `OBJLoader2.parse` and `OBJLoader2Parallel.parse` methods accept `ArrayBuffer` or `String` as input. Text processing is approx. 15-20 pecent slower
- Indexed rendering is available if switched on via `setUseIndices` (see `useLoadSync` in example **OBJLoader2 usage options** below).
- Face N-Gons are supported
- `OBJLoader2` must now be re-instantiated every time it is used, but caching of worker code via `WorkerExecutionSupport` is available
- Console logging is deactivated by default, but can be switched on if desired (including debug logging)
- Progress callbacks provide numerical values to indicate overall progress of download or parsing (issue #16)
- Multi-Materials are created when needed
- Flat smoothing defined by "s 0" or "s off" is supported and Multi-Material is created when one object/group defines both smoothing groups equal and not equal to zero.
- Support for points and lines was added (since V2.3.0) 
- New mesh detection relies 'g' occurrence or 'f', 'l' or 'p' type change (since V2.3.0). This allows mutiple mesh definitions within one group.
- Negative face indices are supported (issue #28)


### Web Worker Support
***NOT YET UPDATED!*** `WorkerExecutionSupport` offers utility functions used to serialize existing code into strings that are used to build the web worker code. Any loader that uses it must provide a function that builds the parser code (for example see `buildCode` inside `OBJLoader2.parseAsync`). `WorkerSupport` provides wrapper code to create the web worker and to organize communication with it. Configuration of the Parser inside the worker is handled by a configuration object that configures the parser identical to synchronous usage.

## Examples:
***NOT YET UPDATED!***
[OBJLoader2 basic usage](https://kaisalmen.de/wwobjloader2/objloader2/main.min.html)<br>
[OBJLoader2 usage options](https://kaisalmen.de/wwobjloader2/wwobjloader2/main.min.html)<br>
[OBJLoader2 Stage](https://kaisalmen.de/wwobjloader2/wwobjloader2stage/main.min.html)<br>


Have fun!

Kai
