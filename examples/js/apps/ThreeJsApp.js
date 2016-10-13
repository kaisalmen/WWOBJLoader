/**
 * @author Kai Salmen / www.kaisalmen.de
 */

"use strict";

if ( THREE.examples === undefined ) {
    THREE.examples = {};
}
if ( THREE.examples.apps === undefined ) {
    THREE.examples.apps = {};
}

THREE.examples.apps.ThreeJsAppDefaultDefinition = {
    name: 'None',
    htmlCanvas : undefined,
    antialias: true,
    useScenePerspective: true,
    useSceneOrtho: false,
    useCube: false,
    verbose: false
};

/**
 * Application shall extend this class
 * Lifecycle is:
 * - configure (e.g. call in constructor of extension)
 * - init (called by AppRunner):
 *   - initPreGL
 *   - initGL
 *   - resizeDisplayGLBase/resizeDisplayGL
 *   - initPostGL
 * - render (called by AppRunner)
 */
THREE.examples.apps.ThreeJsApp = (function () {

    function ThreeJsApp() {
        this.renderingEnabled = false;
        this.frameNumber = 0;

        this.initOk = true;
        this.preloadDone = false;

        this.definition = THREE.examples.apps.ThreeJsAppDefaultDefinition;
        this.scenePerspective = null;
        this.sceneOrtho = null;
    }

    ThreeJsApp.prototype.configure = function ( userDefinition ) {
        this.definition = checkUserDefinition( this.definition, userDefinition );

        this.canvas = new THREE.examples.apps.Canvas( this.definition.htmlCanvas );
        this.canvas.verbose = this.definition.verbose;

        if ( this.definition.useScenePerspective ) {

            this.scenePerspective = new THREE.examples.apps.ThreeJsApp.ScenePerspective( this.canvas );
            this.scenePerspective.useCube = this.definition.useCube;
            this.scenePerspective.verbose = this.definition.verbose;

        }
        if ( this.definition.useSceneOrtho ) {

            this.sceneOrtho = new THREE.examples.apps.ThreeJsApp.SceneOrtho( this.canvas );
            this.sceneOrtho.verbose = this.definition.verbose;
        }

        this.renderer = new THREE.WebGLRenderer( {
            canvas: this.definition.htmlCanvas,
            antialias: this.definition.antialias
        } );

        // auto-clear must not be used when both perspective and ortho scenes are active
        // otherwise: renderer clears 3d content
        if ( this.definition.useScenePerspective && this.definition.useSceneOrtho ) {

            this.renderer.autoClear = false;

        }
    };

    var checkUserDefinition = function ( defPredefined, defUser ) {

        for ( var predefined in defPredefined ) {

            if ( defPredefined.hasOwnProperty( predefined ) && ! defUser.hasOwnProperty( predefined ) ) {

                defUser[predefined] = defPredefined[predefined];
            }
        }

        for ( var user in defUser ) {

            if ( defUser.hasOwnProperty( user ) && ! defPredefined.hasOwnProperty( user ) ) {

                delete defUser[user];
            }
        }

        return defUser;
    };

    ThreeJsApp.prototype.init = function () {
        var scope = this;

        console.log("ThreeJsApp (" + scope.definition.name + "): initPreGL");
        scope.initPreGL();

        var initSync = function () {

            console.log( "ThreeJsApp (" + scope.definition.name + "): initGL" );
            if ( scope.definition.useScenePerspective ) {

                scope.scenePerspective.initGL();
                if ( ! scope.initOk ) { return; }

            }
            if ( scope.definition.useSceneOrtho ) {

                scope.sceneOrtho.initGL();
                if ( ! scope.initOk ) { return; }

            }

            scope.initGL();
            if ( ! scope.initOk ) { return; }

            console.log( "ThreeJsApp (" + scope.definition.name + "): resizeDisplayGLBase" );
            scope.resizeDisplayGLBase();

            console.log( "ThreeJsApp (" + scope.definition.name + "): initPostGL" );
            scope.renderingEnabled = scope.initPostGL();
            if ( ! scope.initOk ) { return; }

            if ( scope.renderingEnabled ) {
                console.log( "ThreeJsApp (" + scope.definition.name + "): Ready to start render loop!" );
            }
        };

        var interval = 10;
        var count = 0;
        var divider = 50;
        var checkPreloadDone = setInterval( checkPreloadDoneTimer, interval );

        function checkPreloadDoneTimer() {
            if ( scope.preloadDone ) {

                clearInterval( checkPreloadDone );
                console.log( 'Pre-loading took approx. ' + interval * count  + 'ms.' );
                if ( scope.initOk ) {

                    initSync();

                }
            }
            else {
                if ( count % divider === 0 ) {

                    console.log( 'Waiting for pre-loading (initPreGL) to complete (' + interval * count  + 'ms)' );

                }
                count++;

            }
        }
    };

    ThreeJsApp.prototype.resetCamera = function () {
        if ( this.definition.useScenePerspective ) {
            this.scenePerspective.resetCamera();
        }

        if ( this.definition.useSceneOrtho ) {
            this.sceneOrtho.resetCamera();
        }
    };

    /**
     * Handle any init not related to WebGL (e.g. file loading) incl. async content that need to be completed
     * before the rest of the initialisation takes part. Once complete asyncDone needs to be set to true.
     * Override if needed.
     */
    ThreeJsApp.prototype.initPreGL = function () {
        this.preloadDone = true;
    };

    /**
     * Handle any init related to WebGL.
     * Override if needed.
     */
    ThreeJsApp.prototype.initGL = function () {

    };

    /**
     * Perform any operations after WebGL init has been performed (e.g event handler init)
     * Override if needed.
     */
    ThreeJsApp.prototype.initPostGL = function () {
        return true;
    };

    /**
     * Perform internal operations when window is resized. User implementation is called within.
     * Do not override! Override "resizeDisplayGL" if needed!
     */
    ThreeJsApp.prototype.resizeDisplayGLBase = function () {
        this.canvas.recalcAspectRatio();

        this.resizeDisplayGL();

        this.renderer.setSize( this.canvas.getWidth(), this.canvas.getHeight(), false );

        if ( this.definition.useScenePerspective ) {
            this.scenePerspective.updateCamera();
        }

        if ( this.definition.useSceneOrtho ) {
            this.sceneOrtho.updateCamera();
        }
    };

    /**
     * Perform any operations when window is resized.
     * Override if needed.
     */
    ThreeJsApp.prototype.resizeDisplayGL = function () {

    };

    /**
     * Perform any operation required before scene is rendered
     * Override if needed.
     */
    ThreeJsApp.prototype.renderPre = function () {
        if ( this.definition.verbose ) {

            console.log( 'ThreeJsApp DEFAULT (' + this.definition.name + '): renderPre' );

        }
    };

    /**
     * Performs rendering according to overall application configuration.
     * Do not override! Perform operations in "renderPre" or "renderPost"
     */
    ThreeJsApp.prototype.render = function () {
        if ( this.renderingEnabled ) {

            this.frameNumber ++;
            if ( ! this.renderer.autoClear ) {

                this.renderer.clear();

            }

            this.renderPre();

            if ( this.definition.useScenePerspective ) {

                if ( this.scenePerspective.useCube ) {

                    this.scenePerspective.cameraCube.rotation.copy( this.scenePerspective.camera.rotation );
                    this.renderer.render( this.scenePerspective.sceneCube, this.scenePerspective.cameraCube );

                }
                this.renderer.render( this.scenePerspective.scene, this.scenePerspective.camera );

            }

            if ( this.definition.useSceneOrtho ) {

                this.renderer.render( this.sceneOrtho.scene, this.sceneOrtho.camera );

            }
            this.renderPost();

        }
    };

    /**
     * Perform any operation after scene is rendered
     * Override if needed.
     */
    ThreeJsApp.prototype.renderPost = function () {
        if ( this.definition.verbose ) {

            console.log( 'ThreeJsApp DEFAULT (' + this.definition.name + '): renderPost' );

        }
    };

    return ThreeJsApp;
})();


