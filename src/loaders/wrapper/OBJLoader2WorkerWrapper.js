/**
 * @author Kai Salmen / www.kaisalmen.de
 */

// Imports only related to wrapper
import { WorkerExecutionSupport } from "../worker/main/WorkerExecutionSupport.js";
import { CodeSerializer } from "../worker/main/CodeSerializer.js";
import { CodeBuilderInstructions } from "../worker/main/CodeBuilderInstructions.js";
import { ResourceDescriptor } from "../utils/ResourceDescriptor.js";
import { OBJLoader2 } from "../OBJLoader2.js";

// Imports related to wrapper and to worker
import { ObjectManipulator } from "../utils/ObjectManipulator.js";

// Imports only related to worker
import { OBJLoader2Parser } from "../worker/parallel/OBJLoader2Parser.js";
import { WorkerRunner } from "../worker/parallel/WorkerRunner.js";

/**
 *
 * @param {Object} loaderParams
 * @param {Object3D} sceneBase
 * @constructor
 */
const OBJLoader2WorkerWrapper = function ( loaderParams, sceneBase ) {
	this.loader = new OBJLoader2();
	ObjectManipulator.applyProperties( this.loader, loaderParams );

	this.sceneBase = sceneBase;
	this.onReportProgress = null;
};

OBJLoader2WorkerWrapper.prototype = {

	constructor: OBJLoader2WorkerWrapper,

	setCallbackReportProgress: function ( onReportProgress ) {
		if ( onReportProgress !== undefined && onReportProgress !== null ) {
			this.onReportProgress = onReportProgress;
		}
	},

	/**
	 * @param {ResourceDescriptor} resourceDescriptor
	 * @param {boolean} useJsm
	 */
	runAsyncParse: function( resourceDescriptor, useJsm ) {
		let workerExecutionSupport = new WorkerExecutionSupport();
		workerExecutionSupport.setTerminateWorkerOnLoad( true );

		if ( useJsm ) {
			workerExecutionSupport.buildJsm( '../../src/loaders/worker/parallel/jsm/OBJLoader2Worker.js' );
		}
		else {
			let codeOBJLoader2Parser = CodeSerializer.serializeClass( 'OBJLoader2Parser', OBJLoader2Parser );
			let codeObjectManipulator = CodeSerializer.serializeObject( 'ObjectManipulator', ObjectManipulator );
			let codeWorkerRunner = CodeSerializer.serializeClass( 'WorkerRunner', WorkerRunner );

			let codeBuilderInstructions = new CodeBuilderInstructions();
			codeBuilderInstructions.addCodeFragment( codeOBJLoader2Parser );
			codeBuilderInstructions.addCodeFragment( codeObjectManipulator );
			codeBuilderInstructions.addCodeFragment( codeWorkerRunner );

			codeBuilderInstructions.addLibraryImport( '../../node_modules/three/build/three.js' );
			codeBuilderInstructions.addStartCode( 'new WorkerRunner( new OBJLoader2Parser() );' );

			workerExecutionSupport.buildStandard( codeBuilderInstructions );
		}

		let scope = this;
		let scopedOnAssetAvailable = function ( payload ) {
			scope.loader._onAssetAvailable( payload );
		};
		let callbackOnLoad = function ( message ) {
			scope.sceneBase.add( scope.loader.baseObject3d  );
			if ( scope.onReportProgress !== null ) {
				scope.onReportProgress( { detail: { text: 'Loading complete: ' + message } } );
			}
		};
		workerExecutionSupport.updateCallbacks( scopedOnAssetAvailable, callbackOnLoad );

		workerExecutionSupport.runAsyncParse(
			{
				params: {
					modelName: this.loader.modelName,
					instanceNo: this.loader.instanceNo,
					useIndices: this.loader.useIndices,
					disregardNormals: this.loader.disregardNormals,
					materialPerSmoothingGroup: this.loader.materialPerSmoothingGroup,
					useOAsMesh: this.loader.useOAsMesh,
				},
				materials: this.loader.materialHandler.getMaterialsJSON(),
				data: {
					input: resourceDescriptor.content.input,
					options: resourceDescriptor.content.inputDataOptions
				},
				logging: {
					enabled: this.loader.logging.enabled,
					debug: this.loader.logging.debug
				}
			},
			resourceDescriptor.transferables );
	}
};

export { OBJLoader2WorkerWrapper }
