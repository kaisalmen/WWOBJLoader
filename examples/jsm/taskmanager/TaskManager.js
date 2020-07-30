/**
 * @author Don McCurdy / https://www.donmccurdy.com
 * @author Kai Salmen / https://kaisalmen.de
 */

import { FileLoader } from "../../../build/three.module.js";
import { TaskManagerDefaultRouting } from "./worker/tmDefaultComRouting.js";

/**
 * Register one to many tasks type to the TaskManager. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The TaskManager allows to execute a maximum number of executions in parallel.
 */
class TaskManager {

    /**
     * Creates a new TaskManager instance.
     *
     * @param {number} [maxParallelExecutions] How many workers are allowed to be executed in parallel.
     */
    constructor ( maxParallelExecutions ) {

        /**
         * @type {Map<string, WorkerTypeDefinition>}
         */
        this.taskTypes = new Map();
        this.verbose = false;
        this.maxParallelExecutions = maxParallelExecutions ? maxParallelExecutions : 4;
        this.actualExecutionCount = 0;
        /**
         * @type {StoredExecution[]}
         */
        this.storedExecutions = [];

    }

    /**
     * Set if logging should be verbose
     *
     * @param {boolean} verbose
     * @return {TaskManager}
     */
    setVerbose ( verbose ) {

        this.verbose = verbose;
        return this;

    }

    /**
     * Set the maximum number of parallel executions.
     *
     * @param {number} maxParallelExecutions How many workers are allowed to be executed in parallel.
     * @return {TaskManager}
     */
    setMaxParallelExecutions ( maxParallelExecutions ) {

        this.maxParallelExecutions = maxParallelExecutions;
        return this;

    }

    /**
     * Returns the maximum number of parallel executions.
     * @return {number}
     */
    getMaxParallelExecutions () {

        return this.maxParallelExecutions;

    }

    /**
     * Returns true if support for the given task type is available.
     *
     * @param {string} taskType The task type as string
     * @return boolean
     */
    supportsTaskType ( taskType ) {

        return this.taskTypes.has( taskType );

    }

    /**
     * Registers functions and dependencies for a new task type.
     *
     * @param {string} taskType The name to be used for registration.
     * @param {function} initFunction The function to be called when the worker is initialised
     * @param {function} executeFunction The function to be called when the worker is executed
     * @param {function} comRoutingFunction The function that should handle communication, leave undefined for default behavior
     * @param {boolean} fallback Set to true if execution should be performed in main
     * @param {Object[]} [dependencyDescriptions]
     * @return {TaskManager}
     */
    registerTaskType ( taskType, initFunction, executeFunction, comRoutingFunction, fallback, dependencyDescriptions ) {

        let workerTypeDefinition = new WorkerTypeDefinition( taskType, this.maxParallelExecutions, fallback, this.verbose );
        workerTypeDefinition.setFunctions( initFunction, executeFunction, comRoutingFunction );
        workerTypeDefinition.setDependencyDescriptions( dependencyDescriptions );
        this.taskTypes.set( taskType, workerTypeDefinition );
        return this;

    }

    /**
     * Registers functionality for a new task type based on module file.
     *
     * @param {string} taskType The name to be used for registration.
     * @param {string} workerModuleUrl The URL to be used for the Worker. Module must provide logic to handle "init" and "execute" messages.
     * @return {TaskManager}
     */
    registerTaskTypeModule ( taskType, workerModuleUrl ) {

        let workerTypeDefinition = new WorkerTypeDefinition( taskType, this.maxParallelExecutions, false, this.verbose );
        workerTypeDefinition.setWorkerModule( workerModuleUrl );
        this.taskTypes.set( taskType, workerTypeDefinition );
        return this;

    }

    /**
     * Provides initialization configuration and transferable objects.
     *
     * @param {string} taskType The name of the registered task type.
     * @param {object} config Configuration properties as serializable string.
     * @param {Object} [transferables] Any optional {@link ArrayBuffer} encapsulated in object..
     */
    async initTaskType ( taskType, config, transferables ) {

        let workerTypeDefinition = this.taskTypes.get( taskType );
        if ( workerTypeDefinition.isWorkerModule() ) {

            return await workerTypeDefinition.createWorkerModules()
                .then( instances => workerTypeDefinition.initWorkers( instances, config, transferables ) );

        }
        else {

            return await workerTypeDefinition.loadDependencies()
                .then( buffers => workerTypeDefinition.generateWorkerCode( buffers ) )
                .then( code => workerTypeDefinition.createWorkers( code ) )
                .then( instances => workerTypeDefinition.initWorkers( instances, config, transferables ) )
                .catch( x => console.error( x ) );

        }
    }

