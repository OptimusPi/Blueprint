import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Badge,
    Button,
    Group,
    NumberInput,
    Paper,
    Progress,
    SegmentedControl,
    Stack,
    Text,
} from "@mantine/core";
import { JamlIde, parseJaml } from "jaml-ui";
import motely, { Search } from "motely-wasm";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import type { JamlIdeSearchResult } from "jaml-ui";
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

let bootPromise: Promise<unknown> | null = null;
function ensureBooted() {
    if (motely.getStatus() === motely.BootStatus.Booted) return Promise.resolve();
    if (!bootPromise) bootPromise = motely.boot();
    return bootPromise;
}

type Status = "idle" | "booting" | "running" | "done" | "error";
type ScopeMode = "sequential" | "random";

const MAX_RESULTS = 200;

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

function formatNumber(value: number): string {
    return value.toLocaleString();
}

export default function JamlView() {
    const { jamlText, setJamlText } = useJamlSearch();

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<Array<MotelySeedScore>>([]);
    const [stats, setStats] = useState<SearchStats>(EMPTY_STATS);

    const [scope, setScope] = useState<ScopeMode>("random");
    const [randomCount, setRandomCount] = useState<number>(50_000);
    const [stopAfter, setStopAfter] = useState<number>(25);

    const [engineError, setEngineError] = useState<string | null>(null);
    const tokenRef = useRef<SearchCancellationToken | null>(null);

    // Boot the engine once when the view mounts so init errors surface immediately.
    useEffect(() => {
        ensureBooted().catch((e) =>
            setEngineError(e instanceof Error ? e.message : String(e)),
        );
    }, []);

    const tallyLabels = useMemo(() => {
        try {
            return parseJaml(jamlText).should.map((clause) => clause.label);
        } catch {
            return [];
        }
    }, [jamlText]);

    useEffect(() => {
        return () => tokenRef.current?.cancel();
    }, []);

    const isSearching = status === "running" || status === "booting";

    const runSearch = useCallback(async () => {
        setError(null);
        setResults([]);
        setStats(EMPTY_STATS);
        setStatus("booting");

        const token = new SearchCancellationToken();
        tokenRef.current = token;

        const collected: Array<MotelySeedScore> = [];
        const onScored = (score: MotelySeedScore) => {
            collected.push(score);
            collected.sort((a, b) => b.score - a.score);
            if (collected.length > MAX_RESULTS) collected.length = MAX_RESULTS;
            setResults([...collected]);
        };
        const onProgress = (p: MotelyProgress) => {
            setStats({
                seedsSearched: Number(p.seedsSearched),
                matchingSeeds: Number(p.matchingSeeds),
                seedsPerSecond: Math.round(p.seedsPerMillisecond * 1000),
                percentComplete: p.percentComplete,
            });
        };

        Search.onScored.subscribe(onScored);
        Search.onProgress.subscribe(onProgress);

        try {
            await ensureBooted();
            setStatus("running");

            const sampleCount = Math.max(1, Math.trunc(randomCount));
            const matchLimit = Math.max(0, Math.trunc(stopAfter));
            let settings = Search.settings(jamlText).withProgressReportIntervalMs(250n);
            settings =
                scope === "random"
                    ? settings.withRandomSearch(sampleCount)
                    : settings.withSequentialSearch();
            if (matchLimit > 0) settings = settings.stopAfter(BigInt(matchLimit));

            await settings.start(token);
            setStatus(token.isCancellationRequested ? "idle" : "done");
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStatus("error");
        } finally {
            Search.onScored.unsubscribe(onScored);
            Search.onProgress.unsubscribe(onProgress);
            tokenRef.current = null;
        }
    }, [jamlText, scope, randomCount, stopAfter]);

    const handleSearch = useCallback(() => {
        if (isSearching) {
            tokenRef.current?.cancel();
        } else {
            void runSearch();
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

    const sidebar = (
        <Stack gap="sm">
            <Paper withBorder p="sm">
                <Stack gap={4}>
                    <Group justify="space-between">
                        <Text fw={600}>{statusLabel[status]}</Text>
                        <Badge color={status === "error" ? "red" : status === "done" ? "green" : "blue"}>
                            {formatNumber(stats.matchingSeeds || results.length)} hits
                        </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                        {formatNumber(stats.seedsSearched)} searched · {formatNumber(stats.seedsPerSecond)}/s
                    </Text>
                    {scope === "random" && (
                        <Progress value={stats.percentComplete} animated={isSearching} />
                    )}
                    {(engineError || error) && (
                        <Text size="sm" c="red">
                            {engineError ? `Engine failed to boot: ${engineError}` : error}
                        </Text>
                    )}
                </Stack>
            </Paper>

            <Paper withBorder p="sm">
                <Stack gap="xs">
                    <Text size="sm" fw={600}>
                        Search scope
                    </Text>
                    <SegmentedControl
                        fullWidth
                        value={scope}
                        onChange={(v) => setScope(v as ScopeMode)}
                        disabled={isSearching}
                        data={[
                            { label: "Random", value: "random" },
                            { label: "Sequential", value: "sequential" },
                        ]}
                    />
                    {scope === "random" && (
                        <NumberInput
                            label="Seeds to sample"
                            value={randomCount}
                            onChange={(v) => setRandomCount(Math.trunc(Number(v) || 0))}
                            min={1}
                            step={10_000}
                            allowDecimal={false}
                            thousandSeparator
                            disabled={isSearching}
                        />
                    )}
                    <NumberInput
                        label="Stop after N matches (0 = unlimited)"
                        value={stopAfter}
                        onChange={(v) => setStopAfter(Math.trunc(Number(v) || 0))}
                        min={0}
                        allowDecimal={false}
                        disabled={isSearching}
                    />
                    <Text size="xs" c="dimmed">
                        Deck &amp; stake come from the JAML. Sequential walks the whole seed space; cancel any time.
                    </Text>
                </Stack>
            </Paper>
        </Stack>
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
            <div style={{ width: 260, flexShrink: 0 }}>
                <Button
                    fullWidth
                    mb="sm"
                    color={isSearching ? "red" : "blue"}
                    onClick={handleSearch}
                >
                    {isSearching ? "Cancel" : "Start Search"}
                </Button>
                {sidebar}
            </div>
        </div>
    );
}
