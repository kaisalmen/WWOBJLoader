import {
	WorkerTaskDirectorDefaultWorker,
	WorkerTaskMessage,
	DataPayloadHandler,
	DataPayload,
	WorkerTaskMessageType,
	AssociatedArrayType
} from 'wtd-core';
import {
	OBJLoader2Parser
} from '../OBJLoader2Parser.js';

class OBJLoader2Worker extends WorkerTaskDirectorDefaultWorker {

	private localData = {
		id: 0,
		parser: new OBJLoader2Parser(),
		buffer: undefined as undefined | ArrayBufferLike,
		materialNames: undefined as undefined | Set<string>
	};

	constructor() {
		super();

		this.localData.parser._onAssetAvailable = preparedMesh => {
			const intermediateMessage = new WorkerTaskMessage({
				cmd: 'intermediate',
				id: this.localData.id,
				progress: preparedMesh.progress
			});

			const dataPayload = new DataPayload();
			if (!dataPayload.params) {
				dataPayload.params = {};
			}
			dataPayload.params.preparedMesh = preparedMesh;
			if (preparedMesh.vertexFA !== null) {
				dataPayload.buffers.set('vertexFA', preparedMesh.vertexFA);
			}
			if (preparedMesh.normalFA !== null) {
				dataPayload.buffers.set('normalFA', preparedMesh.normalFA);
			}
			if (preparedMesh.uvFA !== null) {
				dataPayload.buffers.set('uvFA', preparedMesh.uvFA);
			}
			if (preparedMesh.colorFA !== null) {
				dataPayload.buffers.set('colorFA', preparedMesh.colorFA);
			}
			if (preparedMesh.indexUA !== null) {
				dataPayload.buffers.set('indexUA', preparedMesh.indexUA);
			}
			intermediateMessage.addPayload(dataPayload);

			const transferables = intermediateMessage.pack(false);
			self.postMessage(intermediateMessage, transferables);
		};

		this.localData.parser._onLoad = () => {
			const execMessage = new WorkerTaskMessage({
				cmd: 'execComplete',
				id: this.localData.id
			});
			// no packing required as no Transferables here
			self.postMessage(execMessage);
		};

		this.localData.parser._onProgress = text => {
			if (this.localData.parser.isDebugLoggingEnabled()) {
				console.debug('WorkerRunner: progress: ' + text);
			}
		};
	}

	init(message: WorkerTaskMessageType) {
		const wtm = this.processMessage(message);

		if (this.localData.parser.isDebugLoggingEnabled()) {
			console.log(`OBJLoader2Worker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
		}

		const initComplete = WorkerTaskMessage.createFromExisting(wtm, 'initComplete');
		self.postMessage(initComplete);
	}

	execute(message: WorkerTaskMessageType) {
		if (this.localData.parser.isUsedBefore()) {
			this.localData.parser = new OBJLoader2Parser();
		}
		this.processMessage(message);

		if (this.localData.parser.isDebugLoggingEnabled()) {
			console.log(`OBJLoader2Worker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
		}

		if (this.localData.buffer) {
			this.localData.parser.execute(this.localData.buffer);
		}
		else {
			self.postMessage(new Error('No ArrayBuffer was provided for parsing.'));
		}
	}

	private processMessage(message: WorkerTaskMessageType) {
		this.localData.id = message.id ?? this.localData.id;

		const wtm = WorkerTaskMessage.unpack(message, false);
		const dataPayload = wtm.payloads[0];

		DataPayloadHandler.applyProperties(this.localData.parser as unknown as AssociatedArrayType,
			dataPayload.params as unknown as AssociatedArrayType, false);
		const modelData = dataPayload.buffers?.get('modelData');
		if (modelData) {
			this.localData.buffer = modelData;
		}

		if (dataPayload.params) {
			if (dataPayload.params.materialNames) {
				this.localData.materialNames = dataPayload.params.materialNames as Set<string>;
			}
		}

		if (this.localData.materialNames) {
			this.localData.parser.setMaterialNames(this.localData.materialNames);
		}

		return wtm;
	}
}

const worker = new OBJLoader2Worker();
self.onmessage = (message: MessageEvent<any>) => {
	worker.comRouting(message);
};
