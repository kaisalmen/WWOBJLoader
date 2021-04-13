#!/bin/bash

# This script copies local changes to the three.js repository checkout residing in a parallel directory.

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/../..)
DIR_THREE=${DIR_BASE}/../three.js

cp -fv ${DIR_BASE}/public/examples/webgl_loader_workertaskmanager.html ${DIR_THREE}/examples/webgl_loader_workertaskmanager.html

cp -fv ${DIR_BASE}/src/loaders/workerTaskManager/WorkerTaskManager.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/WorkerTaskManager.js
cp -fv ${DIR_BASE}/src/loaders/workerTaskManager/worker/defaultRouting.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/worker/defaultRouting.js
cp -fv ${DIR_BASE}/src/loaders/workerTaskManager/worker/tmOBJLoader.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/worker/tmOBJLoader.js

cp -fv ${DIR_BASE}/src/loaders/utils/MaterialStore.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/utils/MaterialStore.js
cp -fv ${DIR_BASE}/src/loaders/utils/MaterialUtils.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/utils/MaterialUtils.js
cp -fv ${DIR_BASE}/src/loaders/utils/TransportUtils.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/utils/TransportUtils.js

cp -fv ${DIR_BASE}/public/models/obj/male02/male02.obj ${DIR_THREE}/examples/models/obj/male02/male02.obj
cp -fv ${DIR_BASE}/public/models/obj/male02/male02.mtl ${DIR_THREE}/examples/models/obj/male02/male02.mtl
cp -fv ${DIR_BASE}/public/models/obj/male02/*.JPG ${DIR_THREE}/examples/models/obj/male02/
cp -fv ${DIR_BASE}/public/models/obj/female02/female02.obj ${DIR_THREE}/examples/models/obj/female02/female02.obj
cp -fv ${DIR_BASE}/public/models/obj/female02/female02.mtl ${DIR_THREE}/examples/models/obj/female02/female02.mtl
cp -fv ${DIR_BASE}/public/models/obj/female02/*.JPG ${DIR_THREE}/examples/models/obj/female02/
cp -fv ${DIR_BASE}/public/models/obj/ninja/*.obj ${DIR_THREE}/examples/models/obj/ninja/
cp -fv ${DIR_BASE}/public/models/obj/cerberus/Cerberus.obj ${DIR_THREE}/examples/models/obj/cerberus/Cerberus.obj
cp -fv ${DIR_BASE}/public/models/obj/walt/WaltHead.* ${DIR_THREE}/examples/models/obj/walt/

