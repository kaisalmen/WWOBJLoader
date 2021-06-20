#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)
DIR_LOADER_SRC=${DIR_BASE}/build/ts
DIR_LOADER_TRG=${DIR_BASE}/src

rm -fr ${DIR_LOADER_SRC}
mkdir -p ${DIR_LOADER_SRC}

tsc -p ${DIR_ME}/declaration.tsconfig.json

cp -f ${DIR_LOADER_SRC}/index.d.ts ${DIR_LOADER_TRG}/index.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/OBJLoader2.d.ts ${DIR_LOADER_TRG}/loaders/OBJLoader2.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/OBJLoader2Parallel.d.ts ${DIR_LOADER_TRG}/loaders/OBJLoader2Parallel.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/tmOBJLoader2.d.ts ${DIR_LOADER_TRG}/loaders/tmOBJLoader2.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/utils/MtlObjBridge.d.ts ${DIR_LOADER_TRG}/loaders/utils/MtlObjBridge.d.ts
