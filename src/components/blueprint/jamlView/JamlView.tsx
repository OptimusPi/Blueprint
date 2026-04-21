import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActionIcon,
    Button,
    Group,
    Modal,
    Paper,
    Stack,
    Text,
    TextInput,
    Textarea,
    useMantineTheme
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconUpload } from "@tabler/icons-react";
import { useSeedResultsContainer } from "../../../modules/state/analysisResultProvider.tsx";
import { useSeedOptionsContainer } from "../../../modules/state/optionsProvider.tsx";
import { useCardStore } from "../../../modules/state/store.ts";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import yaml from "js-yaml";
import motely, { MotelyWasm, MotelyWasmEvents } from "motely-wasm";
import { prefetchSeedAnalysis } from "../../../modules/state/analysisResultProvider.tsx";
import { AnalyzerExplorer, JamlIde } from "jaml-ui";
import type { AnalyzerAnteView, AnalyzerItem } from "jaml-ui";
import type { Motely } from "motely-wasm";

// JAML filter presets keyed by dropdown value
const JAML_PRESETS: Record<string, string> = {
    default: `name: Blueprint Copy Engine
author: jammy
description: Blueprint rare joker with Brainstorm for joker copying synergy
deck: Red
stake: White
must:
  - rareJoker: Blueprint
    antes: [1, 2, 3, 4]
should:
  - rareJoker: Brainstorm
    score: 80
  - rareJoker: Baron
    score: 55
  - legendaryJoker: Triboulet
    score: 55
  - uncommonJoker: OopsAll6s
    score: 50
  - legendaryJoker: Perkeo
    score: 50
  - uncommonJoker: Showman
    score: 35
  - spectral: Hex
    score: 35
  - mixedJoker: Any
    edition: Negative
    score: 40
  - tag: NegativeTag
    score: 35
`,
    crush: `name: Claude's Crush
author: claude
description: Hologram + Polychrome early -- the dream infinite scaling duo.
deck: Blue
stake: White
must:
  - joker: Blueprint
    antes: [1, 2]
  - joker: Hologram
    antes: [1, 2, 3]
should:
  - tag: RareTag
    antes: [1]
    score: 60
  - tag: NegativeTag
    antes: [1, 2]
    score: 80
  - rareJoker: Brainstorm
    score: 55
  - tag: PolychromeTag
    antes: [1, 2]
    score: 65
  - rareJoker: Baron
    score: 45
  - soulJoker: Perkeo
    score: 45
  - mixedJoker: Any
    edition: Negative
    score: 40
mustNot:
  - boss: TheNeedle
    antes: [1]
`,
    flush: `name: Claude's Cozy Flush
author: claude
description: Erratic deck flush paradise -- Smeared Joker makes every hand a flush.
deck: Erratic
stake: White
must:
  - uncommonJoker: SmearedJoker
    antes: [1, 2]
  - commonJoker: Splash
    antes: [1, 2, 3]
should:
  - commonJoker: Supernova
    antes: [1, 2]
    score: 60
  - uncommonJoker: FourFingers
    score: 65
  - rareJoker: TheTribe
    score: 50
  - uncommonJoker: Constellation
    antes: [1, 2, 3]
    score: 50
  - tag: PolychromeTag
    antes: [1, 2]
    score: 70
  - rareJoker: Blueprint
    score: 40
  - tag: NegativeTag
    score: 40
  - mixedJoker: Any
    edition: Negative
    score: 35
`,
    canio: `name: Canio Face Destruction
author: jammy
description: Canio legendary joker with Hanged Man for face card destruction scaling
deck: Red
stake: White
must:
  - soulJoker: Canio
    antes: [1, 2, 3, 4]
should:
  - spectral: TheSoul
    score: 55
  - tarot: TheHangedMan
    score: 70
  - uncommonJoker: GlassJoker
    score: 55
  - uncommonJoker: Pareidolia
    score: 50
  - spectral: Ankh
    score: 45
  - rareJoker: Blueprint
    score: 35
  - mixedJoker: Any
    edition: Negative
    score: 35
`,
    speedtest: `name: Speedtest
author: pifreak
description: Minimal benchmark -- any joker in ante 1. Measures raw search throughput.
deck: Red
stake: White
must:
  - joker: Any
    antes: [1]
`,
    __create_new__: `name: My Filter
deck: Red
stake: White
must:

should:
`,
};

// Extract all antes referenced in JAML clauses