THREE.examples.apps.Canvas = (function () {

    function Canvas( htmlCanvas ) {
        this.verbose = false;
        this.htmlCanvas = null;
        if ( htmlCanvas !== undefined && htmlCanvas !== null &&
            htmlCanvas.offsetWidth !== undefined && htmlCanvas.offsetHeight !== undefined ) {
            this.htmlCanvas = htmlCanvas;
        }
        else {
            console.error( 'htmlCanvas cannot be used: It is either undefined or its width and height are not available.' );
        }
        this.recalcAspectRatio();
    }

    Canvas.prototype.recalcAspectRatio = function () {
        if (this.verbose) {
            console.log("width: " + this.getWidth() + " height: " + this.getHeight());
        }
        var height = this.getHeight();
        if (height === 0) {
            this.aspectRatio = 1;
        }
        else {
            this.aspectRatio = this.getWidth() / height;
        }
    };

    Canvas.prototype.resetWidth = function ( width, height ) {
        if (this.htmlCanvas !== null ) {

            if ( this.htmlCanvas.style !== undefined && this.htmlCanvas.style !== null) {
                this.htmlCanvas.style.width = width + 'px';
                this.htmlCanvas.style.height = height + 'px';
            }
            this.htmlCanvas.offsetWidth = width;
            this.htmlCanvas.offsetHeight = height;
        }
        this.recalcAspectRatio();
    };

    Canvas.prototype.getWidth = function () {
        return this.htmlCanvas === null ? 0 : this.htmlCanvas.offsetWidth;
    };

    Canvas.prototype.getHeight = function () {
        return this.htmlCanvas === null ? 0 : this.htmlCanvas.offsetHeight;
    };

    Canvas.prototype.getPixelLeft = function () {
        return -this.getWidth() / 2;
    };

    Canvas.prototype.getPixelRight = function () {
        return this.getWidth() / 2;
    };

    Canvas.prototype.getPixelTop = function () {
        return this.getHeight() / 2;
    };

    Canvas.prototype.getPixelBottom = function () {
        return -this.getHeight() / 2;
    };

    return Canvas;

})();



