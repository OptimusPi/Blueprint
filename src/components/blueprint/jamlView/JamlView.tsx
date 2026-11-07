import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JamlIde, JimboRow, JimboText } from "jaml-ui";
import { JimboTextInput } from "jaml-ui/ui";
import { MotelyDeck, MotelyStake } from "motely-wasm";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import { useCardStore } from "../../../modules/state/store.ts";
import type { JamlIdeSearchResult } from "jaml-ui";
import type { MotelyScoredSeedResult } from "motely-wasm";
import type { LoadedFilter, WorkerRequest, WorkerResponse } from "./searchWorker.ts";

type Status = "idle" | "booting" | "running" | "done" | "error";

interface SearchStats {
    seedsSearched: number;
    matchingSeeds: number;
    seedsPerSecond: number;
    percentComplete: number;
}

const EMPTY_STATS: SearchStats = { seedsSearched: 0, matchingSeeds: 0, seedsPerSecond: 0, percentComplete: 0 };

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
    const [loaded, setLoaded] = useState<LoadedFilter | null>(null);
    const [results, setResults] = useState<Array<MotelyScoredSeedResult>>([]);
    const [stats, setStats] = useState<SearchStats>(EMPTY_STATS);
    const [randomCount, setRandomCount] = useState<number>(1_000_000);
    const [deck, setDeck] = useState<number | null>(null);
    const [stake, setStake] = useState<number | null>(null);

    const workerRef = useRef<Worker | null>(null);
    // Matches accumulate here and flush to state on progress ticks and on done,
    // so a run with many matches doesn't re-sort on every event.
    const collectedRef = useRef<Array<MotelyScoredSeedResult>>([]);
    const onLoadedRef = useRef<(filter: LoadedFilter) => void>(() => {});

    const isSearching = status === "running" || status === "booting";

    const onLoaded = useCallback((filter: LoadedFilter) => {
        setLoaded(filter);
        if (filter.seeds.length === 0) return;
        setStoreDeck(`${filter.deck} Deck`);
        setStoreStake(`${filter.stake} Stake`);
        setSeedQueue(filter.seeds);
    }, [setSeedQueue, setStoreDeck, setStoreStake]);

    useEffect(() => {
        onLoadedRef.current = onLoaded;
    }, [onLoaded]);

    useEffect(() => {
        const worker = new Worker(new URL("./searchWorker.ts", import.meta.url), { type: "module" });
        workerRef.current = worker;
        const flush = () => setResults([...collectedRef.current].sort((a, b) => b.score - a.score));

        worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
            const msg = ev.data;
            switch (msg.type) {
                case "booting":
                case "running":
                    setStatus(msg.type);
                    break;
                case "loaded":
                    onLoadedRef.current(msg.filter);
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
                    break;
                case "error":
                    setError(msg.message);
                    setStatus("error");
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
    }, []);

    const startSearch = (jaml: string) => {
        setError(null);
        setResults([]);
        setStats(EMPTY_STATS);
        collectedRef.current = [];
        setStatus("booting");
        workerRef.current?.postMessage({
            type: "start",
            config: { jaml, randomCount: Math.max(1, randomCount), deck, stake },
        } satisfies WorkerRequest);
    };

    const handleSearch = () => {
        if (isSearching) workerRef.current?.postMessage({ type: "cancel" } satisfies WorkerRequest);
        else startSearch(jamlText);
    };

    const loadFile = () => new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".jaml,.yaml,.yml,.json,.txt";
        input.oncancel = () => resolve(null);
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return resolve(null);
            file.text().then((text) => {
                resolve(text);
                startSearch(text);
            }, () => resolve(null));
        };
        input.click();
    });

    const ideResults: Array<JamlIdeSearchResult> = useMemo(
        () => results.map((r) => ({ seed: r.seed, score: r.score, tallyColumns: Array.from(r.tallies), tallyLabels: [] })),
        [results],
    );

    const hits = stats.matchingSeeds || results.length;
    const seedCount = loaded?.seeds.length ?? 0;
    const progress = isSearching && seedCount === 0 && stats.percentComplete > 0
        ? ` · ${Math.round(stats.percentComplete)}%`
        : "";
    const subtitle = (
        <>
            {STATUS_LABEL[status]} · {formatNumber(hits)} hits · {formatNumber(stats.seedsSearched)} searched · {formatNumber(stats.seedsPerSecond)}/s{progress}
            {seedCount > 0 && <JimboText size="sm" tone="blue"> · {loaded?.name ? `${loaded.name}: ` : ""}{formatNumber(seedCount)} seeds from the filter</JimboText>}
            {error && <JimboText size="sm" tone="red"> · {error}</JimboText>}
        </>
    );

    const actions = (
        <JimboRow gap="xs" align="center" wrap>
            <JimboTextInput
                aria-label="Random seeds to sample"
                title="Random seeds to sample (used when the filter has no seeds: list)"
                inputMode="numeric"
                style={{ width: 120 }}
                value={formatNumber(randomCount)}
                disabled={isSearching}
                onChange={(e) => setRandomCount(Math.max(1, parseCount(e.currentTarget.value)))}
            />
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
