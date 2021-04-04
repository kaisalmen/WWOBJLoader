import { WorkerTaskManager } from "./loaders/workerTaskManager/WorkerTaskManager.js";
import { WorkerTaskManagerDefaultRouting } from "./loaders/workerTaskManager/worker/defaultRouting.js";

import {
	DataTransport,
	GeometryTransport,
	MeshTransport,
	MaterialsTransport,
	ObjectUtils,
	ObjectManipulator
} from "./loaders/utils/TransportUtils.js";
import { MaterialUtils } from "./loaders/utils/MaterialUtils.js";
import { MaterialStore } from "./loaders/utils/MaterialStore.js";

// examples
/*
import { WTMModuleExample } from "./loaders/workerTaskManager/worker/tmModuleExample.js";
import { WTMModuleExampleNoThree } from "./loaders/workerTaskManager/worker/tmModuleExampleNoThree.js";
import { TransferableWorkerTest1 } from "./loaders/workerTaskManager/worker/transferableWorkerTest1.js";
import { TransferableWorkerTest2 } from "./loaders/workerTaskManager/worker/transferableWorkerTest2.js";
import { TransferableWorkerTest3 } from "./loaders/workerTaskManager/worker/transferableWorkerTest3.js";
import { TransferableWorkerTest4 } from "./loaders/workerTaskManager/worker/transferableWorkerTest4.js";
*/

export {
	WorkerTaskManager,
	DataTransport,
	GeometryTransport,
	MeshTransport,
	MaterialsTransport,
	ObjectUtils,
	ObjectManipulator,
	MaterialUtils,
	MaterialStore,
	WorkerTaskManagerDefaultRouting
}
/*
export {
	WTMModuleExample,
	WTMModuleExampleNoThree,
	TransferableWorkerTest1,
	TransferableWorkerTest2,
	TransferableWorkerTest3,
	TransferableWorkerTest4
}
*/