THREE.examples.apps.ThreeJsApp.ScenePerspective = (function () {

    function ScenePerspective( canvas, verbose ) {
        this.canvas = canvas;
        this.verbose = verbose === undefined ? false : verbose;
        this.canvas.verbose = this.verbose;
        this.camera = null;
        this.useCube = false;
        this.cameraCube = null;

        this.scene = null;

        this.defaults = {
            posCamera: new THREE.Vector3(100, 100, 100),
            upVector: new THREE.Vector3(0, 1, 0),
            posCameraTarget: new THREE.Vector3(0, 0, 0),
            posCameraCube: new THREE.Vector3(0, 0, 0),
            near: 0.1,
            far: 10000,
            fov: 45
        };

        this.cameraTarget = this.defaults.posCameraTarget;
    }

    ScenePerspective.prototype.setCameraDefaults = function ( defaults ) {
        if ( defaults === null || defaults === undefined ) {
            return;
        }
        if ( defaults.posCamera !== undefined && defaults.posCamera !== null ) {
            this.defaults.posCamera.copy( defaults.posCamera );
        }
        if ( defaults.upVector !== undefined && defaults.upVector !== null ) {
            this.defaults.upVector.copy( defaults.upVector );
        }
        if ( defaults.posCameraTarget !== undefined && defaults.posCameraTarget !== null ) {
            this.defaults.posCameraTarget.copy( defaults.posCameraTarget );
        }
        if ( defaults.posCameraCube !== undefined && defaults.posCameraCube !== null ) {
            this.defaults.posCameraCube.copy( defaults.posCameraCube );
        }
        if ( defaults.near !== undefined && defaults.near !== null ) {
            this.defaults.near = defaults.near;
        }
        if ( defaults.far !== undefined && defaults.far !== null ) {
            this.defaults.far = defaults.far;
        }
        if ( defaults.fov !== undefined && defaults.fov !== null ) {
            this.defaults.fov = defaults.fov;
        }
        this.resetCamera();
    };

    ScenePerspective.prototype.initGL = function () {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( this.defaults.fov, this.canvas.aspectRatio, this.defaults.near, this.defaults.far );

        if (this.useCube) {
            this.cameraCube = new THREE.PerspectiveCamera( this.defaults.fov, this.canvas.aspectRatio, this.defaults.near, this.defaults.far );
            this.sceneCube = new THREE.Scene();
        }
        this.resetCamera();
    };

    ScenePerspective.prototype.resetCamera = function () {
        this.camera.position.copy(this.defaults.posCamera);
        this.camera.up.copy(this.defaults.upVector);
        this.cameraTarget.copy(this.defaults.posCameraTarget);

        if (this.useCube) {
            this.cameraCube.position.copy(this.defaults.posCameraCube);
        }
        this.updateCamera();
    };

    ScenePerspective.prototype.updateCamera = function () {
        this.camera.aspect = this.canvas.aspectRatio;
        this.camera.lookAt(this.cameraTarget);
        this.camera.updateProjectionMatrix();

        if (this.useCube) {
            this.cameraCube.rotation.copy( this.camera.rotation );
            this.cameraCube.aspectRatio = this.canvas.aspectRatio;
            this.cameraCube.updateProjectionMatrix();
        }
    };

    return ScenePerspective;

})();


