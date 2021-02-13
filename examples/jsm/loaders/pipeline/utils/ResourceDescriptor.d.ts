export class ResourceDescriptor {
    constructor(url: string);
    url: URL;
    path: string;
    filename: string;
    extension: string | null;
    buffer: ArrayBuffer;
    needStringOutput: boolean;
    compressed: boolean;
    getUrl(): URL;
    getPath(): string;
    getFilename(): string;
    getExtension(): null | string;
    setNeedStringOutput(needStringOutput: boolean): ResourceDescriptor;
    isNeedStringOutput(): boolean;
    setCompressed(compressed: boolean): ResourceDescriptor;
    isCompressed(): boolean;
    setBuffer(buffer: ArrayBuffer): ResourceDescriptor;
    getBuffer(): ArrayBuffer;
    getBufferAsString(): string;
}
