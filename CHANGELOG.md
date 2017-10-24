# Changelog

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