function extractAntesFromJaml(jamlConfig: any): Array<number> {

    const antesSet = new Set<number>();



    const extractFromClauses = (clauses: Array<any>) => {

        if (!clauses) return;

        clauses.forEach(clause => {

            if (!clause) return;

            if (clause.antes && Array.isArray(clause.antes)) {

                clause.antes.forEach((a: number) => antesSet.add(a));

            }

            if (clause.and) extractFromClauses(clause.and);

            if (clause.or) extractFromClauses(clause.or);

        });

    };



    extractFromClauses(jamlConfig?.must);

    extractFromClauses(jamlConfig?.should);

    extractFromClauses(jamlConfig?.mustNot);



    if (antesSet.size === 0 && jamlConfig?.defaults?.antes) {

        jamlConfig.defaults.antes.forEach((a: number) => antesSet.add(a));

    }



    if (antesSet.size === 0) {

        [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(a => antesSet.add(a));

    }



    return Array.from(antesSet).sort((a, b) => a - b);

}



// Extract sources to show from JAML


// Check if a card matches a JAML clause

function cardMatchesClause(card: any, clause: any, anteNum: number, slotIndex: number, slotType: 'shop' | 'pack'): boolean {

    // Check ante constraint

    if (clause.antes && !clause.antes.includes(anteNum)) return false;



    // Check slot constraint

    if (slotType === 'shop' && clause.shopItems && !clause.shopItems.includes(slotIndex)) return false;

    if (slotType === 'pack' && clause.boosterPacks && !clause.boosterPacks.includes(slotIndex)) return false;



    const cardName = card?.name?.toLowerCase() || '';

    const cardEdition = card?.edition?.toLowerCase() || '';



    // Check card type matches

    if (clause.joker || clause.legendaryJoker) {

        const targetJoker = (clause.joker || clause.legendaryJoker)?.toLowerCase();

        if (targetJoker === 'any') {

            // Any joker matches

            if (!card?.name) return false;

        } else if (targetJoker && cardName !== targetJoker) {

            return false;

        }

    }



    if (clause.tarotCard) {

        const targetTarot = clause.tarotCard.toLowerCase();

        if (targetTarot === 'any') {

            if (!cardName.includes('tarot') && !['fool', 'magician', 'high priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'justice', 'hermit', 'wheel of fortune', 'strength', 'hanged man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world'].some(t => cardName.includes(t))) return false;

        } else if (cardName !== targetTarot) {

            return false;

        }

    }



    if (clause.spectralCard) {

        const targetSpectral = clause.spectralCard.toLowerCase();

        if (targetSpectral !== 'any' && cardName !== targetSpectral) return false;

    }



    if (clause.voucher) {

        const targetVoucher = clause.voucher.toLowerCase();

        if (targetVoucher !== 'any' && cardName !== targetVoucher) return false;

    }



    // Check edition constraint

    if (clause.edition) {

        const targetEdition = clause.edition.toLowerCase();

        if (targetEdition !== 'any' && cardEdition !== targetEdition) return false;

    }



    return true;

}



// Get glow color for a card based on JAML clauses

function getCardGlow(card: any, jamlConfig: any, anteNum: number, slotIndex: number, slotType: 'shop' | 'pack'): 'red' | 'blue' | null {

    if (!jamlConfig) return null;



    // Check must clauses first (red glow takes priority)

    if (jamlConfig.must) {

        for (const clause of jamlConfig.must) {

            if (clause && cardMatchesClause(card, clause, anteNum, slotIndex, slotType)) {

                return 'red';

            }

        }

    }



    // Check should clauses (blue glow)

    if (jamlConfig.should) {

        for (const clause of jamlConfig.should) {

            if (clause && cardMatchesClause(card, clause, anteNum, slotIndex, slotType)) {

                return 'blue';

            }

        }

    }



    return null;

}



function JamlView() {

    const theme = useMantineTheme();

    const SeedResults = useSeedResultsContainer();

    const analyzeState = useCardStore(state => state.engineState);

    const options = useSeedOptionsContainer();

    const currentSeed = analyzeState.seed;



    const setSeed = useCardStore(state => state.setSeed);

    const setStart = useCardStore(state => state.setStart);

    const setSelectedAnte = useCardStore(state => state.setSelectedAnte);



    // Multi-seed support - initialize with current seed if available

    const [seeds, setSeeds] = useState<Array<string>>(() => currentSeed ? [currentSeed] : []);

    const [currentSeedIndex, setCurrentSeedIndex] = useState(0);



    // Sync currentSeedIndex with actual seed from store

    useEffect(() => {

        if (seeds.length > 0 && currentSeed) {

            const idx = seeds.indexOf(currentSeed);

            if (idx !== -1) {

                setCurrentSeedIndex(idx);

            }

        }

    }, [currentSeed, seeds]);

    const [bulkSeedsOpened, { open: openBulkSeeds, close: closeBulkSeeds }] = useDisclosure(false);

    const [bulkSeedsText, setBulkSeedsText] = useState('');



    // JAML search state from context
    const {
        searchMode,
        funnyMode,
        funnyKeywords,
        selectedFilterKey,
        customJamlText,
    } = useJamlSearch();

    // JAML Editor state

    const [jamlConfig, setJamlConfig] = useState<any>(null);

    const [jamlValid, setJamlValid] = useState<boolean>(false);

    const [wasmStatus, setWasmStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

    const [wasmError, setWasmError] = useState<string | null>(null);

    const [wasmResults, setWasmResults] = useState<Array<{ seed: string; score: number; tallyColumns?: number[]; tallyLabels?: string[] }>>([]);

    const searchRef = useRef<Motely.IMotelyWasmSearch | null>(null);

    const wasmSeenRef = useRef<Set<string>>(new Set());

    // Progress: direct DOM updates, zero React re-renders

    const wasmSeedsSearchedRef = useRef(0);

    const wasmResultCountRef = useRef(0);

    const wasmElapsedMsRef = useRef(0);

    const wasmProgressElRef = useRef<HTMLSpanElement>(null);

    const wasmProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Batch onResult into ref, flush periodically

    const wasmResultBatchRef = useRef<Array<{ seed: string; score: number; tallyColumns?: number[]; tallyLabels?: string[] }>>([]);



    // Perf instrumentation (JS-side overhead)

    const wasmPerfRef = useRef({

        searchStartAt: 0,

        lastLogAt: 0,

        onProgressCalls: 0,

        onResultCalls: 0,

        onProgressMs: 0,

        onResultMs: 0,

        flushCalls: 0,

        flushMs: 0,

    });



    // Prefetch next seeds for smooth scrolling (Time-Sliced)

    useEffect(() => {

        if (!seeds.length) return;

        const index = seeds.indexOf(currentSeed);

        if (index === -1) return;



        // Prefetch next 5 seeds (increased from 3)

        const toPrefetch = seeds.slice(index + 1, index + 6);

        let cancelled = false;



        const processNext = (remainingSeeds: Array<string>) => {

            if (cancelled || remainingSeeds.length === 0) return;



            const [nextSeed, ...rest] = remainingSeeds;



            // Process ONE seed synchronously

            prefetchSeedAnalysis(nextSeed, analyzeState, options);



            // Schedule next seed for next idle period

            if ('requestIdleCallback' in window) {

                (window as any).requestIdleCallback(() => processNext(rest), { timeout: 1000 });

            } else {

                setTimeout(() => processNext(rest), 50);

            }

        };



        // Start the chain

        if ('requestIdleCallback' in window) {

            (window as any).requestIdleCallback(() => processNext(toPrefetch), { timeout: 1000 });

        } else {

            setTimeout(() => processNext(toPrefetch), 50);

        }



        return () => {

            cancelled = true;

        };

    }, [currentSeed, seeds, analyzeState, options]);






    // Handle bulk seeds import (supports plain list, CSV, quoted values)

    const handleBulkSeedsImport = useCallback(() => {

        const parsed = bulkSeedsText

            .split(/\r?\n/)

            .map(line => {

                // Take first value before comma (handles CSV rows)

                const firstCol = line.split(',')[0].trim();

                // Strip surrounding quotes

                const stripped = firstCol.replace(/^["']|["']$/g, '');

                return stripped;

            })

            .filter(s => s.length > 0 && /^[A-Z0-9]+$/i.test(s))

            .map(s => s.toUpperCase());



        if (parsed.length > 0) {

            setSeeds(parsed);

            setCurrentSeedIndex(0);

            // Trigger analysis for the first seed

            setSeed(parsed[0]);

            setStart(true);

            closeBulkSeeds();

            setBulkSeedsText('');

        }

    }, [bulkSeedsText, closeBulkSeeds, setSeed, setStart]);



    // Handle JAML changes from editor

    const handleJamlChange = useCallback((jamlText: string) => {
        try {
            const parsed = yaml.load(jamlText);
            setJamlConfig(parsed);
            setJamlValid(true);
        } catch {
            setJamlValid(false);
        }
    }, []);

    // Validate initial JAML on mount so search button is enabled
    useEffect(() => {
        const initialJaml = selectedFilterKey === '__custom__' ? customJamlText : JAML_PRESETS[selectedFilterKey];
        if (initialJaml) handleJamlChange(initialJaml);
    }, [selectedFilterKey, customJamlText, handleJamlChange]);



    const handleWasmSearch = useCallback(async () => {

        if (!jamlValid || !jamlConfig) {

            setWasmError('Invalid JAML');

            setWasmStatus('error');

            return;

        }



        if (searchMode === 'funny' && funnyMode === 'keyword') {

            const cleaned = funnyKeywords.map(k => k.trim().toUpperCase()).filter(Boolean);

            const invalid = cleaned.some(k => k.length < 4 || k.length > 8);

            if (cleaned.length === 0 || invalid) {

                setWasmError('Keywords must be 4-8 chars each.');

                setWasmStatus('error');

                return;

            }

        }



        if (motely.getStatus() !== motely.BootStatus.Booted) await motely.boot();

        setWasmStatus('running');

        setWasmError(null);

        wasmSeedsSearchedRef.current = 0;

        wasmResultCountRef.current = 0;

        setWasmResults([]);

        wasmSeenRef.current = new Set();

        wasmResultBatchRef.current = [];

        wasmElapsedMsRef.current = 0;

        if (wasmProgressElRef.current) wasmProgressElRef.current.textContent = '';



        wasmPerfRef.current = {

            searchStartAt: performance.now(),

            lastLogAt: performance.now(),

            onProgressCalls: 0,

            onResultCalls: 0,

            onProgressMs: 0,

            onResultMs: 0,

            flushCalls: 0,

            flushMs: 0,

        };



        // Direct DOM updates only — zero React re-renders during search

        if (wasmProgressTimerRef.current) clearInterval(wasmProgressTimerRef.current);

        wasmProgressTimerRef.current = setInterval(() => {

            const perf = wasmPerfRef.current;

            if (wasmProgressElRef.current) {

                const searched = wasmSeedsSearchedRef.current;

                const hits = wasmResultCountRef.current;

                const elapsedS = wasmElapsedMsRef.current / 1000;

                const speed = elapsedS > 0 ? Math.round(searched / elapsedS) : 0;

                const hitsPerSec = elapsedS > 0 ? (hits / elapsedS).toFixed(2) : '0';



                wasmProgressElRef.current.textContent =

                    `${searched.toLocaleString()} seeds \u2022 ${hits.toLocaleString()} hits (${hitsPerSec} h/s) \u2022 ${speed.toLocaleString()} s/s \u2022 ${elapsedS.toFixed(1)}s \u2022 1t`;

            }

            // Flush batched results

            if (wasmResultBatchRef.current.length > 0) {

                const flushStart = performance.now();

                const batch = wasmResultBatchRef.current;

                wasmResultBatchRef.current = [];

                setWasmResults(prev => {

                    if (prev.length >= 200) return prev;

                    return [...batch, ...prev].slice(0, 200);

                });



                perf.flushCalls += 1;

                perf.flushMs += performance.now() - flushStart;

            }



            // Periodic perf log (once per ~2s)

            const now = performance.now();

            if (now - perf.lastLogAt >= 2000) {

                perf.lastLogAt = now;

                const searched = wasmSeedsSearchedRef.current;

                const elapsedS = wasmElapsedMsRef.current / 1000;

                const speed = elapsedS > 0 ? Math.round(searched / elapsedS) : 0;



                console.log('[MotelySearchPerf]', {

                    workerCount: 1,

                    speedSeedsPerSec: speed,

                    searched,

                    hits: wasmResultCountRef.current,

                    elapsedMs: wasmElapsedMsRef.current,

                    jsOnProgressCalls: perf.onProgressCalls,

                    jsOnResultCalls: perf.onResultCalls,

                    jsOnProgressMs: Math.round(perf.onProgressMs),

                    jsOnResultMs: Math.round(perf.onResultMs),

                    jsFlushCalls: perf.flushCalls,

                    jsFlushMs: Math.round(perf.flushMs),

                });

            }

        }, 500);



        const jamlText = yaml.dump(jamlConfig, { indent: 2, lineWidth: -1 });



        try {

            const progressHandler = (seedsSearched: bigint, matchingSeeds: bigint) => {
                                const t0 = performance.now();
                wasmSeedsSearchedRef.current = Number(seedsSearched);
                wasmResultCountRef.current = Number(matchingSeeds);
                wasmElapsedMsRef.current = Math.round(performance.now() - wasmPerfRef.current.searchStartAt);
                const perf = wasmPerfRef.current;
                perf.onProgressCalls += 1;
                perf.onProgressMs += performance.now() - t0;
            };
            const tallyLabels: string[] = MotelyWasm.getTallyLabels(jamlText);

            const resultHandler = (seed: string, score: number, tallyColumns: Int32Array) => {
                const t0 = performance.now();
                if (wasmSeenRef.current.has(seed)) return;
                wasmSeenRef.current.add(seed);
                wasmResultBatchRef.current.push({ seed, score, tallyColumns: Array.from(tallyColumns), tallyLabels });
                const perf = wasmPerfRef.current;
                perf.onResultCalls += 1;
                perf.onResultMs += performance.now() - t0;
            };

            const completion = await new Promise<{ matchingSeeds: bigint }>((resolve, reject) => {
                const completeHandler = (_status: string, _total: bigint, matchingSeeds: bigint) => {
                    MotelyWasmEvents.onProgress.unsubscribe(progressHandler);
                    MotelyWasmEvents.onResult.unsubscribe(resultHandler);
                    MotelyWasmEvents.onComplete.unsubscribe(completeHandler);
                    resolve({ matchingSeeds });
                };

                MotelyWasmEvents.onProgress.subscribe(progressHandler);
                MotelyWasmEvents.onResult.subscribe(resultHandler);
                MotelyWasmEvents.onComplete.subscribe(completeHandler);

                try {
                    let search: Motely.IMotelyWasmSearch;
                    if (searchMode === 'funny' && funnyMode === 'keyword') {
                        const kw = (funnyKeywords || []).map(k => k.trim().toUpperCase()).filter(Boolean).join(',');
                        search = MotelyWasm.startKeywordSearch(jamlText, kw, '');
                    } else {
                        search = MotelyWasm.startRandomSearch(jamlText, 100);
                    }
                    searchRef.current = search;
                } catch (e) {
                    MotelyWasmEvents.onProgress.unsubscribe(progressHandler);
                    MotelyWasmEvents.onResult.unsubscribe(resultHandler);
                    MotelyWasmEvents.onComplete.unsubscribe(completeHandler);
                    reject(e);
                }
            });

            if (wasmProgressTimerRef.current) {
                clearInterval(wasmProgressTimerRef.current);
                wasmProgressTimerRef.current = null;
            }

            const allResults = wasmResultBatchRef.current.slice(0, 200);
            wasmResultBatchRef.current = [];
            setWasmResults(allResults);

            const elapsed = Math.round(performance.now() - wasmPerfRef.current.searchStartAt);
            const totalFound = Number(completion.matchingSeeds);
            console.log(`[MotelySearch] ${totalFound} seeds found in ${elapsed}ms, showing ${allResults.length}`);

            searchRef.current = null;
            setWasmStatus('done');

        } catch (err: any) {

            if (wasmProgressTimerRef.current) { clearInterval(wasmProgressTimerRef.current); wasmProgressTimerRef.current = null; }

            searchRef.current = null;

            setWasmStatus('error');

            setWasmError(err?.message || String(err));

        }

    }, [jamlValid, jamlConfig, searchMode, funnyMode, funnyKeywords]);



    const handleWasmStop = useCallback(() => {
        const timerId = wasmProgressTimerRef.current;
        if (timerId) {
            clearInterval(timerId);
            wasmProgressTimerRef.current = null;
        }

        const el = wasmProgressElRef.current;
        if (el) {
            const searched = wasmSeedsSearchedRef.current;
            const hits = wasmResultCountRef.current;
            const elapsedS = wasmElapsedMsRef.current / 1000;
            const speed = elapsedS > 0 ? Math.round(searched / elapsedS) : 0;

            el.textContent =
                `${searched.toLocaleString()} seeds \u2022 ${hits.toLocaleString()} hits \u2022 ${speed.toLocaleString()} s/s \u2022 ${elapsedS.toFixed(1)}s (stopped)`;
        }

        // Flush remaining results

        if (wasmResultBatchRef.current.length > 0) {

            const batch = wasmResultBatchRef.current;

            wasmResultBatchRef.current = [];

            setWasmResults(prev => [...batch, ...prev].slice(0, 200));

        }

        // Cancel the running WASM search
        searchRef.current?.cancel();
        searchRef.current = null;

        setWasmStatus('idle');

    }, []);



    // Extract antes from JAML config

    const jamlAntes = useMemo(() => {

        if (!jamlValid || !jamlConfig) {

            return [1, 2, 3, 4, 5, 6, 7, 8];

        }

        return extractAntesFromJaml(jamlConfig);

    }, [jamlConfig, jamlValid]);






    // Multi-select antes based on JAML

    const jamlAntesKey = jamlAntes.join(',');

    const [selectedAntes, setSelectedAntes] = useState<Set<number>>(() => new Set(jamlAntes));

    const [prevJamlAntesKey, setPrevJamlAntesKey] = useState(jamlAntesKey);



    // Sync selectedAntes when jamlAntes changes

    if (prevJamlAntesKey !== jamlAntesKey) {

        setPrevJamlAntesKey(jamlAntesKey);

        setSelectedAntes(new Set(jamlAntes));

    }



    // Update store selectedAnte

    useEffect(() => {

        if (selectedAntes.size > 0) {

            const firstSelected = Array.from(selectedAntes).sort((a, b) => a - b)[0];

            setSelectedAnte(firstSelected);

        }

    }, [selectedAntes, setSelectedAnte]);



    const toggleAnte = useCallback((ante: number) => {

        setSelectedAntes(prev => {

            const newSet = new Set(prev);

            if (newSet.has(ante)) {

                newSet.delete(ante);

            } else {

                newSet.add(ante);

            }

            if (newSet.size === 0) {

                return new Set([jamlAntes[0] || 1]);

            }

            return newSet;

        });

    }, [jamlAntes]);






    // Seed navigation - triggers analysis for new seed

    const goToPrevSeed = useCallback(() => {

        setCurrentSeedIndex(prev => {

            const newIndex = Math.max(0, prev - 1);

            if (newIndex !== prev && seeds[newIndex]) {

                setSeed(seeds[newIndex]);

                setStart(true);

            }

            return newIndex;

        });

    }, [seeds, setSeed, setStart]);



    const goToNextSeed = useCallback(() => {

        setCurrentSeedIndex(prev => {

            const newIndex = Math.min(seeds.length - 1, prev + 1);

            if (newIndex !== prev && seeds[newIndex]) {

                setSeed(seeds[newIndex]);

                setStart(true);

            }

            return newIndex;

        });

    }, [seeds, setSeed, setStart]);




    // On mobile swipe, scroll to next/prev ante

    const goToNextPage = useCallback(() => {

        // Scroll down by one viewport height (approximate one ante)

        const container = document.querySelector('[data-ante-scroll]');

        container?.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });

    }, []);



    const goToPrevPage = useCallback(() => {

        const container = document.querySelector('[data-ante-scroll]');

        container?.scrollBy({ top: -(container.clientHeight * 0.8), behavior: 'smooth' });

    }, []);



    // Hotkeys for navigation: Left/Right = seeds, Up/Down = ante pages

    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {

            // Skip if typing in an input

            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;



            // Left/Right: Navigate seeds

            if (e.key === 'ArrowLeft') {

                if (seeds.length > 1) {

                    e.preventDefault();

                    goToPrevSeed();

                }

            } else if (e.key === 'ArrowRight') {

                if (seeds.length > 1) {

                    e.preventDefault();

                    goToNextSeed();

                }

            }

            // Up/Down: Page through antes

            else if (e.key === 'ArrowUp') {

                e.preventDefault();

                goToPrevPage();

            } else if (e.key === 'ArrowDown') {

                e.preventDefault();

                goToNextPage();

            }

        };



        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [goToPrevSeed, goToNextSeed, seeds.length, goToPrevPage, goToNextPage]);



    const pool = SeedResults?.antes;

    const availableAntes = pool ? Object.keys(pool).map(Number).sort((a, b) => a - b) : [];



    const displayAntes = jamlAntes.filter(ante => availableAntes.includes(ante));

    const selectedAntesArray = Array.from(selectedAntes).filter(ante => availableAntes.includes(ante)).sort((a, b) => a - b);

    const analyzerAntes: AnalyzerAnteView[] = pool ? selectedAntesArray.flatMap(anteNum => {
        const anteData = pool[anteNum];
        if (!anteData) return [];
        const shop: AnalyzerItem[] = anteData.queue.slice(0, 30).map((card: any, i: number) => {
            const glow = getCardGlow(card, jamlConfig, anteNum, i, 'shop');
            return {
                id: `${anteNum}-shop-${i}`,
                name: card.name,
                desired: glow === 'red',
                badges: glow === 'blue' ? [{ label: 'should', tone: 'accent' as const }] : undefined,
            };
        });
        const packs: string[] = [];
        for (const blind of ['smallBlind', 'bigBlind', 'bossBlind'] as const) {
            for (const pack of anteData.blinds?.[blind]?.packs ?? []) {
                const label = blind === 'smallBlind' ? 'Small' : blind === 'bigBlind' ? 'Big' : 'Boss';
                packs.push(`${label}: ${pack.name} (Pick ${pack.choices})`);
            }
        }
        const view: AnalyzerAnteView = {
            ante: anteNum,
            boss: anteData.boss ?? undefined,
            voucher: anteData.voucher ?? undefined,
            smallBlindTag: anteData.tags?.[0],
            bigBlindTag: anteData.tags?.[1],
            shop,
            packs,
        };
        return [view];
    }) : [];



    return (

        <Stack h="100%" gap={0} w="100%" style={{ overflow: 'hidden' }}>



            {/* Header bar: Hide/Import + Seed nav + Ante buttons */}

            <Group justify="space-between" gap="xs" align="center" p={4} mb={2}>

                {/* Left: Actions */}

                <Group gap={4}>

                    <Button

                        variant="subtle"

                        size="compact-xs"

                        leftSection={<IconUpload size={14} />}

                        onClick={openBulkSeeds}

                    >

                        Import

                    </Button>

                    <span ref={wasmProgressElRef} style={{ fontSize: '10px', color: 'var(--mantine-color-dimmed)' }} />

                </Group>



                {/* Center: Seed Add + Navigation */}

                <Group gap={4}>

                    <ActionIcon variant="subtle" size="xs" onClick={goToPrevSeed} disabled={currentSeedIndex === 0 || seeds.length <= 1} title="Prev seed (←)">

                        <IconChevronLeft size={14} />

                    </ActionIcon>

                    <TextInput

                        placeholder="Add seed..."

                        size="xs"

                        w={120}

                        styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-xs)', height: '22px', minHeight: '22px' } }}

                        onKeyDown={(e) => {

                            if (e.key === 'Enter') {

                                const val = e.currentTarget.value.trim().toUpperCase();

                                if (val && /^[A-Z0-9]+$/i.test(val)) {

                                    setSeeds(prev => {

                                        if (prev.includes(val)) {

                                            // Jump to existing seed

                                            const idx = prev.indexOf(val);

                                            setCurrentSeedIndex(idx);

                                            setSeed(val);

                                            setStart(true);

                                            return prev;

                                        }

                                        const next = [...prev, val];

                                        setCurrentSeedIndex(next.length - 1);

                                        setSeed(val);

                                        setStart(true);

                                        return next;

                                    });

                                    e.currentTarget.value = '';

                                }

                            }

                        }}

                    />

                    <Text size="xs" fw={600} style={{ minWidth: '55px', textAlign: 'center', fontSize: '10px', fontFamily: 'monospace' }}>

                        {seeds.length > 0 ? (

                            <>{seeds[currentSeedIndex]} <Text span c="dimmed" fz={10}>{currentSeedIndex + 1}/{seeds.length}</Text></>

                        ) : 'No seeds'}

                    </Text>

                    <ActionIcon variant="subtle" size="xs" onClick={goToNextSeed} disabled={currentSeedIndex >= seeds.length - 1 || seeds.length <= 1} title="Next seed (→)">

                        <IconChevronRight size={14} />

                    </ActionIcon>

                </Group>



                {/* Right: Page nav + Ante Selection */}

                <Group gap={2}>

                    <ActionIcon variant="subtle" size="xs" onClick={goToPrevPage} title="Scroll up (↑)">

                        <IconChevronUp size={14} />

                    </ActionIcon>

                    <ActionIcon variant="subtle" size="xs" onClick={goToNextPage} title="Next page (↓)">

                        <IconChevronDown size={14} />

                    </ActionIcon>

                    {displayAntes.map((ante) => (

                        <Button

                            key={ante}

                            size="compact-xs"

                            variant={selectedAntes.has(ante) ? "filled" : "subtle"}

                            color={selectedAntes.has(ante) ? "blue" : "gray"}

                            onClick={() => toggleAnte(ante)}

                            px={6}

                            h={22}

                            fz={10}

                        >

                            {ante}

                        </Button>

                    ))}

                </Group>

            </Group>





            {/* JAML Editor - Collapsible, shares header above */}

            <JamlIde
                key={selectedFilterKey}
                jaml={selectedFilterKey === '__custom__' ? customJamlText : JAML_PRESETS[selectedFilterKey]}
                onChange={handleJamlChange}
                searchResults={wasmResults}
                onSearch={wasmStatus === 'running' ? handleWasmStop : handleWasmSearch}
                isSearching={wasmStatus === 'running'}
            />



            {/* WASM search results - always visible */}

            {wasmError && (

                <Text size="xs" c="red" mb={4} px={4}>{wasmError}</Text>

            )}

            {wasmResults.length > 0 && (

                <Group gap={4} mb={4} px={4} align="center">

                    <Button

                        size="compact-xs"

                        variant="light"

                        color="green"

                        onClick={() => {

                            const newSeeds = wasmResults.map(r => r.seed);

                            setSeeds(prev => {

                                const existing = new Set(prev);

                                const toAdd = newSeeds.filter(s => !existing.has(s));

                                if (toAdd.length === 0) return prev;

                                const next = [...prev, ...toAdd];

                                setCurrentSeedIndex(prev.length); // jump to first new seed

                                setSeed(toAdd[0]);

                                setStart(true);

                                return next;

                            });

                        }}

                    >

                        Add {wasmResults.length} to list

                    </Button>

                    <Button

                        size="compact-xs"

                        variant="subtle"

                        onClick={() => {

                            if (!wasmResults.length || !navigator?.clipboard) return;

                            const text = wasmResults.map(r => r.seed).join('\n');

                            navigator.clipboard.writeText(text).catch(() => { });

                        }}

                    >

                        Copy

                    </Button>

                    <Text size="xs" c="dimmed">{wasmResults.length}/200</Text>

                </Group>

            )}



            {/* Ante view */}

            <div style={{ height: '50dvh', overflow: 'hidden', flexShrink: 0 }}>
                <AnalyzerExplorer
                    antes={analyzerAntes}
                    visibleAntes={selectedAntesArray.length}
                    totalAntes={availableAntes.length}
                />
            </div>



            {/* Bulk Seeds Modal - entire modal is a drop zone */}

            <Modal opened={bulkSeedsOpened} onClose={closeBulkSeeds} title="Import Seeds" size="md">

                <Stack

                    gap="md"

                    onDragOver={(e) => {

                        e.preventDefault();

                        // Highlight the textarea when dragging anywhere in the modal

                        const textarea = e.currentTarget.querySelector('textarea');

                        if (textarea) {

                            textarea.style.backgroundColor = theme.colors.blue[9];

                            textarea.style.borderColor = theme.colors.blue[5];

                        }

                    }}

                    onDragLeave={(e) => {

                        // Only reset if leaving the stack entirely

                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {

                            const textarea = e.currentTarget.querySelector('textarea');

                            if (textarea) {

                                textarea.style.backgroundColor = theme.colors.dark[7];

                                textarea.style.borderColor = '';

                            }

                        }

                    }}

                    onDrop={(e) => {

                        e.preventDefault();

                        const textarea = e.currentTarget.querySelector('textarea');

                        if (textarea) {

                            textarea.style.backgroundColor = theme.colors.dark[7];

                            textarea.style.borderColor = '';

                        }

                        const files = e.dataTransfer.files;

                        if (files[0]) {

                            const reader = new FileReader();

                            reader.onload = (evt) => {

                                const content = evt.target?.result as string;

                                setBulkSeedsText(content);

                            };

                            reader.readAsText(files[0]);

                        }

                    }}

                >

                    <Text size="sm" c="dimmed">

                        Supports: .TXT, .CSV (first 8 chars), or paste directly. One seed per line.

                    </Text>



                    {/* File Upload Button - just a button now, not the main drop zone */}

                    <Paper

                        p="sm"

                        radius="sm"

                        style={{

                            textAlign: 'center',

                            cursor: 'pointer',

                            backgroundColor: theme.colors.dark[6],

                        }}

                        component="label"

                    >

                        <Group justify="center" gap="xs">

                            <IconUpload size={16} color={theme.colors.dark[2]} />

                            <Text fw={500} size="sm">Click to browse files (.txt, .csv)</Text>

                        </Group>

                        <input

                            type="file"

                            accept=".txt,.csv"

                            onChange={(e) => {

                                const file = e.currentTarget.files?.[0];

                                if (file) {

                                    const reader = new FileReader();

                                    reader.onload = (evt) => {

                                        const content = evt.target?.result as string;

                                        setBulkSeedsText(content);

                                    };

                                    reader.readAsText(file);

                                }

                            }}

                            style={{ display: 'none' }}

                        />

                    </Paper>



                    {/* Paste/Drop Area - main drop target, highlights when dragging anywhere */}

                    <Textarea

                        placeholder="Drop file anywhere or paste seeds here...&#10;&#10;KDBX2SMH&#10;3BCUYMCI&#10;11KH17QI&#10;..."

                        value={bulkSeedsText}

                        onChange={(e) => setBulkSeedsText(e.currentTarget.value)}

                        minRows={10}

                        maxRows={15}

                        autosize

                        styles={{

                            input: {

                                fontFamily: 'monospace',

                                backgroundColor: theme.colors.dark[7],

                                color: theme.colors.gray[3],

                                fontSize: '14px',

                                letterSpacing: '0.5px',

                                transition: 'background-color 0.15s, border-color 0.15s',

                            }

                        }}

                    />



                    <Group justify="space-between">

                        <Text size="xs" c="dimmed">

                            {bulkSeedsText.split(/\r?\n/).map((line: string) => {

                                const firstCol = line.split(',')[0].trim().replace(/^["']|["']$/g, '');

                                return firstCol;

                            }).filter((s: string) => s.length > 0 && /^[A-Z0-9]+$/i.test(s)).length} seeds detected

                        </Text>

                        <Group gap="xs">

                            <Button variant="light" onClick={closeBulkSeeds}>Cancel</Button>

                            <Button onClick={handleBulkSeedsImport} leftSection={<IconUpload size={14} />}>

                                Import Seeds

                            </Button>

                        </Group>

                    </Group>

                </Stack>

            </Modal>

        </Stack>

    );

}



export default JamlView;

