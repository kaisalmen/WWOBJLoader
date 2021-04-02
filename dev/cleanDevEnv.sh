#!/bin/bash

# This is script is run inside the container or locally in bash environments

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

echo "Removing ./build"
rm -fr ${DIR_BASE}/build
