# Changelog

## 1.3.0

#### Loader related changes
- SmoothingGroups: activeSmoothingGroup is ensured to be a number (integer). "0" instead of "off" did not lead to detection of flat shading.
- Issue 9: Fixed debug logging in MeshCreator related to Multi-Material creation.
- Issue 8: OBJLoader2 sets the mesh name properly. Mesh name is taken from group name (g) if exists or object name (o). Fixed cut-off names (o, g, mtllib, usemtl)

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
