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
     * @param {string} type
     * @param {number} maximumWorkerCount
     * @param {function} initFunction
     * @param {function} executeFunction
     * @param {function} comRoutingFunction
     * @param {String[]} [dependencyUrls]
     * @return {TaskManager}
     */
    registerType ( type, maximumWorkerCount, initFunction, executeFunction, comRoutingFunction, dependencyUrls ) {

        let workerTypeDefinition = new WorkerTypeDefinition( type, maximumWorkerCount );
        workerTypeDefinition.setFunctions( initFunction, executeFunction, comRoutingFunction );
        workerTypeDefinition.setDependencyUrls( dependencyUrls );
        this.types.set( type, workerTypeDefinition );
        return this;

    }

    /**
     * Registers functionality for a new task type based on module file.
     * @param {string} type
     * @param {number} maximumWorkerCount
     * @param {string} workerJsmUrl
     * @return {TaskManager}
     */
    registerTypeJsm ( type, maximumWorkerCount, workerJsmUrl ) {

        let workerTypeDefinition = new WorkerTypeDefinition( type, maximumWorkerCount );
        workerTypeDefinition.setWorkerJsm( workerJsmUrl );
        this.types.set( type, workerTypeDefinition );
        return this;

    }

    /**
     * Provides initialization configuration and dependencies for all tasks of given type.
     * @param {string} type
     * @param {object} config
     * @param {Transferable[]} [transferables]
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
     * @param {string} type
     * @param {number} cost
     * @param {object} config
     * @param {Transferable[]} [transferables]
     * @return {Promise}
     */
    async addTask ( type, cost, config, transferables ) {

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
     * @param {Number} maximumCount
     */
    constructor ( type, maximumCount ) {
        this.type = type;
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
            }
        };
        /**
         * @type {Set<URL>}
         */
        this.dependencyUrls = new Set();
        /**
         * @type {URL}
         */
        this.workerJsmUrl = null;
        this.workers = {
            maximumCount: maximumCount,
            dependencies: [],
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
     *
     * @param {function} initFunction
     * @param {function} executeFunction
     * @param {function} comRoutingFunction
     */
    setFunctions ( initFunction, executeFunction, comRoutingFunction ) {

        this.functions.init.ref = initFunction;
        this.functions.execute.ref = executeFunction;
        this.functions.comRouting.ref = comRoutingFunction;

    }

    /**
     * Set the url of all dependent libraries (non-jsm).
     *
     * @param {String[]} dependencyUrls
     */
    setDependencyUrls ( dependencyUrls ) {

        dependencyUrls.forEach( url => { this.dependencyUrls.add( new URL( url, window.location.href ) ) } );

    }

    /**
     * Set the url of the jsm worker.
     *
     * @param {string} workerJsmUrl
     */
    setWorkerJsm ( workerJsmUrl ) {

        this.workerJsmUrl = new URL( workerJsmUrl, window.location.href );

    }

    /**
     * Is it a jsm worker?
     * @return {boolean}
     */
    isWorkerJsm () {

        return ( this.workerJsmUrl !== null );

    }

    /**
     * Loads all dependencies and stores each as {@link ArrayBuffer} into the array.
     *
     * @return {Promise<ArrayBuffer[]>}
     */
    async loadDependencies () {

        let fileLoaderBufferAsync = new FileLoaderBufferAsync();
        for ( let url of this.dependencyUrls.entries() ) {

            let dep = await fileLoaderBufferAsync.loadFileAsync( url[ 1 ], ( report => console.log( report.detail.text ) ) )
            this.workers.dependencies.push( dep );

        }
        console.log( 'Task: ' + this.getType() + ': Waiting for completion of loading of all dependencies.');
        return await Promise.all( this.workers.dependencies );

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
        this.workers.code.push( 'self.addEventListener( "message", comRouting, false );' );

        return this.workers.code;

    }

    /**
     *
     * @param {string} code
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkers ( code ) {

        let worker, workerBlob;
        for ( let i = 0; i < this.workers.maximumCount; i++ ) {

            workerBlob = new Blob( this.workers.dependencies.concat( this.workers.code ), { type: 'application/javascript' } );
            worker = new TaskWorker( i, window.URL.createObjectURL( workerBlob ) );
            this.workers.instances[ i ] = worker;

        }
        if ( this.workers.instances.length === 0) {

            worker = new FakeWorker( 0, this.functions.init, this.functions.execute, this.functions.comRouting );
            this.workers.instances[ 0 ] = worker;

        }
        return this.workers.instances;

    }

    /**
     *
     * @return {Promise<TaskWorker[]>}
     */
    async createWorkersJsm () {

        for ( let worker, i = 0; i < this.workers.maximumCount; i++ ) {

            worker = new TaskWorker( i, this.workerJsmUrl.href, { type: "module" } );
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

            let promiseWorker = await new Promise( ( resolveWorker, rejectWorker ) => {

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
        console.log( 'Task: ' + this.getType() + ': Waiting for completion of initialization of all workers.');
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
class FakeWorker extends TaskWorker {

    /**
     *
     * @param id
     * @param {object} init
     * @param {object} execute
     * @param {object} comRouting
     */
    constructor( id, init, execute, comRouting ) {

        super( id, null )

        this.functions = {
            init: init,
            execute: execute,
            comRouting: comRouting
        }

    }

    /**
     *
     * @param message
     */
    postMessage( message ) {

        let scope = this;
        let comRouting = function ( message ) {
            const self = {
                postMessage: function ( m ) {
                    scope.onmessage( m )
                },
            }

            let payload = message.data;
            if ( payload.cmd === 'init' ) {

                scope.functions.init.ref( self, payload.id, payload.config );

            }
            else if ( payload.cmd === 'execute' ) {

                scope.functions.execute.ref( self, payload.id, payload.config );

            }
        };
        comRouting( { data: message } )

    }

}


export { TaskManager };