    /**
     * Queues a new task of the given type. Task will not execute until initialization completes.
     *
     * @param {string} taskType The name of the registered task type.
     * @param {object} config Configuration properties as serializable string.
     * @param {Function} assetAvailableFunction Invoke this function if an asset become intermediately available
     * @param {Object} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     * @return {Promise}
     */
    async enqueueForExecution ( taskType, config, assetAvailableFunction, transferables ) {

        let localPromise = new Promise( ( resolveUser, rejectUser ) => {

            this.storedExecutions.push( new StoredExecution( taskType, config, assetAvailableFunction, resolveUser, rejectUser, transferables ) );

        } );
        this._kickExecutions();
        return localPromise;

    }

    _kickExecutions () {

        while ( this.actualExecutionCount < this.maxParallelExecutions && this.storedExecutions.length > 0 ) {

            let storedExecution = this.storedExecutions.shift();
            if ( storedExecution ) {

                let workerTypeDefinition = this.taskTypes.get( storedExecution.taskType );
                if ( workerTypeDefinition.hasTask() ) {

                    let taskWorker = workerTypeDefinition.getAvailableTask();
                    this.actualExecutionCount++;
                    let promiseWorker = new Promise( ( resolveWorker, rejectWorker ) => {

                        taskWorker.onmessage = function ( e ) {

                            // allow intermediate asset provision before flagging execComplete
                            if ( e.data.cmd === 'assetAvailable' ) {

                                if ( storedExecution.assetAvailableFunction instanceof Function ) {

                                    storedExecution.assetAvailableFunction( e.data );

                                }

                            }
                            else {

                                resolveWorker( e );

                            }

                        };
                        taskWorker.onerror = rejectWorker;

                        taskWorker.postMessage( {
                            cmd: "execute",
                            workerId: taskWorker.getId(),
                            config: storedExecution.config
                        }, storedExecution.transferables );

                    } );
                    promiseWorker.then( ( e ) => {

                        workerTypeDefinition.returnAvailableTask( taskWorker );
                        storedExecution.resolve( e.data );
                        this.actualExecutionCount --;
                        this._kickExecutions();

                    } ).catch( ( e ) => {

                        storedExecution.reject( "Execution error: " + e );

                    } );

                }
                else {

                    // try later again, add at the end for now
                    this.storedExecutions.push( storedExecution );

                }

            }

        }
    }

    /**
     * Destroys all workers and associated resources.
     * @return {TaskManager}
     */
    dispose () {

        for ( let workerTypeDefinition of this.taskTypes.values() ) {

            workerTypeDefinition.dispose();

        }
        return this;

    }

}

/**
 * Defines a worker type: functions, dependencies and runtime information once it was created.
 */
class WorkerTypeDefinition {

