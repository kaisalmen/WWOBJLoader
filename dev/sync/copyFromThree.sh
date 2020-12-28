#!/bin/bash

# This script copies local changes to the three.js repository checkout residing in a parallel directory.

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/../..)
DIR_THREE=${DIR_BASE}/../three.js

bash ${DIR_ME}/copyFiles.sh "${DIR_THREE}" "${DIR_BASE}"
