// motely-wasm 26 boots in embedded mode: the runtime is a base64 string that
// config.mjs turns into bytes with `Uint8Array.fromBase64`. That method is a
// very recent TC39 proposal — absent in Node 22 and in most shipping browsers —
// so without this polyfill `motely.boot()` throws before the search ever starts.
// Guarded so it no-ops wherever the engine's native implementation exists.

interface Uint8ArrayBase64Statics {
    fromBase64?: (input: string) => Uint8Array;
}
interface Uint8ArrayBase64Proto {
    toBase64?: () => string;
    setFromBase64?: (input: string) => { read: number; written: number };
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(input: string): Uint8Array {
    const clean = input.replace(/[\s=]+$/g, "").replace(/\s+/g, "");
    const lookup = new Int16Array(128).fill(-1);
    for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
    // tolerate base64url as well
    lookup["-".charCodeAt(0)] = 62;
    lookup["_".charCodeAt(0)] = 63;

    const out = new Uint8Array((clean.length * 3) >> 2);
    let bits = 0;
    let bitCount = 0;
    let o = 0;
    for (let i = 0; i < clean.length; i++) {
        const v = lookup[clean.charCodeAt(i) & 0x7f];
        if (v < 0) continue;
        bits = (bits << 6) | v;
        bitCount += 6;
        if (bitCount >= 8) {
            bitCount -= 8;
            out[o++] = (bits >> bitCount) & 0xff;
        }
    }
    return o === out.length ? out : out.subarray(0, o);
}

const statics = Uint8Array as unknown as Uint8ArrayBase64Statics;
const proto = Uint8Array.prototype as unknown as Uint8ArrayBase64Proto;

if (typeof statics.fromBase64 !== "function") {
    statics.fromBase64 = decodeBase64;
}

if (typeof proto.toBase64 !== "function") {
    proto.toBase64 = function (this: Uint8Array): string {
        let str = "";
        for (let i = 0; i < this.length; i += 3) {
            const a = this[i];
            const b = i + 1 < this.length ? this[i + 1] : 0;
            const c = i + 2 < this.length ? this[i + 2] : 0;
            str += B64[a >> 2];
            str += B64[((a & 3) << 4) | (b >> 4)];
            str += i + 1 < this.length ? B64[((b & 15) << 2) | (c >> 6)] : "=";
            str += i + 2 < this.length ? B64[c & 63] : "=";
        }
        return str;
    };
}

if (typeof proto.setFromBase64 !== "function") {
    proto.setFromBase64 = function (this: Uint8Array, input: string) {
        const bytes = decodeBase64(input);
        const written = Math.min(bytes.length, this.length);
        this.set(bytes.subarray(0, written));
        return { read: input.length, written };
    };
}
