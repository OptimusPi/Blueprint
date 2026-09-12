import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    JamlIde,
    JimboBadge,
    JimboButton,
    JimboPanel,
    JimboRow,
    JimboStack,
    JimboStatusPill,
    JimboText,
    JimboTextInput,
    estimateEtaSeconds,
    estimateJamlRarity,
    formatEta,
    formatOneIn,
    parseJaml,
} from "jaml-ui";
import { JamlAesthetic, MotelyDeck, MotelyStake } from "motely-wasm";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import type { JamlIdeSearchResult, JimboStatus } from "jaml-ui";
import type { MotelySeedScore } from "motely-wasm";
import type {
    SearchConfig,
    SearchScope,
    WorkerRequest,
    WorkerResponse,
} from "./searchWorker.ts";

type Status = "idle" | "booting" | "running" | "done" | "error";
type ScopeMode = SearchScope["mode"];

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

// Enum → [label, value] pairs. TS numeric enums carry a reverse mapping, so keep
// only the entries whose value is a number.
function enumOptions(e: Record<string, string | number>): Array<[string, number]> {
    return Object.entries(e)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => [k, v as number]);
}
const DECK_OPTS = enumOptions(MotelyDeck);
const STAKE_OPTS = enumOptions(MotelyStake);
const AESTHETIC_OPTS = enumOptions(JamlAesthetic);

const formatNumber = (value: number): string => value.toLocaleString();
const parseCount = (v: string) => Math.max(0, Math.trunc(Number(v.replace(/[^\d]/g, "")) || 0));

