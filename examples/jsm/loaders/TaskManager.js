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
        this.dependencyDescriptors = new Set ();
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

        this.functions.init.ref = initFunction;
        this.functions.execute.ref = executeFunction;
        this.functions.comRouter.ref = comRouterFunction;

    }

    /**
     *
     * @param {String[]} dependencyUrls
     */
    setDependencyUrls ( dependencyUrls ) {

        dependencyUrls.forEach( url => this.dependencyDescriptors.add( new ResourceDescriptor( url ).setUrl( url ) ) )

    }

    setWorkerJsm ( workerJsmUrl ) {

        this.workerJsmUrl = new URL( workerJsmUrl, window.location.href );

    }

    isWorkerJsm () {

        return ( this.workerJsmUrl !== null );

    }

    async loadDependencies () {

        let dependencyDescriptors = [];
        for ( let dependency of this.dependencyDescriptors.entries() ) {

            dependencyDescriptors.push( await FileLoadingExecutor.loadFileAsync( {
                resourceDescriptor: dependency[ 1 ],
                instanceNo: 0,
                description: 'loadAssets',
                reportCallback: ( report => console.log( report.detail.text ) )
            } ));

        }
        console.log( 'Waiting for completion of loading of all assets!');
        return await Promise.all( dependencyDescriptors );

    }

    async generateWorkerCode ( dependencyDescriptors ) {

        this.functions.init.code = 'const init = ' + this.functions.init.ref.toString() + ';\n\n';
        this.functions.execute.code = 'const execute = ' + this.functions.execute.ref.toString() + ';\n\n';
        if ( this.functions.comRouter.ref !== null ) {

            this.functions.comRouter.code = "const comRouter = " + this.functions.comRouter.ref.toString() + ";\n\n";

        }

        dependencyDescriptors.forEach( dependency => this.workers.code.push( dependency.content.data ) );

        this.workers.code.push( this.functions.init.code );
        this.workers.code.push( this.functions.execute.code );
        this.workers.code.push( this.functions.comRouter.code );
        this.workers.code.push( "self.addEventListener( 'message', comRouter, false );" );

        return this.workers.code;

    }

    async createWorkers ( code ) {

        for ( let worker, i = 0; i < this.workers.maximumCount; i++ ) {

            let workerBlob = new Blob( code, { type: 'application/javascript' } );
            worker = new Worker( window.URL.createObjectURL( workerBlob ) );
            this.workers.instances.add( {
                worker: worker,
                id: i
            } );

        }
        return this.workers.instances;

    }

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

    dispose () {

        let it = this.workers.instances.values();
        for ( let workerObj; workerObj = it.next().value; ) {

            workerObj.worker.terminate();

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
     * @param {String[]} [dependencyUrls]
     * @return {TaskManager}
     */
    registerType ( type, initFunction, executeFunction, comRouterFunction, dependencyUrls ) {

        let workerDefinition = new WorkerDefinition( this.maximumWorkerCount );
        workerDefinition.setFunctions( initFunction, executeFunction, comRouterFunction );
        workerDefinition.setDependencyUrls( dependencyUrls );
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
     */
    async initType ( type, config, transferables ) {

        let workerDefinition = this.types.get( type );
        if ( workerDefinition.isWorkerJsm() ) {

            return await workerDefinition.createWorkersJsm()
                .then( instances => workerDefinition.initWorkers( instances, config, transferables ) );

        }
        else {

            return await workerDefinition.loadDependencies()
                .then( deps => workerDefinition.generateWorkerCode( deps ) )
                .then( code => workerDefinition.createWorkers( code ) )
                .then( instances => workerDefinition.initWorkers( instances, config, transferables ) );

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

                    resolveExecute( e.data );
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

        for ( const [ key, workerDefinition ] of this.types.entries() ) {

            workerDefinition.dispose();

        }
        return this;

    }

}

export { TaskManager };
