/**
 * Encapsulates a url and derived values (filename, extension and path and stores the {@link ArrayBuffer}
 * loaded from the resource described by the url.
 */
class ResourceDescriptor {

    private url;
    private path = './';
    private filename: string;
    private extension: string | undefined;
    private buffer: ArrayBufferLike | undefined;
    private needStringOutput = false;

    constructor(url: string) {
        this.url = new URL(url, window.location.href);
        this.filename = url;

        const urlParts = this.url.href.split('/');
        if (urlParts.length > 2) {
            this.filename = urlParts[urlParts.length - 1];
            const urlPartsPath = urlParts.slice(0, urlParts.length - 1).join('/') + '/';
            if (urlPartsPath !== undefined) this.path = urlPartsPath;
        }
        const filenameParts = this.filename.split('.');
        if (filenameParts.length > 1) {
            this.extension = filenameParts[filenameParts.length - 1];
        }
    }

    getUrl() {
        return this.url;
    }

    /**
     * Returns ths path from the base of the URL to the file
     * @return {string}
     */
    getPath() {
        return this.path;
    }

    getFilename() {
        return this.filename;
    }

    getExtension() {
        return this.extension;
    }

    setNeedStringOutput(needStringOutput: boolean) {
        this.needStringOutput = needStringOutput;
        return this;
    }

    isNeedStringOutput() {
        return this.needStringOutput;
    }

    /**
     * Set the buffer after loading.
     * @param {ArrayBufferLike} buffer
     * @return {ResourceDescriptor}
     */
    setBuffer(buffer: ArrayBufferLike) {
        if (!(buffer instanceof ArrayBuffer ||
            buffer instanceof Int8Array ||
            buffer instanceof Uint8Array ||
            buffer instanceof Uint8ClampedArray ||
            buffer instanceof Int16Array ||
            buffer instanceof Uint16Array ||
            buffer instanceof Int32Array ||
            buffer instanceof Uint32Array ||
            buffer instanceof Float32Array ||
            buffer instanceof Float64Array)) {
            throw (new Error('Provided input is neither an "ArrayBuffer" nor a "TypedArray"! Aborting...'));
        } else {
            this.buffer = buffer;
        }
        return this;
    }

    getBuffer() {
        return this.buffer;
    }

    /**
     * Returns the buffer as string by using {@link TextDecoder}.
     *
     * @return {string}
     */
    getBufferAsString() {
        return this.buffer ? new TextDecoder('utf-8').decode(this.buffer) : '';
    }

}

export { ResourceDescriptor };
