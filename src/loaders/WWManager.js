/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWManager = (function () {

	function WWManager() {
		this.groups = {};
		this.callbacks = {
			reportProgress: null
		};
		this.objectsCompleted = 0;

		this.queue = [];
		this.maxQueueSize = 100;
		this.queueCheckInterval = 10;
		this.intervalCheck;

		this.endlessRunner();
	}

	WWManager.prototype.getMaxQueueSize = function () {
		return this.maxQueueSize;
	};

	WWManager.prototype.setMaxQueueSize = function ( maxQueueSize ) {
		this.maxQueueSize = maxQueueSize;
	};

	WWManager.prototype.setQueueCheckInterval = function ( queueCheckInterval ) {
		this.queueCheckInterval = queueCheckInterval;
	};

	WWManager.prototype.setCallbackReportProgreess = function ( reportProgress ) {
		this.callbacks.reportProgress = reportProgress;
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
			group.webWorkers.push( this.buildWebWorker( group ) );

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
		var managerCompletedLoading = function () {
			scope.objectsCompleted++;
			var msg = 'WWManager received loading completed (#' + scope.objectsCompleted + ') of "' + webWorker.getModelName() + '" from: ' + webWorker.getWebWorkerName();
			console.log( msg );
			if ( scope.callbacks.reportProgress != null ) scope.callbacks.reportProgress( msg );

		};
		if ( webWorker.callbacks.hasOwnProperty( 'managerCompletedLoading' ) ) {

			webWorker.callbacks[ 'managerCompletedLoading' ] = managerCompletedLoading;

		}

		return webWorker;
	};

	WWManager.prototype.unregister = function ( groupName ) {
		var group = this.groups[ groupName ];
		var unregistered = false;

		if ( group != null ) {

			for ( var i = 0, webWorker, length = group.webWorkers.length; i < length; i++ ) {

				webWorker = group.webWorkers[ i ];
				webWorker.shutdownWorker();

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
						group.webWorkers.push( webWorker );
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
		clearInterval( this.intervalCheck );
	};

	return WWManager;

})();
