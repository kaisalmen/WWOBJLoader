#!/bin/bash

# This is script is run inside the container or locally in bash environments

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

echo "Removing ./build"
rm -fr ${DIR_BASE}/build

echo "Removing ./src"
rm -fr ${DIR_BASE}/src

echo "Removing ./examples/jsm/controls"
rm -fr ${DIR_BASE}/examples/jsm/controls

echo "Removing ./examples/jsm/helpers"
rm -fr ${DIR_BASE}/examples/jsm/helpers

echo "Removing ./examples/jsm/libs"
rm -fr ${DIR_BASE}/examples/jsm/libs

echo "Removing various files from ./examples"
#rm -f ${DIR_BASE}/examples/jsm/loaders/OBJLoader.js
#rm -f ${DIR_BASE}/examples/jsm/loaders/OBJLoader.d.ts
#rm -f ${DIR_BASE}/examples/js/loaders/OBJLoader.js
