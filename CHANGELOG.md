# Changelog

## 3.1.3-dev
- Changed structure of the repository to mimic three.js layout
- Fixes #18335 CodeSerializer works with uglified code
- All multiple files loading examples now use `AssetPipelineLoader` prototype.

## 3.1.2
- three.js issue 17769:
  - Move `ObjectManipulator` into `WorkerRunner` and export it from there
  - Remove `OBJLoader2Parser` import from `WorkerRunner`. Remove unneeded functions from DefaultWorkerPayloadHandler and WorkerRunner and aligned typescript definitions
  - The parser in DefaultWorkerPayloadHandler should not be limited to `OBJ2LoaderParser`. js and ts was not aligned here.

## 3.1.1.
- three.js issue 17615/17711: ObjLoader2Parser materials are not applied in worker 
- Additionally, allow material override from `OBJLoader2#addMaterials` to `MaterialHandler#addMaterials`

## 3.1.0
- `OBJLoader2` is now based on `Loader` (three.js issue 17406)
- Updated typescript definitions (fixed three.js issue 17364) Note: `OBJLoader2Parallel#parse` is implemented differently
- Unified load and parse behaviour of `OBJLoader2` and `OBJLoader2Parallel`: Separate onParseComplete is gone. onLoad serves the same purpose in both sync an parallel use cases
- Fix logging verbosity (MaterialHandler, etc)
- Fixed three.js 15227 along

## 3.0.0
- Transformed the whole code base to jsm and added typescript definitions (in scope of complete three.js code base transformation).
- Removed `LoaderWorkerDirector`. This is going to be replaced with more generic approach likely driven by three.js
- `OBJLoader2` extends `OBJLoader2Parser`: Moved common functions (parser configuration and callback) to `OBJLoader2Parser`. Here aim was to remove redundant function definitions in both the independent parser code and in `OBJLoader2`.
- `OBJLoader2Parser`: All private functions are now identified by "_". Provides functions and members for extensions.
- `WorkerExecutionSupport` is able to create the worker code for `OBJLoader2Parallel` by concatenation of existing code pieces (memory or files) or loading a jsm file that contains all dependencies.
- `MaterialHandler` and `MeshReceiver` have been extracted from OBJLoader2. The are re-usable `WorkerExecutionSupport` context.
- All MTL handling code has been removed from OBJLoader2. New approach via bridge `MtlObjBridge`.
- OBJLoader2 will not get any further dependencies. `WorkerExecutionSupport` will use OBJLoader2 and other loaders.
- OBJ Verify has been updated to use modules for both `OBJLoader` and `OBJLoader2`.
- Started `AssetPipelineLoader` prototyping

## 2.5.1
- three.js issue 15219: Materials are initialised as objects.
- three.js issue 15468. `OBJLoader2`: Reduced log level from warn to info when defaultMaterial is used when material name was not resolvable.
- three.js issue 16307: Backported onError function usage from OBJLoader2/Parser V3. Unified callback naming

## 2.5.0
- Issue #47: Fixed incorrect vertex color pointerC initialization (omitting first set of values)
- Pull Request #46: It is now possible to run `THREE.OBJLoader2` in nodejs 10.5.0+. Thanks to @Cobertos
- Replaced Singletons with pure function/prototype definitions (backport from dev (V3.0.0)). Reason: Counter issues with worker code Blob generation from minified code base (e.g when using webpack)
- three.js issue 12942: Align `setPath` and `setResourcePath` meaning and handling

## 2.4.2
- Issue #43: `OBJLoader2` allows to register a generic error handler. If this callback is available it will be used instead of a throw. `LoaderWorkerDirector` uses this callback to report a problem, but continue with the next loading task. `loadMtl` now allows to pass onProgress and onError as well.

## 2.4.1
- three.js issue 14010: `TRHEE.OBJLoader2.loadMtl` transforms an ArrayBuffer to String `THREE.LoaderUtils.decodeText` if content is provided as ArrayBuffer
- three.js issue 14032: Vertex Color value was not correctly initialized. Vertex colors are now correctly used
- Issue #40: Added function `TRHEE.OBJLoader2.setUseOAsMesh` to enforce mesh creation on occurrence of "o". The default is false (spec compliant).
- Issue #39: Ensure name of `THREE.LoaderSupport.ResourceDescriptor` always has a default name
- Issue #38: Fixed onMeshAlter and onLoadMaterials callback usage in `THREE.LoaderSupport.WorkerDirector` and fixed handling of returned objects in `THREE.LoaderSupport.MeshBuilder`

## 2.4.0
- three.js issue 13197:
  - Added forceWorkerDataCopy to THREE.LoaderSupport.WorkerSupport and THREE.LoaderSupport.WorkerDirector
  - THREE.OBJLoader2 handles cached resources properly. This increases overall performance as no unnecessary reloads are requested.
