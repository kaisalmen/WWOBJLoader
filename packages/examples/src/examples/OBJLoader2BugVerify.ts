import { Object3D, Vector3 } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { ResourceDescriptor } from 'wwobjloader2';
import { AssetPipelineLoader, AssetPipeline, AssetTask, LinkType } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, ThreeDefaultSetup } from './ExampleCommons.js';

export class OBJLoader2BugVerify implements ExampleDefinition {

    private setup: ThreeDefaultSetup;

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
        this.setup.renderer?.setClearColor(0x808080);
    }

    getSetup() {
        return this.setup;
    }

    render() {
        renderDefault(this.setup);
    }

    run() {
        // issue: 14
        const assetPipeline14 = new AssetPipeline();
        const assetPipelineLoader14 = new AssetPipelineLoader('Issue14', assetPipeline14);

        const pivot14 = new Object3D();
        pivot14.position.set(-400, 0, 0);
        pivot14.scale.set(5.0, 5.0, 5.0);
        this.setup.scene.add(pivot14);
        assetPipelineLoader14.setBaseObject3d(pivot14);

        const assetTask14Mtl = new AssetTask('task14Mtl');
        assetTask14Mtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/14/bbd3874250e2414aaa6a4c84c8a21656.mtl').setNeedStringOutput(true));
        assetTask14Mtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/14/' });

        const assetTask14MtlObjLink = new AssetTask('task14MtlObjLink');
        assetTask14MtlObjLink.setLinker(new MtlObjBridge());

        const assetTask14Obj = new AssetTask('task14Obj');
        assetTask14Obj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/14/bbd3874250e2414aaa6a4c84c8a21656.obj'));
        assetTask14Obj.setLoader(new OBJLoader2());

        assetPipeline14.addAssetTask(assetTask14Mtl);
        assetPipeline14.addAssetTask(assetTask14MtlObjLink);
        assetPipeline14.addAssetTask(assetTask14Obj);

        assetPipelineLoader14.run();

        // issue: 14032
        const assetPipeline14032 = new AssetPipeline();
        const assetPipelineLoader14032 = new AssetPipelineLoader('Issue14032', assetPipeline14032);

        const pivot14032 = new Object3D();
        pivot14032.position.set(-325, 50, 0);
        this.setup.scene.add(pivot14032);
        assetPipelineLoader14032.setBaseObject3d(pivot14032);

        const assetTask14032Mtl = new AssetTask('task14032Mtl');
        assetTask14032Mtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/14032/union.mtl').setNeedStringOutput(true));
        assetTask14032Mtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/14032/' });

        const assetTask14032MtlObjLink = new AssetTask('task14MtlObjLink');
        assetTask14032MtlObjLink.setLinker(new MtlObjBridge());

        const assetTask14032Obj = new AssetTask('task14032Obj');
        assetTask14032Obj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/14032/union.obj'));
        assetTask14032Obj.setLoader(new OBJLoader2());

        assetPipeline14032.addAssetTask(assetTask14032Mtl);
        assetPipeline14032.addAssetTask(assetTask14032MtlObjLink);
        assetPipeline14032.addAssetTask(assetTask14032Obj);

        assetPipelineLoader14032.run();

        // issue: 21
        const assetPipeline21 = new AssetPipeline();
        const assetPipelineLoader21 = new AssetPipelineLoader('Issue21', assetPipeline21);
        const pivot21 = new Object3D();
        pivot21.position.set(-225, 0, 0);
        pivot21.scale.set(25.0, 25.0, 25.0);
        this.setup.scene.add(pivot21);
        assetPipelineLoader21.setBaseObject3d(pivot21);

        const assetTask21Mtl = new AssetTask('task21Mtl');
        assetTask21Mtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/21/Table_Photo_Frame_03.mtl').setNeedStringOutput(true));
        assetTask21Mtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/21/' });

        const assetTask21MtlObjLink = new AssetTask('task21MtlObjLink');
        assetTask21MtlObjLink.setLinker(new MtlObjBridge());

        const assetTask21Obj = new AssetTask('task21Obj');
        assetTask21Obj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/21/Table_Photo_Frame_03.obj'));
        assetTask21Obj.setLoader(new OBJLoader2());

        assetPipeline21.addAssetTask(assetTask21Mtl);
        assetPipeline21.addAssetTask(assetTask21MtlObjLink);
        assetPipeline21.addAssetTask(assetTask21Obj);

        assetPipelineLoader21.run();

        // issue: 12120
        const assetPipeline12120 = new AssetPipeline();
        const assetPipelineLoader12120 = new AssetPipelineLoader('Issue12120', assetPipeline12120);
        const pivot12120 = new Object3D();
        pivot12120.position.set(-325, 0, -100);
        pivot12120.scale.set(0.01, 0.01, 0.01);
        this.setup.scene.add(pivot12120);
        assetPipelineLoader12120.setBaseObject3d(pivot12120);

        const assetTask12120Mtl = new AssetTask('task12120Mtl');
        assetTask12120Mtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/12120/zjej_abm_f01_out_T005.mtl').setNeedStringOutput(true));
        assetTask12120Mtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/12120/' });

        const assetTask12120MtlObjLink = new AssetTask('task12120MtlObjLink');
        assetTask12120MtlObjLink.setLinker(new MtlObjBridge());

        const assetTask12120Obj = new AssetTask('task12121Obj');
        assetTask12120Obj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/12120/zjej_abm_f01_out_T005.obj'));
        assetTask12120Obj.setLoader(new OBJLoader2());

        assetPipeline12120.addAssetTask(assetTask12120Mtl);
        assetPipeline12120.addAssetTask(assetTask12120MtlObjLink);
        assetPipeline12120.addAssetTask(assetTask12120Obj);

        assetPipelineLoader12120.run();

        // issue: 12324
        const assetPipeline12324 = new AssetPipeline();
        const assetPipelineLoader12324 = new AssetPipelineLoader('Issue12324', assetPipeline12324);
        const pivot12324 = new Object3D();
        pivot12324.position.set(-50, 0, 0);
        this.setup.scene.add(pivot12324);
        assetPipelineLoader12324.setBaseObject3d(pivot12324);

        const assetTask12324Mtl = new AssetTask('task12324Mtl');
        assetTask12324Mtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/12324/rampanueva.mtl').setNeedStringOutput(true));
        assetTask12324Mtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/12324/' });

        const assetTask12324MtlObjLink = new AssetTask('task12324MtlObjLink');
        assetTask12324MtlObjLink.setLinker(new MtlObjBridge());

        const assetTask12324Obj = new AssetTask('task12324Obj');
        assetTask12324Obj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/12324/rampanueva.obj'));
        assetTask12324Obj.setLoader(new OBJLoader2());

        assetPipeline12324.addAssetTask(assetTask12324Mtl);
        assetPipeline12324.addAssetTask(assetTask12324MtlObjLink);
        assetPipeline12324.addAssetTask(assetTask12324Obj);

        assetPipelineLoader12324.run();

        // issue: 11811A
        const assetPipeline11811A = new AssetPipeline();
        const assetPipelineLoader11811A = new AssetPipelineLoader('Issue11811A', assetPipeline11811A);
        const pivot11811A = new Object3D();
        pivot11811A.position.set(50, 0, 0);
        pivot11811A.scale.set(0.25, 0.25, 0.25);
        this.setup.scene.add(pivot11811A);
        assetPipelineLoader11811A.setBaseObject3d(pivot11811A);

        const assetTask11811AMtl = new AssetTask('task11811AMtl');
        assetTask11811AMtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/11811/3dbpo10518T.mtl').setNeedStringOutput(true));
        assetTask11811AMtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/11811/' });

        const assetTask11811AMtlObjLink = new AssetTask('task11811AMtlObjLink');
        assetTask11811AMtlObjLink.setLinker(new MtlObjBridge() as unknown as LinkType);

        const assetTask11811AObj = new AssetTask('task11811AObj');
        assetTask11811AObj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/11811/3dbpo10518T.obj'));
        assetTask11811AObj.setLoader(new OBJLoader2());

        assetPipeline11811A.addAssetTask(assetTask11811AMtl);
        assetPipeline11811A.addAssetTask(assetTask11811AMtlObjLink);
        assetPipeline11811A.addAssetTask(assetTask11811AObj);

        assetPipelineLoader11811A.run();

        // issue: 11811B
        const assetPipeline11811B = new AssetPipeline();
        const assetPipelineLoader11811B = new AssetPipelineLoader('Issue11811B', assetPipeline11811B);
        const pivot11811B = new Object3D();
        pivot11811B.position.set(150, 0, 0);
        pivot11811B.scale.set(0.25, 0.25, 0.25);
        this.setup.scene.add(pivot11811B);
        assetPipelineLoader11811B.setBaseObject3d(pivot11811B);

        const assetTask11811BMtl = new AssetTask('task11811BMtl');
        assetTask11811BMtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/11811/3dbts103601T.mtl').setNeedStringOutput(true));
        assetTask11811BMtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/11811/' });

        const assetTask11811BMtlObjLink = new AssetTask('task11811BMtlObjLink');
        assetTask11811BMtlObjLink.setLinker(new MtlObjBridge());

        const assetTask11811BObj = new AssetTask('task11811BObj');
        assetTask11811BObj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/11811/3dbts103601T.obj'));
        assetTask11811BObj.setLoader(new OBJLoader2());

        assetPipeline11811B.addAssetTask(assetTask11811BMtl);
        assetPipeline11811B.addAssetTask(assetTask11811BMtlObjLink);
        assetPipeline11811B.addAssetTask(assetTask11811BObj);

        assetPipelineLoader11811B.run();

        // Issue: 27 door
        const assetPipeline27Door = new AssetPipeline();
        const assetPipelineLoader27Door = new AssetPipelineLoader('Issue27Door', assetPipeline27Door);
        const pivot27Door = new Object3D();
        pivot27Door.position.set(250, 0, 0);
        pivot27Door.scale.set(0.5, 0.5, 0.5);
        this.setup.scene.add(pivot27Door);
        assetPipelineLoader27Door.setBaseObject3d(pivot27Door);

        const assetTask27DoorMtl = new AssetTask('task27DoorMtl');
        assetTask27DoorMtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/27/door.mtl').setNeedStringOutput(true));
        assetTask27DoorMtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/27/' });

        const assetTask27DoorMtlObjLink = new AssetTask('task27DoorMtlObjLink');
        assetTask27DoorMtlObjLink.setLinker(new MtlObjBridge());

        const assetTask27DoorObj = new AssetTask('task27DoorObj');
        assetTask27DoorObj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/27/door.obj'));
        assetTask27DoorObj.setLoader(new OBJLoader2());

        assetPipeline27Door.addAssetTask(assetTask27DoorMtl);
        assetPipeline27Door.addAssetTask(assetTask27DoorMtlObjLink);
        assetPipeline27Door.addAssetTask(assetTask27DoorObj);

        assetPipelineLoader27Door.run();

        // Issue: 27 wall2
        const assetPipeline27Wall2 = new AssetPipeline();
        const assetPipelineLoader27Wall2 = new AssetPipelineLoader('Issue27Wall2', assetPipeline27Wall2);
        const pivot27Wall2 = new Object3D();
        pivot27Wall2.position.set(350, 0, 0);
        pivot27Wall2.scale.set(0.5, 0.5, 0.5);
        this.setup.scene.add(pivot27Wall2);
        assetPipelineLoader27Wall2.setBaseObject3d(pivot27Wall2);

        const assetTask27Wall2Mtl = new AssetTask('task27Wall2Mtl');
        assetTask27Wall2Mtl.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/27/wall2.mtl').setNeedStringOutput(true));
        assetTask27Wall2Mtl.setLoader(new MTLLoader(), { resourcePath: './models/obj/bugs/27/' });

        const assetTask27Wall2MtlObjLink = new AssetTask('task27Wall2MtlObjLink');
        assetTask27Wall2MtlObjLink.setLinker(new MtlObjBridge());

        const assetTask27Wall2Obj = new AssetTask('task27Wall2Obj');
        assetTask27Wall2Obj.setResourceDescriptor(new ResourceDescriptor('./models/obj/bugs/27/wall2.obj'));
        assetTask27Wall2Obj.setLoader(new OBJLoader2());

        assetPipeline27Wall2.addAssetTask(assetTask27Wall2Mtl);
        assetPipeline27Wall2.addAssetTask(assetTask27Wall2MtlObjLink);
        assetPipeline27Wall2.addAssetTask(assetTask27Wall2Obj);

        assetPipelineLoader27Wall2.run();
    }
}
