import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JamlIde, JimboButton, JimboRow, JimboText, JimboTextInput, parseJaml } from "jaml-ui";
import { MotelyDeck, MotelyStake } from "motely-wasm";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import { useCardStore } from "../../../modules/state/store.ts";
import {
    documentLooksLikeSeedBundle,
    jamlDeckToBlueprint,
    jamlStakeToBlueprint,
} from "../../../modules/jamlDocumentParse.ts";
import type { JamlIdeSearchResult } from "jaml-ui";
import type { MotelySeedScore } from "motely-wasm";
import type {
    ParsedJamlDocumentMessage,
    SearchConfig,
    SearchScope,
    WorkerRequest,
    WorkerResponse,
} from "./searchWorker.ts";

type Status = "idle" | "booting" | "running" | "done" | "error";

interface SearchStats {
    seedsSearched: number;
    matchingSeeds: number;
    seedsPerSecond: number;
    percentComplete: number;
}

const EMPTY_STATS: SearchStats = {
    seedsSearched: 0,
    matchingSeeds: 0,
    seedsPerSecond: 0,
    percentComplete: 0,
};

const STATUS_LABEL: Record<Status, string> = {
    idle: "Ready",
    booting: "Booting engine…",
    running: "Searching…",
    done: "Done",
    error: "Error",
};

// TS numeric enums carry a reverse mapping, so keep only the numeric entries.
function enumOptions(e: Record<string, string | number>): Array<[string, number]> {
    return Object.entries(e)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => [k, v as number]);
}
const DECK_OPTS = enumOptions(MotelyDeck);
const STAKE_OPTS = enumOptions(MotelyStake);

const formatNumber = (value: number): string => value.toLocaleString();
const parseCount = (v: string) => Math.max(0, Math.trunc(Number(v.replace(/[^\d]/g, "")) || 0));

function motelyDeckFromJaml(deck: string | null): number | null {
    if (!deck) return null;
    const value = MotelyDeck[deck.replace(/\s+Deck$/i, "").trim() as keyof typeof MotelyDeck];
    return typeof value === "number" ? value : null;
}

function motelyStakeFromJaml(stake: string | null): number | null {
    if (!stake) return null;
    const value = MotelyStake[stake.replace(/\s+Stake$/i, "").trim() as keyof typeof MotelyStake];
    return typeof value === "number" ? value : null;
}

const selectStyle: React.CSSProperties = {
    background: "var(--j-darkest, #1e2b2d)",
    color: "var(--j-cream, #f4eee0)",
    border: "1px solid var(--j-line, #38494b)",
    borderRadius: 6,
    padding: "6px 8px",
    fontFamily: "var(--j-font-code, monospace)",
    fontSize: 13,
};

