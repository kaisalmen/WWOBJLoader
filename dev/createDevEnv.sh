#!/bin/bash

# This is script is run inside the container or locally in bash environments

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)

if [[ ! -d ${DIR_BASE}/build/ts ]]; then
  mkdir -p ${DIR_BASE}/build/ts
fi

echo "Executing npm install"
( cd ${DIR_BASE} && npm install )
