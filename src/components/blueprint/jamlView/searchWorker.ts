// The engine runs here, off the main thread. motely-wasm is single-threaded and
// blocks whatever realm it runs in; in a worker the UI stays live and
// results/progress stream back over postMessage.
import "../../../modules/uint8Base64Polyfill.ts";
import motely, {
    CancellationToken,
    Errors,
    JamlConfigLoader,
    JamlSearchBuilder,
    MotelyDeck,
    MotelyStake,
} from "motely-wasm";
import { parseJamlDocument } from "../../../modules/jamlDocumentParse.ts";
import type { IMotelySearch, MotelyProgress, MotelyScoredSeedResult } from "motely-wasm";

export type SearchScope =
    | { mode: "random"; count: number }
    | { mode: "seedList"; seeds: Array<string> };

export interface SearchConfig {
    jaml: string;
    scope: SearchScope;
    deck: MotelyDeck | null;
    stake: MotelyStake | null;
}

export type ParsedJamlDocumentMessage = {
    filterJaml: string;
    seeds: Array<string>;
    deck: string | null;
    stake: string | null;
    name: string | null;
};

export type WorkerRequest =
    | { type: "start"; config: SearchConfig }
    | { type: "cancel" }
    | { type: "parseDocument"; text: string };

export type WorkerResponse =
    | { type: "booting" }
    | { type: "running" }
    | { type: "scored"; score: MotelyScoredSeedResult }
    | { type: "progress"; progress: MotelyProgress }
    | { type: "done"; cancelled: boolean }
    | { type: "error"; message: string }
    | { type: "documentParsed"; document: ParsedJamlDocumentMessage };

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
        post({ type: "running" });

        let s = JamlSearchBuilder.createSettings(JamlConfigLoader.fromJaml(config.jaml))
            .withThreadCount(1)
            .withProgressReportIntervalMs(250n)
            .withProgressCallback((progress) => post({ type: "progress", progress }))
            .withScoredResultCallback((score) => post({ type: "scored", score }));

        s = config.scope.mode === "random"
            ? s.withRandomSearch(config.scope.count)
            : s.withSeedList(config.scope.seeds);
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
    else if (msg.type === "parseDocument") {
        try {
            post({ type: "documentParsed", document: parseJamlDocument(msg.text) });
        } catch (e) {
            post({ type: "error", message: errorMessage(e) });
        }
    }
};
