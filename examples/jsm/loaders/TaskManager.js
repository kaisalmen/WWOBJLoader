import { FileLoadingExecutor } from "./obj2/utils/FileLoadingExecutor.js";
import { ResourceDescriptor } from "./obj2/utils/ResourceDescriptor.js";

/**
 * @author Don McCurdy / https://www.donmccurdy.com
 * @author Kai Salmen / https://kaisalmen.de
 */

class WorkerDefinition {

    /**
     *
     * @param {Number} maximumCount
     */
    constructor ( maximumCount ) {
        this.init = {
            ref: null,
            code: null
        };
        this.execute = {
            ref: null,
            code: null
        };
        this.comRouter = {
            ref: null,
            code: null
        };
        this.dependencies = new Set ();
        this.workerJsmUrl = null;
        this.workers = {
            maximumCount: maximumCount,
            code: [],
            instances: new Set (),
            available: [],
            storedPromises: []
        };

    }

    setFunctions ( initFunction, executeFunction, comRouterFunction ) {

        this.init.ref = initFunction;
        this.execute.ref = executeFunction;
        this.comRouter.ref = comRouterFunction;

    }

    /**
     *
     * @param {String[]} dependencies
     * @return {*[]|*}
     */
    setDependencies ( dependencies ) {

        for ( let dependency of dependencies.entries() ) {

            let url = dependency[ 1 ];
            this.dependencies.add( new ResourceDescriptor( url ).setUrl( url ) );

        }

    }

    setWorkerJsm ( workerJsmUrl ) {

        this.workerJsmUrl = workerJsmUrl;

    }

    async loadDependencies () {

        let loadPromises = [];
        for ( let dependency of this.dependencies.entries() ) {

            loadPromises.push( await FileLoadingExecutor.loadFileAsync( {
                resourceDescriptor: dependency[ 1 ],
                instanceNo: 0,
                description: 'loadAssets',
                reportCallback: ( report => console.log( report.detail.text ) )
            } ));

        }
        console.log( 'Waiting for completion of loading of all assets!');
        return await Promise.all( loadPromises );

    }

    generateWorkerCode ( dependencies ) {

        if ( this.workerJsmUrl === null ) {

            this.init.code = "const init = " + this.init.ref.toString() + ";\n\n";
            this.execute.code = "const execute = " + this.execute.ref.toString() + ";\n\n";
            if ( this.comRouter.ref !== null ) {

                this.comRouter.code = "const comRouter = " + this.comRouter.ref.toString() + ";\n\n";

            }

            for ( let dependency of dependencies.entries() ) {

                this.dependencies[ dependency[ 0 ] ] = dependency[ 1 ];
                this.workers.code.push( dependency[ 1 ].content.data );

            }
            this.workers.code.push( this.init.code );
            this.workers.code.push( this.execute.code );
            this.workers.code.push( this.comRouter.code );
            this.workers.code.push( "self.addEventListener( 'message', comRouter, false );" );

        }
        return this;

    }

    createWorkers () {

        let worker;
        for ( let i = 0; i < this.workers.maximumCount; i++ ) {

            if ( this.workerJsmUrl === null ) {

                let workerBlob = new Blob( this.workers.code, { type: 'application/javascript' } );
                worker = new Worker( window.URL.createObjectURL( workerBlob ) );

            }
            else {

                worker = new Worker( this.workerJsmUrl.href, { type: "module" } );

            }
            this.workers.instances.add( {
                worker: worker,
                id: i
            } );

        }
        return this;

    }

    initWorkers ( config, transferables ) {

        let it = this.workers.instances.values();
        for ( let workerObj; workerObj = it.next().value; ) {

            workerObj.worker.postMessage( {
                cmd: "init",
                id: workerObj.id,
                config: config
            }, transferables );
            this.workers.available.push( workerObj );

        }

    }

    getAvailableTask () {

        return this.workers.available.shift();

    }

    returnAvailableTask ( workerObj ) {

        this.workers.available.push( workerObj );
        let storedExec = this.workers.storedPromises.shift();
        if ( storedExec ) {

            storedExec.exec( this.getAvailableTask(), storedExec.resolve, storedExec.reject );
        }

    }

}


class TaskManager {

    constructor ( maximumWorkerCount ) {

        this.types = new Map();
        this.maximumWorkerCount = maximumWorkerCount;

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
     * @param {function} initFunction
     * @param {function} executeFunction
     * @param {function} comRouterFunction
     * @param {String[]} [dependencies]
     * @return {TaskManager}
     */
    registerType ( type, initFunction, executeFunction, comRouterFunction, dependencies ) {

        let workerDefinition = new WorkerDefinition( this.maximumWorkerCount );
        workerDefinition.setFunctions( initFunction, executeFunction, comRouterFunction );
        workerDefinition.setDependencies( dependencies );
        this.types.set( type, workerDefinition );

        return this;

    }

    /**
     * Registers functionality for a new task type based on module file.
     * @param {string} type
     * @param {URL} workerJsmUrl
     * @return {TaskManager}
     */
    registerTypeJsm ( type, workerJsmUrl ) {

        let workerDefinition = new WorkerDefinition( this.maximumWorkerCount );
        workerDefinition.setWorkerJsm( workerJsmUrl );
        this.types.set( type, workerDefinition );
        return this;

    }

    /**
     * Provides initialization configuration and dependencies for all tasks of given type.
     * @param {string} type
     * @param {object} config
     * @param {Transferable[]} [transferables]
     * @return {TaskManager}
     */
    initType ( type, config, transferables ) {

        let workerDefinition = this.types.get( type );
        workerDefinition.loadDependencies()
            .then( deps => workerDefinition.generateWorkerCode( deps ).createWorkers().initWorkers( config, transferables ) );
        return this;

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

        let workerDefinition = this.types.get( type );
        let workerObj = workerDefinition.getAvailableTask();

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

                    resolveExecute( e.data.result );
                    workerDefinition.returnAvailableTask( workerObjExecute );

                } ).catch( ( e ) => {

                    rejectExecute( "Execution error: " + e );

                } );

            }

            if ( workerObj ) {

                executeWorker( workerObj, resolveUser, rejectUser );

            }
            else {

                workerDefinition.workers.storedPromises.push( {
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

        // TODO
        return this;

    }

}


export { TaskManager };
