/**
 * @author Don McCurdy / https://www.donmccurdy.com
 * @author Kai Salmen / https://kaisalmen.de
 */

import { FileLoaderBufferAsync } from "./obj2/utils/FileLoaderBufferAsync.js";

/**
 *
 */
class TaskManager {

    constructor () {

        this.types = new Map();
        this.verbose = false;

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
     * Returns true if support for the given task type is available.
     * @param {string} type The type as string
     * @return boolean
     */
    supportsType ( type ) {

        return this.types.has( type );

    }

    /**
     * Registers functionality for a new task type.
     * @param {string} type The name to be used for registration.
     * @param {number} maximumWorkerCount How many workers are allows. Set 0 for execution on Main ({@link FakeTaskWorker})
     * @param {function} initFunction The function to be called when the worker is initialised
     * @param {function} executeFunction The function to be called when the worker is executed
     * @param {function} comRoutingFunction The function that should handle communication, leave undefined for default behavior
     * @param {String[]} [dependencyUrls]
     * @return {TaskManager}
     */
    registerType ( type, maximumWorkerCount, initFunction, executeFunction, comRoutingFunction, dependencyUrls ) {

        let workerTypeDefinition = new WorkerTypeDefinition( type, maximumWorkerCount, this.verbose );
        workerTypeDefinition.setFunctions( initFunction, executeFunction, comRoutingFunction );
        workerTypeDefinition.setDependencyUrls( dependencyUrls );
        this.types.set( type, workerTypeDefinition );
        return this;

    }

    /**
     * Registers functionality for a new task type based on module file.
     * @param {string} type The name to be used for registration.
     * @param {number} maximumWorkerCount How many workers are allows. Set 0 for execution on Main ({@link FakeTaskWorker})
     * @param {string} workerJsmUrl The URL to be used for the Worker. Module must provide logic to handle "init" and "execute" messages.
     * @return {TaskManager}
     */
    registerTypeJsm ( type, maximumWorkerCount, workerJsmUrl ) {

        let workerTypeDefinition = new WorkerTypeDefinition( type, maximumWorkerCount, this.verbose );
        workerTypeDefinition.setWorkerJsm( workerJsmUrl );
        this.types.set( type, workerTypeDefinition );
        return this;

    }

    /**
     * Provides initialization configuration and transferable objects.
     * @param {string} type The name of the registered task type.
     * @param {object} config Configuration properties as serializable string.
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer}.
     */
    async initType ( type, config, transferables ) {

        let workerTypeDefinition = this.types.get( type );
        if ( workerTypeDefinition.isWorkerJsm() ) {

            return await workerTypeDefinition.createWorkersJsm()
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
     * @param {string} type The name of the registered task type.
     * @param {object} config Configuration properties as serializable string.
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer}.
     * @return {Promise}
     */
    async addTask ( type, config, transferables ) {

        let workerTypeDefinition = this.types.get( type );
        let taskWorker = workerTypeDefinition.getAvailableTask();
        return new Promise( ( resolveUser, rejectUser ) => {

            /**
             * Function wrapping worker execution. It binds resolve and reject to onmessage and onerror.
             *
             * @param {TaskWorker} taskWorkerExecute
             * @param {function} resolveExecute
             * @param {function} rejectExecute
             */
            function executeWorker( taskWorkerExecute, resolveExecute, rejectExecute ) {

                let promiseWorker = new Promise( ( resolveWorker, rejectWorker ) => {

                    taskWorkerExecute.onmessage = resolveWorker;
                    taskWorkerExecute.onerror = rejectWorker;

                    taskWorkerExecute.postMessage( {
                        cmd: "execute",
                        id: taskWorkerExecute.getId(),
                        config: config
                    }, transferables );

                } );
                promiseWorker.then( ( e ) => {

                    resolveExecute( e.data );
                    workerTypeDefinition.returnAvailableTask( taskWorkerExecute );

                } ).catch( ( e ) => {

                    rejectExecute( "Execution error: " + e );

                } );

            }

            if ( taskWorker ) {

                executeWorker( taskWorker, resolveUser, rejectUser );

            }
            else {

                // store promises that can not directly executed as the limit has been reached.
                // storedPromises are checked when returnAvailableTask is called.
                workerTypeDefinition.workers.storedPromises.push( {
                    exec: executeWorker,
                    resolve: resolveUser,
                    reject: rejectUser
                } );

            }

        } )

    }

    /**
     * Destroys all workers and associated resources.
     * @return {TaskManager}
     */
    dispose () {

        for ( let workerTypeDefinition of this.types.values() ) {

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
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    /**

     */
    constructor ( type, maximumCount, verbose ) {
        this.type = type;
        this.maximumCount = maximumCount;
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
            workerJsmUrl: null
        };


        this.workers = {
            code: [],
            instances: [],
            available: [],
            storedPromises: []
        };

    }

    getType () {

        return this.type;

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

        if ( this.maximumCount > 0 && this.functions.comRouting.ref === undefined || this.functions.comRouting.ref === null ) {

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
     * Set the url of all dependent libraries (only used in non-jsm case).
     *
     * @param {String[]} dependencyUrls URLs of code init and execute functions rely on.
     */
    setDependencyUrls ( dependencyUrls ) {

        if ( dependencyUrls ) {

            dependencyUrls.forEach( url => { this.functions.dependencies.urls.push( new URL( url, window.location.href ) ) } );

        }

    }

    /**
     * Set the url of the jsm worker.
     *
     * @param {string} workerJsmUrl The URL is created from this string.
     */
    setWorkerJsm ( workerJsmUrl ) {

        this.functions.workerJsmUrl = new URL( workerJsmUrl, window.location.href );

    }

    /**
     * Is it a jsm worker?
     *
     * @return {boolean} True or false
     */
    isWorkerJsm () {

        return ( this.functions.workerJsmUrl !== null );

    }

    /**
     * Loads all dependencies and stores each as {@link ArrayBuffer} into the array. Returns if all loading is completed.
     *
     * @return {Promise<ArrayBuffer[]>}
     */
    async loadDependencies () {

        let fileLoaderBufferAsync = new FileLoaderBufferAsync();
        for ( let url of this.functions.dependencies.urls ) {

            let dep = await fileLoaderBufferAsync.loadFileAsync( url, report => { if ( this.verbose ) console.log( report.detail.text ); } )
            this.functions.dependencies.code.push( dep );

        }
        if ( this.verbose ) console.log( 'Task: ' + this.getType() + ': Waiting for completion of loading of all dependencies.');
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

        let worker, workerBlob;
        for ( let i = 0; i < this.maximumCount; i++ ) {

            workerBlob = new Blob( this.functions.dependencies.code.concat( this.workers.code ), { type: 'application/javascript' } );
            worker = new TaskWorker( i, window.URL.createObjectURL( workerBlob ) );
            this.workers.instances[ i ] = worker;

        }
        if ( this.workers.instances.length === 0) {

            worker = new FakeTaskWorker( 0, this.functions.init.ref, this.functions.execute.ref );
            this.workers.instances[ 0 ] = worker;

        }
        return this.workers.instances;

    }

    /**
     *
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkersJsm () {

        for ( let worker, i = 0; i < this.maximumCount; i++ ) {

            worker = new TaskWorker( i, this.functions.workerJsmUrl.href, { type: "module" } );
            this.workers.instances[ i ] = worker;

        }
        return this.workers.instances;

    }

    /**
     *
     * @param {TaskWorker[]} instances
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
        if ( this.verbose ) console.log( 'Task: ' + this.getType() + ': Waiting for completion of initialization of all workers.');
        return await Promise.all( this.workers.available );

    }

    /**
     * Returns the first {@link TaskWorker} from array of available workers.
     *
     * @return {TaskWorker|null}
     */
    getAvailableTask () {

        return this.workers.available.shift();

    }

    /**
     *
     * @param {TaskWorker} taskWorker
     */
    returnAvailableTask ( taskWorker ) {

        this.workers.available.push( taskWorker );
        let storedExec = this.workers.storedPromises.shift();
        if ( storedExec ) {

            storedExec.exec( this.getAvailableTask(), storedExec.resolve, storedExec.reject );

        }

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
class FakeTaskWorker extends TaskWorker {

    /**
     *
     * @param id
     * @param {function} initFunction
     * @param {function} executeFunction
     */
    constructor( id, initFunction, executeFunction ) {

        super( id, null )
        this.functions = {
            init: initFunction,
            execute: executeFunction
        }

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
