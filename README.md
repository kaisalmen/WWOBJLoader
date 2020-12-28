OBJLoader2 & WorkerTaskManager for three.js
===
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/WWOBJLoader/blob/dev/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/WWOBJLoader)

***IMPORTANT: This README is in the process of being updated.***

`OBJLoader2` is a loader for the `OBJ` file format included in [three.js](https://threejs.org). It is an alternative to `OBJLoader` offering more options. The parser `OBJLoader2Parser` is independent and can either be used on Main via `OBJLoader2` or in parallel inside a web worker via `OBJLoader2Parallel`.

New versions of `OBJLoader2` and `OBJLoader2Parallel` are now released via  three.js. I currently no longer plan to release them independently via npm.

## Changelog
Interested in recent changes? Check the [CHANGELOG](CHANGELOG.md).

# Development

## Main Branches

Main development now takes place on branch [dev](https://github.com/kaisalmen/WWOBJLoader/tree/dev).
<br>
Last stable release available with three.js is available on branch [stable](https://github.com/kaisalmen/WWOBJLoader/tree/stable).

## Repository structure
The directory structure now mimics the three.js directory structure to easy porting of changes:
- **examples**: Contains Tests/HTML examples
- **examples/jsm**: Contains the sources for the loaders
- **examples/models**: Contains OBJs, MTLs and textures
  
Use the [index.html](./index.html) to easily access the different examples.

## Development Environments

### Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/kaisalmen/WWOBJLoader) 

The easiest way to get started is simple by using gitpod! It offers all the possibilities the local environments do.

### Local Container

If you have docker & docker-compose available there is no need to install any software stacks (git, node, npm, gulp, etc.).
From the root of the repo just invoke the following command:
```shell script
docker-compose up -d --build
```
When the container starts it always performs the initialisation task which puts all required files in place and then launches a [local nginx http server on port 8085](http://localhost:8085).
All local build environment configuration is stored in the `dev` folder.

Bash into the running container for any manual task or script you want to run.
```shell script
docker exec -it obj2dev bash
```

### Local System

If you don't want to use the docker environment, then you need to set-up and **[npm](https://nodejs.org)** and **[gulp](http://gulpjs.com/)** locally on your local platform.
After you have cloned this repository locally and have npm and gulp set-up, please run:<br>
```shell script
npm install
```

### Docs
From the project's root run `gulp` to create The documentation in directory **build/docs**.
 
### Additional models and resources
Use the following script to download missing resources (OBJ, MTL files and textures):
```shell script
bash dev/models/retrieveExtras.sh
```


## Implementation Overview

***OUTDATED: WILL BE UPDATED SOON!***
 
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
- `WorkerExecutionSupport` offers utility functions used to serialize existing code into strings that are used to build the web worker code. Any loader that uses it must provide a function that builds the parser code (for example see `buildCode` inside `OBJLoader2.parseAsync`). `WorkerSupport` provides wrapper code to create the web worker and to organize communication with it. Configuration of the Parser inside the worker is handled by a configuration object that configures the parser identical to synchronous usage.


Happy coding!

Kai