THREE.examples.apps.ThreeJsApp.SceneOrtho = (function () {

    function SceneOrtho( canvas, verbose ) {
        this.canvas = canvas;
        this.verbose = verbose === undefined ? false : verbose;
        this.canvas.verbose = this.verbose;

        this.scene = null;

        this.defaults = {
            posCamera: new THREE.Vector3( 0, 0, 1 ),
            near: 10,
            far: -10
        };
    }

    SceneOrtho.prototype.setCameraDefaults = function ( defaults ) {
        if ( defaults === null || defaults === undefined ) {
            return;
        }
        if ( defaults.posCamera !== undefined && defaults.posCamera !== null ) {
            this.defaults.posCamera.copy( defaults.posCamera );
        }
        if ( defaults.near !== undefined && defaults.near !== null ) {
            this.defaults.near = defaults.near;
        }
        if ( defaults.far !== undefined && defaults.far !== null ) {
            this.defaults.far = defaults.far;
        }
        this.resetCamera();
    };

    SceneOrtho.prototype.initGL = function () {
        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(
            this.canvas.getPixelLeft(),
            this.canvas.getPixelRight,
            this.canvas.getPixelTop(),
            this.canvas.getPixelBottom(),
            this.defaults.near,
            this.defaults.far
        );
    };

    SceneOrtho.prototype.resetCamera = function () {
        this.camera.position.set( this.defaults.posCamera.x, this.defaults.posCamera.y, this.defaults.posCamera.z );
        this.camera.near = this.defaults.near;
        this.camera.far = this.defaults.far;
        this.camera.updateProjectionMatrix();
    };

    SceneOrtho.prototype.updateCamera = function () {
        this.camera.left = this.canvas.getPixelLeft();
        this.camera.right = this.canvas.getPixelRight();
        this.camera.top = this.canvas.getPixelTop();
        this.camera.bottom = this.canvas.getPixelBottom();

        if (this.verbose) {
            console.log('Ortho Camera Dimensions: ' + this.camera.left + ' ' + this.camera.right + ' ' + this.camera.top + ' ' + this.camera.bottom);
        }

        this.camera.updateProjectionMatrix();
    };

    return SceneOrtho;

})();
