OBJLoader2 and OBJLoader2Parallel for three.js
===

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/WWOBJLoader/blob/dev/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/WWOBJLoader/tree/stable)

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

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/kaisalmen/WWOBJLoader/tree/stable) 

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
From the project's root run `gulp` to create The documentation in directory **build/docs** and set the versions. No more bundling is performed.
 
### Additional models and resources
Use the following script to download missing resources (OBJ, MTL files and textures):
```shell script
bash dev/models/retrieveExtras.sh
```


## Implementation Overview

### `OBJLoader2Parser`
The parser used by `OBJLoader2` and `OBJLoader2Parallel` has all OBJ parsing capabilities of `OBJLoader`. Please see the following list of features:
- Parser can be executed in worker 
- `OBJLoader2.parse` and `OBJLoader2Parallel.parse` methods accept `ArrayBuffer` or `String` as input. Text processing is approx. 15-20 pecent slower
- It features indexed rendering including vertex reduction.
- Indexed rendering is available if switched on via `setUseIndices` (see `useIndices` in example **[OBJLoader2 usage options](./examples/webgl_loader_obj2_options.html)**).
- Face N-Gons are supported
- Multi-Materials are created when needed
- Flat smoothing defined by "s 0" or "s off" is supported and Multi-Material is created when one object/group defines both smoothing groups equal and not equal to zero.
- Support for points and lines was added (since V2.3.0)
- New mesh detection relies 'g' occurrence or 'f', 'l' or 'p' type change (since V2.3.0). This allows mutiple mesh definitions within one group.
- Negative face indices are supported (issue #28)
- The parser is now a single function that can be easily embedded in module or standard Workers (since V4.0.0-dev)

### General features 
- Console logging is deactivated by default, but can be switched on if desired (including debug logging)
- `OBJLoader2` and `OBJLoader2Parallel` must be re-instantiated every time they are used.
- Progress callbacks provide numerical values to indicate overall progress of download or parsing (issue #16)

Have fun!

Kai