    /**
     * Creates a new instance of {@link WorkerTypeDefinition}.
     *
     * @param {string} taskType The name of the registered task type.
     * @param {Number} maximumCount Maximum worker count
     * @param {boolean} fallback Set to true if execution should be performed in main
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    constructor ( taskType, maximumCount, fallback, verbose ) {
        this.taskType = taskType;
        this.fallback = fallback;
        this.verbose = verbose === true;
        this.functions = {
            init: {
                /** @type {function} */
                ref: null,
                /** @type {string} */
                code: null
            },
            execute: {
                /** @type {function} */
                ref: null,
                /** @type {string} */
                code: null
            },
            comRouting: {
                /** @type {function} */
                ref: null,
                /** @type {string} */
                code: null
            },
            dependencies: {
                /** @type {Object[]} */
                descriptions: [],
                /** @type {string[]} */
                code: []
            },
            /**
             * @type {URL}
             */
            workerModuleUrl: null
        };


        this.workers = {
            /** @type {string[]} */
            code: [],
            /** @type {TaskWorker[]|MockedTaskWorker[]} */
            instances: new Array ( maximumCount ),
            /** @type {TaskWorker[]|MockedTaskWorker[]} */
            available: []
        };

    }

    getTaskType () {

        return this.taskType;

    }

    /**
     * Set the three functions. A default comRouting function is used if it is not passed here.
     *
     * @param {function} initFunction The function to be called when the worker is initialised
     * @param {function} executeFunction The function to be called when the worker is executed
     * @param {function} [comRoutingFunction] The function that should handle communication, leave undefined for default behavior
     */
    setFunctions ( initFunction, executeFunction, comRoutingFunction ) {

        this.functions.init.ref = initFunction;
        this.functions.execute.ref = executeFunction;
        this.functions.comRouting.ref = comRoutingFunction;

        if ( this.functions.comRouting.ref === undefined || this.functions.comRouting.ref === null ) {

            this.functions.comRouting.ref = TaskManagerDefaultRouting.comRouting;

        }
    }

    /**
     * Set the url of all dependent libraries (only used in non-module case).
     *
     * @param {Object[]} dependencyDescriptions URLs of code init and execute functions rely on.
     */
    setDependencyDescriptions ( dependencyDescriptions ) {

        if ( dependencyDescriptions ) {

            dependencyDescriptions.forEach( description => { this.functions.dependencies.descriptions.push( description ) } );

        }

    }

    /**
     * Set the url of the module worker.
     *
     * @param {string} workerModuleUrl The URL is created from this string.
     */
    setWorkerModule ( workerModuleUrl ) {

        this.functions.workerModuleUrl = new URL( workerModuleUrl, window.location.href );

    }

    /**
     * Is it a module worker?
     *
     * @return {boolean} True or false
     */
    isWorkerModule () {

        return ( this.functions.workerModuleUrl !== null );

    }

    /**
     * Loads all dependencies and stores each as {@link ArrayBuffer} into the array. Returns if all loading is completed.
     *
     * @return {Promise<Object[]>}
     */
    async loadDependencies () {

        let fileLoader = new FileLoader();
        fileLoader.setResponseType( 'arraybuffer' );
        for ( let description of this.functions.dependencies.descriptions ) {

            let dep;
            if ( description.url ) {

                let url = new URL( description.url, window.location.href );
                dep = await fileLoader.loadAsync( url.href, report => { if ( this.verbose ) console.log( report ); } )

            }
            if ( description.code ) {

                dep = await new Promise( resolve => resolve( description.code ) );

            }
            this.functions.dependencies.code.push( dep );

        }
        if ( this.verbose ) console.log( 'Task: ' + this.getTaskType() + ': Waiting for completion of loading of all dependencies.');
        return await Promise.all( this.functions.dependencies.code );

    }

    /**
     * Uses the configured values for init, execute and comRouting and embeds it in necessary glue code.
     *
     * @param {ArrayBuffer[]} dependencies
     * @return {Promise<String[]>}
     */
    async generateWorkerCode ( dependencies ) {

        this.functions.init.code = 'const init = ' + this.functions.init.ref.toString() + ';\n\n';
        this.functions.execute.code = 'const execute = ' + this.functions.execute.ref.toString() + ';\n\n';
        if ( this.functions.comRouting.ref !== null ) {

            this.functions.comRouting.code = "const comRouting = " + this.functions.comRouting.ref.toString() + ";\n\n";

        }
        this.workers.code.push( this.functions.init.code );
        this.workers.code.push( this.functions.execute.code );
        this.workers.code.push( this.functions.comRouting.code );
        this.workers.code.push( 'self.addEventListener( "message", message => comRouting( self, message, null, init, execute ), false );' );

        return this.workers.code;

    }

    /**
     * Creates workers based on the configured function and dependency strings.
     *
     * @param {string} code
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkers ( code ) {

        let worker;
        if ( !this.fallback ) {

            let workerBlob = new Blob( this.functions.dependencies.code.concat( this.workers.code ), { type: 'application/javascript' } );
            let objectURL = window.URL.createObjectURL( workerBlob );
            for ( let i = 0; i < this.workers.instances.length; i ++ ) {

                worker = new TaskWorker( i, objectURL );
                this.workers.instances[ i ] = worker;

            }

        }
        else {

            for ( let i = 0; i < this.workers.instances.length; i ++ ) {

                worker = new MockedTaskWorker( i, this.functions.init.ref, this.functions.execute.ref );
                this.workers.instances[ i ] = worker;

            }

        }
        return this.workers.instances;

    }

    /**
     * Creates module workers.
     *
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkerModules () {

        for ( let worker, i = 0; i < this.workers.instances.length; i++ ) {

            worker = new TaskWorker( i, this.functions.workerModuleUrl.href, { type: "module" } );
            this.workers.instances[ i ] = worker;

        }
        return this.workers.instances;

    }

    /**
     * Initialises all workers with common configuration data.
     *
     * @param {TaskWorker[]|MockedTaskWorker[]} instances
     * @param {object} config
     * @param {Object} transferables
     * @return {Promise<TaskWorker[]>}
     */
    async initWorkers ( instances, config, transferables ) {

        for ( let taskWorker of instances ) {

            await new Promise( ( resolveWorker, rejectWorker ) => {

                taskWorker.onmessage = resolveWorker;
                taskWorker.onerror = rejectWorker;

                // ensure all transferables are copies to all workers on int!
                let transferablesToWorker;
                if ( transferables ) {
                    transferablesToWorker = {};
                    for ( let [ key, transferable ] of Object.entries( transferables ) ) {
                        transferablesToWorker[ key ] = transferable !== null ? transferable.slice( 0 ) : null;
                    }
                }

                taskWorker.postMessage( {
                    cmd: "init",
                    workerId: taskWorker.getId(),
                    config: config
                }, transferablesToWorker );

            } );
            this.workers.available.push( taskWorker );

        }
        if ( this.verbose ) console.log( 'Task: ' + this.getTaskType() + ': Waiting for completion of initialization of all workers.');
        return await Promise.all( this.workers.available );

    }

    /**
     * Returns the first {@link TaskWorker} or {@link MockedTaskWorker} from array of available workers.
     *
     * @return {TaskWorker|MockedTaskWorker|undefined}
     */
    getAvailableTask () {

        return this.workers.available.shift();

    }

    /**
     * Returns if a task is available or not.
     *
     * @return {boolean}
     */
    hasTask () {

        return this.workers.available.length > 0;

    }

    /**
     *
     * @param {TaskWorker|MockedTaskWorker} taskWorker
     */
    returnAvailableTask ( taskWorker ) {

        this.workers.available.push( taskWorker );

    }

    /**
     * Dispose all worker instances.
     */
    dispose () {

        for ( let taskWorker of this.workers.instances ) {

            taskWorker.terminate();

        }

    }

}

