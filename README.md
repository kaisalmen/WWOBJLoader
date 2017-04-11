OBJLoader2 and WWOBJLoader2 for three.js
===

OBJLoader2 is a new loader for the OBJ file format that is additionally executable within a web worker (WWOBJLoader2).

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
`npm update`

You require gulp to be able to build the bundles. If you have not yet installed the cli, execute this:<br>
`npm install --global gulp-cli`

From the project's root run `gulp` to create The documentation in directory **build/docs** and the bundles in directory **build**:
 - **OBJLoader2[.min].js**: Contains all code required for the loader to work
 - **WWOBJLoader2[.min].js**: Consists of web worker control, web worker and director code

## Implementation Overview
In contrast to the existing [OBJLoader](https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/OBJLoader.js) the new `OBJLoader2` consists of three logical blocks. Only one of these blocks is public:
- `OBJLoader2` (public): Is the sole class to interact with for setting up, for loading data from a given file or for directly forwarding data to the parser
- `Parser` (private): Is used by `OBJLoader2` and `WWOBJLoader2` to parse the data and transform it into a "raw" representation.
- `MeshCreator` (private): Builds meshes from the "raw" representation that can be incorporated into the scenegraph.

##### What is the reason for separation?
The loader should be easily usable within a web worker. But each web worker has its own scope which means any imported code needs to be re-loaded and some things cannot be accessed (e.g. DOM). The aim is to be able to enclose the parser with two different **cloaks**:<br>
1. Standard direct usage<br>
2. Embedded within a web worker

As `Parser` is independent of any other code piece of [three.js](https://threejs.org) or any other library, the surrounding code either needs to directly do the required three.js integration like `OBJLoader2` with `MeshCreator` or `WWOBJLoader2` which serves as a control interface to the web worker code that it dynamically creates during initialization. `WWOBJLoader2` basically provides the same functionality as `OBJLoader2` and `MeshCreator`, but the parsing and mesh preparation work is done by the web worker.

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
The web worker code is contained in `WWOBJLoader2.js`. At worker init a string is built from code within the class that contains all code of private classes within `WWOBJLoader2._buildWebWorkerCode`. `OBJLoader2` also provides provides a build function as `Parser` is private to it which is called by during the execution of the function. The string contains all code required for the worker to be fully functional. It is put to a blob that is used to create the worker. This reliefs the user of the loader to care about path issues and static imports within the worker are no longer required.

##### Improvements
- Test automation with focus on batch execution of tests for retrieval of more robust performance numbers

## Examples:
[OBJLoader2](https://kaisalmen.de/wwobjloader2/objloader2/main.min.html)<br>
[WWOBJLoader](https://kaisalmen.de/wwobjloader2/wwobjloader2/main.min.html)<br>
[WWOBJLoader Stage](https://kaisalmen.de/wwobjloader2/wwobjloader2stage/main.min.html)<br>
[Web Worker OBJ Parallels Demo](https://kaisalmen.de/wwobjloader2/wwparallels/main.min.html)<br>

### Models and resources

**This applies to NPM only**:<br>
The following models need to be made available in directories below "resources/obj" otherwise the examples will not work:
- female02
- male02
- female02
- vive-controller
- walt

Just download them from the [WWOBJLoader GitHub repository](https://github.com/kaisalmen/WWOBJLoader) or [three.js GitHub repository](https://github.com/mrdoob/three.js).<br>

**This applies to NPM and GitHub**:<br>
Larger models not found in any GitHub repository which need to be made available in directories below "resources/obj" as well:
- PTV1
- zomax
<br>
Please download the following zip files and put them in the directories named above. There is no need to decompress them:

[Compressed PTV1 model](https://kaisalmen.de/resource/obj/PTV1/PTV1.zip) (150MB)<br>
Models by Cornelius Dämmrich [zomax.net](https://zomax.net/free-stuff/):<br>
[Compressed Sink model](https://kaisalmen.de/resource/obj/zomax/zomax-net_haze-sink-scene.zip) (178MB)<br>
[Compressed Oven model](https://kaisalmen.de/resource/obj/zomax/zomax-net_haze-oven-scene.zip) (150MB)<br>