- THREE.OBJLoader2: Reduced Parser complexity:
  - Simplified slash counting used for face type detection
  - One buildFace function is used for all four face types, lines and points including indices (=vertex reduction) creation if wanted.
  - String processing (o, g, mtllib and usemtl) just concatenates chars
  - Overall speed improvements due simpler code paths
- Removed THREE.LoaderSupport.ConsoleLogger: Added setLogging function as replacement where required. Console logging is behind boolean flags. **Important:** Code adjustments are required. 
- Removed THREE.LoaderSupport.LoaderBase: Many functions are coupled with OBJLoader2. It was simply not generic enough and added unneeded complexity. 
- Reduced THREE.LoaderSupport.PrepData to minimum set of generic functions. Simple properties are added by demand and are no longer enforced.
- Renamed THREE.LoaderSupport.Builder to THREE.LoaderSupport.MeshBuilder
- Added objverify to npm package
- Updated documentation

## 2.3.1
- Issue #10: Moved load and checkResourceDescriptorFiles from OBJLoader2 to LoaderBase. Re-use generic functions in other loaders

## 2.3.0
- Issue #28: Parser Verification. Reduce overall complexity of Parser. It is now a single class. Missing 'g' statement don't cripple parsing.
- Issue #31: Worker code still works when mangling is used during minification.
- Issue #32: THREE.LoaderSupport.ConsoleLogger: Allow to pass additional arguments to error, warn, info and debug
- Issue #33: Added support for Points and fixed Lines along

## 2.2.1
- Issue #27: Multiple mesh definitions (vertices, normals, uvs and faces) within one group are now supported. Needed to remove early release of vertex data from memory.
- Issue #28: Negative face indices are now supported.
- Issue #29: Cleaned loadMtl API and clarified `WorkerSupport.run` contract. Transferable is automatically attached if data is an ArrayBuffer.

## 2.2.0
- WorkerRunnerRefImpl changes: No longer required `THREE.LoaderSupport.Validator` and `THREE.LoaderSupport.ConsoleLogger` which reduces size of worker. Default workers only include WorkerRunnerRefImpl for establishing communication and no longer need the Validator or the ConsoleLogger. 
- LoaderWorkerSupport changes: It always ensures logConfig parameters are properly initialized before being passed to worker. Fixed logging problems.
- Issue #25: OBJLoader2 now logs an error if `THREE.LoaderSupport` is not included as script in HTML. The same is true for missing `THRE.MTLLoader`, but only if method `loadMtl` is used.
- Issue #26: `WorkerSuport` now contains a inner private class `LoaderWorker` that encapsulates the native worker. This separates the runtime functionality from the setup and interaction. Workers are now terminated when immediately when they are not running otherwise `LoaderWorker.terminateRequested` ensures termination when final execution status is reached. `WorkerDirector` now properly handles shutdown of workers. Evaluation of status is always performed in `WorkerDirector.processQueue`. `WorkerDirector.callbackOnFinishedProcessing` is called when processing is completed and all workers are terminated. This allows to clear all meshes, for example.

## 2.1.2
- Added onLoadMaterials allowing alteration of materials when they have been loaded
- Issue #21 Part2: Fixed new mesh detection (offset and not) solely relies on 'v' and 'f' occurrences. 'o' and 'g' are meta information, that no longer drive the decision
- Issue #22: WorkerDirector now only allows implementations that have property callbacks
- Example WWOBJLoader2Stage: Added validity checks to ZipTools
- Fixed worker code generated from minified version is broken 

## 2.1.1
- Issue #21: Fixed 'o' or 'g' declaration lead to early cleanup of stored vertex data 
- WorkerSupport: Added worker payloads "imageData" and "error"

## 2.1.0
- Issue #18: Builder enhancements:
  - Materials can be added to it as regular objects, as jsonified objects (e.g. from worker) and as clone instruction (map of property and value)
  - Separated mesh processing from material processing
  - Builder no longer defines default materials. This is no the responsibility of the user (loader) 
- WorkerSupport is now able to load arbitrary js files into Blob used to create the Worker (as exemplary shown and used in MeshSpray)

## 2.0.1
- three.js issue #12324: Fix slashes in string pattern (e.g. usemtl) were replaced by spaces
- Fixed line processing with uv

## 2.0.0

- `OBJLoader2` and `WWOBJLoader2` have been fused. Worker based asynchronous execution of the loader is now handled by `parseAsync`, `load` with `useAsync` flag or `run` which is used for batch processing
- All common functionality independent of OBJ parsing has been moved to package `THREE.LoaderSupport`. Thease are:
  - Builder
  - LoadedMeshUserOverride
  - WorkerSupport
  - WorkerRunnerRefImpl
  - WorkerDirector
  - PrepData
  - Commons
  - Callbacks
  - Validator
  - ConsoleLogger
