// The engine runs here, off the main thread. motely-wasm 26 is single-threaded
// and blocks whatever realm it runs in; on the UI thread that froze the tab for
// seconds at a time. In a worker the freeze is invisible — the UI stays live and
// results/progress stream back over postMessage.
//
// This drives motely-wasm's Search directly (per Blueprint's "no wrapper modules"
// rule). The worker boundary is a thread, not an abstraction: it still calls
// Search.settings(jaml).with…().start(token) with no layer in between.
import "../../../modules/uint8Base64Polyfill.ts";
import motely, {
    JamlAesthetic,
    MotelyDeck,
    MotelyStake,
    Search,
} from "motely-wasm";
import type { MotelyProgress, MotelySeedScore } from "motely-wasm";

// CancellationToken collides at the motely-wasm package root (re-exported from
// two submodules), so the token contract start() needs is reimplemented here.
class SearchCancellationToken {
    isCancellationRequested = false;
    private handlers = new Set<() => void>();
    onCancellationRequested = {
        subscribe: (h: () => void) => this.handlers.add(h),
        unsubscribe: (h: () => void) => this.handlers.delete(h),
    };
    cancel() {
        if (this.isCancellationRequested) return;
        this.isCancellationRequested = true;
        for (const h of this.handlers) h();
    }
}

export type SearchScope =
    | { mode: "random"; count: number }
    | { mode: "sequential" }
    | { mode: "keyword"; keywords: Array<string>; quickPad: boolean }
    | { mode: "aesthetic"; aesthetic: JamlAesthetic; quickPad: boolean }
    | { mode: "seedList"; seeds: Array<string> };

export interface SearchConfig {
    jaml: string;
    scope: SearchScope;
    deck: MotelyDeck | null;
    stake: MotelyStake | null;
    batchCharacterCount: number | null;
    providerBatchSeedCount: number | null;
    startBatchIndex: number | null;
    endBatchIndex: number | null;
    autoScoreCutoff: boolean;
    stopAfter: number;
}

export type WorkerRequest =
    | { type: "start"; config: SearchConfig }
    | { type: "cancel" };

export type WorkerResponse =
    | { type: "booting" }
    | { type: "running" }
    | { type: "scored"; score: MotelySeedScore }
    | { type: "progress"; progress: MotelyProgress }
    | { type: "done"; cancelled: boolean }
    | { type: "error"; message: string };

let bootPromise: Promise<unknown> | null = null;
function ensureBooted() {
    if (motely.getStatus() === motely.BootStatus.Booted) return Promise.resolve();
    if (!bootPromise) bootPromise = motely.boot();
    return bootPromise;
}

let activeToken: SearchCancellationToken | null = null;

const post = (msg: WorkerResponse) => (self as unknown as Worker).postMessage(msg);

async function run(config: SearchConfig) {
    const token = new SearchCancellationToken();
    activeToken = token;

    const onScored = (score: MotelySeedScore) => post({ type: "scored", score });
    const onProgress = (progress: MotelyProgress) => post({ type: "progress", progress });
    Search.onScored.subscribe(onScored);
    Search.onProgress.subscribe(onProgress);

    try {
        post({ type: "booting" });
        await ensureBooted();
        post({ type: "running" });

        let s = Search.settings(config.jaml).withProgressReportIntervalMs(250n);

        switch (config.scope.mode) {
            case "random":
                s = s.withRandomSearch(config.scope.count);
                break;
            case "sequential":
                s = s.withSequentialSearch();
                break;
            case "keyword":
                s = s.withKeywordSearch(config.scope.keywords, config.scope.quickPad);
                break;
            case "aesthetic":
                s = s.withAestheticSearch(config.scope.aesthetic, config.scope.quickPad);
                break;
            case "seedList":
                s = s.withSeedList(config.scope.seeds);
                break;
        }

        if (config.deck !== null) s = s.withDeck(config.deck);
        if (config.stake !== null) s = s.withStake(config.stake);
        if (config.batchCharacterCount !== null)
            s = s.withBatchCharacterCount(config.batchCharacterCount);
        if (config.providerBatchSeedCount !== null)
            s = s.withProviderBatchSeedCount(config.providerBatchSeedCount);
        if (config.startBatchIndex !== null)
            s = s.withStartBatchIndex(BigInt(config.startBatchIndex));
        if (config.endBatchIndex !== null)
            s = s.withEndBatchIndex(BigInt(config.endBatchIndex));
        if (config.autoScoreCutoff) s = s.withAutoScoreCutoff(true);
        if (config.stopAfter > 0) s = s.stopAfter(BigInt(config.stopAfter));

        await s.start(token as never);
        post({ type: "done", cancelled: token.isCancellationRequested });
    } catch (e) {
        post({ type: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
        Search.onScored.unsubscribe(onScored);
        Search.onProgress.unsubscribe(onProgress);
        if (activeToken === token) activeToken = null;
    }
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
    const msg = ev.data;
    if (msg.type === "start") void run(msg.config);
    else if (msg.type === "cancel") activeToken?.cancel();
};
