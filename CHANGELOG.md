# Changelog

## 1.2.0

#### Code related changes

##### THREE.WWOBJLoader2
- Function `_receiveWorkerMessage` now uses a meshDescription that allows to override material or bufferGeometry or to completely disregard the mesh. `THREE.OBJLoader2.WWOBJLoader2.LoadedMeshUserOverride` was introduced for this.
- Allow usage of multiple callbacks per callback type

##### THREE.WWOBJLoader2Director
- Added per queue object callbacks
- Callbacks will be reset and reassigned for every run

##### All
- Improve code quality and logging: Replaced != or == with Boolean() or ! Boolean() where applicable
- Improve logging and comments
- Restored compatibility with three.js release 84


## 1.1.1

wwobjloader2 npm relase 1.1.0 did not set three.js dependency properly. That's why it was immediately succeeded by this version.

#### Code related changes

- Adjusted to removal of MultiMaterial in three.js release 85. Therefore not compatible with three.js < 0.85.0.


## 1.0.7 / 1.0.6

Improvements since initial release. This was the first npm release and the first release for three.js.

#### Code related changes

##### THREE.OBJLoader2
- Removed need for making Parser public. OBJLoader2 has a build function for web worker code.
- MeshCreator is now private to OBJLoader2
- Removed underscores from functions of private classes

##### THREE.WWOBJLoader2
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

##### Examples
- Created one page examples and tuned naming
- All examples now use dat.gui
- Removed namespace "THREE.examples"
- Fixed comment typos
- Fixed some code formatting issues
- Fixed tabs in examples


## 1.0.0

Initial public release.