const selectStyle: React.CSSProperties = {
    width: "100%",
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

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<Array<MotelySeedScore>>([]);
    const [stats, setStats] = useState<SearchStats>(EMPTY_STATS);
    const [searchedJaml, setSearchedJaml] = useState<string | null>(null);

    // Search source (mutually exclusive engine modes).
    const [scopeMode, setScopeMode] = useState<ScopeMode>("random");
    const [randomCount, setRandomCount] = useState<number>(1_000_000);
    const [keywords, setKeywords] = useState<string>("CLAUDE,HAIKU,SONNET,OPUS,FABLE");
    const [quickPad, setQuickPad] = useState<boolean>(true);
    const [aesthetic, setAesthetic] = useState<number>(JamlAesthetic.Palindrome);
    const [seedList, setSeedList] = useState<string>("");

    // Overrides & tuning. null = leave to the JAML / engine default.
    const [deck, setDeck] = useState<number | null>(null);
    const [stake, setStake] = useState<number | null>(null);
    const [stopAfter, setStopAfter] = useState<number>(0);
    const [autoScoreCutoff, setAutoScoreCutoff] = useState<boolean>(false);
    const [batchCharacterCount, setBatchCharacterCount] = useState<number>(0);
    const [providerBatchSeedCount, setProviderBatchSeedCount] = useState<number>(0);
    const [startBatchIndex, setStartBatchIndex] = useState<number>(0);
    const [endBatchIndex, setEndBatchIndex] = useState<number>(0);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    const workerRef = useRef<Worker | null>(null);
    // Matches accumulate here (push-only, no per-event sort) and flush to state on
    // progress ticks + on done — so a run that matches a lot of seeds doesn't turn
    // into an O(n²) sort storm, and there is no artificial cap on how many are kept.
    const collectedRef = useRef<Array<MotelySeedScore>>([]);

    const flush = useCallback(() => {
        const sorted = [...collectedRef.current].sort((a, b) => b.score - a.score);
        setResults(sorted);
    }, []);

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
    }, [flush]);

    const tallyLabels = useMemo(() => {
        try {
            return parseJaml(jamlText).should.map((clause) => clause.label);
        } catch {
            return [];
        }
    }, [jamlText]);

    const isSearching = status === "running" || status === "booting";

    const estimate = useMemo(() => {
        try {
            return estimateJamlRarity(jamlText);
        } catch {
            return null;
        }
    }, [jamlText]);
    const hits = stats.matchingSeeds || results.length;
    const measured = hits > 0 && stats.seedsSearched > 0 && searchedJaml === jamlText;
    const estimatedP = estimate?.combined.oneIn ? estimate.combined.pPerSeed : 0;
    const pPerSeed = measured ? hits / stats.seedsSearched : estimatedP;
    const calculus = pPerSeed > 0
        ? {
            source: measured
                ? `measured: ${formatNumber(hits)} ÷ ${formatNumber(stats.seedsSearched)}`
                : searchedJaml !== null && searchedJaml !== jamlText
                    ? "estimated from the edited filter, ±10x (search stats belong to the previous filter)"
                    : "estimated from the filter, ±10x",
            oneIn: formatOneIn(1 / pPerSeed),
            expected: 1 / pPerSeed,
            coinFlip: Math.LN2 / pPerSeed,
            almostCertain: Math.log(20) / pPerSeed,
            eta: (seeds: number) => stats.seedsPerSecond > 0 ? formatEta(estimateEtaSeconds(1 / seeds, stats.seedsPerSecond)) : "—",
        }
        : null;

    const buildScope = useCallback((): SearchScope => {
        switch (scopeMode) {
            case "random":
                return { mode: "random", count: Math.max(1, Math.trunc(randomCount)) };
            case "sequential":
                return { mode: "sequential" };
            case "keyword":
                return {
                    mode: "keyword",
                    keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
                    quickPad,
                };
            case "aesthetic":
                return { mode: "aesthetic", aesthetic, quickPad };
            case "seedList":
                return {
                    mode: "seedList",
                    seeds: seedList.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
                };
        }
    }, [scopeMode, randomCount, keywords, quickPad, aesthetic, seedList]);

    const runSearch = useCallback(() => {
        setError(null);
        setResults([]);
        setStats(EMPTY_STATS);
        setSearchedJaml(jamlText);
        collectedRef.current = [];

        const config: SearchConfig = {
            jaml: jamlText,
            scope: buildScope(),
            deck,
            stake,
            batchCharacterCount: batchCharacterCount > 0 ? Math.trunc(batchCharacterCount) : null,
            providerBatchSeedCount:
                providerBatchSeedCount > 0 ? Math.trunc(providerBatchSeedCount) : null,
            startBatchIndex: startBatchIndex > 0 ? Math.trunc(startBatchIndex) : null,
            endBatchIndex: endBatchIndex > 0 ? Math.trunc(endBatchIndex) : null,
            autoScoreCutoff,
            stopAfter: Math.max(0, Math.trunc(stopAfter)),
        };
        setStatus("booting");
        workerRef.current?.postMessage({ type: "start", config } satisfies WorkerRequest);
    }, [
        jamlText,
        buildScope,
        deck,
        stake,
        batchCharacterCount,
        providerBatchSeedCount,
        startBatchIndex,
        endBatchIndex,
        autoScoreCutoff,
        stopAfter,
    ]);

    const handleSearch = useCallback(() => {
        if (isSearching) {
            workerRef.current?.postMessage({ type: "cancel" } satisfies WorkerRequest);
        } else {
            runSearch();
        }
    }, [isSearching, runSearch]);

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

    const statusLabel: Record<Status, string> = {
        idle: "Ready",
        booting: "Booting engine…",
        running: "Searching…",
        done: "Search complete",
        error: "Error",
    };
    const pillStatus: Record<Status, JimboStatus> = {
        idle: "idle",
        booting: "running",
        running: "running",
        done: "ok",
        error: "error",
    };
    const hitTone = status === "error" ? "red" : status === "done" ? "green" : "blue";

    const scopeButtons: Array<[ScopeMode, string]> = [
        ["random", "Random"],
        ["sequential", "Sequential"],
        ["keyword", "Keyword"],
        ["aesthetic", "Aesthetic"],
        ["seedList", "Seed list"],
    ];

    const numberField = (
        label: string,
        value: number,
        onChange: (n: number) => void,
        hint?: string,
    ) => (
        <JimboStack gap="xs">
            <JimboText size="xs" tone="grey">{label}</JimboText>
            <JimboTextInput
                inputMode="numeric"
                value={value}
                onChange={(e) => onChange(parseCount(e.currentTarget.value))}
                disabled={isSearching}
            />
            {hint && <JimboText size="xs" tone="grey">{hint}</JimboText>}
        </JimboStack>
    );

    const sidebar = (
        <JimboStack gap="sm">
            <JimboPanel title="Search" tone="blue">
                <JimboStack gap="sm">
                    <JimboRow justify="between" align="center">
                        <JimboStatusPill status={pillStatus[status]} label={statusLabel[status]} />
                        <JimboBadge tone={hitTone}>
                            {formatNumber(stats.matchingSeeds || results.length)} hits
                        </JimboBadge>
                    </JimboRow>
                    <JimboText size="sm" tone="grey">
                        {formatNumber(stats.seedsSearched)} searched · {formatNumber(stats.seedsPerSecond)}/s
                        {scopeMode === "random" && isSearching
                            ? ` · ${Math.round(stats.percentComplete)}%`
                            : ""}
                    </JimboText>
                    {error && <JimboText size="sm" tone="red">{error}</JimboText>}
                </JimboStack>
            </JimboPanel>

            <JimboPanel title="Calculus" tone="grey">
                {calculus ? (
                    <JimboStack gap="xs">
                        <JimboRow justify="between">
                            <JimboText size="xs" tone="grey">Rarity</JimboText>
                            <JimboText size="sm">{calculus.oneIn}</JimboText>
                        </JimboRow>
                        <JimboText size="xs" tone="grey">{calculus.source}</JimboText>
                        <JimboRow justify="between">
                            <JimboText size="xs" tone="grey">Expected wait (1/p)</JimboText>
                            <JimboText size="sm">{formatNumber(Math.round(calculus.expected))} · {calculus.eta(calculus.expected)}</JimboText>
                        </JimboRow>
                        <JimboRow justify="between">
                            <JimboText size="xs" tone="grey">Coin flip (ln 2/p)</JimboText>
                            <JimboText size="sm">{formatNumber(Math.round(calculus.coinFlip))} · {calculus.eta(calculus.coinFlip)}</JimboText>
                        </JimboRow>
                        <JimboRow justify="between">
                            <JimboText size="xs" tone="grey">95% (ln 20/p)</JimboText>
                            <JimboText size="sm">{formatNumber(Math.round(calculus.almostCertain))} · {calculus.eta(calculus.almostCertain)}</JimboText>
                        </JimboRow>
                        {stats.seedsPerSecond === 0 && (
                            <JimboText size="xs" tone="grey">Times appear once the rig speed is measured.</JimboText>
                        )}
                    </JimboStack>
                ) : (
                    <JimboText size="xs" tone="grey">No estimate for this filter yet; rarity is measured once the search has hits.</JimboText>
                )}
            </JimboPanel>

            <JimboPanel title="Source" tone="gold">
                <JimboStack gap="sm">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {scopeButtons.map(([mode, label]) => (
                            <JimboButton
                                key={mode}
                                fullWidth
                                tone={scopeMode === mode ? "blue" : "grey"}
                                disabled={isSearching}
                                onClick={() => setScopeMode(mode)}
                            >
                                {label}
                            </JimboButton>
                        ))}
                    </div>

                    {scopeMode === "random" &&
                        numberField("Seeds to sample", randomCount, (n) =>
                            setRandomCount(Math.max(1, n)),
                        )}

                    {scopeMode === "keyword" && (
                        <JimboStack gap="xs">
                            <JimboText size="xs" tone="grey">Keywords (comma-separated)</JimboText>
                            <JimboTextInput
                                value={keywords}
                                onChange={(e) => setKeywords(e.currentTarget.value)}
                                disabled={isSearching}
                            />
                        </JimboStack>
                    )}

                    {scopeMode === "aesthetic" && (
                        <JimboStack gap="xs">
                            <JimboText size="xs" tone="grey">Aesthetic</JimboText>
                            <select
                                style={selectStyle}
                                value={aesthetic}
                                disabled={isSearching}
                                onChange={(e) => setAesthetic(Number(e.currentTarget.value))}
                            >
                                {AESTHETIC_OPTS.map(([label, v]) => (
                                    <option key={v} value={v}>{label}</option>
                                ))}
                            </select>
                        </JimboStack>
                    )}

                    {(scopeMode === "keyword" || scopeMode === "aesthetic") && (
                        <JimboButton
                            fullWidth
                            tone={quickPad ? "blue" : "grey"}
                            disabled={isSearching}
                            onClick={() => setQuickPad((q) => !q)}
                        >
                            Quick pad: {quickPad ? "on" : "off"}
                        </JimboButton>
                    )}

                    {scopeMode === "seedList" && (
                        <JimboStack gap="xs">
                            <JimboText size="xs" tone="grey">Seeds (space/comma-separated)</JimboText>
                            <JimboTextInput
                                value={seedList}
                                onChange={(e) => setSeedList(e.currentTarget.value)}
                                disabled={isSearching}
                            />
                        </JimboStack>
                    )}

                    {numberField(
                        "Stop after N matches (0 = unlimited)",
                        stopAfter,
                        setStopAfter,
                    )}
                </JimboStack>
            </JimboPanel>

            <JimboPanel title="Overrides" tone="green">
                <JimboStack gap="sm">
                    <JimboStack gap="xs">
                        <JimboText size="xs" tone="grey">Deck (JAML default if unset)</JimboText>
                        <select
                            style={selectStyle}
                            value={deck ?? ""}
                            disabled={isSearching}
                            onChange={(e) =>
                                setDeck(e.currentTarget.value === "" ? null : Number(e.currentTarget.value))
                            }
                        >
                            <option value="">— JAML default —</option>
                            {DECK_OPTS.map(([label, v]) => (
                                <option key={v} value={v}>{label}</option>
                            ))}
                        </select>
                    </JimboStack>
                    <JimboStack gap="xs">
                        <JimboText size="xs" tone="grey">Stake (JAML default if unset)</JimboText>
                        <select
                            style={selectStyle}
                            value={stake ?? ""}
                            disabled={isSearching}
                            onChange={(e) =>
                                setStake(e.currentTarget.value === "" ? null : Number(e.currentTarget.value))
                            }
                        >
                            <option value="">— JAML default —</option>
                            {STAKE_OPTS.map(([label, v]) => (
                                <option key={v} value={v}>{label}</option>
                            ))}
                        </select>
                    </JimboStack>
                    <JimboButton
                        fullWidth
                        tone={autoScoreCutoff ? "blue" : "grey"}
                        disabled={isSearching}
                        onClick={() => setAutoScoreCutoff((v) => !v)}
                    >
                        Auto score cutoff: {autoScoreCutoff ? "on" : "off"}
                    </JimboButton>
                </JimboStack>
            </JimboPanel>

            <JimboPanel title="Batching" tone="grey">
                <JimboStack gap="sm">
                    <JimboButton
                        fullWidth
                        tone="grey"
                        onClick={() => setShowAdvanced((v) => !v)}
                    >
                        {showAdvanced ? "Hide" : "Show"} batch controls
                    </JimboButton>
                    {showAdvanced && (
                        <JimboStack gap="sm">
                            {numberField(
                                "Batch character count (0 = auto)",
                                batchCharacterCount,
                                setBatchCharacterCount,
                            )}
                            {numberField(
                                "Provider batch seed count (0 = auto)",
                                providerBatchSeedCount,
                                setProviderBatchSeedCount,
                            )}
                            {numberField(
                                "Start batch index (0 = start)",
                                startBatchIndex,
                                setStartBatchIndex,
                            )}
                            {numberField(
                                "End batch index (0 = end)",
                                endBatchIndex,
                                setEndBatchIndex,
                            )}
                        </JimboStack>
                    )}
                </JimboStack>
            </JimboPanel>
        </JimboStack>
    );

    return (
        <div style={{ display: "flex", gap: 16, padding: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 320 }}>
                <JamlIde
                    jaml={jamlText}
                    onChange={setJamlText}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    searchResults={ideResults}
                    title="JAML Seed Search"
                    subtitle={statusLabel[status]}
                />
            </div>
            <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                <JimboButton
                    fullWidth
                    tone={isSearching ? "red" : "blue"}
                    onClick={handleSearch}
                >
                    {isSearching ? "Cancel" : "Start Search"}
                </JimboButton>
                {sidebar}
            </div>
        </div>
    );
}
