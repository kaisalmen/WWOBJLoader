#!/bin/bash

cp -fv ${1}/examples/webgl_loader_obj2.html ${2}/examples/webgl_loader_obj2.html
cp -fv ${1}/examples/webgl_loader_obj2_options.html ${2}/examples/webgl_loader_obj2_options.html
cp -fv ${1}/examples/webgl_loader_workertaskmanager.html ${2}/examples/webgl_loader_workertaskmanager.html

cp -fv ${1}/examples/jsm/loaders/OBJLoader2.* ${2}/examples/jsm/loaders/
cp -fv ${1}/examples/jsm/loaders/OBJLoader2Parallel.* ${2}/examples/jsm/loaders/

cp -fv ${1}/examples/jsm/loaders/obj2/OBJLoader2Parser.* ${2}/examples/jsm/loaders/obj2/
cp -fv ${1}/examples/jsm/loaders/obj2/bridge/* ${2}/examples/jsm/loaders/obj2/bridge/
cp -fv ${1}/examples/jsm/loaders/obj2/shared/* ${2}/examples/jsm/loaders/obj2/shared/
cp -fv ${1}/examples/jsm/loaders/obj2/utils/ResourceDescriptor.* ${2}/examples/jsm/loaders/obj2/utils/

cp -fv ${1}/examples/jsm/loaders/workerTaskManager/WorkerTaskManager.* ${2}/examples/jsm/loaders/workerTaskManager
cp -fv ${1}/examples/jsm/loaders/workerTaskManager/utils/* ${2}/examples/jsm/loaders/workerTaskManager/utils/
cp -fv ${1}/examples/jsm/loaders/workerTaskManager/worker/* ${2}/examples/jsm/loaders/workerTaskManager/worker/

cp -fv ${1}/examples/models/obj/verify/* ${2}/examples/models/obj/verify/
