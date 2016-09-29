OBJLoader2 and web worker
=========================

Prototyping area for potentially new OBJLoader for three.js

Objectives for OBJLoader2:
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


Objectives for web worker wrapper/worker controller:
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
- Think about worker management (@Usnul):
 - worker pool (construction cost, device limitations, etc.)

Kai
