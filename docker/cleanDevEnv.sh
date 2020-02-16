#!/bin/bash

# This is script is run inside the container or locally in bash environments

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

echo "Removing ./build"
rm -fr ${DIR_BASE}/build

echo "Removing ./src"
rm -fr ${DIR_BASE}/src

echo "Removing various files from ./examples"
rm -f ${DIR_BASE}/examples/jsm/controls/TrackballControls.js
rm -f ${DIR_BASE}/examples/jsm/controls/TrackballControls.d.ts
rm -f ${DIR_BASE}/examples/jsm/loaders/MTLLoader.js
rm -f ${DIR_BASE}/examples/jsm/loaders/MTLLoader.d.ts
rm -f ${DIR_BASE}/examples/jsm/helpers/VertexNormalsHelper.js
rm -f ${DIR_BASE}/examples/jsm/helpers/VertexNormalsHelper.d.ts
rm -f ${DIR_BASE}/examples/jsm/libs/dat.gui.module.js
rm -f ${DIR_BASE}/examples/jsm/libs/gunzip.module.min.js
