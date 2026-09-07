// motely-wasm 26 boots in embedded mode: the runtime is a base64 string that
// config.mjs turns into bytes with `Uint8Array.fromBase64`. That method is a
// very recent TC39 proposal — absent in Node 22 and in most shipping browsers —
// so without this polyfill `motely.boot()` throws before the search ever starts.
// Only `fromBase64` is on that boot path, so only `fromBase64` is polyfilled.
// Guarded so it no-ops wherever the engine's native implementation exists.

interface Uint8ArrayBase64Statics {
    fromBase64?: (input: string) => Uint8Array;
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
if (typeof statics.fromBase64 !== "function") {
    statics.fromBase64 = decodeBase64;
}
