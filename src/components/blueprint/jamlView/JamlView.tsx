import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Collapse,
    Group,
    Modal,
    Paper,
    Stack,
    Text,
    Textarea,
    TextInput,
    useMantineTheme
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconCode, IconSearch, IconUpload } from "@tabler/icons-react";
import { prefetchSeedAnalysis, useSeedResultsContainer } from "../../../modules/state/analysisResultProvider.tsx";
import { useSeedOptionsContainer } from "../../../modules/state/optionsProvider.tsx";
import { useCardStore } from "../../../modules/state/store.ts";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import { DragScroll } from "../../DragScroller.tsx";
import { GameCard } from "../../Rendering/cards.tsx";
import { Boss, Tag as RenderTag, Voucher } from "../../Rendering/gameElements.tsx";
import { JamlEditor } from "./JamlEditor.tsx";
import yaml from "js-yaml";
import { getWasmCapabilities, startJamlSearchWasm, cancelSearchWasm } from "../../../lib/motelyWasm.ts";
import type { Ante, Pack } from "../../../modules/GameEngine/CardEngines/Cards.ts";

// JAML filter presets keyed by dropdown value
const JAML_PRESETS: Record<string, string> = {
    default: `# Default.jaml
name: Default JAML file, good for a generic test filter, or for a JAML Map View.
author: pifreak
description: A fast SIMD filter for Balatro Seeds.
deck: Red
stake: White
must:
  # This is literally *always* true in Balatro
  #   - RULE: The FIRST booster pack in a shop is ALWAYS a 2-joker, $4 bufoon pack.
  - joker: Any
    antes: [1]
    packSlots: [0]
should:
  - joker: Blueprint
    antes: [1, 2, 3, 4, 5, 6, 7, 8]
    packSlots: [0, 1, 2, 3, 4, 5]
    shopSlots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
seeds:
  - "PIFREAK"
  - "LOVESYOU"
`,
    speedtest: `# Speedtest.jaml
name: Speedtest
author: pifreak
description: Minimal benchmark filter - any joker in ante 1. Used for measuring raw search throughput.
deck: Red
stake: White
must:
  - joker: Any
    antes: [1]
`,
    __create_new__: `# New Filter
name: My Filter
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

        [1, 2, 3, 4, 5, 6, 7, 8].forEach(a => antesSet.add(a));

    }



    return Array.from(antesSet).sort((a, b) => a - b);

}



// Extract sources to show from JAML

function extractSourcesFromJaml(jamlConfig: any): {

    showShop: boolean;

    shopSlots: Array<number>;

    showPacks: boolean;

    packSlots: Array<number>;

    showVoucher: boolean;

    miscSources: Array<string>;

} {

    const result = {

        showShop: false,

        shopSlots: [] as Array<number>,

        showPacks: false,

        packSlots: [] as Array<number>,

        showVoucher: false,

        miscSources: [] as Array<string>

    };



    let foundAnySource = false;



    const extractFromClauses = (clauses: Array<any>) => {

        if (!clauses) return;

        clauses.forEach(clause => {

            if (!clause) return;

            // Check for voucher clauses

            if (clause.voucher || clause.vouchers) {

                result.showVoucher = true;

                foundAnySource = true;

            }



            // Check for shopSlots at clause level

            if (clause.shopSlots && clause.shopSlots.length > 0) {

                result.showShop = true;

                foundAnySource = true;

                clause.shopSlots.forEach((s: number) => {

                    if (!result.shopSlots.includes(s)) result.shopSlots.push(s);

                });

            }



            // Check for packSlots at clause level

            if (clause.packSlots && clause.packSlots.length > 0) {

                result.showPacks = true;

                foundAnySource = true;

                clause.packSlots.forEach((s: number) => {

                    if (!result.packSlots.includes(s)) result.packSlots.push(s);

                });

            }



            const sources = clause.sources;

            if (sources) {

                if (sources.shopSlots && sources.shopSlots.length > 0) {

                    result.showShop = true;

                    foundAnySource = true;

                    sources.shopSlots.forEach((s: number) => {

                        if (!result.shopSlots.includes(s)) result.shopSlots.push(s);

                    });

                }

                if (sources.packSlots && sources.packSlots.length > 0) {

                    result.showPacks = true;

                    foundAnySource = true;

                    sources.packSlots.forEach((s: number) => {

                        if (!result.packSlots.includes(s)) result.packSlots.push(s);

                    });

                }

                const miscKeys = ['judgement', 'riffRaff', 'rareTag', 'uncommonTag', 'emperor', 'seance', 'sixthSense', 'purpleSealOrEightBall'];

                miscKeys.forEach(key => {

                    if (sources[key] && sources[key].length > 0) {

                        foundAnySource = true;

                        if (!result.miscSources.includes(key)) result.miscSources.push(key);

                    }

                });

            }

            if (clause.and) extractFromClauses(clause.and);

            if (clause.or) extractFromClauses(clause.or);

        });

    };



    extractFromClauses(jamlConfig?.must);

    extractFromClauses(jamlConfig?.should);

    extractFromClauses(jamlConfig?.mustNot);



    // If no sources specified anywhere, default to showing shop and voucher

    if (!foundAnySource) {

        result.showShop = true;

        result.showVoucher = true;

        result.showPacks = true;

    }



    result.shopSlots.sort((a, b) => a - b);

    result.packSlots.sort((a, b) => a - b);



    return result;

}



// Check if a card matches a JAML clause

function cardMatchesClause(card: any, clause: any, anteNum: number, slotIndex: number, slotType: 'shop' | 'pack'): boolean {

    // Check ante constraint

    if (clause.antes && !clause.antes.includes(anteNum)) return false;



    // Check slot constraint

    if (slotType === 'shop' && clause.shopSlots && !clause.shopSlots.includes(slotIndex)) return false;

    if (slotType === 'pack' && clause.packSlots && !clause.packSlots.includes(slotIndex)) return false;



    const cardName = card?.name?.toLowerCase() || '';

    const cardEdition = card?.edition?.toLowerCase() || '';



    // Check card type matches

    if (clause.joker || clause.soulJoker) {

        const targetJoker = (clause.joker || clause.soulJoker)?.toLowerCase();

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



// Custom source type for layout

interface CustomSource {

    sourceName: string;

    sourceType: 'misc' | 'voucher' | 'tag' | 'boss' | 'booster';

    ante: number;

    cards: Array<any>;

}



// Memoized AnteSection component

const AnteSection = React.memo(({

    anteNum,

    anteData,

    sourcesConfig,

    jamlConfig,

    customSources = [],

    cardScale = 0.85

}: {

    anteNum: number;

    anteData: Ante;

    sourcesConfig: ReturnType<typeof extractSourcesFromJaml>;

    jamlConfig: any;

    customSources?: Array<CustomSource>;

    cardScale?: number;

}) => {

    const [collapsed, setCollapsed] = useState(false);

    const theme = useMantineTheme();



    // Get packs from each blind separately (keys are smallBlind, bigBlind, bossBlind)

    // Ante 0: No blinds shown

    // Ante 1: Small Blind column shows (skip tag only, no packs), Big + Boss have packs

    // Ante 2+: All three blinds have packs

    const showSmallBlindColumn = anteNum >= 1; // Always show column for Ante 1+

    const hasSmallBlindPacks = anteNum >= 2;   // But only has packs for Ante 2+

    const hasBigBlind = anteNum >= 1;

    const hasBossBlind = anteNum >= 1;



    const smallBlindPacks = hasSmallBlindPacks ? (anteData.blinds?.smallBlind?.packs || []) : [];

    const bigBlindPacks = hasBigBlind ? (anteData.blinds?.bigBlind?.packs || []) : [];

    const bossBlindPacks = hasBossBlind ? (anteData.blinds?.bossBlind?.packs || []) : [];



    // Show ALL shop cards (full shop), but filter displayed ones

    const allShop = anteData.queue || [];



    // Show more shop cards in the scrollable carousel

    const shopLimit = anteNum === 1 ? 20 : 30;

    const displayShop = allShop.slice(0, shopLimit);



    // Total packs for hasContent check

    const totalPacks = smallBlindPacks.length + bigBlindPacks.length + bossBlindPacks.length;



    // Don't render if nothing to show (but custom sources count!)

    const hasContent = displayShop.length > 0 || totalPacks > 0 || sourcesConfig.showVoucher || sourcesConfig.miscSources.length > 0 || customSources.length > 0;

    if (!hasContent) return null;



    // Panel colors: use jimboPanel if available (Jaml theme), otherwise inherit from Mantine

    const jimbo = theme.colors.jimboPanel;

    const PANEL_BG = jimbo ? jimbo[3] : 'var(--mantine-color-dark-7)';



    return (

        <Paper p={6} radius="sm" style={{ backgroundColor: PANEL_BG, border: 'none' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: '4px', alignItems: 'start' }}>

                {/* LEFT COLUMN: Collapse arrow + Ante label + Voucher (fixed width) */}

                <Stack gap={2} align="center" style={{ width: '50px' }}>

                    <ActionIcon

                        variant="subtle"

                        size="xs"

                        onClick={() => setCollapsed(!collapsed)}

                    >

                        {collapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}

                    </ActionIcon>

                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" lh={1}>Ante</Text>

                    <Text fw={700} size="xl" lh={1}>{anteNum}</Text>

                    {!collapsed && sourcesConfig.showVoucher && anteData.voucher && (

                        <>

                            <Voucher voucherName={anteData.voucher} />

                            <Text size="9px" fw={600} c="dimmed" ta="center" lh={1}>Voucher</Text>

                        </>

                    )}

                </Stack>



                {/* RIGHT COLUMN: Shop + Blinds (collapsible) */}

                <Box style={{ minWidth: 0, overflow: 'hidden' }}>

                <Collapse in={!collapsed}>

                    <Stack gap={4}>

                        {/* Shop row */}

                        {sourcesConfig.showShop && displayShop.length > 0 && (

                            <DragScroll hideScrollbar>

                                <Group wrap="nowrap" gap={3}>

                                    {displayShop.map((card: any, index: number) => {

                                        const isInJamlSlot = sourcesConfig.shopSlots.length === 0 || sourcesConfig.shopSlots.includes(index);

                                        const glow = getCardGlow(card, jamlConfig, anteNum, index, 'shop');

                                        return (

                                            <Box key={index} style={{ flexShrink: 0, opacity: isInJamlSlot ? 1 : 0.5, transition: 'opacity 0.2s' }}>

                                                <GameCard card={card} glow={glow} scale={cardScale} />

                                            </Box>

                                        );

                                    })}

                                </Group>

                            </DragScroll>

                        )}



                        {/* Blind columns */}

                        {sourcesConfig.showPacks && (hasBigBlind || hasBossBlind) && (

                            <Group gap={4} wrap="nowrap" align="stretch" style={{ width: '100%' }}>

                                {/* SMALL BLIND */}

                                {showSmallBlindColumn && (

                                    <Stack gap={2} justify="flex-end" style={{ flex: 1 }}>

                                        {smallBlindPacks.length > 0 && (

                                            <Stack gap={4} mb="auto">

                                                {smallBlindPacks.map((pack: Pack, idx: number) => {

                                                    const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx);

                                                    return (

                                                        <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>

                                                            <Group gap={3} mb={2} wrap="nowrap">

                                                                <Badge size="xs" variant="filled" color="gray">{pack.name}</Badge>

                                                                <Badge size="xs" variant="filled" color={pack.choices > 1 ? "green" : "gray"}>Pick {pack.choices}</Badge>

                                                            </Group>

                                                            <Group wrap="nowrap" gap={2}>

                                                                {pack.cards.map((card, cardIdx) => (

                                                                    <GameCard key={cardIdx} card={card!} glow={getCardGlow(card, jamlConfig, anteNum, 0, 'pack')} scale={cardScale} />

                                                                ))}

                                                            </Group>

                                                        </Box>

                                                    );

                                                })}

                                            </Stack>

                                        )}

                                        <Group gap={4} align="center">

                                            {anteData.tags?.[0] && <RenderTag tagName={anteData.tags[0]} />}

                                            <Text size="xs" fw={600} c="dimmed">Small Blind</Text>

                                        </Group>

                                    </Stack>

                                )}



                                {/* BIG BLIND */}

                                <Stack gap={2} justify="flex-end" style={{ flex: 1 }}>

                                    {bigBlindPacks.length > 0 && (

                                        <Stack gap={4} mb="auto">

                                            {bigBlindPacks.map((pack: Pack, idx: number) => {

                                                const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx + 2);

                                                return (

                                                    <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>

                                                        <Group gap={3} mb={2} wrap="nowrap">

                                                            <Badge size="xs" variant="filled" color="gray">{pack.name}</Badge>

                                                            <Badge size="xs" variant="filled" color={pack.choices > 1 ? "green" : "gray"}>Pick {pack.choices}</Badge>

                                                        </Group>

                                                        <Group wrap="nowrap" gap={2}>

                                                            {pack.cards.map((card, cardIdx) => (

                                                                <GameCard key={cardIdx} card={card!} glow={getCardGlow(card, jamlConfig, anteNum, 1, 'pack')} scale={cardScale} />

                                                            ))}

                                                        </Group>

                                                    </Box>

                                                );

                                            })}

                                        </Stack>

                                    )}

                                    <Group gap={4} align="center">

                                        {anteData.tags?.[1] && <RenderTag tagName={anteData.tags[1]} />}

                                        <Text size="xs" fw={600} c="dimmed">Big Blind</Text>

                                    </Group>

                                </Stack>



                                {/* BOSS BLIND */}

                                {hasBossBlind && (

                                    <Stack gap={2} justify="flex-end" style={{ flex: 1 }}>

                                        {bossBlindPacks.length > 0 && (

                                            <Stack gap={4} mb="auto">

                                                {bossBlindPacks.map((pack: Pack, idx: number) => {

                                                    const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx + 4);

                                                    return (

                                                        <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>

                                                            <Group gap={3} mb={2} wrap="nowrap">

                                                                <Badge size="xs" variant="filled" color="gray">{pack.name}</Badge>

                                                                <Badge size="xs" variant="filled" color={pack.choices > 1 ? "green" : "gray"}>Pick {pack.choices}</Badge>

                                                            </Group>

                                                            <Group wrap="nowrap" gap={2}>

                                                                {pack.cards.map((card, cardIdx) => (

                                                                    <GameCard key={cardIdx} card={card!} glow={getCardGlow(card, jamlConfig, anteNum, 2, 'pack')} scale={cardScale} />

                                                                ))}

                                                            </Group>

                                                        </Box>

                                                    );

                                                })}

                                            </Stack>

                                        )}

                                        <Group gap={4} align="center">

                                            {anteData.boss && <Boss bossName={anteData.boss} />}

                                            <Text size="xs" fw={600} c="dimmed">Boss Blind</Text>

                                        </Group>

                                    </Stack>

                                )}

                            </Group>

                        )}



                        {/* Misc sources from JAML */}

                        {sourcesConfig.miscSources.length > 0 && (

                            <Group gap={4} wrap="nowrap">

                                {sourcesConfig.miscSources.map(source => (

                                    <Badge key={source} size="xs" variant="outline">{source}</Badge>

                                ))}

                            </Group>

                        )}



                        {/* Custom Layout Sources */}

                        {customSources.length > 0 && (

                            <Stack gap={4}>

                                {customSources.map((source, idx) => (

                                    <Box key={`${source.sourceType}-${source.sourceName}-${idx}`}>

                                        <Badge size="xs" variant="filled" color="blue" mb={2}>

                                            {source.sourceName} ({source.sourceType})

                                        </Badge>

                                        {source.cards && source.cards.length > 0 && (

                                            <DragScroll hideScrollbar>

                                                <Group wrap="nowrap" gap={3}>

                                                    {source.cards.map((card: any, cardIdx: number) => (

                                                        <Box key={cardIdx} style={{ flexShrink: 0 }}>

                                                            <GameCard card={card} scale={cardScale} />

                                                        </Box>

                                                    ))}

                                                </Group>

                                            </DragScroll>

                                        )}

                                    </Box>

                                ))}

                            </Stack>

                        )}

                    </Stack>

                </Collapse>

                </Box>

            </div>

        </Paper>

    );

});



AnteSection.displayName = 'AnteSection';



// Ante list view: renders all antes, scrollable. On mobile, supports swipe to jump between antes.

const AntePageView = React.memo(({

    selectedAntesArray,

    pool,

    sourcesConfig,

    jamlConfig,

    customSources,

    touchStartRef,

    goToNextPage,

    goToPrevPage,

}: {

    selectedAntesArray: number[];

    pool: Record<number, Ante>;

    sourcesConfig: ReturnType<typeof extractSourcesFromJaml>;

    jamlConfig: any;

    customSources: Array<CustomSource>;

    touchStartRef: React.MutableRefObject<{ y: number; time: number } | null>;

    goToNextPage: () => void;

    goToPrevPage: () => void;

}) => {

    // Touch swipe handlers (mobile only — desktop just scrolls)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {

        touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };

    }, [touchStartRef]);



    const handleTouchEnd = useCallback((e: React.TouchEvent) => {

        if (!touchStartRef.current) return;

        const deltaY = touchStartRef.current.y - e.changedTouches[0].clientY;

        const deltaTime = Date.now() - touchStartRef.current.time;

        touchStartRef.current = null;



        // Swipe threshold: 50px or fast flick (30px in <300ms)

        if (deltaY > 50 || (deltaY > 30 && deltaTime < 300)) {

            goToNextPage();

        } else if (deltaY < -50 || (deltaY < -30 && deltaTime < 300)) {

            goToPrevPage();

        }

    }, [touchStartRef, goToNextPage, goToPrevPage]);



    return (

        <Box

            data-ante-scroll

            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', contain: 'layout style' }}

            onTouchStart={handleTouchStart}

            onTouchEnd={handleTouchEnd}

        >

            <Stack gap={8}>

                {selectedAntesArray.map((anteNum) => {

                    const anteData = pool[anteNum];

                    if (!anteData) return null;

                    const anteCustomSources = customSources.filter(s => s.ante === anteNum);



                    return (

                        <AnteSection

                            key={anteNum}

                            anteNum={anteNum}

                            anteData={anteData}

                            sourcesConfig={sourcesConfig}

                            jamlConfig={jamlConfig}

                            customSources={anteCustomSources}

                            cardScale={0.85}

                        />

                    );

                })}

            </Stack>

        </Box>

    );

});



AntePageView.displayName = 'AntePageView';



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



    // WASM search tuning controls - now from context
    const defaultThreads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;

    // JAML search state from context
    const {
        searchMode,
        apiEndpoint,
        wasmThreadCount,
        wasmBatchSize,
        quickSeedCount,
        quickSeedInput,
        sequentialStartSeed,
        sequentialEndSeed,
        funnyMode,
        funnyKeywords,
        selectedFilterKey,
        customJamlText,
    } = useJamlSearch();

    const [wasmVersion, setWasmVersion] = useState<string | null>(null);

    const [wasmSimdEnabled, setWasmSimdEnabled] = useState<boolean | null>(null);

    const wasmCoiStatus = typeof window !== 'undefined'
        ? {
            coi: (navigator as any).crossOriginIsolated === true,
            sab: typeof (window as any).SharedArrayBuffer === 'function'
        }
        : { coi: false, sab: false };

    // isThreadable requires SharedArrayBuffer. coi-serviceworker.js can provide SAB
    // without actual COOP/COEP headers, so crossOriginIsolated may be false while SAB works.
    const isThreadable = wasmCoiStatus.sab;

    // JAML Editor state

    const [editorOpened, { toggle: toggleEditor }] = useDisclosure(false);

    const [jamlConfig, setJamlConfig] = useState<any>(null);

    const [jamlValid, setJamlValid] = useState<boolean>(false);

    const [wasmStatus, setWasmStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

    const [wasmError, setWasmError] = useState<string | null>(null);

    const [wasmResults, setWasmResults] = useState<Array<{ seed: string; score: number }>>([]);

    const wasmSearchIdRef = useRef<string | null>(null);

    const wasmSeenRef = useRef<Set<string>>(new Set());

    // Progress: direct DOM updates, zero React re-renders

    const wasmSeedsSearchedRef = useRef(0);

    const wasmResultCountRef = useRef(0);

    const wasmElapsedMsRef = useRef(0);

    const wasmProgressElRef = useRef<HTMLSpanElement>(null);

    const wasmProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Batch onResult into ref, flush periodically

    const wasmResultBatchRef = useRef<Array<{ seed: string; score: number }>>([]);



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



        const processNext = (remainingSeeds: string[]) => {

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



    useEffect(() => {

        let mounted = true;

        getWasmCapabilities()

            .then((caps) => {

                if (!mounted) return;

                setWasmVersion(caps.version);

                setWasmSimdEnabled(caps.simd);

            })

            .catch(() => {

                if (!mounted) return;

                setWasmVersion(null);

                setWasmSimdEnabled(null);

            });

        return () => {

            mounted = false;

        };

    }, []);



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

    const handleJamlChange = useCallback((parsed: any, isValid: boolean) => {

        setJamlConfig(parsed);

        setJamlValid(isValid);

    }, []);



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

            setWasmError('Keyword mode is not wired yet (needs Motely CLI keyword pipeline).');

            setWasmStatus('error');

            return;

        }



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

                    `${searched.toLocaleString()} seeds \u2022 ${hits.toLocaleString()} hits (${hitsPerSec} h/s) \u2022 ${speed.toLocaleString()} s/s \u2022 ${elapsedS.toFixed(1)}s \u2022 ${wasmThreadCount}w`;

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

                // eslint-disable-next-line no-console

                console.log('[MotelySearchPerf]', {

                    workerCount: wasmThreadCount,

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

            if (!isThreadable) {
                setWasmStatus('error');
                setWasmError('WASM search requires SharedArrayBuffer. Ensure COOP/COEP headers or coi-serviceworker.');
                return;
            }

            // Single WASM instance search — .NET threading via WasmEnableThreads
            const finalStatus = await startJamlSearchWasm(jamlText, {
                threadCount: wasmThreadCount > 0 ? wasmThreadCount : defaultThreads,
                batchSize: wasmBatchSize,
                palindrome: (searchMode === 'funny' && funnyMode === 'palindrome') ? true : undefined,
            }, {
                onProgress: (totalSeedsSearched: number, _matchingSeeds: number, elapsedMs: number, resultCount: number) => {
                    wasmSearchIdRef.current = 'active';  // Just mark as running
                    const t0 = performance.now();
                    wasmSeedsSearchedRef.current = totalSeedsSearched;
                    wasmResultCountRef.current = resultCount;
                    wasmElapsedMsRef.current = elapsedMs;

                    const perf = wasmPerfRef.current;
                    perf.onProgressCalls += 1;
                    perf.onProgressMs += performance.now() - t0;
                },
                onResult: (seed: string, score: number) => {
                    const t0 = performance.now();
                    if (wasmSeenRef.current.has(seed)) return;
                    wasmSeenRef.current.add(seed);
                    wasmResultBatchRef.current.push({ seed, score });

                    const perf = wasmPerfRef.current;
                    perf.onResultCalls += 1;
                    perf.onResultMs += performance.now() - t0;
                },
            });

            // Process final results
            if (finalStatus.results && finalStatus.results.length > 0) {
                const newResults = finalStatus.results
                    .filter((r: any) => !wasmSeenRef.current.has(r.seed))
                    .slice(0, 200 - wasmResults.length);
                if (newResults.length > 0) {
                    setWasmResults(prev => [...prev, ...newResults]);
                    newResults.forEach((r: any) => wasmSeenRef.current.add(r.seed));
                }
            }

            // Final perf log
            {
                const perf = wasmPerfRef.current;
                const searched = wasmSeedsSearchedRef.current;
                const elapsedS = wasmElapsedMsRef.current / 1000;
                const speed = elapsedS > 0 ? Math.round(searched / elapsedS) : 0;
                // eslint-disable-next-line no-console
                console.log('[MotelySearchPerf][final]', {
                    workerCount: wasmThreadCount,
                    speedSeedsPerSec: speed,
                    searched,
                    hits: wasmResultCountRef.current,
                    elapsedMs: wasmElapsedMsRef.current,
                    wallElapsedMs: Math.round(performance.now() - perf.searchStartAt),
                    jsOnProgressCalls: perf.onProgressCalls,
                    jsOnResultCalls: perf.onResultCalls,
                    jsOnProgressMs: Math.round(perf.onProgressMs),
                    jsOnResultMs: Math.round(perf.onResultMs),
                    jsFlushCalls: perf.flushCalls,
                    jsFlushMs: Math.round(perf.flushMs),
                });
            }

            // Final flush
            if (wasmProgressTimerRef.current) {
                clearInterval(wasmProgressTimerRef.current);
                wasmProgressTimerRef.current = null;
            }

            const el = wasmProgressElRef.current;
            if (el) {
                const searched = wasmSeedsSearchedRef.current;
                const hits = wasmResultCountRef.current;
                const elapsedS = wasmElapsedMsRef.current / 1000;
                const speed = elapsedS > 0 ? Math.round(searched / elapsedS) : 0;
                const hitsPerSec = elapsedS > 0 ? (hits / elapsedS).toFixed(2) : '0';
                el.textContent =
                    `${searched.toLocaleString()} seeds \u2022 ${hits.toLocaleString()} hits (${hitsPerSec} h/s) \u2022 ${speed.toLocaleString()} s/s \u2022 ${elapsedS.toFixed(1)}s \u2022 ${wasmThreadCount}w`;
            }

            // Flush remaining results
            if (wasmResultBatchRef.current.length > 0) {
                const batch = wasmResultBatchRef.current;
                wasmResultBatchRef.current = [];
                setWasmResults(prev => [...batch, ...prev].slice(0, 200));
            }

            wasmSearchIdRef.current = null;
            setWasmStatus('done');

        } catch (err: any) {

            if (wasmProgressTimerRef.current) { clearInterval(wasmProgressTimerRef.current); wasmProgressTimerRef.current = null; }

            wasmSearchIdRef.current = null;

            setWasmStatus('error');

            setWasmError(err?.message || String(err));

        }

    }, [jamlValid, jamlConfig, searchMode, funnyMode, funnyKeywords, wasmThreadCount, wasmBatchSize, defaultThreads]);



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
        if (wasmSearchIdRef.current) {
            cancelSearchWasm().catch(() => {});
            wasmSearchIdRef.current = null;
        }

        setWasmStatus('idle');

    }, []);



    // Extract antes from JAML config

    const jamlAntes = useMemo(() => {

        if (!jamlValid || !jamlConfig) {

            return [1, 2, 3, 4, 5, 6, 7, 8];

        }

        return extractAntesFromJaml(jamlConfig);

    }, [jamlConfig, jamlValid]);



    // Extract sources from JAML config

    const sourcesConfig = useMemo(() => {

        if (!jamlValid || !jamlConfig) {

            return {

                showShop: true,

                shopSlots: [],

                showPacks: true,

                packSlots: [],

                showVoucher: true,

                miscSources: []

            };

        }

        return extractSourcesFromJaml(jamlConfig);

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



    // Custom layout sources - tracks added sources from misc sources display

    const [customSources, setCustomSources] = useState<Array<CustomSource>>([]);



    // Listen for custom source add/remove events from misc sources display

    useEffect(() => {

        const handleAddCustomSource = (event: Event) => {

            const detail = (event as CustomEvent).detail;

            const { sourceName, cards, sourceType, ante, action } = detail;



            setCustomSources(prev => {

                if (action === 'remove') {

                    // Remove source

                    return prev.filter(s => !(s.sourceName === sourceName && s.sourceType === sourceType && s.ante === ante));

                } else {

                    // Add source (avoid duplicates)

                    const exists = prev.some(s => s.sourceName === sourceName && s.sourceType === sourceType && s.ante === ante);

                    if (exists) return prev;

                    return [...prev, { sourceName, sourceType, ante, cards }];

                }

            });

        };



        window.addEventListener('addCustomSource', handleAddCustomSource);

        return () => window.removeEventListener('addCustomSource', handleAddCustomSource);

    }, []);



    // Notify aside about added source names so buttons reflect current state

    // Use key without ante to match MiscCardSourcesDisplay's key format

    useEffect(() => {

        const addedNames = new Set(

            customSources.map(s => `${s.sourceType}-${s.sourceName}`)

        );

        window.dispatchEvent(new CustomEvent('customSourcesUpdated', {

            detail: { addedSourceNames: addedNames }

        }));

    }, [customSources]);



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



    // Touch swipe state (mobile ante navigation)

    const touchStartRef = useRef<{ y: number; time: number } | null>(null);



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



    if (!SeedResults) return null;



    const pool = SeedResults.antes;

    const availableAntes = Object.keys(pool).map(Number).sort((a, b) => a - b);



    const displayAntes = jamlAntes.filter(ante => availableAntes.includes(ante));

    const selectedAntesArray = Array.from(selectedAntes).filter(ante => availableAntes.includes(ante)).sort((a, b) => a - b);



    return (

        <Stack h="100%" gap={0} w="100%" style={{ overflow: 'hidden' }}>



            {/* Header bar: Hide/Import + Seed nav + Ante buttons */}

            <Group justify="space-between" gap="xs" align="center" p={4} mb={2}>

                {/* Left: Actions */}

                <Group gap={4}>

                    <Button

                        variant="subtle"

                        size="compact-xs"

                        leftSection={<IconCode size={14} />}

                        onClick={toggleEditor}

                    >

                        {editorOpened ? 'Hide' : 'Edit'}

                    </Button>

                    <Button

                        variant="subtle"

                        size="compact-xs"

                        leftSection={<IconUpload size={14} />}

                        onClick={openBulkSeeds}

                    >

                        Import

                    </Button>

                    {/* WASM Motely search */}

                    <Button

                        size="compact-xs"

                        variant={wasmStatus === 'running' ? 'filled' : 'light'}

                        color={wasmStatus === 'running' ? 'red' : 'green'}

                        onClick={wasmStatus === 'running' ? handleWasmStop : handleWasmSearch}

                        disabled={!jamlValid}

                        leftSection={<IconSearch size={12} />}

                    >

                        {wasmStatus === 'running' ? 'Stop' : 'Motely Search'}

                    </Button>

                    <Text size="xs" c={wasmVersion ? 'dimmed' : 'gray'}>

                        {wasmVersion ? `WASM v${wasmVersion}` : 'WASM v?'}

                    </Text>

                    <Text size="xs" c={wasmSimdEnabled === null ? 'gray' : (wasmSimdEnabled ? 'green' : 'red')}>

                        SIMD:{wasmSimdEnabled ? 'on' : 'off'}

                    </Text>

                    <Text size="xs" c={wasmCoiStatus.sab ? 'green' : 'red'}>

                        COI:{wasmCoiStatus.coi ? 'on' : 'off'} SAB:{wasmCoiStatus.sab ? 'on' : 'off'}

                    </Text>

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

            <Collapse in={editorOpened}>

                <Box mb={4}>

                    <JamlEditor
                        key={selectedFilterKey}
                        initialJaml={selectedFilterKey === '__custom__' ? customJamlText : JAML_PRESETS[selectedFilterKey]}
                        onJamlChange={handleJamlChange}
                    />

                </Box>

            </Collapse>



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

                            navigator.clipboard.writeText(text).catch(() => {});

                        }}

                    >

                        Copy

                    </Button>

                    <Text size="xs" c="dimmed">{wasmResults.length}/200</Text>

                </Group>

            )}



            {/* Paginated ante view with swipe */}

            {selectedAntesArray.length === 0 ? (

                <Box p="md" ta="center">

                    <Text c="dimmed" size="sm">No antes selected. Configure your JAML filter.</Text>

                </Box>

            ) : (

                <AntePageView

                    selectedAntesArray={selectedAntesArray}

                    pool={pool}

                    sourcesConfig={sourcesConfig}

                    jamlConfig={jamlConfig}

                    customSources={customSources}

                    touchStartRef={touchStartRef}

                    goToNextPage={goToNextPage}

                    goToPrevPage={goToPrevPage}

                />

            )}



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