/**
 * Contains all things required for later executions of Worker.
 */
class StoredExecution {

    /**
     * Creates a new instance.
     *
     * @param {string} taskType
     * @param {object} config
     * @param {Function} assetAvailableFunction
     * @param {Function} resolve
     * @param {Function} reject
     * @param {Transferable[]} [transferables]
     */
    constructor( taskType, config, assetAvailableFunction, resolve, reject, transferables ) {

        this.taskType = taskType;
        this.config = config;
        this.assetAvailableFunction = assetAvailableFunction;
        this.resolve = resolve;
        this.reject = reject;
        this.transferables = transferables;

    }

}

/**
 * Extends the {@link Worker} with an id.
 */
class TaskWorker extends Worker {

    /**
     * Creates a new instance.
     *
     * @param {number} id Numerical id of the task.
     * @param {string} aURL
     * @param {object} [options]
     */
    constructor( id, aURL, options ) {

        super( aURL, options );
        this.id = id;

    }

    /**
     * Returns the id.
     * @return {number}
     */
    getId() {

        return this.id;

    }

}

/**
 * This is a mock of a worker to be used on Main. It defines necessary functions, so it can be handled like
 * a regular {@link TaskWorker}.
 */
class MockedTaskWorker {

    /**
     * Creates a new instance.
     *
     * @param {number} id
     * @param {function} initFunction
     * @param {function} executeFunction
     */
    constructor( id, initFunction, executeFunction ) {

        this.id = id;
        this.functions = {
            init: initFunction,
            execute: executeFunction
        }

    }

    /**
     * Returns the id.
     * @return {number}
     */
    getId() {

        return this.id;

    }

    /**
     * Delegates the message to the registered functions
     * @param {String} message
     * @param {Transferable[]} [transfer]
     */
    postMessage( message, transfer ) {

        let scope = this;
        let self = {
            postMessage: function ( m ) {
                scope.onmessage( { data: m } )
            }
        }
        TaskManagerDefaultRouting.comRouting( self, { data: message }, null, scope.functions.init, scope.functions.execute )

    }

    /**
     * Mocking termination
     */
    terminate () {}

}


export { TaskManager };
