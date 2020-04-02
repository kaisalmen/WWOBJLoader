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
        this.workerJsmUrl = null;
        this.worker = {
            maximumCount: maximumCount,
            code: [],
            instances: new Set (),
            available: [],
        };

    }

    setInit ( initFunction ) {

        this.init.ref = initFunction;

    }

    setExecute ( executeFunction ) {

        this.execute.ref = executeFunction;

    }

    setComRouterCode ( comRouterFunction ) {

        this.comRouter.ref = comRouterFunction;

    }

    setWorkerJsm ( workerJsmUrl ) {

        this.workerJsmUrl = workerJsmUrl;

    }

    generateWorkerCode () {

        if ( this.workerJsmUrl === null ) {

            this.init.code = "const init = " + this.init.ref.toString() + ";\n\n";
            this.execute.code = "const execute = " + this.execute.ref.toString() + ";\n\n";
            if ( this.comRouter.ref !== null ) {

                this.comRouter.code = "const comRouter = " + this.comRouter.ref.toString() + ";\n\n";

            }
            this.worker.code.push( this.init.code );
            this.worker.code.push( this.execute.code );
            this.worker.code.push( this.comRouter.code );
            this.worker.code.push( "self.addEventListener( 'message', comRouter, false );" );

        }

    }

    createWorkers () {

        let worker;
        for ( let i = 0; i < this.worker.maximumCount; i++ ) {

            if ( this.workerJsmUrl === null ) {

                let workerBlob = new Blob( this.worker.code, { type: 'application/javascript' } );
                worker = new Worker( window.URL.createObjectURL( workerBlob ) );

            }
            else {

                worker = new Worker( this.workerJsmUrl.href, { type: "module" } );

            }
            worker.onmessage = ( event) => console.log( i + ": " + event);
            worker.onerror = ( event) => console.log( i + ": " + event);
            this.worker.instances.add( {
                worker: worker,
                id: i
            } );

        }

    }

    initWorkers ( config, transferables ) {

        let it = this.worker.instances.values();
        for ( let workerObj; workerObj = it.next().value; ) {

            workerObj.worker.postMessage( {
                cmd: "init",
                id: workerObj.id,
                config: config
            }, transferables );
            this.worker.available.push( workerObj );

        }

    }

    getAvailableTask () {

        return this.worker.available.pop();

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
     * @param {function} [comRouterFunction]
     * @return {TaskManager}
     */
    registerType ( type, initFunction, executeFunction, comRouterFunction ) {

        let workerDefinition = new WorkerDefinition( this.maximumWorkerCount );
        workerDefinition.setInit( initFunction );
        workerDefinition.setExecute( executeFunction );
        workerDefinition.setComRouterCode( comRouterFunction );

        workerDefinition.generateWorkerCode();

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

        workerDefinition.generateWorkerCode();

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
        workerDefinition.createWorkers();
        workerDefinition.initWorkers( config, transferables );
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
    addTask ( type, cost, config, transferables ) {

        let workerDefinition = this.types.get( type );
        let workerObj = workerDefinition.getAvailableTask();
        if ( workerObj !== null ) {

            workerObj.worker.postMessage( {
                cmd: "execute",
                id: workerObj.id,
                config: config
            }, transferables );

        }
        else {

            console.log( "No Task available for execution" );

        }

    }

    /**
     * Destroys all workers and associated resources.
     * @return {TaskManager}
     */
    dispose () {

        return this;

    }

}


export { TaskManager };