export default function JamlView() {
    const { jamlText, setJamlText } = useJamlSearch();
    const setStoreDeck = useCardStore((s) => s.setDeck);
    const setStoreStake = useCardStore((s) => s.setStake);
    const setSeedQueue = useCardStore((s) => s.setSeedQueue);

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [documentStatus, setDocumentStatus] = useState<string | null>(null);
    const [results, setResults] = useState<Array<MotelySeedScore>>([]);
    const [stats, setStats] = useState<SearchStats>(EMPTY_STATS);
    const [randomCount, setRandomCount] = useState<number>(1_000_000);
    const [documentSeeds, setDocumentSeeds] = useState<Array<string>>([]);
    const [deck, setDeck] = useState<number | null>(null);
    const [stake, setStake] = useState<number | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const suppressDocumentParseRef = useRef(false);
    const lastParsedFingerprintRef = useRef<string>("");
    // Matches accumulate here and flush to state on progress ticks and on done,
    // so a run with many matches doesn't re-sort on every event.
    const collectedRef = useRef<Array<MotelySeedScore>>([]);
    const applyParsedDocumentRef = useRef<(doc: ParsedJamlDocumentMessage) => void>(() => {});

    const isSearching = status === "running" || status === "booting";

    const flush = useCallback(() => {
        setResults([...collectedRef.current].sort((a, b) => b.score - a.score));
    }, []);

    const startSearch = useCallback((
        jaml: string,
        scope: SearchScope,
        deckValue: number | null,
        stakeValue: number | null,
    ) => {
        setError(null);
        setResults([]);
        setStats(EMPTY_STATS);
        collectedRef.current = [];
        const config: SearchConfig = {
            jaml,
            scope,
            deck: deckValue,
            stake: stakeValue,
            batchCharacterCount: null,
            providerBatchSeedCount: null,
            startBatchIndex: null,
            endBatchIndex: null,
            autoScoreCutoff: false,
            stopAfter: 0,
        };
        setStatus("booting");
        workerRef.current?.postMessage({ type: "start", config } satisfies WorkerRequest);
    }, []);

    const applyParsedDocument = useCallback((doc: ParsedJamlDocumentMessage) => {
        const fingerprint = `${doc.seeds.length}:${doc.seeds[0] ?? ""}:${doc.seeds.at(-1) ?? ""}:${doc.filterJaml.length}`;
        if (fingerprint === lastParsedFingerprintRef.current) {
            setDocumentStatus(null);
            return;
        }
        lastParsedFingerprintRef.current = fingerprint;

        const deckOverride = motelyDeckFromJaml(doc.deck);
        const stakeOverride = motelyStakeFromJaml(doc.stake);
        if (doc.deck) setStoreDeck(jamlDeckToBlueprint(doc.deck));
        if (doc.stake) setStoreStake(jamlStakeToBlueprint(doc.stake));
        setDeck(deckOverride);
        setStake(stakeOverride);
        setDocumentSeeds(doc.seeds);
        suppressDocumentParseRef.current = true;
        setJamlText(doc.filterJaml);
        setSeedQueue(doc.seeds);
        queueMicrotask(() => {
            suppressDocumentParseRef.current = false;
        });

        setDocumentStatus(
            doc.name
                ? `${doc.name}: ${formatNumber(doc.seeds.length)} seeds · ${doc.deck ?? "Red"} / ${doc.stake ?? "White"}`
                : `${formatNumber(doc.seeds.length)} seeds loaded`,
        );

        startSearch(doc.filterJaml, { mode: "seedList", seeds: doc.seeds }, deckOverride, stakeOverride);
    }, [startSearch, setJamlText, setSeedQueue, setStoreDeck, setStoreStake]);

    useEffect(() => {
        applyParsedDocumentRef.current = applyParsedDocument;
    }, [applyParsedDocument]);

    useEffect(() => {
        const worker = new Worker(new URL("./searchWorker.ts", import.meta.url), {
            type: "module",
        });
        workerRef.current = worker;

        worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
            const msg = ev.data;
            switch (msg.type) {
                case "booting":
                    setStatus("booting");
                    break;
                case "running":
                    setStatus("running");
                    break;
                case "scored":
                    collectedRef.current.push(msg.score);
                    break;
                case "progress":
                    setStats({
                        seedsSearched: Number(msg.progress.seedsSearched),
                        matchingSeeds: Number(msg.progress.matchingSeeds),
                        seedsPerSecond: Math.round(msg.progress.seedsPerMillisecond * 1000),
                        percentComplete: msg.progress.percentComplete,
                    });
                    flush();
                    break;
                case "done":
                    flush();
                    setStatus(msg.cancelled ? "idle" : "done");
                    setDocumentStatus(null);
                    break;
                case "error":
                    setError(msg.message);
                    setStatus("error");
                    setDocumentStatus(null);
                    break;
                case "documentParsed":
                    applyParsedDocumentRef.current(msg.document);
                    break;
            }
        };
        worker.onerror = (e) => {
            setError(e.message || "Worker crashed");
            setStatus("error");
        };

        return () => {
            worker.postMessage({ type: "cancel" } satisfies WorkerRequest);
            worker.terminate();
            workerRef.current = null;
        };
    }, [flush]);

    useEffect(() => {
        if (suppressDocumentParseRef.current) return;
        if (!documentLooksLikeSeedBundle(jamlText)) return;
        const timer = setTimeout(() => {
            setDocumentStatus("Parsing JAML document in worker…");
            workerRef.current?.postMessage({ type: "parseDocument", text: jamlText } satisfies WorkerRequest);
        }, 450);
        return () => clearTimeout(timer);
    }, [jamlText]);

    const handleSearch = () => {
        if (isSearching) {
            workerRef.current?.postMessage({ type: "cancel" } satisfies WorkerRequest);
            return;
        }
        const scope: SearchScope = documentSeeds.length > 0
            ? { mode: "seedList", seeds: documentSeeds }
            : { mode: "random", count: Math.max(1, randomCount) };
        startSearch(jamlText, scope, deck, stake);
    };

    const loadFile = () => new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".yaml,.yml,.json,.jaml,.txt";
        input.oncancel = () => resolve(null);
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return resolve(null);
            lastParsedFingerprintRef.current = "";
            file.text().then(resolve, () => resolve(null));
        };
        input.click();
    });

    const clearDocumentSeeds = () => {
        setDocumentSeeds([]);
        lastParsedFingerprintRef.current = "";
    };

    const tallyLabels = useMemo(() => {
        try {
            return parseJaml(jamlText).should.map((clause) => clause.label);
        } catch {
            return [];
        }
    }, [jamlText]);

    const ideResults: Array<JamlIdeSearchResult> = useMemo(
        () =>
            results.map((r) => ({
                seed: r.seed,
                score: r.score,
                tallyColumns: Array.from(r.tally),
                tallyLabels,
            })),
        [results, tallyLabels],
    );

    const hits = stats.matchingSeeds || results.length;
    const progress = isSearching && documentSeeds.length === 0 && stats.percentComplete > 0
        ? ` · ${Math.round(stats.percentComplete)}%`
        : "";
    const subtitle = (
        <>
            {STATUS_LABEL[status]} · {formatNumber(hits)} hits · {formatNumber(stats.seedsSearched)} searched · {formatNumber(stats.seedsPerSecond)}/s{progress}
            {documentStatus && <JimboText size="sm" tone="blue"> · {documentStatus}</JimboText>}
            {error && <JimboText size="sm" tone="red"> · {error}</JimboText>}
        </>
    );

    const actions = (
        <JimboRow gap="xs" align="center" wrap>
            {documentSeeds.length > 0 ? (
                <JimboButton tone="grey" disabled={isSearching} onClick={clearDocumentSeeds}>
                    {formatNumber(documentSeeds.length)} seeds from file ✕
                </JimboButton>
            ) : (
                <JimboTextInput
                    aria-label="Random seeds to sample"
                    title="Random seeds to sample"
                    inputMode="numeric"
                    style={{ width: 120 }}
                    value={formatNumber(randomCount)}
                    disabled={isSearching}
                    onChange={(e) => setRandomCount(Math.max(1, parseCount(e.currentTarget.value)))}
                />
            )}
            <select
                aria-label="Deck"
                style={selectStyle}
                value={deck ?? ""}
                disabled={isSearching}
                onChange={(e) => setDeck(e.currentTarget.value === "" ? null : Number(e.currentTarget.value))}
            >
                <option value="">Deck: JAML</option>
                {DECK_OPTS.map(([label, v]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <select
                aria-label="Stake"
                style={selectStyle}
                value={stake ?? ""}
                disabled={isSearching}
                onChange={(e) => setStake(e.currentTarget.value === "" ? null : Number(e.currentTarget.value))}
            >
                <option value="">Stake: JAML</option>
                {STAKE_OPTS.map(([label, v]) => <option key={v} value={v}>{label}</option>)}
            </select>
        </JimboRow>
    );

    return (
        <div style={{ padding: 12 }}>
            <JamlIde
                jaml={jamlText}
                onChange={setJamlText}
                onSearch={handleSearch}
                isSearching={isSearching}
                searchResults={ideResults}
                showLoadFileButton
                onLoadFile={loadFile}
                title="JAML Seed Search"
                subtitle={subtitle}
                actions={actions}
            />
        </div>
    );
}
