/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

if ( THREE === undefined ) var THREE = {};
if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }

THREE.WebWorker.WWManager = (function () {

	var MAX_WW_PER_GROUP = 2;
	var MAX_WW_GROUPS = 4;

	function WWManager() {
		this.maxWebWorkerPerGroup = MAX_WW_PER_GROUP;
		this.maxWebWorkerGroups = MAX_WW_PER_GROUP;
		this.groups = {};
	}

	WWManager.prototype.setMaxWebWorkerPerGroup = function ( maxWebWorkerPerGroup ) {
		this.maxWebWorkerPerGroup = maxWebWorkerPerGroup;
	};

	WWManager.prototype.setMaxWebWorkerGroups = function ( maxWebWorkerGroups ) {
		this.maxWebWorkerGroups = maxWebWorkerGroups;
	};

	WWManager.prototype.createGroup = function ( groupName ) {
		this.groups[ groupName ] = {};
	};

	WWManager.prototype.register = function ( groupName, webWorker ) {
		var webWorkers = this.groups[ groupName ];
		var wwLength = Object.keys( webWorkers ).length;
		var registered = false;
		if ( wwLength < this.maxWebWorkerPerGroup ) {

			webWorkers[ webWorker.getWebWorkerName() ] = webWorker;
			registered = true;

		}
		return registered;
	};

	WWManager.prototype.deregister = function ( groupName, webWorkerName ) {
		var webWorkers = this.groups[ groupName ];
		var deregistered = false;

		if ( webWorkers != null ) {

			var webWorker = webWorkers[ webWorkerName ];
			if ( webWorker != null && webWorker.getWebWorkerName() === webWorkerName ) {

				webWorker.shutdownWorker();
				delete webWorker.webWorkerName;
				deregistered = true;

			}

		}
		return deregistered;
	};

	WWManager.prototype.init = function () {

	};

	return WWManager;

})();
