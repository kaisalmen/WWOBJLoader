OBJLoader2 and WWOBJLoader2 for three.js
===

Welcome to the repository for OBJLoader2 a new loader for the OBJ file format that is additionally executable within a web worker.

## Repository structure
The directory structure is organized as follows:
- **src**: Contains the sources for the loaders
- **test**: Contains Tests/HTML examples
- **resource**: Contains OBJs, MTLs and textures

## Building

Before you can start to play around some post-checkout initialization steps have to be performed.<br>
**[npm](https://nodejs.org)** and **[gulp](http://gulpjs.com/)** must be installed on your local platform. They are required for retrieving dependencies and for building combined source bundles and the documentation. 
After checkout run:<br>
`npm update`

You require gulp to be able to build the bundles. If you have not yet installed the cli, execute this:<br>
`npm install --global gulp-cli`

From the project's root run `gulp` to create The documentation in directory **build/docs** and the bundles in directory **build**:
 - **OBJLoader2[.min].js**: Contains all code required for the loader to work
 - **WWOBJLoader2[.min].js**: Consists of web worker control, web worker and director code

## Implementation Overview
In contrast to the existing [OBJLoader](https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/OBJLoader.js) the new `OBJLoader2` consists of three pieces:
- `OBJLoader2`: Is the class to interact with for setting up, for loading data from a given file or for directly forwarding data to the parser
- `OBJLoader2Parser`: Is invoked by `OBJLoader2` or `WWOBJLoader2` to parse the data and transform it into a "raw" representation
- `OBJLoader2MeshCreator`: Builds meshes from the "raw" representation that can be incorporated into the scenegraph.

##### What is the reason for separation?
The loader should be easily usable within a web worker. But each web worker has its own scope which means any imported code needs to be re-loaded and some things cannot be accessed (e.g. DOM). The aim is to be able to enclose the parser with two different **cloaks**:
1. Standard direct usage
2. Embedded within a web worker

As `OBJLoader2Parser` is independent of any other code piece of [three.js](https://threejs.org) or any other library, the surrounding code either needs to directly do the required three.js integration like `OBJLoader2` and `OBJLoader2MeshCreator` or `WWOBJLoader2` which serves as a control interface to the web worker code that it dynamically creates during initialization. `WWOBJLoader2` basically provides the same functionality as `OBJLoader2` and `OBJLoader2MeshCreator`, but the parsing and mesh preparation work is done by the web worker.

`WWOBJLoader2` could be seen as a template for other web worker control classes of yet non-existing web worker based loaders.

##### Directing the symphony
`WWOBJLoader2Director` is introduced to ease usage of multiple `WWOBJLoader2`. It is able to create a configurable amount of loaders via reflection just by providing parameters. An instruction queue is fed and all workers created will work to deplete it once they have been started. The usage of `WWOBJLoader2Director` is not required.

##### Parser POIs
The parser and mesh creation functions have reached full feature parity with the existing OBJ loader. These are some interesting POIs:
- Per default `OBJLoader2` parse method requires arraybuffer as input. A fallback method for parsing text directly still exists, but it is approx. 15-20 pecent slower
- Face N-Gons are not supported identically to the old parser
- Direct re-usage of all involved classes is fully supported. I took care in resource clean-up and re-validation of status on all involved objects
- "o name" (object), "g name" (group) and new vertex definition without any other declaration lead to new object creation
- Multi-Materials are created when needed
- Flat smoothing defined by "s 0" or "s off" is supported and Multi-Material is created when one object/group defines both smoothing groups equal and not equal to zero.

##### Bundle Details
The web worker code is contained in `WWOBJLoader2.js`. At worker init a string is built from code within the class that contains all code of `OBJLoader2Parser` and private classes within `WWOBJLoader2._buildWebWorkerCode`. The string contains all code required for the worker to be fully functional. It is put to a blob that is used to create the worker. This reliefs the user of the loader to care about path issues and static imports within the worker are no longer required.

##### Improvements
- Objects are streamed to the scene when `WWOBJLoader2` is used. Add-only-when-fully-loaded should be added
- Test automation with focus on batch execution of tests for retrieval of more robust performance numbers

## Examples:
[Web Worker OBJ Parallels Demo](https://kaisalmen.de/proto/test/wwparallels/main.min.html)<br>
[WWOBJLoader](http://kaisalmen.de/proto/test/wwobjloader2complex/main.min.html)<br>
[OBJLoader2](http://kaisalmen.de/proto/test/objloader2/main.min.html)<br>
[Original OBJLoader](http://kaisalmen.de/proto/test/three.js.old/webgl_loader_objloader_direct.html)<br>
<br>
Larger models not in this repository:<br>
[Compressed PTV1 Model](http://kaisalmen.de/proto/resource/obj/PTV1/PTV1.zip) (150MB)<br>
Models by Cornelius Dämmrich [zomax.net](https://zomax.net/free-stuff/):<br>
[Compressed Sink Model](http://kaisalmen.de/proto/resource/obj/zomax/zomax-net_haze-sink-scene.zip) (178MB)<br>
[Compressed Oven Model](http://kaisalmen.de/proto/resource/obj/zomax/zomax-net_haze-oven-scene.zip) (150MB)<br>
