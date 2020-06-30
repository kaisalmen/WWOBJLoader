/**
 * @author Don McCurdy / https://www.donmccurdy.com
 * @author Kai Salmen / https://kaisalmen.de
 */

import { FileLoader } from "../../../build/three.module.js";

/**
 *
 */
class TaskManager {

    /**
     *
     * @param {number} [maximumWorkerCount] How many workers are allows. Set 0 for execution on Main ({@link FakeTaskWorker})
     */
    constructor ( maximumWorkerCount ) {

        this.taskTypes = new Map();
        this.verbose = false;
        this.maximumWorkerCount = maximumWorkerCount ? maximumWorkerCount : 4;
        this.actualExecutionCount = 0;
        this.storedPromises = [];

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
     * @param {number} maximumWorkerCount How many workers are allows. Set 0 for execution on Main ({@link FakeTaskWorker})
     * @return {TaskManager}
     */
    setMaximumWorkerCount ( maximumWorkerCount ) {

        this.maximumWorkerCount = maximumWorkerCount;
        return this;

    }


    /**
     * Returns true if support for the given task type is available.
     * @param {string} taskType The task type as string
     * @return boolean
     */
    supportsTaskType ( taskType ) {

        return this.taskTypes.has( taskType );

    }

    /**
     * Registers functionality for a new task type.
     * @param {string} taskType The name to be used for registration.
     * @param {function} initFunction The function to be called when the worker is initialised
     * @param {function} executeFunction The function to be called when the worker is executed
     * @param {function} comRoutingFunction The function that should handle communication, leave undefined for default behavior
     * @param {boolean} fallback Set to true if execution should be performed in main
     * @param {String[]} [dependencyUrls]
     * @return {TaskManager}
     */
    registerTaskType ( taskType, initFunction, executeFunction, comRoutingFunction, fallback, dependencyUrls ) {

        let workerTypeDefinition = new WorkerTypeDefinition( taskType, this.maximumWorkerCount, fallback, this.verbose );
        workerTypeDefinition.setFunctions( initFunction, executeFunction, comRoutingFunction );
        workerTypeDefinition.setDependencyUrls( dependencyUrls );
        this.taskTypes.set( taskType, workerTypeDefinition );
        return this;

    }

    /**
     * Registers functionality for a new task type based on module file.
     * @param {string} taskType The name to be used for registration.
     * @param {string} workerModuleUrl The URL to be used for the Worker. Module must provide logic to handle "init" and "execute" messages.
     * @return {TaskManager}
     */
    registerTaskTypeModule ( taskType, workerModuleUrl ) {

        let workerTypeDefinition = new WorkerTypeDefinition( taskType, this.maximumWorkerCount, false, this.verbose );
        workerTypeDefinition.setWorkerModule( workerModuleUrl );
        this.taskTypes.set( taskType, workerTypeDefinition );
        return this;

    }

    /**
     * Provides initialization configuration and transferable objects.
     * @param {string} taskType The name of the registered task type.
     * @param {object} config Configuration properties as serializable string.
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer}.
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
     * @param {string} taskType The name of the registered task type.
     * @param {object} config Configuration properties as serializable string.
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer}.
     * @return {Promise}
     */
    async enqueueForExecution ( taskType, config, transferables ) {

        let localPromise = new Promise( ( resolveUser, rejectUser ) => {

            this.storedPromises.push( {
                taskType: taskType,
                config: config,
                transferables: transferables,
                resolve: resolveUser,
                reject: rejectUser
            } );

        } )

        this._verify();

        return localPromise;

    }

    _verify () {

        while ( this.actualExecutionCount < this.maximumWorkerCount && this.storedPromises.length > 0 ) {

            let storedExec = this.storedPromises.shift();
            if ( storedExec ) {

                let workerTypeDefinition = this.taskTypes.get( storedExec.taskType );
                let taskWorker = workerTypeDefinition.getAvailableTask();
                if ( taskWorker ) {

                    this.actualExecutionCount++;
                    let promiseWorker = new Promise( ( resolveWorker, rejectWorker ) => {

                        taskWorker.onmessage = resolveWorker;
                        taskWorker.onerror = rejectWorker;

                        taskWorker.postMessage( {
                            cmd: "execute",
                            id: taskWorker.getId(),
                            config: storedExec.config
                        }, storedExec.transferables );

                    } );
                    promiseWorker.then( ( e ) => {

                        workerTypeDefinition.returnAvailableTask( taskWorker );
                        storedExec.resolve( e.data );
                        this.actualExecutionCount --;
                        this._verify();

                    } ).catch( ( e ) => {

                        storedExec.reject( "Execution error: " + e );

                    } );

                }
                else {

                    // try later again, add at the end for now
                    this.storedPromises.push( storedExec );

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
     * @param {string} type The name of the registered task type.
     * @param {Number} maximumCount Maximum worker count
     * @param {boolean} fallback Set to true if execution should be performed in main
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    /**

     */
    constructor ( taskType, maximumCount, fallback, verbose ) {
        this.taskType = taskType;
        this.maximumCount = maximumCount;
        this.fallback = fallback;
        this.verbose = verbose === true;
        this.functions = {
            init: {
                ref: null,
                code: null
            },
            execute: {
                ref: null,
                code: null
            },
            comRouting: {
                ref: null,
                code: null
            },
            dependencies: {
                urls: [],
                code: []
            },
            /**
             * @type {URL}
             */
            workerModuleUrl: null
        };


        this.workers = {
            code: [],
            instances: [],
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

        if ( this.fallback && this.functions.comRouting.ref === undefined || this.functions.comRouting.ref === null ) {

            let comRouting = function ( message, init, execute ) {

                let payload = message.data;
                if ( payload.cmd === 'init' ) {

                    init( self, payload.id, payload.config );

                } else if ( payload.cmd === 'execute' ) {

                    execute( self, payload.id, payload.config );

                }

            }
            this.functions.comRouting.ref = comRouting;

        }
    }

    /**
     * Set the url of all dependent libraries (only used in non-module case).
     *
     * @param {String[]} dependencyUrls URLs of code init and execute functions rely on.
     */
    setDependencyUrls ( dependencyUrls ) {

        if ( dependencyUrls ) {

            dependencyUrls.forEach( url => { this.functions.dependencies.urls.push( new URL( url, window.location.href ) ) } );

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
     * @return {Promise<ArrayBuffer[]>}
     */
    async loadDependencies () {

        let fileLoader = new FileLoader();
        fileLoader.setResponseType( 'arraybuffer' );
        for ( let url of this.functions.dependencies.urls ) {

            let dep = await fileLoader.loadAsync( url.href, report => { if ( this.verbose ) console.log( report ); } )
            this.functions.dependencies.code.push( dep );

        }
        if ( this.verbose ) console.log( 'Task: ' + this.getTaskType() + ': Waiting for completion of loading of all dependencies.');
        return await Promise.all( this.functions.dependencies.code );

    }

    /**
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
        this.workers.code.push( 'self.addEventListener( "message", message => comRouting( message, init, execute ), false );' );

        return this.workers.code;

    }

    /**
     *
     * @param {string} code
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkers ( code ) {

        let worker;
        if ( !this.fallback ) {

            let workerBlob = new Blob( this.functions.dependencies.code.concat( this.workers.code ), { type: 'application/javascript' } );
            let objectURL = window.URL.createObjectURL( workerBlob );
            for ( let i = 0; i < this.maximumCount; i ++ ) {

                worker = new TaskWorker( i, objectURL );
                this.workers.instances[ i ] = worker;

            }

        }
        else {

            for ( let i = 0; i < this.maximumCount; i ++ ) {

                worker = new FakeTaskWorker( i, this.functions.init.ref, this.functions.execute.ref );
                this.workers.instances[ i ] = worker;

            }

        }
        return this.workers.instances;

    }

    /**
     *
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkerModules () {

        for ( let worker, i = 0; i < this.maximumCount; i++ ) {

            worker = new TaskWorker( i, this.functions.workerModuleUrl.href, { type: "module" } );
            this.workers.instances[ i ] = worker;

        }
        return this.workers.instances;

    }

    /**
     *
     * @param {TaskWorker[]|FakeTaskWorker[]} instances
     * @param {object} config
     * @param {Transferable[]} transferables
     * @return {Promise<TaskWorker[]>}
     */
    async initWorkers ( instances, config, transferables ) {

        for ( let taskWorker of instances ) {

            await new Promise( ( resolveWorker, rejectWorker ) => {

                taskWorker.onmessage = resolveWorker;
                taskWorker.onerror = rejectWorker;

                taskWorker.postMessage( {
                    cmd: "init",
                    id: taskWorker.getId(),
                    config: config
                }, transferables );

            } );
            this.workers.available.push( taskWorker );

        }
        if ( this.verbose ) console.log( 'Task: ' + this.getTaskType() + ': Waiting for completion of initialization of all workers.');
        return await Promise.all( this.workers.available );

    }

    /**
     * Returns the first {@link TaskWorker} or {@link FakeTaskWorker} from array of available workers.
     *
     * @return {TaskWorker|FakeTaskWorker|undefined}
     */
    getAvailableTask () {

        return this.workers.available.shift();

    }

    /**
     *
     * @param {TaskWorker|FakeTaskWorker} taskWorker
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
 *
 */
class TaskWorker extends Worker {

    /**
     *
     * @param id
     * @param aURL
     * @param options
     */
    constructor( id, aURL, options ) {

        super( aURL, options );
        this.id = id;

    }

    /**
     *
     * @return {*}
     */
    getId() {

        return this.id;

    }

}

/**
 *
 */
class FakeTaskWorker {

    /**
     *
     * @param id
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
     *
     * @return {*}
     */
    getId() {

        return this.id;

    }

    /**
     *
     * @param message
     */
    postMessage( message ) {

        let scope = this;
        let comRouting = function ( message ) {
            let self = {
                postMessage: function ( m ) {
                    scope.onmessage( { data: m } )
                },
            }

            let payload = message.data;
            if ( payload.cmd === 'init' ) {

                scope.functions.init( self, payload.id, payload.config );

            }
            else if ( payload.cmd === 'execute' ) {

                scope.functions.execute( self, payload.id, payload.config );

            }
        };
        comRouting( { data: message } )

    }

}


export { TaskManager };
