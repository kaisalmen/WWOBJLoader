# OBJLoader2 & OBJLoader2Parallel for three.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/WWOBJLoader/blob/dev/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/WWOBJLoader)

`OBJLoader2` is a loader for the `OBJ` file format. It is an alternative to `OBJLoader` included in [three.js](https://threejs.org). The loader and its parser can be used on Main via `OBJLoader2` or in parallel inside a web worker via `OBJLoader2Parallel`.

New versions of `OBJLoader2` and `OBJLoader2Parallel` are from now on again released as npm modules independent of three.js. The first stable version that was released independent again is 4.0.0. Versions 3.x.y were never released as independent npm and only in combination with three.js itself.

## Changelog

Interested in recent changes? Check the [CHANGELOG](CHANGELOG.md).

## Development

### Getting Started

There exist three possibilities:

* Press the `Gitpod` button above and start coding and using the examples directly in the browser
* Checkout the repository and use `docker-compose up -d` to spin up local snowpack dev server.
* Checkout the repository and run `npm install`, `npm run build` and then `npm run dev` to spin up local Vite dev server

Whatever environment you choose to start [Vite](https://vitejs.dev/) is used to serve the code and the examples using it. With this setup you are able to change the code and examples without invoking an additional bundler. Snowpack ensures all imported npm modules are available if previously installed in local environment (see `npm install`).

If you run Vite locally you require a `nodejs` and `npm`. The Gitpod and local docker environment ensure all prerequisites are fulfilled.

In any environment the server is reachable on port 8085.

### Examples

If you want to get started see take a look at the following examples. They get more advanced from top to bottom:

* [OBJLoader2 basic usage](./packages/examples/obj2_basic.html)
* [OBJLoader2Parallel Worker Module Support](./packages/examples/obj2parallel_basic.html)
* [OBJLoader2 usage options](./packages/examples/obj2_options.html)

### Main Branches

Main development now takes place on branch [main](https://github.com/kaisalmen/WWOBJLoader/tree/main).
<br>
The [stable](https://github.com/kaisalmen/WWOBJLoader/tree/stable) branch contains the release versions.

### Docs

Run `npm run doc` to create the documentation in directory **build/docs**.

### Additional models and resources

Use the following script `bash dev/models/retrieveExtras.sh` to download missing resources (OBJ, MTL files and textures).

## Feature Overview

### OBJLoader2Parser

The parser `OBJLoader2Parser` used by `OBJLoader2` and `OBJLoader2Parallel` has all OBJ parsing capabilities of `OBJLoader` from three.js, plus some extra feature. Please see the following list:

* The `parse` methods of `OBJLoader2Parser` accepts `ArrayBuffer` or `String` as input. Text processing is approx. 15-20 pecent slower.
* In case `OBJLoader2Parallel` the of Parser `OBJLoader2Parser` is executed inside a worker.
* `OBJLoader2Parser` features indexed rendering including vertex reduction.
* Indexed rendering is available if switched on via `setUseIndices` (see `useIndices` in example **[OBJLoader2 usage options](public/examples/webgl_loader_obj2_options.html#L133)**).
* Face N-Gons are supported.
* Multi-Materials are created when needed.
* Flat smoothing defined by "s 0" or "s off" is supported and Multi-Material is created when one object/group defines both smoothing groups equal and not equal to zero.
* Support for points and lines is available since V2.3.0.
* New mesh detection relies on 'g' occurrence or 'f', 'l' or 'p' type change (since V2.3.0). This allows multiple mesh definitions within one group.
* Negative face indices are supported (issue #28)
* The parser is now a single class that can be directly stored as string and therefore embedded in module or standard Workers (since V4.0.0).

### OBJLoader2 & OBJLoader2Parallel

* Console logging is deactivated by default. It can be enabled by switching [here]() including debug logging.
* TypeScript definitions (d.ts) are generated from JSDoc definitions for free from it, see [declaration](./dev/declaration.tsconfig.json)

## WorkerTaskDirector Core Library

`WorkerTask` from [wtd-core](https://github.com/kaisalmen/three-wtm) is used to control everything regarding workers. This library was separated with the 4.0.0 release. It now evolves as independent library that is utilized by `OBJLoader2Parallel`.

Happy coding!

Kai
