/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { OBJLoader2Parser } from "../OBJLoader2Parser.js";
import { WorkerRunner } from "../WorkerRunner.js";

new WorkerRunner( new OBJLoader2Parser() );
