/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWManager = (function () {

	function WWManager() {
		this.groups = {};
	}

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
		var managerCompletedLoading = function () {
			console.log( 'WWManager received loading completed from: ' + webWorker.getWebWorkerName() );
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

		var webWorker;
		if ( group.webWorkers.length > 0 ) {

			webWorker = group.webWorkers[ 0 ];

		} else {

			webWorker = this.buildWebWorker( group )
			group.webWorkers.push( webWorker );

		}

		webWorker.prepareRun( runParams );
		webWorker.run();
	};

	return WWManager;

})();
