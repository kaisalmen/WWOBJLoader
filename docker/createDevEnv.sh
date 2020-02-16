#!/bin/bash

# This is script is run inside the container or locally in bash environments

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

if [[ ! -d ${DIR_BASE}/build ]]; then
  mkdir ${DIR_BASE}/build
fi

echo "Executing npm install"
( cd ${DIR_BASE} && npm install )

echo "Copying file from node_modules/three to ./build"
cp -f ${DIR_BASE}/node_modules/three/build/* ${DIR_BASE}/build

echo "Copying file from node_modules/three to ./examples"
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/controls/TrackballControls.js ${DIR_BASE}/examples/jsm/controls/TrackballControls.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/controls/TrackballControls.d.ts ${DIR_BASE}/examples/jsm/controls/TrackballControls.d.ts
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/loaders/MTLLoader.js ${DIR_BASE}/examples/jsm/loaders/MTLLoader.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/loaders/MTLLoader.d.ts ${DIR_BASE}/examples/jsm/loaders/MTLLoader.d.ts
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/helpers/VertexNormalsHelper.js ${DIR_BASE}/examples/jsm/helpers/VertexNormalsHelper.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/helpers/VertexNormalsHelper.d.ts ${DIR_BASE}/examples/jsm/helpers/VertexNormalsHelper.d.ts
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/libs/dat.gui.module.js ${DIR_BASE}/examples/jsm/libs/dat.gui.module.js
cp -f ${DIR_BASE}/node_modules/three/examples/jsm/libs/gunzip.module.min.js ${DIR_BASE}/examples/jsm/libs/gunzip.module.min.js

echo "Copying file from node_modules/three to ./src"
cp -fr ${DIR_BASE}/node_modules/three/src ${DIR_BASE}
