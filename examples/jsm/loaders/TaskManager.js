/**
 * @author Don McCurdy / https://www.donmccurdy.com
 * @author Kai Salmen / https://kaisalmen.de
 */

import { FileLoaderBufferAsync } from "./obj2/utils/FileLoaderBufferAsync.js";

/**
 * Defines a worker type: functions, dependencies and runtime information once it was created.
 */
class WorkerTypeDefinition {

    /**
     * Creates a new instance of {@link WorkerTypeDefinition}.
     *
     * @param {Number} maximumCount
     */
    constructor ( maximumCount ) {
        this.functions = {
            init: {
                ref: null,
                code: null
            },
            execute: {
                ref: null,
                code: null
            },
            comRouter: {
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
            code: [],
            instances: new Set(),
            available: [],
            storedPromises: []
        };

    }

    /**
     *
     * @param {function} initFunction
     * @param {function} executeFunction
     * @param {function} comRouterFunction
     */
    setFunctions ( initFunction, executeFunction, comRouterFunction ) {

        this.functions.init.ref = initFunction;
        this.functions.execute.ref = executeFunction;
        this.functions.comRouter.ref = comRouterFunction;

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
        let buffers = [];
        for ( let url of this.dependencyUrls.entries() ) {

            buffers.push( fileLoaderBufferAsync.loadFileAsync( url[ 1 ], ( report => console.log( report.detail.text ) ) ) );

        }
        console.log( 'Waiting for completion of loading of all assets!');
        return await Promise.all( buffers );

    }

    /**
     *
     * @param {ArrayBuffer[]} buffers
     * @return {Promise<String[]>}
     */
    async generateWorkerCode ( buffers ) {

        this.functions.init.code = 'const init = ' + this.functions.init.ref.toString() + ';\n\n';
        this.functions.execute.code = 'const execute = ' + this.functions.execute.ref.toString() + ';\n\n';
        if ( this.functions.comRouter.ref !== null ) {

            this.functions.comRouter.code = "const comRouter = " + this.functions.comRouter.ref.toString() + ";\n\n";

        }
        buffers.forEach( buffer => this.workers.code.push( buffer ) );

        this.workers.code.push( this.functions.init.code );
        this.workers.code.push( this.functions.execute.code );
        this.workers.code.push( this.functions.comRouter.code );
        this.workers.code.push( 'self.addEventListener( "message", comRouter, false );' );

        return this.workers.code;

    }

    /**
     *
     * @param {string} code
     * @return {Promise<Set<any>>}
     */
    async createWorkers ( code ) {

        for ( let worker, i = 0; i < this.workers.maximumCount; i++ ) {

            let workerBlob = new Blob( code, { type: 'application/javascript' } );
            worker = new Worker( window.URL.createObjectURL( workerBlob ) );
            // TODO: why is this not a map with int index?
            this.workers.instances.add( {
                worker: worker,
                id: i
            } );

        }
        return this.workers.instances;

    }

    /**
     *
     * @return {Promise<Set<any>>}
     */
    async createWorkersJsm () {

        for ( let worker, i = 0; i < this.workers.maximumCount; i++ ) {

            worker = new Worker( this.workerJsmUrl.href, { type: "module" } );
            this.workers.instances.add( {
                worker: worker,
                id: i
            } );

        }
        return this.workers.instances;

    }

    /**
     *
     * @param {object} instances
     * @param {object} config
     * @param {Transferable[]} transferables
     * @return {Promise<[]>}
     */
    async initWorkers ( instances, config, transferables ) {

        let it = instances.values();
        for ( let workerObj; workerObj = it.next().value; ) {

            workerObj.worker.postMessage( {
                cmd: "init",
                id: workerObj.id,
                config: config
            }, transferables );
            this.workers.available.push( workerObj );

        }
        return this.workers.available;

    }

    /**
     * Returns a Worker or none.
     *
     * @return {Worker|null}
     */
    getAvailableTask () {

        return this.workers.available.shift();

    }

    /**
     *
     * @param {object} workerObj
     */
    returnAvailableTask ( workerObj ) {

        this.workers.available.push( workerObj );
        let storedExec = this.workers.storedPromises.shift();
        if ( storedExec ) {

            storedExec.exec( this.getAvailableTask(), storedExec.resolve, storedExec.reject );
        }

    }

    /**
     * Dispose all worker instances.
     */
    dispose () {

        let it = this.workers.instances.values();
        for ( let workerObj; workerObj = it.next().value; ) {

            workerObj.worker.terminate();

        }
    }

}


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
     * @param {function} comRouterFunction
     * @param {String[]} [dependencyUrls]
     * @return {TaskManager}
     */
    registerType ( type, maximumWorkerCount, initFunction, executeFunction, comRouterFunction, dependencyUrls ) {

        let workerTypeDefinition = new WorkerTypeDefinition( maximumWorkerCount );
        workerTypeDefinition.setFunctions( initFunction, executeFunction, comRouterFunction );
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

        let workerTypeDefinition = new WorkerTypeDefinition( maximumWorkerCount );
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
        let workerObj = workerTypeDefinition.getAvailableTask();

        return new Promise( ( resolveUser, rejectUser ) => {

            function executeWorker( workerObjExecute, resolveExecute, rejectExecute ) {

                let promiseWorker = new Promise( ( resolveWorker, rejectWorker ) => {

                    workerObjExecute.worker.onmessage = resolveWorker;
                    workerObjExecute.worker.onerror = rejectWorker;

                    workerObjExecute.worker.postMessage( {
                        cmd: "execute",
                        id: workerObjExecute.id,
                        config: config
                    }, transferables );

                } );
                promiseWorker.then( ( e ) => {

                    resolveExecute( e.data );
                    workerTypeDefinition.returnAvailableTask( workerObjExecute );

                } ).catch( ( e ) => {

                    rejectExecute( "Execution error: " + e );

                } );

            }

            if ( workerObj ) {

                executeWorker( workerObj, resolveUser, rejectUser );

            }
            else {

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

export { TaskManager };
