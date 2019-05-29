/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../independent/OBJLoader2Parser.js";
import { WorkerRunner } from "../independent/WorkerRunner.js";


let workerRunner = new WorkerRunner( new OBJLoader2Parser() );
