import React, {useState, useMemo, useEffect, useCallback} from "react";
import {
    Box,
    Button,
    Group,
    Paper,
    Text,
    Collapse,
    Badge,
    ActionIcon,
    Modal,
    Textarea,
    Stack,
    Autocomplete
} from "@mantine/core";
import {IconCode, IconChevronDown, IconChevronUp, IconChevronLeft, IconChevronRight, IconList, IconUpload} from "@tabler/icons-react";
import {useDisclosure} from "@mantine/hooks";
import {useCardStore} from "../../../modules/state/store.ts";
import {useSeedResultsContainer} from "../../../modules/state/analysisResultProvider.tsx";
import {GameCard} from "../../Rendering/cards.tsx";
import {DragScroll} from "../../DragScroller.tsx";
import {JamlEditor} from "./JamlEditor.tsx";
import {Voucher, Tag as RenderTag, Boss} from "../../Rendering/gameElements.tsx";
import {popularSeeds, SeedsWithLegendary} from "../../../modules/const.ts";
import type {Ante, Pack} from "../../../modules/ImmolateWrapper/CardEngines/Cards.ts";

// Extract all antes referenced in JAML clauses
function extractAntesFromJaml(jamlConfig: any): number[] {
    const antesSet = new Set<number>();
    
    const extractFromClauses = (clauses: any[]) => {
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
    shopSlots: number[];
    showPacks: boolean;
    packSlots: number[];
    showVoucher: boolean;
    miscSources: string[];
} {
    const result = {
        showShop: false,
        shopSlots: [] as number[],
        showPacks: false,
        packSlots: [] as number[],
        showVoucher: false,
        miscSources: [] as string[]
    };
    
    let foundAnySource = false;
    
    const extractFromClauses = (clauses: any[]) => {
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

// Memoized AnteSection component
const AnteSection = React.memo(({ 
    anteNum, 
    anteData, 
    sourcesConfig,
    selectedBlind,
    jamlConfig
}: { 
    anteNum: number;
    anteData: Ante;
    sourcesConfig: ReturnType<typeof extractSourcesFromJaml>;
    selectedBlind: string;
    jamlConfig: any;
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const shopQueue = anteData.queue || [];
    
    // Get packs from each blind separately (keys are smallBlind, bigBlind, bossBlind)
    // Ante 0: No packs
    // Ante 1: Big Blind + Boss Blind only (no Small Blind)
    // Ante 2+: All three blinds have packs
    const hasSmallBlind = anteNum >= 2;
    const hasBigBlind = anteNum >= 1;
    const hasBossBlind = anteNum >= 1;
    
    const smallBlindPacks = hasSmallBlind ? (anteData.blinds?.smallBlind?.packs || []) : [];
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
    
    // Don't render if nothing to show
    const hasContent = displayShop.length > 0 || totalPacks > 0 || sourcesConfig.showVoucher || sourcesConfig.miscSources.length > 0;
    if (!hasContent) return null;
    
    return (
        <Paper withBorder p="xs" radius="md">
            {/* Collapsible header */}
            <Group 
                justify="space-between" 
                mb={collapsed ? 0 : 'xs'}
                onClick={() => setCollapsed(!collapsed)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
            >
            <Group gap="xs" align="center">
                <Text fw={800} size="xl" lh={1} style={{ fontSize: '32px' }}>
                    Ante {anteNum}
                </Text>
            </Group>
                <ActionIcon variant="subtle" size="lg">
                    {collapsed ? <IconChevronDown size={20} /> : <IconChevronUp size={20} />}
                </ActionIcon>
            </Group>
            
            {/* Collapsible content */}
            <Collapse in={!collapsed}>
                {/* Grid layout: Fixed left column | Flex right column */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px' }}>
                    {/* LEFT COLUMN: Fixed width - Voucher (centered, bottom-aligned) */}
                    <Stack gap="xs" justify="flex-end" align="center" style={{ minWidth: '80px' }}>
                    {/* Voucher - centered horizontally, bottom-aligned vertically */}
                    {sourcesConfig.showVoucher && anteData.voucher && (
                        <Box style={{ height: '96px', width: '71px', marginTop: 'auto' }}>
                            <Voucher voucherName={anteData.voucher} />
                        </Box>
                    )}
                </Stack>
                
                {/* RIGHT COLUMN: Shop + Blind columns */}
                <Stack gap="xs">
                    {/* TOP: Shop - Show 12 cards, gray out ones not in JAML spec */}
                    {sourcesConfig.showShop && displayShop.length > 0 && (
                        <Box>
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
                                                <GameCard card={card} glow={glow} />
                                            </Box>
                                        );
                                    })}
                                </Group>
                            </DragScroll>
                        </Box>
                    )}
                    
                    {/* BOTTOM: 3 columns for Small Blind | Big Blind | Boss Blind */}
                    {sourcesConfig.showPacks && totalPacks > 0 && (
                        <Group gap="md" wrap="nowrap" align="flex-start" style={{ width: '100%' }}>
                            {/* SMALL BLIND COLUMN */}
                            {smallBlindPacks.length > 0 && (
                                <Stack gap="xs" justify="space-between">
                                    <Stack gap="xs">
                                        {smallBlindPacks.map((pack: Pack, idx: number) => {
                                            // Check if pack is within JAML specified packSlots
                                            const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx);
                                            
                                            return (
                                                <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                    <Group gap={4} mb={4} wrap="nowrap">
                                                        <Badge size="xs" variant="light">{pack.name}</Badge>
                                                        <Badge size="xs" color="blue">Cards: {pack.size}</Badge>
                                                        <Badge size="xs" color={pack.choices > 1 ? "green" : "gray"}>Pick: {pack.choices}</Badge>
                                                    </Group>
                                                    <Group wrap="nowrap" gap={2}>
                                                        {pack.cards.map((card, cardIdx) => {
                                                            const glow = getCardGlow(card, jamlConfig, anteNum, 0, 'pack');
                                                            return (
                                                                <Box key={cardIdx}>
                                                                    <GameCard card={card!} glow={glow} />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Group>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                    {/* Label + Tag at bottom */}
                                    <Group gap={4} mt="xs" align="center" style={{ justifyContent: 'center', width: '100%' }}>
                                        <Text size="xs" fw={600} c="dimmed" style={{ textAlign: 'center' }}>Small Blind</Text>
                                        {anteData.tags?.[0] && <RenderTag tagName={anteData.tags[0]} />}
                                    </Group>
                                </Stack>
                            )}
                            
                            {/* BIG BLIND COLUMN */}
                            {bigBlindPacks.length > 0 && (
                                <Stack gap="xs" justify="space-between">
                                    <Stack gap="xs">
                                        {bigBlindPacks.map((pack: Pack, idx: number) => {
                                            // Check if pack is within JAML specified packSlots
                                            const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx + 2);
                                            
                                            return (
                                                <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                    <Group gap={4} mb={4} wrap="nowrap">
                                                        <Badge size="xs" variant="light">{pack.name}</Badge>
                                                        <Badge size="xs" color="blue">Cards: {pack.size}</Badge>
                                                        <Badge size="xs" color={pack.choices > 1 ? "green" : "gray"}>Pick: {pack.choices}</Badge>
                                                    </Group>
                                                    <Group wrap="nowrap" gap={2}>
                                                        {pack.cards.map((card, cardIdx) => {
                                                            const glow = getCardGlow(card, jamlConfig, anteNum, 1, 'pack');
                                                            return (
                                                                <Box key={cardIdx}>
                                                                    <GameCard card={card!} glow={glow} />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Group>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                    {/* Tag + Label at bottom (swapped, larger font) */}
                                    <Group gap={4} mt="xs">
                                        {anteData.tags?.[1] && <RenderTag tagName={anteData.tags[1]} />}
                                        <Text size="sm" fw={700} c="dimmed">Big Blind</Text>
                                    </Group>
                                </Stack>
                            )}
                            
                            {/* BOSS BLIND COLUMN - Only show for Ante 1+ */}
                            {hasBossBlind && bossBlindPacks.length > 0 && (
                                <Stack gap="xs" justify="space-between">
                                    <Stack gap="xs">
                                        {bossBlindPacks.map((pack: Pack, idx: number) => {
                                            // Check if pack is within JAML specified packSlots
                                            const isInJamlSlots = sourcesConfig.packSlots.length === 0 || sourcesConfig.packSlots.includes(idx + 4);
                                            
                                            return (
                                                <Box key={idx} style={{ opacity: isInJamlSlots ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                    <Group gap={4} mb={4} wrap="nowrap">
                                                        <Badge size="xs" variant="light">{pack.name}</Badge>
                                                        <Badge size="xs" color="blue">Cards: {pack.size}</Badge>
                                                        <Badge size="xs" color={pack.choices > 1 ? "green" : "gray"}>Pick: {pack.choices}</Badge>
                                                    </Group>
                                                    <Group wrap="nowrap" gap={2}>
                                                        {pack.cards.map((card, cardIdx) => {
                                                            const glow = getCardGlow(card, jamlConfig, anteNum, 2, 'pack');
                                                            return (
                                                                <Box key={cardIdx}>
                                                                    <GameCard card={card!} glow={glow} />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Group>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                    {/* Label + Boss icon at bottom */}
                                    <Group gap={4} mt="xs" align="center">
                                        {anteData.boss && <Boss bossName={anteData.boss} />}
                                        <Text size="xs" fw={600} c="dimmed">Boss Blind</Text>
                                    </Group>
                                </Stack>
                            )}
                        </Group>
                    )}
                    
                    {/* Misc sources */}
                    {sourcesConfig.miscSources.length > 0 && (
                        <Group gap={4} wrap="nowrap">
                            {sourcesConfig.miscSources.map(source => (
                                <Badge key={source} size="xs" variant="outline">{source}</Badge>
                            ))}
                        </Group>
                    )}
                </Stack>
            </div>
            </Collapse>
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
    const selectedBlind = useCardStore(state => state.applicationState.selectedBlind);
    
    // Multi-seed support
    const [seeds, setSeeds] = useState<string[]>([]);
    const [currentSeedIndex, setCurrentSeedIndex] = useState(0);
    const [bulkSeedsOpened, { open: openBulkSeeds, close: closeBulkSeeds }] = useDisclosure(false);
    const [bulkSeedsText, setBulkSeedsText] = useState('');
    
    // JAML Editor state
    const [editorOpened, { toggle: toggleEditor }] = useDisclosure(false);
    const [jamlConfig, setJamlConfig] = useState<any>(null);
    const [jamlValid, setJamlValid] = useState<boolean>(false);
    
    // Initialize seeds from current seed
    useEffect(() => {
        if (seed && seeds.length === 0) {
            setSeeds([seed]);
        }
    }, [seed]);
    
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
    const [selectedAntes, setSelectedAntes] = useState<Set<number>>(new Set(jamlAntes));
    
    // Update selected antes when JAML changes
    useEffect(() => {
        setSelectedAntes(new Set(jamlAntes));
    }, [jamlAntes]);
    
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
    
    // Hotkeys for navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (seeds.length <= 1) return;
            
            // Arrow keys or Page Up/Down
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                goToPrevSeed();
            } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                e.preventDefault();
                goToNextSeed();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevSeed, goToNextSeed, seeds.length]);

    if (!SeedResults) return null;

    const pool = SeedResults.antes;
    const availableAntes = Object.keys(pool).map(Number).sort((a, b) => a - b);
    
    const displayAntes = jamlAntes.filter(ante => availableAntes.includes(ante));
    const selectedAntesArray = Array.from(selectedAntes).filter(ante => availableAntes.includes(ante)).sort((a, b) => a - b);

    return (
        <>
            {/* Top Config Bar - Responsive Layout */}
            <Paper withBorder p="xs" mb="sm">
                <Stack gap="xs">
                    {/* Row 1: Filter Name/Editor Toggle | Pagination | Antes (all combined) */}
                    <Group justify="flex-start" align="center" wrap="wrap" gap="xs">
                        {/* Filter Name = Expand Button */}
                        <Button 
                            variant="light" 
                            size="xs"
                            leftSection={<IconCode size={12} />}
                            rightSection={editorOpened ? <IconChevronUp size={10} /> : <IconChevronDown size={10} />}
                            onClick={toggleEditor}
                            compact
                            fw={600}
                        >
                            {jamlValid && jamlConfig ? jamlConfig.name || 'Filter' : 'Filter'}
                        </Button>

                        {/* Seed Source Dropdown + Navigation */}
                        <Button 
                            variant="light"
                            size="xs"
                            leftSection={<IconList size={12} />}
                            rightSection={<IconChevronDown size={10} />}
                            onClick={openBulkSeeds}
                            compact
                        >
                            {seeds.length > 1 ? `${seeds.length} Seeds` : 'Seed Source'}
                        </Button>

                        {/* Seed Input + Pagination */}
                        <Paper withBorder p={6} radius="sm" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
                        <Paper withBorder p={6} radius="sm">
                            <Group gap={2} wrap="nowrap">
                                {displayAntes.map((ante) => (
                                    <Button
                                        key={ante}
                                        size="compact-xs"
                                        variant={selectedAntes.has(ante) ? "filled" : "light"}
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

            {/* Render sections for each selected ante */}
            {selectedAntesArray.length === 0 ? (
                <Paper withBorder p="md" ta="center">
                    <Text c="dimmed" size="sm">No antes selected. Configure your JAML filter.</Text>
                </Paper>
            ) : (
                <Stack gap="xs">
                    {selectedAntesArray.map((anteNum) => {
                        const anteData = pool[anteNum];
                        if (!anteData) return null;
                        
                        return (
                            <AnteSection
                                key={anteNum}
                                anteNum={anteNum}
                                anteData={anteData}
                                sourcesConfig={sourcesConfig}
                                selectedBlind={selectedBlind}
                                jamlConfig={jamlConfig}
                            />
                        );
                    })}
                </Stack>
            )}
            
            {/* Bulk Seeds Modal */}
            <Modal opened={bulkSeedsOpened} onClose={closeBulkSeeds} title="Import Seeds" size="md">
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Supports: .TXT, .CSV (first 8 chars), or paste directly. One seed per line.
                    </Text>
                    
                    {/* File Upload Area */}
                    <Paper 
                        withBorder 
                        p="md" 
                        radius="sm" 
                        style={{ 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            backgroundColor: 'var(--mantine-color-dark-6)',
                            borderStyle: 'dashed',
                            borderColor: 'var(--mantine-color-dark-4)'
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-9)';
                            e.currentTarget.style.borderColor = 'var(--mantine-color-blue-5)';
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)';
                            e.currentTarget.style.borderColor = 'var(--mantine-color-dark-4)';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)';
                            e.currentTarget.style.borderColor = 'var(--mantine-color-dark-4)';
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
                        component="label"
                    >
                        <Group justify="center" gap="xs">
                            <IconUpload size={20} color="var(--mantine-color-dimmed)" />
                            <div>
                                <Text fw={500} size="sm">Drop files here or click to upload</Text>
                                <Text size="xs" c="dimmed">.txt or .csv</Text>
                            </div>
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

                    {/* Paste Area - also accepts file drop */}
                    <Textarea
                        placeholder="KDBX2SMH&#10;3BCUYMCI&#10;11KH17QI&#10;..."
                        value={bulkSeedsText}
                        onChange={(e) => setBulkSeedsText(e.currentTarget.value)}
                        minRows={8}
                        maxRows={15}
                        autosize
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
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
                        styles={{ 
                            input: { 
                                fontFamily: 'monospace',
                                backgroundColor: 'var(--mantine-color-dark-7)',
                                color: 'var(--mantine-color-gray-3)',
                                fontSize: '14px',
                                letterSpacing: '0.5px'
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
