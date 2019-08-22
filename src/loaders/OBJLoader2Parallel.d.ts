import {
  LoadingManager
} from '../../node_modules/three/src/Three';
import { OBJLoader2 } from './OBJLoader2';

import { WorkerExecutionSupport} from './worker/main/WorkerExecutionSupport';

export class OBJLoader2Parallel extends OBJLoader2 {
  constructor(manager?: LoadingManager);
  preferJsmWorker: boolean;
	executeParallel: boolean;
	workerExecutionSupport: WorkerExecutionSupport;

  setPreferJsmWorker(preferJsmWorker: boolean): this;
  setCallbackOnParseComplete(onParseComplete: Function): this;
  setExecuteParallel(executeParallel: boolean): this;
  getWorkerExecutionSupport(): object;
  buildWorkerCode(): object;
}
