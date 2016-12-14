/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWManager = (function () {

	function WWManager( maxQueueSize, queueCheckInterval ) {
		this.groups = {};
		this.objectsCompleted = 0;

		this.queue = [];
		this.maxQueueSize = maxQueueSize;
		this.queueCheckInterval = queueCheckInterval;
		this.intervalCheck;
	}

	WWManager.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	WWManager.prototype.verifyEndlessRunnerExec = function () {
		if ( ! this.runnerEnabled ) {
			this.runEndless();
			this.runnerEnabled = true;
		}
	};

	WWManager.prototype.stopEndlessRunnerExec = function () {
		clearInterval( this.intervalCheck );
		this.runnerEnabled = false;
	};

	WWManager.prototype.register = function ( groupName, maxWebWorkerPerGroup, prototypeDef, globalParams, callbacks ) {
		this.verifyEndlessRunnerExec();

		var group = this.groups[ groupName ];
		if ( group == null ) {

			group = this.groups[ groupName ] = {
				maxWebWorkerPerGroup: maxWebWorkerPerGroup,
				prototypeDef: prototypeDef,
				globalParams: globalParams,
				callbacks: {},
				webWorkers: []
			};
			if ( callbacks != null ) {

				for ( var key in callbacks ) {

					if ( callbacks.hasOwnProperty( key ) ) group.callbacks[ key ] = callbacks[ key ];

				}

			}

		} else {

			console.warn( 'Group "' + groupName + '" already exists. Returning without change!' );

		}
	};

	WWManager.prototype.buildWebWorker = function ( group ) {
		var webWorker = Object.create( group.prototypeDef );
		webWorker.init( group.globalParams );

		for ( var key in group.callbacks ) {

			if ( webWorker.callbacks.hasOwnProperty( key ) && group.callbacks.hasOwnProperty( key ) ) {

				webWorker.callbacks[ key ] = group.callbacks[ key ];

			}

		}

		var scope = this;
		var managerCompletedLoading = function ( webWorkerName, modelName, instanceNo ) {
			scope.objectsCompleted++;
		};
		if ( webWorker.callbacks.manager.hasOwnProperty( 'completedLoading' ) ) {

			webWorker.callbacks.manager[ 'completedLoading' ] = managerCompletedLoading;

		}

		webWorker.instanceNo = group.webWorkers.length;
		group.webWorkers.push( webWorker );
		return webWorker;
	};

	WWManager.prototype.unregister = function ( groupName ) {
		var group = this.groups[ groupName ];
		var unregistered = false;

		if ( group != null ) {

			for ( var i = 0, webWorker, length = group.webWorkers.length; i < length; i++ ) {

				webWorker = group.webWorkers[ i ];
				webWorker.setRequestTerminate();

			}
			group = null;
			delete this.groups[ groupName ];
			unregistered = true;

		}
		return unregistered;
	};

	WWManager.prototype.enqueueForRun = function ( groupName, runParams ) {
		var group = this.groups[ groupName ];
		if ( group == null ) throw  'Group "' + groupName + '" does not exist. Unable to run.';

		if ( this.queue.length < this.maxQueueSize ) {
			this.queue.push( {
				groupName: groupName,
				runParams: runParams
			} );
		}
	};


	WWManager.prototype.runEndless = function () {
		var scope = this;
		scope.intervalCheck = setInterval( checkQueueStatus, scope.queueCheckInterval );

		function checkQueueStatus() {
			if ( scope.queue.length === 0 ) return;

			var workerDesc = scope.queue[ 0 ];
			// expect groups is only filled via enqueueForRun
			var group = scope.groups[ workerDesc.groupName ];

			var webWorker;
			for ( var i = 0, length = group.maxWebWorkerPerGroup; i < length; i++ ) {

				webWorker = group.webWorkers[ i ];
				if ( webWorker == null ) webWorker = scope.buildWebWorker( group );
				if ( ! webWorker.running ) {

					webWorker.prepareRun( workerDesc.runParams );
					webWorker.run();
					scope.queue.shift();

					if ( scope.queue.length === 0 ) break;

				}

			}
		}
	};

	WWManager.prototype.terminateManager = function () {
		console.log( 'TERMINATE: WWManager received the termination signal!' );
		this.stopEndlessRunnerExec();

		for ( var key in this.groups ) {

			if ( this.groups.hasOwnProperty( key ) ) {

				this.unregister( key );

			}

		}
	};

	return WWManager;

})();
