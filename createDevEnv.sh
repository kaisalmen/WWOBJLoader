#!/bin/bash

# This is run inside the container
mkdir build
mkdir -p examples/jsm/controls
mkdir -p examples/jsm/libs

cp ./node_modules/three/build/* ./build
cp ./node_modules/three/examples/jsm/controls/TrackballControls.js ./examples/jsm/controls/TrackballControls.js
cp ./node_modules/three/examples/jsm/libs/dat.gui.module.js ./examples/jsm/libs/dat.gui.module.js
