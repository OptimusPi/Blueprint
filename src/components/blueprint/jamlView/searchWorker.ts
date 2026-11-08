// The engine runs here, off the main thread. motely-wasm is single-threaded and
// blocks whatever realm it runs in; in a worker the UI stays live and
// results/progress stream back over postMessage.
import motely, {
    CancellationToken,
    Errors,
    JamlConfigLoader,
    JamlSearchBuilder,
    MotelyDeck,
    MotelyStake,
} from "motely-wasm";
import type { IMotelySearch, MotelyProgress, MotelyScoredSeedResult } from "motely-wasm";

export interface SearchConfig {
    jaml: string;
    randomCount: number;
    deck: MotelyDeck | null;
    stake: MotelyStake | null;
}

export interface LoadedFilter {
    name: string | null;
    deck: string;
    stake: string;
    seeds: Array<string>;
    tallyLabels: Array<string>;
}

export type WorkerRequest =
    | { type: "start"; config: SearchConfig }
    | { type: "cancel" };

export type WorkerResponse =
    | { type: "booting" }
    | { type: "running" }
    | { type: "loaded"; filter: LoadedFilter }
    | { type: "scored"; score: MotelyScoredSeedResult }
    | { type: "progress"; progress: MotelyProgress }
    | { type: "done"; cancelled: boolean }
    | { type: "error"; message: string };

let bootPromise: Promise<unknown> | null = null;
function ensureBooted() {
    if (motely.getStatus() === motely.BootStatus.Booted) return Promise.resolve();
    if (!bootPromise) bootPromise = motely.boot();
    return bootPromise;
}

let activeToken: CancellationToken | null = null;

const post = (msg: WorkerResponse) => (self as unknown as Worker).postMessage(msg);

// NativeAOT hands JS an opaque "C# exception from NativeAOT"; Errors.last() has the real message.
function errorMessage(e: unknown): string {
    const message = e instanceof Error ? e.message : String(e);
    return message.includes("NativeAOT") ? (Errors.last() ?? message) : message;
}

async function run(config: SearchConfig) {
    const token = new CancellationToken();
    activeToken = token;
    let search: IMotelySearch | null = null;

    try {
        post({ type: "booting" });
        await ensureBooted();

        const problem = JamlConfigLoader.check(config.jaml);
        if (problem) throw new Error(problem);
        const filter = JamlConfigLoader.fromJaml(config.jaml);
        post({
            type: "loaded",
            filter: {
                name: filter.name ?? null,
                deck: MotelyDeck[filter.deck],
                stake: MotelyStake[filter.stake],
                seeds: [...filter.seeds],
                tallyLabels: filter.should.map((clause, i) => clause.label ?? `Tally ${i + 1}`),
            },
        });
        post({ type: "running" });

        let s = JamlSearchBuilder.createSettings(filter)
            .withThreadCount(1)
            .withProgressReportIntervalMs(250n)
            .withProgressCallback((progress) => post({ type: "progress", progress }))
            .withScoredResultCallback((score) => post({ type: "scored", score }));
        s = filter.seeds.length > 0
            ? s.withSeedList([...filter.seeds])
            : s.withRandomSearch(config.randomCount);
        if (config.deck !== null) s = s.withDeck(config.deck);
        if (config.stake !== null) s = s.withStake(config.stake);

        search = s.start(token);
        await search.waitForCompletionAsync();
        post({ type: "done", cancelled: token.isCancellationRequested });
    } catch (e) {
        post({ type: "error", message: errorMessage(e) });
    } finally {
        search?.dispose();
        if (activeToken === token) activeToken = null;
    }
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
    const msg = ev.data;
    if (msg.type === "start") void run(msg.config);
    else if (msg.type === "cancel") activeToken?.cancel();
};
