import { BoxGeometry, DoubleSide, FileLoader, FrontSide, LineSegments, Material, Mesh, MeshNormalMaterial, Object3D, Points, Vector3 } from 'three';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { Controller, GUI } from 'lil-gui';
import { OBJLoader2, OBJLoader2Parallel, MtlObjBridge } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, reportProgress, ThreeDefaultSetup } from './ExampleCommons.js';

export class OBJLoader2OptionsExample implements ExampleDefinition {

    private setup: ThreeDefaultSetup;
    private cube: Mesh;
    private pivot: Object3D;
    private models = {
        male02: true,
        female02: true,
        female02_vertex_colors: true,
        waltHead: true,
        ninjaHead: true,
        cerberus: true
    };
    private flatShading = false;
    private doubleSide = false;
    private useJsmWorker = false;
    private useIndices = false;
    private materialPerSmoothingGroup = false;
    private useOAsMesh = false;
    private disregardNormals = false;
    private regularLogging = false;
    private debugLogging = false;
    private loadCount = 6;

    constructor(canvas: HTMLCanvasElement | null) {
        const cameraDefaults = {
            posCamera: new Vector3(0.0, 175.0, 500.0),
            posCameraTarget: new Vector3(0, 0, 0),
            near: 0.1,
            far: 10000,
            fov: 45
        };
        this.setup = createThreeDefaultSetup(canvas, cameraDefaults, {
            width: canvas?.offsetWidth ?? 0,
            height: canvas?.offsetHeight ?? 0,
            pixelRatio: window.devicePixelRatio
        });

        const geometry = new BoxGeometry(10, 10, 10);
        const material = new MeshNormalMaterial();
        this.cube = new Mesh(geometry, material);
        this.cube.position.set(0, 0, 0);
        this.setup.scene.add(this.cube);

        this.pivot = new Object3D();
        this.pivot.name = 'Pivot';
        this.setup.scene.add(this.pivot);
    }

    getSetup() {
        return this.setup;
    }

    useParseMain() {
        const modelName = 'female02';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const objLoader2 = new OBJLoader2()
            .setModelName(modelName)
            .setUseIndices(this.useIndices)
            .setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
            .setUseOAsMesh(this.useOAsMesh)
            .setDisregardNormals(this.disregardNormals)
            .setLogging(this.regularLogging, this.debugLogging);

        const onLoadMtl = (mtlParseResult: MTLLoader.MaterialCreator) => {
            objLoader2.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));

