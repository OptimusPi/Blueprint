import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
    ActionIcon,
    Autocomplete,
    Badge,
    Box,
    Button,
    Collapse,
    Group,
    Modal,
    Paper,
    Stack,
    Text,
    Textarea
} from "@mantine/core";
import {useDisclosure} from "@mantine/hooks";
import {IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconCode, IconList, IconUpload} from "@tabler/icons-react";
import {SeedsWithLegendary, popularSeeds} from "../../../modules/const.ts";
import {useSeedResultsContainer} from "../../../modules/state/analysisResultProvider.tsx";
import {useCardStore} from "../../../modules/state/store.ts";
import {DragScroll} from "../../DragScroller.tsx";
import {GameCard} from "../../Rendering/cards.tsx";
import {Boss, Tag as RenderTag, Voucher} from "../../Rendering/gameElements.tsx";
import {JamlEditor} from "./JamlEditor.tsx";
import type {Ante, Pack} from "../../../modules/ImmolateWrapper/CardEngines/Cards.ts";

// Extract all antes referenced in JAML clauses
function extractAntesFromJaml(jamlConfig: any): Array<number> {
    const antesSet = new Set<number>();
    
    const extractFromClauses = (clauses: Array<any>) => {
        if (!clauses) return;
        clauses.forEach(clause => {
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
            if (cardMatchesClause(card, clause, anteNum, slotIndex, slotType)) {
                return 'red';
            }
        }
    }
    
    // Check should clauses (blue glow)
    if (jamlConfig.should) {
        for (const clause of jamlConfig.should) {
            if (cardMatchesClause(card, clause, anteNum, slotIndex, slotType)) {
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
    const maxShopSlot = sourcesConfig.shopSlots.length > 0 
        ? Math.max(...sourcesConfig.shopSlots) 
        : 3; // Default to slots 0-3 (first 4)
    
    // Ante 1 shows 10 shop cards, others show 15
    const shopLimit = anteNum === 1 ? 10 : 15;
    const displayShop = allShop.slice(0, shopLimit);
    
    // Total packs for hasContent check
    const totalPacks = smallBlindPacks.length + bigBlindPacks.length + bossBlindPacks.length;
    
    // Don't render if nothing to show (but custom sources count!)
    const hasContent = displayShop.length > 0 || totalPacks > 0 || sourcesConfig.showVoucher || sourcesConfig.miscSources.length > 0 || customSources.length > 0;
    if (!hasContent) return null;
    
    // Balatro grey shades for flat panels (no borders) - only 2 levels needed
    const PANEL_BG = {
        outer: '#1e2b2d',    // darkGrey - outer panel
        inner: '#33464b',    // mediumGrey - nested content (cards sit directly on this)
    };
    
    return (
        <Paper p="sm" radius="sm" style={{ backgroundColor: PANEL_BG.outer, border: 'none' }}>
            {/* Grid layout: Left column (Ante label) | Main content | Collapse button */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'start' }}>
                {/* LEFT COLUMN: Just the Ante label */}
                <Text 
                    fw={700} 
                    size="lg"
                    c="dimmed"
                    style={{ whiteSpace: 'nowrap', minWidth: '30px', textAlign: 'center' }}
                >
                    {anteNum}
                </Text>
                
                {/* MIDDLE COLUMN: Shop + Blind columns + Voucher (all collapsible) */}
                <Collapse in={!collapsed}>
                <Stack gap="xs">
                    {/* TOP: Shop - Show 12 cards, gray out ones not in JAML spec */}
                    {sourcesConfig.showShop && displayShop.length > 0 && (
                        <Box p="xs" style={{ backgroundColor: PANEL_BG.inner, borderRadius: '4px' }}>
                            <Text size="xs" c="dimmed" mb={4}>Shop [0-{maxShopSlot}]</Text>
                            <DragScroll hideScrollbar>
                                <Group wrap="nowrap" gap={4}>
                                    {displayShop.map((card: any, index: number) => {
                                        const isInJamlSlot = sourcesConfig.shopSlots.length === 0 || sourcesConfig.shopSlots.includes(index);
                                        const glow = getCardGlow(card, jamlConfig, anteNum, index, 'shop');
                                        
                                        return (
                                            <Box 
                                                key={index} 
                                                style={{ 
                                                    flexShrink: 0,
                                                    opacity: isInJamlSlot ? 1 : 0.5,
                                                    transition: 'opacity 0.2s'
                                                }}
                                            >
                                                <GameCard card={card} glow={glow} scale={cardScale} />
                                            </Box>
                                        );
                                    })}
                                </Group>
                            </DragScroll>
                        </Box>
                    )}
                    
                    {/* BOTTOM: 3 columns for Small Blind | Big Blind | Boss Blind */}
                    {/* Always show 3 blind columns for consistent layout */}
                    {sourcesConfig.showPacks && (hasBigBlind || hasBossBlind) && (
                        <Group gap="xs" wrap="nowrap" align="stretch" style={{ width: '100%' }}>
                            {/* SMALL BLIND COLUMN - Always show for Ante 1+, even without packs (shows skip tag) */}
                            {showSmallBlindColumn && (
                            <Stack gap={2} justify="flex-end" p="xs" style={{ backgroundColor: PANEL_BG.inner, borderRadius: '4px', flex: 1 }}>
                                {smallBlindPacks.length > 0 && (
                                    <Stack gap="xs" mb="auto">
                                        {smallBlindPacks.map((pack: Pack, idx: number) => {
                                            const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx);
                                            return (
                                                <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                    <Group gap={4} mb={4} wrap="nowrap">
                                                        <Badge size="xs" variant="filled" color="gray">{pack.name}</Badge>
                                                        <Badge size="xs" variant="filled" color="blue">{pack.size}</Badge>
                                                        <Badge size="xs" variant="filled" color={pack.choices > 1 ? "green" : "gray"}>Pick {pack.choices}</Badge>
                                                    </Group>
                                                    <Group wrap="nowrap" gap={2}>
                                                        {pack.cards.map((card, cardIdx) => {
                                                            const glow = getCardGlow(card, jamlConfig, anteNum, 0, 'pack');
                                                            return (
                                                                <Box key={cardIdx}>
                                                                    <GameCard card={card!} glow={glow} scale={cardScale} />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Group>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                )}
                                {/* Tag + Label at bottom-left */}
                                <Group gap={4} align="center">
                                    {anteData.tags?.[0] && <RenderTag tagName={anteData.tags[0]} />}
                                    <Text size="xs" fw={600} c="dimmed">Small Blind</Text>
                                </Group>
                            </Stack>
                            )}
                            
                            {/* BIG BLIND COLUMN */}
                            <Stack gap={2} justify="flex-end" p="xs" style={{ backgroundColor: PANEL_BG.inner, borderRadius: '4px', flex: 1 }}>
                                {bigBlindPacks.length > 0 && (
                                    <Stack gap="xs" mb="auto">
                                        {bigBlindPacks.map((pack: Pack, idx: number) => {
                                            const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx + 2);
                                            return (
                                                <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                    <Group gap={4} mb={4} wrap="nowrap">
                                                        <Badge size="xs" variant="filled" color="gray">{pack.name}</Badge>
                                                        <Badge size="xs" variant="filled" color="blue">{pack.size}</Badge>
                                                        <Badge size="xs" variant="filled" color={pack.choices > 1 ? "green" : "gray"}>Pick {pack.choices}</Badge>
                                                    </Group>
                                                    <Group wrap="nowrap" gap={2}>
                                                        {pack.cards.map((card, cardIdx) => {
                                                            const glow = getCardGlow(card, jamlConfig, anteNum, 1, 'pack');
                                                            return (
                                                                <Box key={cardIdx}>
                                                                    <GameCard card={card!} glow={glow} scale={cardScale} />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Group>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                )}
                                {/* Tag + Label at bottom-left */}
                                <Group gap={4} align="center">
                                    {anteData.tags?.[1] && <RenderTag tagName={anteData.tags[1]} />}
                                    <Text size="xs" fw={600} c="dimmed">Big Blind</Text>
                                </Group>
                            </Stack>
                            
                            {/* BOSS BLIND COLUMN */}
                            {hasBossBlind && (
                                <Stack gap={2} justify="flex-end" p="xs" style={{ backgroundColor: PANEL_BG.inner, borderRadius: '4px', flex: 1 }}>
                                    {bossBlindPacks.length > 0 && (
                                        <Stack gap="xs" mb="auto">
                                            {bossBlindPacks.map((pack: Pack, idx: number) => {
                                                const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx + 4);
                                                return (
                                                    <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                        <Group gap={4} mb={4} wrap="nowrap">
                                                            <Badge size="xs" variant="filled" color="gray">{pack.name}</Badge>
                                                            <Badge size="xs" variant="filled" color="blue">{pack.size}</Badge>
                                                            <Badge size="xs" variant="filled" color={pack.choices > 1 ? "green" : "gray"}>Pick {pack.choices}</Badge>
                                                        </Group>
                                                        <Group wrap="nowrap" gap={2}>
                                                            {pack.cards.map((card, cardIdx) => {
                                                                const glow = getCardGlow(card, jamlConfig, anteNum, 2, 'pack');
                                                                return (
                                                                    <Box key={cardIdx}>
                                                                        <GameCard card={card!} glow={glow} scale={cardScale} />
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Group>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    )}
                                    {/* Boss icon + Label at bottom-left */}
                                    <Group gap={4} align="center">
                                        {anteData.boss && <Boss bossName={anteData.boss} />}
                                        <Text size="xs" fw={600} c="dimmed">Boss Blind</Text>
                                    </Group>
                                </Stack>
                            )}
                        </Group>
                    )}
                    
                    {/* Voucher - now inside collapse with label */}
                    {sourcesConfig.showVoucher && anteData.voucher && (
                        <Box p="xs" style={{ backgroundColor: PANEL_BG.inner, borderRadius: '4px' }}>
                            <Group gap="xs" align="flex-end">
                                <Stack gap={2} align="center">
                                    <Text size="xs" c="dimmed" fw={600}>Voucher</Text>
                                    <Box style={{ height: '96px', width: '71px' }}>
                                        <Voucher voucherName={anteData.voucher} />
                                    </Box>
                                </Stack>
                            </Group>
                        </Box>
                    )}
                    
                    {/* Misc sources from JAML */}
                    {sourcesConfig.miscSources.length > 0 && (
                        <Group gap={4} wrap="nowrap">
                            {sourcesConfig.miscSources.map(source => (
                                <Badge key={source} size="xs" variant="outline">{source}</Badge>
                            ))}
                        </Group>
                    )}
                    
                    {/* Custom Layout Sources - added via + button from misc sources display */}
                    {customSources.length > 0 && (
                        <Box p="xs" style={{ backgroundColor: PANEL_BG.inner, borderRadius: '4px' }}>
                            <Text size="xs" c="dimmed" mb={4}>Custom Sources</Text>
                            <Stack gap="xs">
                                {customSources.map((source, idx) => (
                                    <Box key={`${source.sourceType}-${source.sourceName}-${idx}`}>
                                        <Badge size="xs" variant="filled" color="blue" mb={4}>
                                            {source.sourceName} ({source.sourceType})
                                        </Badge>
                                        {source.cards && source.cards.length > 0 && (
                                            <DragScroll hideScrollbar>
                                                <Group wrap="nowrap" gap={4}>
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
                        </Box>
                    )}
                </Stack>
                </Collapse>
                
                {/* RIGHT COLUMN: Collapse button */}
                <ActionIcon 
                    variant="subtle" 
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                    style={{ alignSelf: 'start' }}
                >
                    {collapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
                </ActionIcon>
            </div>
        </Paper>
    );
});

AnteSection.displayName = 'AnteSection';

function JamlView() {
    const SeedResults = useSeedResultsContainer();
    const seed = useCardStore(state => state.immolateState.seed);
    const setSeed = useCardStore(state => state.setSeed);
    const setStart = useCardStore(state => state.setStart);
    const setSelectedAnte = useCardStore(state => state.setSelectedAnte);
    
    // Multi-seed support - initialize with current seed if available
    const [seeds, setSeeds] = useState<Array<string>>(() => seed ? [seed] : []);
    const [currentSeedIndex, setCurrentSeedIndex] = useState(0);
    const [bulkSeedsOpened, { open: openBulkSeeds, close: closeBulkSeeds }] = useDisclosure(false);
    const [bulkSeedsText, setBulkSeedsText] = useState('');
    
    // JAML Editor state
    const [editorOpened, { toggle: toggleEditor }] = useDisclosure(false);
    const [jamlConfig, setJamlConfig] = useState<any>(null);
    const [jamlValid, setJamlValid] = useState<boolean>(false);
    
    // Handle bulk seeds import
    const handleBulkSeedsImport = useCallback(() => {
        const parsed = bulkSeedsText
            .split(/[\n,]+/)
            .map(s => {
                // Handle CSV: extract first 8 characters or up to first comma
                const trimmed = s.trim();
                const match = trimmed.match(/^([A-Z0-9]{8})/);
                return match ? match[1] : '';
            })
            .filter(s => s.length === 8 && /^[A-Z0-9]{8}$/.test(s));
        
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
                showPacks: false,
                packSlots: [],
                showVoucher: false,
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
    
    // Track focused ante index for keyboard navigation (used in scroll effect)
    const [, setFocusedAnteIndex] = useState(0);
    
    // Hotkeys for navigation: Left/Right = seeds, Up/Down = antes
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
            // Up/Down: Navigate antes (scroll to focused ante) - instant, no animation
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedAnteIndex(prev => {
                    const newIndex = Math.max(0, prev - 1);
                    const anteElement = document.querySelector(`[data-ante-index="${newIndex}"]`);
                    anteElement?.scrollIntoView({ behavior: 'auto', block: 'start' });
                    return newIndex;
                });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedAnteIndex(prev => {
                    const maxIndex = selectedAntes.size - 1;
                    const newIndex = Math.min(maxIndex, prev + 1);
                    const anteElement = document.querySelector(`[data-ante-index="${newIndex}"]`);
                    anteElement?.scrollIntoView({ behavior: 'auto', block: 'start' });
                    return newIndex;
                });
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevSeed, goToNextSeed, seeds.length, selectedAntes.size]);

    if (!SeedResults) return null;

    const pool = SeedResults.antes;
    const availableAntes = Object.keys(pool).map(Number).sort((a, b) => a - b);
    
    const displayAntes = jamlAntes.filter(ante => availableAntes.includes(ante));
    const selectedAntesArray = Array.from(selectedAntes).filter(ante => availableAntes.includes(ante)).sort((a, b) => a - b);

    // Balatro grey shades for flat panels (no borders)
    const CONFIG_BG = {
        bar: '#1e2b2d',      // darkGrey
        nested: '#33464b',   // mediumGrey
    };
    
    return (
        <>
            {/* Top Config Bar - Responsive Layout */}
            <Paper p="xs" mb="sm" style={{ backgroundColor: CONFIG_BG.bar, border: 'none' }}>
                <Stack gap="xs">
                    {/* Row 1: Filter Name/Editor Toggle | Pagination | Antes (all combined) */}
                    <Group justify="flex-start" align="center" wrap="wrap" gap="xs">
                        {/* Filter Name = Expand Button */}
                        <Button 
                            variant="light" 
                            size="compact-xs"
                            leftSection={<IconCode size={12} />}
                            rightSection={editorOpened ? <IconChevronUp size={10} /> : <IconChevronDown size={10} />}
                            onClick={toggleEditor}
                            fw={600}
                        >
                            {jamlValid && jamlConfig ? jamlConfig.name || 'Filter' : 'Filter'}
                        </Button>

                        {/* Seed Source Dropdown + Navigation */}
                        <Button 
                            variant="light"
                            size="compact-xs"
                            leftSection={<IconList size={12} />}
                            rightSection={<IconChevronDown size={10} />}
                            onClick={openBulkSeeds}
                        >
                            {seeds.length > 1 ? `${seeds.length} Seeds` : 'Seed Source'}
                        </Button>

                        {/* Seed Input + Pagination */}
                        <Paper p={6} radius="sm" style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: CONFIG_BG.nested, border: 'none' }}>
                            <Autocomplete
                                size="xs"
                                placeholder="Seed"
                                value={seeds[currentSeedIndex] || seed || ''}
                                onChange={(value) => {
                                    if (value) {
                                        setSeeds([value]);
                                        setCurrentSeedIndex(0);
                                        setSeed(value);
                                        setStart(true);
                                    }
                                }}
                                data={[
                                    { group: 'Popular Seeds', items: popularSeeds },
                                    { group: 'Legendary Joker Seeds', items: SeedsWithLegendary }
                                ]}
                                w={100}
                                style={{ flex: '0 0 auto' }}
                                styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-xs)' } }}
                            />
                            <ActionIcon variant="subtle" size="xs" onClick={goToPrevSeed} disabled={currentSeedIndex === 0 || seeds.length <= 1} title="Prev seed (←)">
                                <IconChevronLeft size={12} />
                            </ActionIcon>
                            <Text size="xs" fw={500} style={{ minWidth: '30px', textAlign: 'center' }}>{seeds.length > 0 ? `${currentSeedIndex + 1}/${seeds.length}` : '0/0'}</Text>
                            <ActionIcon variant="subtle" size="xs" onClick={goToNextSeed} disabled={currentSeedIndex >= seeds.length - 1 || seeds.length <= 1} title="Next seed (→)">
                                <IconChevronRight size={12} />
                            </ActionIcon>
                        </Paper>

                        {/* Antes Selector */}
                        <Paper p={6} radius="sm" style={{ backgroundColor: CONFIG_BG.nested, border: 'none' }}>
                            <Group gap={2} wrap="nowrap">
                                {displayAntes.map((ante) => (
                                    <Button
                                        key={ante}
                                        size="compact-xs"
                                        variant={selectedAntes.has(ante) ? "filled" : "default"}
                                        color={selectedAntes.has(ante) ? "blue" : "gray"}
                                        onClick={() => toggleAnte(ante)}
                                        px={4}
                                        fz="xs"
                                    >
                                        {ante}
                                    </Button>
                                ))}
                            </Group>
                        </Paper>

                        {/* Info Badges */}
                        {jamlValid && jamlConfig && (
                            <Group gap={4} wrap="nowrap">
                                {jamlConfig.must?.length > 0 && <Badge color="red" size="xs">{jamlConfig.must.length} MUST</Badge>}
                                {jamlConfig.should?.length > 0 && <Badge color="blue" size="xs">{jamlConfig.should.length} SHOULD</Badge>}
                            </Group>
                        )}
                    </Group>
                </Stack>
            </Paper>

            {/* JAML Editor - Collapsible */}
            <Collapse in={editorOpened}>
                <Box mb="sm">
                    <JamlEditor onJamlChange={handleJamlChange} />
                </Box>
            </Collapse>

            {/* Render sections for each selected ante - scroll snap container */}
            {selectedAntesArray.length === 0 ? (
                <Paper p="md" ta="center" style={{ backgroundColor: CONFIG_BG.bar, border: 'none' }}>
                    <Text c="dimmed" size="sm">No antes selected. Configure your JAML filter.</Text>
                </Paper>
            ) : (
                <Stack 
                    gap="xs"
                    style={{
                        scrollSnapType: 'y mandatory',
                        scrollBehavior: 'auto', // Instant snap, no sluggish animation
                        overflowY: 'auto',
                        maxHeight: 'calc(100vh - 180px)',
                    }}
                >
                    {selectedAntesArray.map((anteNum, index) => {
                        const anteData = pool[anteNum];
                        if (!anteData) return null;
                        
                        // Filter custom sources for this ante
                        const anteCustomSources = customSources.filter(s => s.ante === anteNum);
                        
                        return (
                            <Box 
                                key={anteNum} 
                                data-ante-index={index}
                                style={{ scrollSnapAlign: 'start' }}
                            >
                                <AnteSection
                                    anteNum={anteNum}
                                    anteData={anteData}
                                    sourcesConfig={sourcesConfig}
                                    jamlConfig={jamlConfig}
                                    customSources={anteCustomSources}
                                    cardScale={0.85}
                                />
                            </Box>
                        );
                    })}
                </Stack>
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
                            textarea.style.backgroundColor = 'var(--mantine-color-blue-9)';
                            textarea.style.borderColor = 'var(--mantine-color-blue-5)';
                        }
                    }}
                    onDragLeave={(e) => {
                        // Only reset if leaving the stack entirely
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            const textarea = e.currentTarget.querySelector('textarea');
                            if (textarea) {
                                textarea.style.backgroundColor = 'var(--mantine-color-dark-7)';
                                textarea.style.borderColor = '';
                            }
                        }
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const textarea = e.currentTarget.querySelector('textarea');
                        if (textarea) {
                            textarea.style.backgroundColor = 'var(--mantine-color-dark-7)';
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
                            backgroundColor: 'var(--mantine-color-dark-6)',
                        }}
                        component="label"
                    >
                        <Group justify="center" gap="xs">
                            <IconUpload size={16} color="var(--mantine-color-dimmed)" />
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
                                backgroundColor: 'var(--mantine-color-dark-7)',
                                color: 'var(--mantine-color-gray-3)',
                                fontSize: '14px',
                                letterSpacing: '0.5px',
                                transition: 'background-color 0.15s, border-color 0.15s',
                            } 
                        }}
                    />
                    
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                            {bulkSeedsText.split(/[\n,]+/).filter((s: string) => {
                                const trimmed = s.trim();
                                return trimmed.length > 0 && /^[A-Z0-9]{8}/.test(trimmed);
                            }).length} seeds detected
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
        </>
    );
}

export default JamlView;
