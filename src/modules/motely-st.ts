// Single-threaded motely-wasm boot wrapper.
// Uses bootsharp_st instead of bootsharp to avoid SharedArrayBuffer/COEP requirements.

// @ts-expect-error — internal path, resolved via vite alias
import bootsharp, { MotelyWasm, Event } from "motely-wasm-st";

let bootPromise: Promise<unknown> | null = null;

export function boot(): Promise<unknown> {
    if (!bootPromise) {
        // No root needed — bootsharp_st bundles everything inline
        bootPromise = bootsharp.boot();
    }
    return bootPromise;
}

export { MotelyWasm, Event };
