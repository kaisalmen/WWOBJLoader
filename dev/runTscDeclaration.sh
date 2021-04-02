#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)
DIR_LOADER_SRC=${DIR_BASE}/build/ts
DIR_LOADER_TRG=${DIR_BASE}/src/loaders

rm -fr ${DIR_BASE}/build/ts

tsc -p ${DIR_BASE}/declaration.tsconfig.json

#cp -f ${DIR_LOADER_SRC}/workerTaskManager/WorkerTaskManager.d.ts ${DIR_LOADER_TRG}/workerTaskManager/WorkerTaskManager.d.ts
#cp -f ${DIR_LOADER_SRC}/workerTaskManager/utils/TransportUtils.d.ts ${DIR_LOADER_TRG}/workerTaskManager/utils/TransportUtils.d.ts
#cp -f ${DIR_LOADER_SRC}/workerTaskManager/utils/MaterialUtils.d.ts ${DIR_LOADER_TRG}/workerTaskManager/utils/MaterialUtils.d.ts
#cp -f ${DIR_LOADER_SRC}/workerTaskManager/utils/MaterialStore.d.ts ${DIR_LOADER_TRG}/workerTaskManager/utils/MaterialStore.d.ts
#cp -f ${DIR_LOADER_SRC}/workerTaskManager/worker/defaultRouting.d.ts ${DIR_LOADER_TRG}/workerTaskManager/worker/defaultRouting.d.ts
#cp -f ${DIR_LOADER_SRC}/workerTaskManager/worker/tmOBJLoader2.d.ts ${DIR_LOADER_TRG}/workerTaskManager/worker/tmOBJLoader2.d.ts
#cp -f ${DIR_LOADER_SRC}/AssetPipelineLoader.d.ts ${DIR_LOADER_TRG}/AssetPipelineLoader.d.ts
#cp -f ${DIR_LOADER_SRC}/OBJLoader2.d.ts ${DIR_LOADER_TRG}/OBJLoader2.d.ts
#cp -f ${DIR_LOADER_SRC}/OBJLoader2Parallel.d.ts ${DIR_LOADER_TRG}/OBJLoader2Parallel.d.ts
#cp -f ${DIR_LOADER_SRC}/obj2/MtlObjBridge.d.ts ${DIR_LOADER_TRG}/obj2/MtlObjBridge.d.ts
#cp -f ${DIR_LOADER_SRC}/pipeline/utils/ResourceDescriptor.d.ts ${DIR_LOADER_TRG}/pipeline/utils/ResourceDescriptor.d.ts
