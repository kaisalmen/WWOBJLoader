#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

# This is run inside the container
mkdir ${DIR_BASE}/build
mkdir -p ${DIR_BASE}/examples/jsm/controls
mkdir -p ${DIR_BASE}/examples/jsm/libs

cp ${DIR_BASE}/node_modules/three/build/* ${DIR_BASE}/build
cp ${DIR_BASE}/node_modules/three/examples/jsm/controls/TrackballControls.js ${DIR_BASE}/examples/jsm/controls/TrackballControls.js
cp ${DIR_BASE}/node_modules/three/examples/jsm/libs/dat.gui.module.js ${DIR_BASE}/examples/jsm/libs/dat.gui.module.js
