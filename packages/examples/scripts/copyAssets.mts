import shell from 'shelljs';

shell.mkdir('-p', './libs/worker');
shell.cp('-f', '../../node_modules/three/build/three.module.js', './libs/three.module.js');
shell.cp('-f', '../../node_modules/three/examples/jsm/controls/TrackballControls.js', './libs/TrackballControls.js');
shell.cp('-f', '../../node_modules/three/examples/jsm/loaders/MTLLoader.js', './libs/MTLLoader.js');
shell.cp('-f', '../../node_modules/three/examples/jsm/helpers/VertexNormalsHelper.js', './libs/VertexNormalsHelper.js');
shell.cp('-f', '../../node_modules/lil-gui/dist/lil-gui.esm.js', './libs/lil-gui.esm.js');

shell.mkdir('-p',  './libs/wtd-core/offscreen');
shell.cp('-f', '../../node_modules/wtd-core/dist/*.js', './libs/wtd-core');
shell.cp('-f', '../../node_modules/wtd-core/dist/offscreen/*.js', './libs/wtd-core/offscreen');
shell.cp('-f', '../objloader2/lib/objloader2.js', './libs/objloader2.js');
shell.cp('-f', '../objloader2/lib/worker/OBJLoader2WorkerModule.js', './libs/worker/OBJLoader2WorkerModule.js');
shell.cp('-f', '../objloader2/lib/worker/OBJLoader2WorkerClassic.js', './libs/worker/OBJLoader2WorkerClassic.js');