- `OBJLoader2.parse` method accepts arraybuffer or string as input.
- Indexed rendering is supported.
- Issue #15: `ConsoleLogger` now encapsulates all console logging. Logging can be fully deactivated or switched to debug mode
- Issue #16: progress callbacks provide numerical values to indicate overall progress of download or parsing

## 1.4.1

#### Loader related changes
- Issue #14: RawObject was not set with usemtl name, but with mtllib

## 1.4.0

#### Loader related changes
- Issue #12, three.js issue #11804, #11871, PR #11928: Added n-gon support

## 1.3.1

#### Loader related changes
- Issue #12, three.js issue #11804, #11871, PR #11928: Added n-gon support

## 1.3.0

#### Loader related changes
- SmoothingGroups: activeSmoothingGroup is ensured to be a number (integer). "0" instead of "off" did not lead to detection of flat shading.
- Issue 8: OBJLoader2 sets the mesh name properly. Mesh name is taken from group name (g) if exists or object name (o). Fixed cut-off names (o, g, mtllib, usemtl)
- Issue 9: Fixed debug logging in MeshCreator related to Multi-Material creation.
- three.js issue 11422: OBJLoader2 and WWOBJLoader2 are able to load vertexColors when defined as: v x y z r g b
- Added download/progress feedback in all examples

#### Example related changes
- Replaced Boolean with own Validator function

## 1.2.1

#### Loader related changes

##### All
- Validator and its functions replace all Boolean calls. It is included in THREE.OBJLoader2.
- Versions are now defined inside OBJLoader2 and WWOBJLoader2.
- Static OBJLoader2._getValidator and OBJLoader2_buildWebWorkerCode are reached via prototype of OBJLoader2. Instance of OBJLoader2 is no longer created.
- Requires three.js release 85 (now available)

#### Example related changes

##### webgl_loader_obj2_ww_parallels:
- Fixed "Run Queue" started new run before first was completed.

## 1.2.0

#### Loader related changes

##### THREE.OBJLoader2.WWOBJLoader2
- Function `_receiveWorkerMessage` now uses a meshDescription that allows to override material or bufferGeometry or to completely disregard the mesh. `THREE.OBJLoader2.WWOBJLoader2.LoadedMeshUserOverride` was introduced for this.
- Allow usage of multiple callbacks per callback type
- `THREE.OBJLoader2.WWOBJLoader2.PrepDataArrayBuffer` and `THREE.OBJLoader2.WWOBJLoader2.PrepDataFile` require less mandatory parameters. Setters are introduced to handle optional things

##### THREE.OBJLoader2.WWOBJLoader2Director
- Added per queue object callbacks
- Global callbacks in `prepareWorkers` will be specified with new object `OBJLoader2.WWOBJLoader2.PrepDataCallbacks`. This object is also used in both PrepData objects for defining extra per model callbacks in addition to the global ones
- Callbacks will be reset and reassigned for every run

##### All
- Improve code quality and logging: Replaced != or == with Boolean() or ! Boolean() where applicable
- Improve logging and comments
- Restored compatibility with three.js release 84


## 1.1.1

wwobjloader2 npm relase 1.1.0 did not set three.js dependency properly. That's why it was immediately succeeded by this version.

#### Loader related changes

- Adjusted to removal of MultiMaterial in three.js release 85. Therefore not compatible with three.js < 0.85.0.


## 1.0.7 / 1.0.6

Improvements since initial release. This was the first npm release and the first release for three.js.

#### Loader related changes

##### THREE.OBJLoader2
- Removed need for making Parser public. OBJLoader2 has a build function for web worker code.
- MeshCreator is now private to OBJLoader2
- Removed underscores from functions of private classes

##### THREE.OBJLoader2.WWOBJLoader2
- Added checks for Blob and URL.createObjectURL
- Worker code build: Removed need to adjust constructor and some new Object calls
- Allow to properly set CORS to MTLLoader via WWOBJLoader2 and WWOBJLoader2Director
- Now allows to enable/disable mesh streaming
- Adjusted naming of web worker classes

##### All
- Library headers now carry references to development repository

#### Example related changes

##### webgl_loader_obj
- Added GridHelper
- Resources to load are now defined outside example classes

##### webgl_loader_obj2_ww
- Allow to clear all meshes in
- Allows to load user OBJ/MTL files
- Added GridHelper
- Resources to load are now defined outside example classes

##### All Examples
- Created one page examples and tuned naming
- All examples now use dat.gui
- Removed namespace "THREE.examples"
- Fixed comment typos
- Fixed some code formatting issues
- Fixed tabs in examples


## 1.0.0

Initial public release.
