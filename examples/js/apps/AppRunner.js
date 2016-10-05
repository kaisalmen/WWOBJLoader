/**
 * @author Kai Salmen / www.kaisalmen.de
 */

"use strict";

if (THREE.examples === undefined) {
    THREE.examples = {};
}

if (THREE.examples.apps === undefined) {
    THREE.examples.apps = {};
}

THREE.examples.apps.AppRunner = (function () {

    function AppRunner ( implementation ) {
        this.implementation = implementation;
    }

    AppRunner.prototype.run = function ( startRenderLoop ) {
        var scope = this;
        var resizeWindow = function () {
            scope.implementation.resizeDisplayGLBase();
        };
        window.addEventListener('resize', resizeWindow, false);

        // kicks init and prepares resources
        console.log("AppRunner: Starting global initialisation phase...");
        this.implementation.init();
        console.log( 'AppRunner: Successfully initialised app: ' + this.implementation.definition.name );

        if ( startRenderLoop ) {
            this.startRenderLoop();
        }
    };

    AppRunner.prototype.startRenderLoop = function () {
        var scope = this;
        var render = function () {
            requestAnimationFrame(render);
            scope.render();
        };
        render();
    };

    AppRunner.prototype.render = function () {
        this.implementation.render();
    };

    return AppRunner;

})();
