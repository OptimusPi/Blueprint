// Thin wrapper around motely-wasm 11.3.2 (NativeAOT-LLVM + Bootsharp).
// One-time boot, global event fan-out, typed helper for Blueprint's JAML search UI.

let bootPromise: Promise<typeof import('motely-wasm')> | null = null;

async function bootOnce() {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
        const mod = await import('motely-wasm');
        await mod.default.boot();
        return mod;
    })().catch((err) => {
        bootPromise = null;
        throw err;
    });
    return bootPromise;
}

export async function getVersion(): Promise<string> {
    const { MotelyWasm } = await bootOnce();
    return MotelyWasm.getVersion();
}

export type JamlValidation = { ok: true } | { ok: false; error: string };

export async function validateJaml(jaml: string): Promise<JamlValidation> {
    const { MotelyWasm } = await bootOnce();
    const result = MotelyWasm.validateJaml(jaml);
    if (!result || result.toLowerCase() === 'valid' || result === '') {
        return { ok: true };
    }
    return { ok: false, error: result };
}

export type SearchMode =
    | { kind: 'random'; count: number }
    | { kind: 'sequential'; batchCharCount: number; startBatch: bigint; endBatch: bigint }
    | { kind: 'seedList'; seeds: string[] }
    | { kind: 'keyword'; keywordsCsv: string; paddingChars: string }
    | { kind: 'aesthetic'; aesthetic: number };

export interface SearchCallbacks {
    onProgress?: (seedsSearched: number, matchingSeeds: number) => void;
    onResult?: (seed: string, score: number, tallyColumns: Int32Array) => void;
    onComplete?: (status: string, totalSeedsSearched: number, matchingSeeds: number) => void;
}

export interface SearchHandle {
    cancel: () => void;
    done: Promise<{ state: number; totalSeedsSearched: number; matchingSeeds: number; error?: string }>;
}

// bigint → number with clamping for the UI (seeds searched won't exceed 2^53 in any realistic run).
const toNum = (b: bigint): number => {
    if (b <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(b);
    return Number.MAX_SAFE_INTEGER;
};

export async function startJamlSearch(
    jaml: string,
    mode: SearchMode,
    callbacks: SearchCallbacks = {},
): Promise<SearchHandle> {
    const { MotelyWasm, MotelyWasmEvents } = await bootOnce();

    const progressHandler = callbacks.onProgress
        ? (seedsSearched: bigint, matchingSeeds: bigint) =>
              callbacks.onProgress!(toNum(seedsSearched), toNum(matchingSeeds))
        : null;
    const resultHandler = callbacks.onResult
        ? (seed: string, score: number, tallyColumns: Int32Array) =>
              callbacks.onResult!(seed, score, tallyColumns)
        : null;
    const completeHandler = callbacks.onComplete
        ? (status: string, total: bigint, matching: bigint) =>
              callbacks.onComplete!(status, toNum(total), toNum(matching))
        : null;

    if (progressHandler) MotelyWasmEvents.onProgress.subscribe(progressHandler);
    if (resultHandler) MotelyWasmEvents.onResult.subscribe(resultHandler);
    if (completeHandler) MotelyWasmEvents.onComplete.subscribe(completeHandler);

    const unsubscribe = () => {
        if (progressHandler) MotelyWasmEvents.onProgress.unsubscribe(progressHandler);
        if (resultHandler) MotelyWasmEvents.onResult.unsubscribe(resultHandler);
        if (completeHandler) MotelyWasmEvents.onComplete.unsubscribe(completeHandler);
    };

    let search: ReturnType<typeof MotelyWasm.startRandomSearch>;
    switch (mode.kind) {
        case 'random':
            search = MotelyWasm.startRandomSearch(jaml, mode.count);
            break;
        case 'sequential':
            search = MotelyWasm.startSequentialSearch(jaml, mode.batchCharCount, mode.startBatch, mode.endBatch);
            break;
        case 'seedList':
            search = MotelyWasm.startSeedListSearch(jaml, mode.seeds);
            break;
        case 'keyword':
            search = MotelyWasm.startKeywordSearch(jaml, mode.keywordsCsv, mode.paddingChars);
            break;
        case 'aesthetic':
            search = MotelyWasm.startAestheticSearch(jaml, mode.aesthetic);
            break;
    }

    const done = search
        .waitForCompletion()
        .then((c) => ({
            state: c.state,
            totalSeedsSearched: toNum(c.totalSeedsSearched),
            matchingSeeds: toNum(c.matchingSeeds),
            error: c.error,
        }))
        .finally(unsubscribe);

    return {
        cancel: () => {
            try {
                search.cancel();
            } catch {
                /* ignore — cancel on already-completed search */
            }
        },
        done,
    };
}

if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
    (window as any).__motelyCheck = async () => {
        const version = await getVersion();
        const info = { booted: true, version };
        console.table(info);
        return info;
    };
}
