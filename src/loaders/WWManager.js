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

	WWManager.prototype.register = function ( groupName, maxWebWorkerPerGroup ) {
		var webWorker;
		var group = this.groups[ groupName ];
		if ( group == null ) {

			group = this.groups[ groupName ] = {
				maxWebWorkerPerGroup: maxWebWorkerPerGroup,
				webWorkers: []
			};

			webWorker = Object.create( THREE.WebWorker.WWOBJLoaderProxy.prototype );
			webWorker.newInstance( 'WWOBJLoader', '..', 'src/loaders/WWOBJLoader.js' );

			webWorker.registerHookManagerCompletedLoading( function () {
				console.log( 'Manager received loading completed from: ' + webWorker.getWebWorkerName() );
			});
			group.webWorkers.push( webWorker );

		} else {
			webWorker = group[ 0 ];
		}
		return webWorker;
	};

	WWManager.prototype.deregister = function ( groupName ) {
		var group = this.groups[ groupName ];
		var deregistered = false;

		if ( group != null ) {
			for ( var i = 0, webWorker, length = group.webWorkers.length; i < length; i++ ) {
				webWorker = group.webWorkers[ i ];
				webWorker.shutdownWorker();
			}
			delete this.groups.groupName;
			deregistered = true;

		}
		return deregistered;
	};

	WWManager.prototype.init = function () {

	};

	return WWManager;

})();
