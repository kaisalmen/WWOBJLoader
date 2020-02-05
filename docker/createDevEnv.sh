#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

# This is run inside the container
if [[ ! -d ${DIR_BASE}/build ]]; then
  mkdir ${DIR_BASE}/build
fi

cp -f ${DIR_BASE}/node_modules/three/build/* ${DIR_BASE}/build
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/controls/TrackballControls.js ${DIR_BASE}/examples/jsm/controls/TrackballControls.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/controls/TrackballControls.d.ts ${DIR_BASE}/examples/jsm/controls/TrackballControls.d.ts
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/loaders/MTLLoader.js ${DIR_BASE}/examples/jsm/loaders/MTLLoader.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/loaders/MTLLoader.d.ts ${DIR_BASE}/examples/jsm/loaders/MTLLoader.d.ts
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/helpers/VertexNormalsHelper.js ${DIR_BASE}/examples/jsm/helpers/VertexNormalsHelper.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/helpers/VertexNormalsHelper.d.ts ${DIR_BASE}/examples/jsm/helpers/VertexNormalsHelper.d.ts
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/libs/dat.gui.module.js ${DIR_BASE}/examples/jsm/libs/dat.gui.module.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/libs/gunzip.module.min.js ${DIR_BASE}/examples/jsm/libs/gunzip.module.min.js