            const fileLoader = new FileLoader();
            fileLoader.setPath('');
            fileLoader.setResponseType('arraybuffer');
            fileLoader.load('./models/obj/main/female02/female02.obj',
                (content) => {
                    const local = new Object3D();
                    local.name = 'Pivot_female02';
                    local.position.set(75, 0, 0);
                    this.pivot.add(local);
                    local.add(objLoader2.parse(content));

                    reportProgress({
                        detail: {
                            text: `Loading of ${modelName} completed: OBJLoader2#pase: Parsing completed`
                        }
                    });
                    this.finalize();
                }
            );
        };

        const mtlLoader = new MTLLoader();
        mtlLoader.load('./models/obj/main/female02/female02.mtl', onLoadMtl);
    }

    getWorkerUrl() {
        if (this.useJsmWorker) {
            return OBJLoader2Parallel.getModuleWorkerDefaultUrl();
        }
        else {
            return OBJLoader2Parallel.getStandardWorkerDefaultUrl();
        }
    }

    useParseParallel() {
        const modelName = 'female02_vertex';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const local = new Object3D();
        local.name = 'Pivot_female02_vertex';
        local.position.set(-75, 0, 0);
        this.pivot.add(local);

        const callbackOnLoad = (object3d: Object3D) => {
            this.setup.scene.add(object3d);
            reportProgress({
                detail: {
                    text: `Loading of [${modelName}] was successfully completed.`
                }
            });
            this.finalize();
        };

        const objLoader2Parallel = new OBJLoader2Parallel()
            .setModelName(modelName)
            .setWorkerUrl(this.useJsmWorker, this.getWorkerUrl())
            .setUseIndices(this.useIndices)
            .setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
            .setUseOAsMesh(this.useOAsMesh)
            .setDisregardNormals(this.disregardNormals)
            .setLogging(this.regularLogging, this.debugLogging)
            .setCallbackOnLoad(callbackOnLoad);

        const fileLoader = new FileLoader();
        fileLoader.setPath('');
        fileLoader.setResponseType('arraybuffer');
        fileLoader.load('./models/obj/main/female02/female02_vertex_colors.obj',
            (content) => {
                objLoader2Parallel.parse(content as ArrayBuffer);
            }
        );
    }

    useLoadMain() {
        const modelName = 'male02';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const objLoader2 = new OBJLoader2()
            .setModelName(modelName)
            .setUseIndices(this.useIndices)
            .setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
            .setUseOAsMesh(this.useOAsMesh)
            .setDisregardNormals(this.disregardNormals)
            .setLogging(this.regularLogging, this.debugLogging);

        const callbackOnLoad = (object3d: Object3D) => {
            const local = new Object3D();
            local.name = 'Pivot_male02';
            local.position.set(-75, 0, 0);
            this.pivot.add(local);
            local.add(object3d);
            reportProgress({
                detail: {
                    text: `Loading of [${modelName}] was successfully completed.`
                }
            });
            this.finalize();
        };

        const onLoadMtl = (mtlParseResult: MTLLoader.MaterialCreator) => {
            objLoader2.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
            objLoader2.load('./models/obj/main/male02/male02.obj', callbackOnLoad);
        };

        const mtlLoader = new MTLLoader();
        mtlLoader.load('./models/obj/main/male02/male02.mtl', onLoadMtl);
    }

    useLoadParallel() {
        const modelName = 'WaltHead';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const local = new Object3D();
        local.name = 'Pivot_WaltHead';
        local.position.set(-75, 0, 100);
        const scale = 0.5;
        local.scale.set(scale, scale, scale);
        this.pivot.add(local);

        const objLoader2Parallel = new OBJLoader2Parallel()
            .setModelName(modelName)
            .setWorkerUrl(this.useJsmWorker, this.getWorkerUrl())
            .setUseIndices(this.useIndices)
            .setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
            .setUseOAsMesh(this.useOAsMesh)
            .setDisregardNormals(this.disregardNormals)
            .setLogging(this.regularLogging, this.debugLogging);

        const callbackOnLoad = (object3d: Object3D) => {
            local.add(object3d);
            reportProgress({
                detail: {
                    text: `Loading of [${modelName}] was successfully completed.`
                }
            });
            this.finalize();
        };

        const onLoadMtl = (mtlParseResult: MTLLoader.MaterialCreator) => {
            objLoader2Parallel.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
            objLoader2Parallel.load('./models/obj/main/walt/WaltHead.obj', callbackOnLoad);
        };

        const mtlLoader = new MTLLoader();
        mtlLoader.load('./models/obj/main/walt/WaltHead.mtl', onLoadMtl);
    }

    async useLoadMainFallback() {
        const local = new Object3D();
        local.name = 'Pivot_Cerberus';
        local.position.set(0, 0, 100);
        const scale = 50;
        local.scale.set(scale, scale, scale);
        this.pivot.add(local);

        const objLoader2 = new OBJLoader2()
            .setModelName(local.name)
            .setUseIndices(this.useIndices)
            .setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
            .setUseOAsMesh(this.useOAsMesh)
            .setDisregardNormals(this.disregardNormals)
            .setLogging(this.regularLogging, this.debugLogging);

        try {
            const object3d = await objLoader2.loadAsync('./models/obj/main/cerberus/Cerberus.obj');
            local.add(object3d as Object3D);
            reportProgress({
                detail: {
                    text: `Loading of [${local.name}] was successfully completed.`
                }
            });
            this.finalize();
            console.log('Awaited Cerberus.obj loading!');
        } catch (e) {
            console.error(e);
        }
    }

    useLoadParallelMeshAlter() {
        const local = new Object3D();
        local.position.set(75, -150, 100);
        local.name = 'Pivot_ninjaHead';
        this.pivot.add(local);

        const objLoader2Parallel = new OBJLoader2Parallel()
            .setModelName(local.name)
            .setWorkerUrl(this.useJsmWorker, this.getWorkerUrl())
            .setUseIndices(this.useIndices)
            .setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
            .setUseOAsMesh(this.useOAsMesh)
            .setDisregardNormals(this.disregardNormals)
            .setLogging(this.regularLogging, this.debugLogging)
            // Configure WorkerExecutionSupport to not disregard worker after execution
            .setTerminateWorkerOnLoad(false);

        const callbackMeshAlter = (mesh: Mesh | LineSegments | Points, baseObject3d: Object3D) => {
            const helper = new VertexNormalsHelper(mesh, 2, 0x00ff00);
            helper.name = 'VertexNormalsHelper';
            baseObject3d.add(helper);
        };
        objLoader2Parallel.setCallbackOnMeshAlter(callbackMeshAlter);

        const callbackOnLoad = (object3d: Object3D) => {
            local.add(object3d);
            reportProgress({
                detail: {
                    text: `Loading of [${objLoader2Parallel.getModelName()}] was successfully completed.`
                }
            });
            this.finalize();
        };

        objLoader2Parallel.load('./models/obj/main/ninja/ninjaHead_Low.obj', callbackOnLoad);
    }

    finalize() {
        this.loadCount--;
        if (this.loadCount === 0) {
            reportProgress({ detail: { text: '' } });
        }
    }
    render() {
        this.cube.rotation.x += 0.05;
        this.cube.rotation.y += 0.05;
        renderDefault(this.setup);
    }

    alterShading() {
        this.flatShading = !this.flatShading;
        console.log(this.flatShading ? 'Enabling flat shading' : 'Enabling smooth shading');

        this.traversalFunction = (material: Material) => {
            if (Object.prototype.hasOwnProperty.call(material, 'flatShading')) {
                (material as {
                    flatShading: boolean;
                } & Material).flatShading = this.flatShading;
            }
            material.needsUpdate = true;
        };

        const scopeTraverse = (mesh: Object3D) => {
            this.traverseScene(mesh as Mesh);
        };
        this.pivot.traverse(scopeTraverse);
    }

    traversalFunction(_material: Material) {
        console.log('Default traversalFunction');
    }

    alterDouble() {
        this.doubleSide = !this.doubleSide;
        console.log(this.doubleSide ? 'Enabling DoubleSide materials' : 'Enabling FrontSide materials');

        this.traversalFunction = (material: Material) => {
            material.side = this.doubleSide ? DoubleSide : FrontSide;
        };

        const scopeTraverse = (mesh: Object3D) => {
            this.traverseScene(mesh as Mesh);
        };
        this.pivot.traverse(scopeTraverse);
    }

    traverseScene(mesh: Mesh) {
        if (Array.isArray(mesh.material)) {
            const materials = mesh.material;

            for (const name in materials) {
                if (Object.prototype.hasOwnProperty.call(materials, name)) {
                    this.traversalFunction(materials[name]);
                }
            }
        } else if (mesh.material) {
            this.traversalFunction(mesh.material);
        }
    }

    private executeLoading() {
        // Load a file with OBJLoader2.parse on main
        if (this.models.female02) this.useParseMain();

        // Load a file with OBJLoader2Parallel.parse in parallel in worker
        if (this.models.female02_vertex_colors) this.useParseParallel();

        // Load a file with OBJLoader.load on main
        if (this.models.male02) this.useLoadMain();

        // Load a file with OBJLoader2Parallel.load in parallel in worker
        if (this.models.waltHead) this.useLoadParallel();

        // Load a file with OBJLoader2Parallel.load on main with fallback to OBJLoader2.parse
        if (this.models.cerberus) this.useLoadMainFallback();

        // Load a file with OBJLoader2Parallel.load in parallel in worker and add normals during onMeshAlter
        if (this.models.ninjaHead) this.useLoadParallelMeshAlter();
    }

    run() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const app = this;
        const wwObjLoader2Control = {
            flatShading: app.flatShading,
            doubleSide: app.doubleSide,
            useJsmWorker: app.useJsmWorker,
            useIndices: app.useIndices,
            materialPerSmoothingGroup: app.materialPerSmoothingGroup,
            useOAsMesh: app.useOAsMesh,
            disregardNormals: app.disregardNormals,
            regularLogging: app.regularLogging,
            debugLogging: app.debugLogging,
            models: {
                male02: app.models.male02,
                female02: app.models.female02,
                female02_vertex_colors: app.models.female02_vertex_colors,
                waltHead: app.models.waltHead,
                ninjaHead: app.models.ninjaHead,
                cerberus: app.models.cerberus
            },
            blockEvent: (event: Event) => {
                event.stopPropagation();
            },
            disableElement(elementHandle: Controller) {
                elementHandle.domElement.addEventListener('click', this.blockEvent, true);
                if (elementHandle.domElement.parentElement) {
                    elementHandle.domElement.parentElement.style.pointerEvents = 'none';
                    elementHandle.domElement.parentElement.style.opacity = '0.5';
                }
            },
            enableElement(elementHandle: Controller) {
                if (elementHandle.domElement.parentElement) {
                    elementHandle.domElement.removeEventListener('click', this.blockEvent, true);
                    elementHandle.domElement.parentElement.style.pointerEvents = 'auto';
                    elementHandle.domElement.parentElement.style.opacity = '1.0';
                }
            },
            executeLoading: () => {
                if (app.models.female02 || app.models.female02_vertex_colors || app.models.male02 ||
                    app.models.waltHead || app.models.cerberus || app.models.ninjaHead) {

                    app.executeLoading();
                    wwObjLoader2Control.disableElement(handleExecuteLoading);
                }
            },
        };

        const menuDiv = document.getElementById('dat');
        const gui = new GUI({
            autoPlace: false,
            width: 320
        });
        menuDiv?.appendChild(gui.domElement);

        const folderObjLoader2Models = gui.addFolder('Model Selection');

        const controlModelFemale02 = folderObjLoader2Models.add(wwObjLoader2Control.models, 'female02');
        controlModelFemale02.onChange((v: boolean) => {
            console.log('Setting models.female02 to: ' + v);
            app.models.female02 = v;
        });
        const controlModelFemale02VertexColors = folderObjLoader2Models.add(wwObjLoader2Control.models, 'female02_vertex_colors').name('female02 (worker)');
        controlModelFemale02VertexColors.onChange((v: boolean) => {
            console.log('Setting models.female02_vertex_colors to: ' + v);
            app.models.female02_vertex_colors = v;
        });
        const controlModelMale02 = folderObjLoader2Models.add(wwObjLoader2Control.models, 'male02');
        controlModelMale02.onChange((v: boolean) => {
            console.log('Setting models.male02 to: ' + v);
            app.models.male02 = v;
        });
        const controlModelWaltHead = folderObjLoader2Models.add(wwObjLoader2Control.models, 'waltHead').name('waltHead (worker)');
        controlModelWaltHead.onChange((v: boolean) => {
            console.log('Setting models.waltHead to: ' + v);
            app.models.waltHead = v;
        });
        const controlModelCerberus = folderObjLoader2Models.add(wwObjLoader2Control.models, 'cerberus');
        controlModelCerberus.onChange((v: boolean) => {
            console.log('Setting models.cerberus to: ' + v);
            app.models.cerberus = v;
        });
        const controlModelNinjaHead = folderObjLoader2Models.add(wwObjLoader2Control.models, 'ninjaHead').name('ninjaHead (worker)');
        controlModelNinjaHead.onChange((v: boolean) => {
            console.log('Setting models.ninjaHead to: ' + v);
            app.models.ninjaHead = v;
        });

        const folderObjLoader2ParallelOptions = gui.addFolder('OBJLoader2Parallel Options');
        const controlJsmWorker = folderObjLoader2ParallelOptions.add(wwObjLoader2Control, 'useJsmWorker').name('Use Module Workers');
        controlJsmWorker.onChange((value: boolean) => {
            console.log('Setting useJsmWorker to: ' + value);
            app.useJsmWorker = value;
        });

        const folderObjLoader2ParserOptions = gui.addFolder('OBJLoader2Parser Options');
        const controlUseIndices = folderObjLoader2ParserOptions.add(wwObjLoader2Control, 'useIndices').name('Use Indices');
        controlUseIndices.onChange((value: boolean) => {
            console.log('Setting useIndices to: ' + value);
            app.useIndices = value;
        });
        const controlMaterialPerSmoothingGroup = folderObjLoader2ParserOptions.add(wwObjLoader2Control, 'materialPerSmoothingGroup').name('Use material per SG');
        controlMaterialPerSmoothingGroup.onChange((value: boolean) => {
            console.log('Setting materialPerSmoothingGroup to: ' + value);
            app.materialPerSmoothingGroup = value;
        });
        const controlUseOAsMesh = folderObjLoader2ParserOptions.add(wwObjLoader2Control, 'useOAsMesh').name('Use useOAsMesh');
        controlUseOAsMesh.onChange((value: boolean) => {
            console.log('Setting useOAsMesh to: ' + value);
            app.useOAsMesh = value;
        });
        const controlDisregardNormals = folderObjLoader2ParserOptions.add(wwObjLoader2Control, 'disregardNormals').name('Use disregardNormals');
        controlDisregardNormals.onChange((value: boolean) => {
            console.log('Setting disregardNormals to: ' + value);
            app.disregardNormals = value;
        });

        const folderLoggingOptions = gui.addFolder('Logging');
        const controlRegularLogging = folderLoggingOptions.add(wwObjLoader2Control, 'regularLogging').name('Enable logging');
        const controlDebugLogging = folderLoggingOptions.add(wwObjLoader2Control, 'debugLogging').name('Enable debug logging');

        controlRegularLogging.onChange((value: boolean) => {
            console.log('Setting regularLogging to: ' + value);
            app.regularLogging = value;
            if (!app.regularLogging) {
                wwObjLoader2Control.disableElement(controlDebugLogging);
            } else {
                wwObjLoader2Control.enableElement(controlDebugLogging);
            }
        });
        controlDebugLogging.onChange((value: boolean) => {
            console.log('Setting debugLogging to: ' + value);

            app.debugLogging = value;
            if (!app.regularLogging) {
                app.regularLogging = app.debugLogging;
                controlRegularLogging.setValue(app.debugLogging);
            }
        });
        wwObjLoader2Control.disableElement(controlDebugLogging);

        const folderRenderingOptions = gui.addFolder('Rendering Options');
        const controlFlat = folderRenderingOptions.add(wwObjLoader2Control, 'flatShading').name('Flat Shading');
        controlFlat.onChange((value: boolean) => {
            console.log('Setting flatShading to: ' + value);
            app.alterShading();
        });

        const controlDouble = folderRenderingOptions.add(wwObjLoader2Control, 'doubleSide').name('Double Side Materials');
        controlDouble.onChange((value: boolean) => {
            console.log('Setting doubleSide to: ' + value);
            app.alterDouble();
        });

        const folderExecution = gui.addFolder('Execution');
        const handleExecuteLoading = folderExecution.add(wwObjLoader2Control, 'executeLoading').name('Run');
        handleExecuteLoading.domElement.id = 'startButton';

        folderObjLoader2Models.open();
        folderObjLoader2ParallelOptions.open();
        folderObjLoader2ParserOptions.open();
        folderLoggingOptions.close();
        folderRenderingOptions.close();
        folderExecution.open();
    }

}
