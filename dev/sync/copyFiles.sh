#!/bin/bash

cp -fv ${1}/examples/webgl_loader_workertaskmanager.html ${2}/examples/webgl_loader_workertaskmanager.html

cp -fv ${1}/examples/jsm/loaders/worker/tmModuleExample.js ${2}/examples/jsm/loaders/worker/
cp -fv ${1}/examples/jsm/loaders/worker/tmModuleExampleNoThree.js ${2}/examples/jsm/loaders/worker/
cp -fv ${1}/examples/jsm/loaders/worker/tmOBJLoader.js ${2}/examples/jsm/loaders/worker/
cp -fv ${1}/examples/jsm/loaders/workerTaskManager/WorkerTaskManager.js ${2}/examples/jsm/loaders/workerTaskManager
cp -fv ${1}/examples/jsm/loaders/workerTaskManager/utils/*.js ${2}/examples/jsm/loaders/workerTaskManager/utils/
cp -fv ${1}/examples/jsm/loaders/workerTaskManager/comm/worker/*.js ${2}/examples/jsm/loaders/workerTaskManager/comm/worker/

cp -fv ${1}/examples/models/obj/male02/male02.obj ${2}/examples/models/obj/male02/
cp -fv ${1}/examples/models/obj/male02/male02.mtl ${2}/examples/models/obj/male02/
cp -fv ${1}/examples/models/obj/male02/*.JPG ${2}/examples/models/obj/male02/
cp -fv ${1}/examples/models/obj/female02/female02.obj ${2}/examples/models/obj/female02/
cp -fv ${1}/examples/models/obj/female02/female02.mtl ${2}/examples/models/obj/female02/
cp -fv ${1}/examples/models/obj/female02/*.JPG ${2}/examples/models/obj/female02/
cp -fv ${1}/examples/models/obj/ninja/*.obj ${2}/examples/models/obj/ninja/
cp -fv ${1}/examples/models/obj/cerberus/Cerberus.obj ${2}/examples/models/obj/cerberus/Cerberus.obj
cp -fv ${1}/examples/models/obj/walt/WaltHead.* ${2}/examples/models/obj/walt/
