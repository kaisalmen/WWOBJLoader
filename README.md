New OBJLoader prototyping for three.js
===

## New Repository structure
As proposed in the issue discussion of three.js [#9756](https://github.com/mrdoob/three.js/issues/9756) I have adjusted the repository structure:
- **src**: Contains own sources
- **test**: Contains Tests/HTML Examples
- **resource**: Contains OBJs, MTLs and textures

External libraries (three.js and jszip) are initialized with npm. Therefore, **npm** installation is required.
Before you can start to play around after checkout please run:
`npm update`


## Current Status
This changed since last status update:
- Repository structure has been adjusted
- OBJLoader3 has been renamed to OBJLoader2
- Parser rework has been completed: I turned some circles to understand browser performance differences and Javascript performance problems in general.
- Both arraybuffer and text can be parsed
- Code documentation has been improved
- Face N-Gons are not supported (this gave me some headaches and I changed the parsing approach), but it was not supported by old parser either. Triangular and quad faces are fully supported
- Re-usage of OBJLoader like WWOBJLoader does is not an issue. I took care in resource clean-up and re-validation of the loader status and all involved objects
- **2016-12-01**: Multi-Material bug is fixed: Vertex group start and offset were not correctly calculated
- **2016-12-02**: WWOBJLoader and OBJLoader2 are both using MultiMaterial. Simplified code.
- **2016-12-02**: WWOBJLoader no longer requires MTTLoader

Next on my agenda:
- Split OBJLoader2 into multiple files (aim: worker without three.js import)
- Work on Life-cycle of WWOBJLoader and FrontEnd (eventually find a better name)
- Test automation

## Examples:
[OBJLoader2](http://kaisalmen.de/proto/test/webgl_loader_objloader2_direct.html)<br>
[WWOBJLoader](http://kaisalmen.de/proto/test/webgl_loader_wwobj.html)<br>
[Original OBJLoader](http://kaisalmen.de/proto/test/three.js.old/webgl_loader_objloader_direct.html)

Larger models not in the prototype repository:<br>
[Compressed PTV1 Model](http://kaisalmen.de/proto/resource/obj/PTV1/PTV1.zip) (150MB)<br>
[Compressed Sink Model](http://kaisalmen.de/proto/resource/obj/zomax/zomax-net_haze-sink-scene.zip) (178MB)<br>
[Compressed Oven Model](http://kaisalmen.de/proto/resource/obj/zomax/zomax-net_haze-oven-scene.zip) (150MB)


### 2016-11-06: Status update
- New OBJLoader has almost reached feature parity with the existing OBJLoader
- Features still missing in comparison with existing OBJLoader:
 - Support for Line parsing/geometry generation is missing
 - Multi-Materials are not used, instead a mesh is created per object/group/material designation
- New features:
 - Flag ==createObjectPerSmoothingGroup== will enforce mesh creation per object/group/material/smoothingGroup (default false; as it may lead to thousands of meshes, but useful for experiments)
  - Load from string or arraybuffer
  - Hook for web worker extension "ExtendableMeshCreator" exists already. In non-extended loader it creates meshes and attaches it to the scenegraph group.
- Web worker work has not started, yet, but code base exists from previous proposal!

##### Some thoughts on the code:
Approach is as object oriented as possible: Parsing, raw object creation/data transformation and mesh creation have been encapsulated in classes.

Parsing is done by OBJCodeParser. It processes byte by byte independent of text or arraybuffer input. Chars are transformed to char codes. Differnet line parsers (vertex,normal,uv,face,strings) are responsible for delivering the data retrieved from a single line to the RawObjectBuilder.

The RawObjectBuilder stores raw vertex, normal and uv information and builds output arrays on-the-fly depending on the delivered face information. One input geometry may lead to various output geometry as a raw output arrays are stored currently stored by group and material.

Once a new object is detected from the input, new meshes are created by the ExtendableMeshCreator and the RawObjectBuilder is reset. This is then just a for-loop over the raw objects stored by group_material index.

##### Memory Consumption
Only 60% of the original at peek (150 MB input model) has a peak at  approx. 800MB whereas the existing has a peak at approx. 1300MB in Chrome.

##### Performance
So far, I only ran desktop tests: Firefox is generally faster than Chrome (~125%). 150MB model is loaded in ~6.4 seconds in Firefox and ~8 seconds in Chrome. Existing OBJLoader loader takes 5.1s in Firefox and 5.3s in Chrome.
Tests were performed on: Core i7-6700, 32GB DDR4-2133, 960GTX 4GB, Windows 10 14393.351, Firefox 49 and Chrome Canary 56.
Biggest room for improvement: Assembling a single line and then using a regex to divide it, seems to be faster than evaluating every byte and drawing conclusions. This is not what I expected. I will write a second OBJCodeParser that works differently. From my point of view OO approach is not hindering performance.


### 2016-09-29: Objectives

#### Objectives for new OBJLoader:
- Support different input types for parsing:
 - string
 - arraybuffer
- Low memory usage:
 - Process file content serially and per line
 - Minimize internal data-structure/object usage
- Support inline-processing:
 - Add mesh and material to scene when it becomes available
 - Only intermediate data of current input mesh shall be kept in memory
- Provide hooks for web worker extension
 - Mesh creation shall be isolated within a function
 - Material creation shall be isolated within a function


#### Objectives for web worker wrapper/worker controller:
- Establish lifecycle:
 - init (controller feeds worker)
 - send material information (bi-directional)
 - parse (pass-back buffers)
- Use transferables wherever possible:
 - Construct BufferGeometry on main thread (worker controller)
 - Texture loading must be done on main thread (worker controller). As I understand it the TextureLoader needs document access and web workers are unable to.
- Keep the worker as generic as possible:
 - Already now the WWOBJLoader is not very OBJLoader specific
 - Porting the web worker to other loaders should be straightforward if mesh and material hooks are in loader
- Think about worker management:
 - worker pool (construction cost, device limitations, etc.)

Kai
