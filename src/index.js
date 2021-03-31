/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2, OBJLoader2Parser } from "./loaders/OBJLoader2.js";
import { OBJLoader2Parallel } from "./loaders/OBJLoader2Parallel.js";
import { WorkerTaskManager } from "./loaders/workerTaskManager/WorkerTaskManager.js";
import {
	DataTransport,
	GeometryTransport,
	MeshTransport,
	MaterialsTransport,
	ObjectUtils,
	ObjectManipulator
} from "./loaders/workerTaskManager/utils/TransportUtils.js";
import { MaterialUtils } from "./loaders/workerTaskManager/utils/MaterialUtils.js";
import { MaterialStore } from "./loaders/workerTaskManager/utils/MaterialStore.js";
import { WorkerTaskManagerDefaultRouting } from "./loaders/workerTaskManager/worker/defaultRouting.js";
import { WTMModuleExample } from "./loaders/workerTaskManager/worker/tmModuleExample.js";
import { WTMModuleExampleNoThree } from "./loaders/workerTaskManager/worker/tmModuleExampleNoThree.js";
import { OBJ2LoaderWorker } from "./loaders/workerTaskManager/worker/tmOBJLoader2.js";
import { TransferableWorkerTest1 } from "./loaders/workerTaskManager/worker/transferableWorkerTest1.js";
import { TransferableWorkerTest2 } from "./loaders/workerTaskManager/worker/transferableWorkerTest2.js";
import { TransferableWorkerTest3 } from "./loaders/workerTaskManager/worker/transferableWorkerTest3.js";
import { TransferableWorkerTest4 } from "./loaders/workerTaskManager/worker/transferableWorkerTest4.js";

export {
	OBJLoader2,
	OBJLoader2Parser,
	OBJLoader2Parallel,
	WorkerTaskManager,
	DataTransport,
	GeometryTransport,
	MeshTransport,
	MaterialsTransport,
	ObjectUtils,
	ObjectManipulator,
	MaterialUtils,
	MaterialStore,
	WorkerTaskManagerDefaultRouting,
	WTMModuleExample,
	WTMModuleExampleNoThree,
	OBJ2LoaderWorker,
	TransferableWorkerTest1,
	TransferableWorkerTest2,
	TransferableWorkerTest3,
	TransferableWorkerTest4
}
