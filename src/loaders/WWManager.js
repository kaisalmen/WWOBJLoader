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

		this.endlessRunner();
	}

	WWManager.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	WWManager.prototype.register = function ( groupName, maxWebWorkerPerGroup, prototypeDef, globalParams, callbacks ) {
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
			this.buildWebWorker( group );

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
			delete this.groups.groupName;
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


	WWManager.prototype.endlessRunner = function () {
		var scope = this;
		scope.intervalCheck = setInterval( checkQueueStatus, scope.queueCheckInterval );

		function checkQueueStatus() {
			if ( scope.queue.length > 0 ) {

				var workerDesc = scope.queue[ 0 ];
				// expect groups is only filled via enqueueForRun
				var group = scope.groups[ workerDesc.groupName ];

				var webWorker;
				for ( var i = 0, w, length = group.webWorkers.length; i < length; i++ ) {

					w = group.webWorkers[ i ];
					if ( ! w.running ) {

						webWorker = w;
						break;

					}

				}
				if ( webWorker == null ) {

					if ( group.webWorkers.length < group.maxWebWorkerPerGroup ) {

						webWorker = scope.buildWebWorker( group );
						webWorker.prepareRun( workerDesc.runParams );
						webWorker.run();
						scope.queue.shift();
					}

				} else {

					webWorker.prepareRun( workerDesc.runParams );
					webWorker.run();
					scope.queue.shift();

				}
			}
		}
	};

	WWManager.prototype.terminateManager = function () {
		console.log( 'TERMINATE: WWManager received the termination signal!' );
		clearInterval( this.intervalCheck );

		for ( var key in this.groups ) {

			if ( this.groups.hasOwnProperty( key ) ) {

				this.unregister( this.groups[ key ] );

			}

		}
	};

	return WWManager;

})();
