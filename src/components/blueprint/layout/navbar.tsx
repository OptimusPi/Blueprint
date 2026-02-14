import {
    ActionIcon,
    AppShell,
    Box,
    Button,
    Divider,
    Group,
    InputLabel,
    NativeSelect,
    NumberInput,
    ScrollArea,
    SegmentedControl,
    Select,
    Stack,
    Switch,
    Text,
<<<<<<< Updated upstream
=======
    Textarea,
    TextInput,
>>>>>>> Stashed changes
    Tooltip,
    useMantineColorScheme,
    useMantineTheme
} from "@mantine/core";
<<<<<<< Updated upstream
import React, {useState, useEffect} from "react";
import {
    IconFileText,
    IconJoker,
    IconLayout,
    IconListSearch,
    IconMoon,
    IconPlayCard,
    IconSun
} from "@tabler/icons-react";
=======
import { useDisclosure } from "@mantine/hooks";

>>>>>>> Stashed changes
import { useCardStore } from "../../../modules/state/store.ts";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import UnlocksModal from "../../unlocksModal.tsx";
import FeaturesModal from "../../FeaturesModal.tsx";
<<<<<<< Updated upstream
import {RerollCalculatorModal} from "../../RerollCalculatorModal.tsx";
import {GaEvent} from "../../../modules/useGA.ts";
import { useDebouncedCallback } from "@mantine/hooks";
import { DrawSimulatorModal } from "../../DrawSimulatorModal.tsx";
import SeedInputAutoComplete from "../../SeedInputAutoComplete.tsx";
import { useBlueprintTheme } from "../../../modules/state/themeProvider.tsx";
import type { KnownThemes } from "../../../modules/state/themeProvider.tsx";


export default function NavBar() {
    const theme = useMantineTheme();
    const { theme: themeName, setTheme, themes } = useBlueprintTheme()
    const themeNames = Object.keys(themes);
    const colorScheme = useMantineColorScheme()
=======
import { RerollCalculatorModal } from "../../RerollCalculatorModal.tsx";
import { GaEvent } from "../../../modules/useGA.ts";
import { DrawSimulatorModal } from "../../DrawSimulatorModal.tsx";
import SeedInputAutoComplete from "../../SeedInputAutoComplete.tsx";
import { DeckBackIcon, StakeChipIcon } from "../../Rendering/deckStakeIcons.tsx";
import {
    IconJoker,
    IconLayout,
    IconPlayCard,
    IconSettings,
    IconUpload,
    IconSearch
} from "@tabler/icons-react";

export default function Navbar() {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
>>>>>>> Stashed changes
    const viewMode = useCardStore(state => state.applicationState.viewMode);
    const isJamlView = viewMode === 'jaml';
    
    // JAML search state from context
    const {
        searchMode,
        searchEngineMode,
        apiEndpoint,
        wasmThreadCount,
        wasmBatchSize,
        quickSeedCount,
        quickSeedInput,
        sequentialStartSeed,
        sequentialEndSeed,
        funnyMode,
        funnyKeywords,
        setSearchMode,
        setSearchEngineMode,
        setApiEndpoint,
        setWasmThreadCount,
        setWasmBatchSize,
        setQuickSeedCount,
        setQuickSeedInput,
        setSequentialStartSeed,
        setSequentialEndSeed,
        setFunnyMode,
        setFunnyKeywords,
        selectedFilterKey,
        setSelectedFilterKey,
        setCustomJamlText,
    } = useJamlSearch();
    const jamlFileInputRef = React.useRef<HTMLInputElement>(null);
    const setViewMode = useCardStore(state => state.setViewMode);
<<<<<<< Updated upstream
=======
    const settingsOpen = useCardStore(state => state.applicationState.settingsOpen);
>>>>>>> Stashed changes

    const analyzeState = useCardStore(state => state.immolateState);
    const { seed, deck, stake, gameVersion: version, antes, cardsPerAnte } = analyzeState;
    const showCardSpoilers = useCardStore(state => state.applicationState.showCardSpoilers);
    const useCardPeek = useCardStore(state => state.applicationState.useCardPeek);
    const setUseCardPeek = useCardStore(state => state.setUseCardPeek);
    const maxMiscCardSource = useCardStore(state => state.applicationState.maxMiscCardSource);
    const setMiscMaxSource = useCardStore(state => state.setMiscMaxSource);


    const setSeed = useCardStore(state => state.setSeed);
    const setDeck = useCardStore(state => state.setDeck);
    const setStake = useCardStore(state => state.setStake);
    const setVersion = useCardStore(state => state.setGameVersion);
    const setAntes = useCardStore(state => state.setAntes);
    const setCardsPerAnte = useCardStore(state => state.setCardsPerAnte);
    const setShowCardSpoilers = useCardStore(state => state.setShowCardSpoilers);
    const setStart = useCardStore(state => state.setStart);
    const openSelectOptionModal = useCardStore(state => state.openSelectOptionModal);
    const openFeaturesModal = useCardStore(state => state.openFeaturesModal);
    const openSnapshotModal = useCardStore(state => state.openSnapshotModal);
    const rerollCalculatorModalOpen = useCardStore(state => state.applicationState.rerollCalculatorModalOpen);
    const rerollCalculatorMetadata = useCardStore(state => state.applicationState.rerollCalculatorMetadata);
    const closeRerollCalculatorModal = useCardStore(state => state.closeRerollCalculatorModal);
    const reset = useCardStore(state => state.reset);
    const hasSettingsChanged = useCardStore((state) => state.applicationState.hasSettingsChanged);

    const [localAntes, setLocalAntes] = useState<number | string>(antes);
    useEffect(() => { setLocalAntes(antes); }, [antes]);
    const debouncedSetAntes = useDebouncedCallback((val: number) => {
        if (val !== antes) setAntes(val);
    }, 200);

    const handleJamlSearchClick = () => {
        // In JAML mode, trigger the search by setting start=true
        // The JamlView component will detect this and start the search
        setStart(true);
    }

    const handleAnalyzeClick = () => {
        setStart(true);
    }

<<<<<<< Updated upstream
=======
    const handleBulkSeedsImport = () => {
        const parsed = bulkSeedsText
            .split(/\r?\n/)
            .map(line => {
                const firstCol = line.split(',')[0].trim();
                const stripped = firstCol.replace(/^["']|["']$/g, '');
                return stripped;
            })
            .filter(s => s.length > 0 && /^[A-Z0-9]+$/i.test(s))
            .map(s => s.toUpperCase());

        if (parsed.length > 0) {
            setSeed(parsed[0]);
            setStart(true);
            closeBulkSeeds();
            setBulkSeedsText('');
        }
    }

    const handleViewModeChange = (value: string) => {
        if (value === 'jaml') {
            setViewMode('jaml');
            // Force these ON for JAML mode
            setShowCardSpoilers(true);
            setUseCardPeek(true);
            return;
        }
        setViewMode(value);
    }

>>>>>>> Stashed changes
    return (
        <AppShell.Navbar p="md">
            <UnlocksModal />
            <UnlocksModal />
            <FeaturesModal />
            <DrawSimulatorModal />
            <RerollCalculatorModal
                opened={rerollCalculatorModalOpen}
                onClose={closeRerollCalculatorModal}
                targetIndex={rerollCalculatorMetadata?.index ?? 0}
                metaData={rerollCalculatorMetadata}
            />
            <AppShell.Section>
                <SegmentedControl
                    id="view-mode"
                    fullWidth
                    value={viewMode}
                    onChange={(value: string) => setViewMode(value)}
                    data={[
                        {
                            value: 'blueprint',
                            label: (
                                <Group gap="xs">
                                    <IconLayout size={16} />
                                    <Text>Blueprint</Text>
                                </Group>
                            )
                        },
                        {
<<<<<<< Updated upstream
                            value: 'simple',
                            label: (
                                <Group gap="xs">
                                    <IconListSearch size={16} />
                                    <Text>Efficiency</Text>
                                </Group>
                            )
                        },
                        {
                            value: 'text',
                            label: (
                                <Group gap="xs">
                                    <IconFileText size={16} />
                                    <Text>Text</Text>
=======
                            value: 'jaml',
                            label: (
                                <Group gap={4} wrap="nowrap" align="center">
                                    <Image
                                        src={`${import.meta.env.BASE_URL}images/JAML.ico`}
                                        alt="JAML"
                                        w={18}
                                        h={18}
                                        fit="contain"
                                    />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>JAML</Text>
>>>>>>> Stashed changes
                                </Group>
                            )
                        },
                        {
                            value: 'settings',
                            label: (
                                <Group gap={4} wrap="nowrap" align="center">
                                    <IconSettings size={12} />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>Settings</Text>
                                </Group>
                            )
                        }
                    ]}
                    mb="sm"
                />
                <Divider mb='md' />
<<<<<<< Updated upstream
                <Group align={'flex-end'}>
                    <Select
                        label={'Theme'}
                        value={themeName}
                        onChange={(t) => {
                            if (!t) return
                            setTheme(t as KnownThemes)
                        }}
                        data={themeNames}
                        flex={1}
                    />
                    <Switch
                        size={'xl'}
                        checked={colorScheme.colorScheme === 'dark'}
                        thumbIcon={colorScheme.colorScheme === 'dark' ? (<IconSun size={16} color={'var(--mantine-color-teal-6)'} />) : (<IconMoon size={16} />)}
                        onChange={colorScheme.toggleColorScheme}
                    />
                </Group>
            </AppShell.Section>
            <AppShell.Section id="seed-config" pr={'xs'} grow mb="md" component={ScrollArea} scrollbars={'y'}>
                <SeedInputAutoComplete
                    seed={seed}
                    setSeed={setSeed}
                />
                <NumberInput
                    id="setting-max-ante"
                    label={'Max Ante'}
                    defaultValue={8}
                    value={localAntes}
                    onChange={(val: number | string) => {
                        const num = typeof val === 'string' ? parseInt(val) || 8 : val;
                        setLocalAntes(num);
                        debouncedSetAntes(num);
                    }}
                />
                <NativeSelect
                    id="setting-deck"
                    label={'Choose Deck'}
                    value={deck}
                    onChange={(e) => setDeck(e.currentTarget.value)}
                >
                    <option value="Red Deck">Red Deck</option>
                    <option value="Blue Deck">Blue Deck</option>
                    <option value="Yellow Deck">Yellow Deck</option>
                    <option value="Green Deck">Green Deck</option>
                    <option value="Black Deck">Black Deck</option>
                    <option value="Magic Deck">Magic Deck</option>
                    <option value="Nebula Deck">Nebula Deck</option>
                    <option value="Ghost Deck">Ghost Deck</option>
                    <option value="Abandoned Deck">Abandoned Deck</option>
                    <option value="Checkered Deck">Checkered Deck</option>
                    <option value="Zodiac Deck">Zodiac Deck</option>
                    <option value="Painted Deck">Painted Deck</option>
                    <option value="Anaglyph Deck">Anaglyph Deck</option>
                    <option value="Plasma Deck">Plasma Deck</option>
                    <option value="Erratic Deck">Erratic Deck</option>
                </NativeSelect>
                <NativeSelect
                    id="setting-stake"
                    label={'Choose Stake'}
                    value={stake}
                    onChange={(e) => setStake(e.currentTarget.value)}
                >
                    <option value="White Stake">White Stake</option>
                    <option value="Red Stake">Red Stake</option>
                    <option value="Green Stake">Green Stake</option>
                    <option value="Black Stake">Black Stake</option>
                    <option value="Blue Stake">Blue Stake</option>
                    <option value="Purple Stake">Purple Stake</option>
                    <option value="Orange Stake">Orange Stake</option>
                    <option value="Gold Stake">Gold Stake</option>
                </NativeSelect>
                <NativeSelect
                    id="setting-version"
                    label={'Choose Version'}
                    value={version}
                    onChange={(e) => setVersion(e.currentTarget.value)}
                    mb={'md'}
                >
                    <option value="10106">1.0.1f</option>
                    <option value="10103">1.0.1c</option>
                    <option value="10014">1.0.0n</option>
                </NativeSelect>
                <InputLabel> Cards per Ante</InputLabel>
                <Text fz={'xs'} c={'dimmed'}>
                    It is recommended to keep this number under 200.
                </Text>
                <Box id="setting-cards-per-ante" mb={'lg'}>
                    <Button.Group w={'100%'}>
                        <Button variant="default" c={'blue'} onClick={() => setCardsPerAnte(50)}>50</Button>
                        <Button variant="default" c={'red'} onClick={() => setCardsPerAnte(Math.max(cardsPerAnte - 50, 0))}>-50</Button>
                        <Button.GroupSection flex={1} variant="default" bg="var(--mantine-color-body)" miw={80}>
                            {cardsPerAnte}
                        </Button.GroupSection>
                        <Button variant="default" c={'green'}
                            onClick={() => setCardsPerAnte(Math.min(cardsPerAnte + 50, 1000))}>+50</Button>
                        <Button variant="default" c={'blue'} onClick={() => setCardsPerAnte(1000)}>1000</Button>
                    </Button.Group>
                </Box>
                <InputLabel> Cards per Misc source</InputLabel>
                <Text fz={'xs'} c={'dimmed'}>
                    It is recommended to keep this number under 50.
                </Text>
                <Box id="setting-misc-source" mb={'lg'}>
                    <Button.Group w={'100%'}>
                        <Button variant="default" c={'blue'} onClick={() => setMiscMaxSource(15)}>15</Button>
                        <Button variant="default" c={'red'} onClick={() => setMiscMaxSource(Math.max(maxMiscCardSource - 5, 0))}>-5</Button>
                        <Button.GroupSection flex={1} variant="default" bg="var(--mantine-color-body)" miw={80}>
                            {maxMiscCardSource}
                        </Button.GroupSection>
                        <Button variant="default" c={'green'}
                            onClick={() => setMiscMaxSource(Math.min(maxMiscCardSource + 5, 100))}>+5</Button>
                        <Button variant="default" c={'blue'} onClick={() => setMiscMaxSource(100)}>100</Button>
                    </Button.Group>
                </Box>
                <Group justify={'space-between'}>
                    <Box id="setting-spoilers">
                        <Text mb={0} fz={'xs'}>Show Joker Spoilers</Text>
                        <Tooltip label="Cards that give jokers, are replaced with the joker the card would give."
                            refProp="rootRef">
                            <Switch
                                size={'xl'}
                                checked={showCardSpoilers}
                                thumbIcon={showCardSpoilers ? (<IconJoker color={'black'} />) : (
                                    <IconPlayCard color={'black'} />)}
                                onChange={() => setShowCardSpoilers(!showCardSpoilers)}
                            />
                        </Tooltip>
                    </Box>
                    <Box id="setting-quick-reroll">
                        <Text mb={0} fz={'xs'}>Quick Reroll</Text>
                        <Tooltip label="Long pressing a card in the shop queue, will reroll that card."
                            refProp="rootRef">
                            <Switch
                                size={'xl'}
                                checked={useCardPeek}
                                onChange={() => setUseCardPeek(!useCardPeek)}
=======
                {isJamlView && (
                    <>
                        {/* Game Config: Filter, Deck, Stake */}
                        <Select
                            label="JAML Filter"
                            size="xs"
                            placeholder="Select a filter..."
                            value={selectedFilterKey}
                            mb="xs"
                            data={[
                                {
                                    group: 'Filters',
                                    items: [
                                        { value: 'default', label: 'Default (Generic)' },
                                        { value: 'speedtest', label: 'Speedtest (Benchmark)' },
                                    ]
                                },
                                {
                                    group: 'Actions',
                                    items: [
                                        { value: '__create_new__', label: 'Create New...' },
                                        { value: '__upload__', label: 'Upload .jaml File...' },
                                    ]
                                }
                            ]}
                            onChange={(value) => {
                                if (!value) return;
                                if (value === '__upload__') {
                                    jamlFileInputRef.current?.click();
                                    return;
                                }
                                setSelectedFilterKey(value);
                            }}
                        />
                        <input
                            type="file"
                            ref={jamlFileInputRef}
                            accept=".jaml,.yaml,.yml"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const content = ev.target?.result as string;
                                        if (content) {
                                            setCustomJamlText(content);
                                            setSelectedFilterKey('__custom__');
                                        }
                                    };
                                    reader.readAsText(file);
                                }
                                e.target.value = '';
                            }}
                        />
                        <Group align={'flex-end'} grow mb="xs">
                            <Select
                                label={'Deck'}
                                value={deck}
                                onChange={(value) => {
                                    if (value) setDeck(value);
                                }}
                                size="sm"
                                flex={1}
                                data={[
                                    "Red Deck",
                                    "Blue Deck",
                                    "Yellow Deck",
                                    "Green Deck",
                                    "Black Deck",
                                    "Magic Deck",
                                    "Nebula Deck",
                                    "Ghost Deck",
                                    "Abandoned Deck",
                                    "Checkered Deck",
                                    "Zodiac Deck",
                                    "Painted Deck",
                                    "Anaglyph Deck",
                                    "Plasma Deck",
                                    "Erratic Deck"
                                ]}
                                leftSection={deck ? <DeckBackIcon deckName={deck} /> : null}
                            />
                            <Select
                                label={'Stake'}
                                value={stake}
                                onChange={(value) => {
                                    if (value) setStake(value);
                                }}
                                size="sm"
                                flex={1}
                                data={[
                                    "White Stake",
                                    "Red Stake",
                                    "Green Stake",
                                    "Black Stake",
                                    "Blue Stake",
                                ]}
                                leftSection={stake ? <StakeChipIcon stakeName={stake} /> : null}
                            />
                        </Group>

                    </>
                )}
                {viewMode === 'settings' && (
                    <>
                        {/* Search Config */}
                        <Paper p={6} radius="sm" mb={4} style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
                            <Stack gap={6}>
                                <Text size="sm" fw={600}>JAML Search Settings</Text>
                                <SegmentedControl
                                    size="xs"
                                    value={searchEngineMode}
                                    onChange={(value) => setSearchEngineMode(value as 'browser-wasm' | 'public-api')}
                                    data={[
                                        { label: 'Browser WASM', value: 'browser-wasm' },
                                        { label: 'Public API', value: 'public-api' },
                                    ]}
                                />

                                <SegmentedControl
                                    size="xs"
                                    value={searchMode}
                                    onChange={(value) => setSearchMode(value as 'quick' | 'sequential' | 'funny')}
                                    data={[
                                        { label: 'Quick Search', value: 'quick' },
                                        { label: 'Full Sequential', value: 'sequential' },
                                        { label: 'Funny Search', value: 'funny' },
                                    ]}
                                />

                                {searchEngineMode === 'public-api' && (
                                    <TextInput
                                        label="Motely API endpoint"
                                        size="xs"
                                        value={apiEndpoint}
                                        onChange={(e) => setApiEndpoint(e.currentTarget.value)}
                                        placeholder="https://motelyjaml-pi.8pi.me"
                                    />
                                )}

                                {searchEngineMode === 'browser-wasm' && searchMode !== 'funny' && (
                                    <Group grow gap="xs">
                                        <TextInput
                                            label="Threads"
                                            size="xs"
                                            value={String(wasmThreadCount)}
                                            onChange={(e) => {
                                                const v = parseInt(e.currentTarget.value, 10);
                                                if (Number.isNaN(v)) return;
                                                const clamped = Math.max(1, Math.min(v, 32));
                                                setWasmThreadCount(clamped);
                                            }}
                                        />
                                    </Group>
                                )}

                                {searchMode === 'quick' && (
                                    <Group grow gap="xs">
                                        <Select
                                            label="Seed count"
                                            size="xs"
                                            value={quickSeedCount}
                                            onChange={(value) => setQuickSeedCount((value as typeof quickSeedCount) ?? '1k')}
                                            data={[
                                                { value: 'single', label: 'Single' },
                                                { value: '1k', label: '1K' },
                                                { value: '100k', label: '100K' },
                                                { value: '1m', label: '1M' },
                                                { value: '10m', label: '10M' },
                                            ]}
                                        />
                                        {quickSeedCount === 'single' && (
                                            <TextInput
                                                label="Seed"
                                                size="xs"
                                                value={quickSeedInput}
                                                onChange={(e) => setQuickSeedInput(e.currentTarget.value.toUpperCase())}
                                                placeholder="TACO1111"
                                            />
                                        )}
                                        <TextInput
                                            label="Batch size"
                                            size="xs"
                                            value={String(wasmBatchSize)}
                                            onChange={(e) => {
                                                const v = parseInt(e.currentTarget.value, 10);
                                                if (Number.isNaN(v)) return;
                                                const clamped = Math.max(1, Math.min(v, 4));
                                                setWasmBatchSize(clamped);
                                            }}
                                        />
                                    </Group>
                                )}

                                {searchMode === 'sequential' && (
                                    <Group grow gap="xs">
                                        <TextInput
                                            label="Batch size"
                                            size="xs"
                                            value={String(wasmBatchSize)}
                                            onChange={(e) => {
                                                const v = parseInt(e.currentTarget.value, 10);
                                                if (Number.isNaN(v)) return;
                                                const clamped = Math.max(1, Math.min(v, 4));
                                                setWasmBatchSize(clamped);
                                            }}
                                        />
                                        <TextInput
                                            label="Start seed"
                                            size="xs"
                                            value={sequentialStartSeed}
                                            onChange={(e) => setSequentialStartSeed(e.currentTarget.value.toUpperCase())}
                                        />
                                        <TextInput
                                            label="End seed"
                                            size="xs"
                                            value={sequentialEndSeed}
                                            onChange={(e) => setSequentialEndSeed(e.currentTarget.value.toUpperCase())}
                                        />
                                    </Group>
                                )}

                                {searchMode === 'funny' && (
                                    <Stack gap={6}>
                                        <SegmentedControl
                                            size="xs"
                                            value={funnyMode}
                                            onChange={(value) => setFunnyMode(value as 'palindrome' | 'keyword')}
                                            data={[
                                                { label: 'Palindromes', value: 'palindrome' },
                                                { label: 'Keywords', value: 'keyword' },
                                            ]}
                                        />
                                        {funnyMode === 'keyword' && (
                                            <Stack gap={4}>
                                                {funnyKeywords.map((keyword, idx) => (
                                                    <TextInput
                                                        key={`keyword-${idx}`}
                                                        size="xs"
                                                        label={idx === 0 ? 'Keyword(s)' : undefined}
                                                        value={keyword}
                                                        onChange={(e) => {
                                                            const next = [...funnyKeywords];
                                                            next[idx] = e.currentTarget.value.toUpperCase();
                                                            setFunnyKeywords(next);
                                                        }}
                                                        placeholder="JOKER"
                                                    />
                                                ))}
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    onClick={() => setFunnyKeywords([...funnyKeywords, ''])}
                                                >
                                                    + add another
                                                </Button>
                                            </Stack>
                                        )}
                                    </Stack>
                                )}
                            </Stack>
                        </Paper>
                    </>
                )}
                {!isJamlView && (
                    <>
                        <Group grow gap="xs" mb="xs">
                            <Box flex={1}>
                                <SeedInputAutoComplete
                                    seed={seed}
                                    setSeed={setSeed}
                                />
                            </Box>
                            <Box flex={1}>
                                <NumberInput
                                    label={'Max Ante'}
                                    value={maxAnte}
                                    onChange={(val) => {
                                        const newMax = Number(val) || 8;
                                        setMaxAnte(Math.max(minAnte, Math.min(newMax, 39)));
                                    }}
                                    min={minAnte}
                                    max={39}
                                    size="sm"
                                />
                            </Box>
                        </Group>
                        <Group align={'flex-end'} grow>
                            <Select
                                label={'Choose Deck'}
                                value={deck}
                                onChange={(value) => {
                                    if (value) setDeck(value);
                                }}
                                size="sm"
                                flex={1}
                                data={[
                                    "Red Deck",
                                    "Blue Deck",
                                    "Yellow Deck",
                                    "Green Deck",
                                    "Black Deck",
                                    "Magic Deck",
                                    "Nebula Deck",
                                    "Ghost Deck",
                                    "Abandoned Deck",
                                    "Checkered Deck",
                                    "Zodiac Deck",
                                    "Painted Deck",
                                    "Anaglyph Deck",
                                    "Plasma Deck",
                                    "Erratic Deck"
                                ]}
                                leftSection={deck ? <DeckBackIcon deckName={deck} /> : null}
                            />
                            <Select
                                label={'Choose Stake'}
                                value={stake}
                                onChange={(value) => {
                                    if (value) setStake(value);
                                }}
                                size="sm"
                                flex={1}
                                data={[
                                    "White Stake",
                                    "Red Stake",
                                    "Green Stake",
                                    "Black Stake",
                                    "Blue Stake",
                                ]}
                                leftSection={stake ? <StakeChipIcon stakeName={stake} /> : null}
>>>>>>> Stashed changes
                            />
                        </Group>
                        <InputLabel>Cards per Ante</InputLabel>
                        <Button.Group w={'100%'} mb="xs">
                            <Button variant="default" size="sm" onClick={() => setCardsPerAnte(50)}>50</Button>
                            <Button variant="default" size="sm" onClick={() => setCardsPerAnte(Math.max(cardsPerAnte - 50, 0))}>-50</Button>
                            <Button.GroupSection flex={1} variant="default" miw={60} style={{ fontSize: 'var(--mantine-font-size-sm)', padding: '2px 8px', fontWeight: 800, textAlign: 'center' }}>
                                {cardsPerAnte}
                            </Button.GroupSection>
                            <Button variant="default" size="sm"
                                onClick={() => setCardsPerAnte(Math.min(cardsPerAnte + 50, 1000))}>+50</Button>
                            <Button variant="default" size="sm" onClick={() => setCardsPerAnte(1000)}>1000</Button>
                        </Button.Group>
                        <InputLabel> Cards per Misc source</InputLabel>
                        <Button.Group w={'100%'} mb="xs">
                            <Button variant="default" size="sm" onClick={() => setMiscMaxSource(15)}>15</Button>
                            <Button variant="default" size="sm" onClick={() => setMiscMaxSource(Math.max(maxMiscCardSource - 5, 0))}>-5</Button>
                            <Button.GroupSection flex={1} variant="default" miw={60} style={{ fontSize: 'var(--mantine-font-size-sm)', padding: '2px 8px', fontWeight: 800, textAlign: 'center' }}>
                                {maxMiscCardSource}
                            </Button.GroupSection>
                            <Button variant="default" size="sm"
                                onClick={() => setMiscMaxSource(Math.min(maxMiscCardSource + 5, 100))}>+5</Button>
                            <Button variant="default" size="sm" onClick={() => setMiscMaxSource(100)}>100</Button>
                        </Button.Group>
                        <Group grow gap="xs" mb="xs">
                            <NativeSelect
                                label={'Version'}
                                value={version}
                                onChange={(e) => setVersion(e.currentTarget.value)}
                                size="sm"
                            >
                                <option value="10106">1.0.1f</option>
                                <option value="10103">1.0.1c</option>
                                <option value="10014">1.0.0n</option>
                            </NativeSelect>
                            <Box>
                                <Text mb={'xs'} fz={'sm'}>Joker Spoilers</Text>
                                <Tooltip label="Cards that give jokers, are replaced with the joker the card would give."
                                    refProp="rootRef">
                                    <Switch
                                        size={'md'}
                                        checked={showCardSpoilers}
                                        thumbIcon={showCardSpoilers ? (<IconJoker size={12} color={'black'} />) : (
                                            <IconPlayCard size={12} color={'black'} />)}
                                        onChange={() => setShowCardSpoilers(!showCardSpoilers)}
                                    />
                                </Tooltip>
                            </Box>
                            <Box id="setting-quick-reroll">
                                <Text mb={'xs'} fz={'sm'}>Quick Reroll</Text>
                                <Tooltip label="Long pressing a card in the shop queue, will reroll that card."
                                    refProp="rootRef">
                                    <Switch
                                        size={'md'}
                                        checked={useCardPeek}
                                        onChange={() => setUseCardPeek(!useCardPeek)}
                                    />
                                </Tooltip>
                            </Box>
                        </Group>
                    </>
                )}
            </AppShell.Section>
<<<<<<< Updated upstream
            <AppShell.Section id="tool-buttons" mb="md" h={'fit-content'}>
                <Stack>
                    <Button
                        id="analyze-button"
                        onClick={handleAnalyzeClick}
                        disabled={!hasSettingsChanged}
                        color={hasSettingsChanged ? "green" : "gray"}

                    >
                        Analyze Seed
                    </Button>
                    {/*<Button*/}
                    {/*    id="features-button"*/}
                    {/*    color={theme.colors.grape[9]}*/}
                    {/*    onClick={() => {*/}
                    {/*        GaEvent('view_features');*/}
                    {/*        openFeaturesModal()*/}
                    {/*    }}*/}
                    {/*>*/}
                    {/*    Features*/}
                    {/*</Button>*/}
                    <Button id="unlocks-button" color={theme.colors.blue[9]} onClick={() => openSelectOptionModal()}>
                        Modify Unlocks
                    </Button>
                    <Group grow>
                        <Button
                            id="snapshot-button"
                            color={theme.colors.cyan[9]}
                            onClick={() => {
                                openSnapshotModal();
                                GaEvent('view_seed_snapshot');
                            }}
=======
            <AppShell.Section
                id="tool-buttons"
                mt="auto"
                pb="xs"
                style={{
                    flex: '0 0 auto',
                    borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]}`,
                    paddingTop: 'var(--mantine-spacing-xs)'
                }}
            >
                <Stack gap="xs">
                    {!isJamlView && (
                        <Button
                            id="analyze-button"
                            onClick={handleAnalyzeClick}
                            color="green"
                            size="sm"
                            fullWidth
>>>>>>> Stashed changes
                        >
                            Analyze Seed
                        </Button>
<<<<<<< Updated upstream
                        <Button color={theme.colors.red[9]} variant={'filled'} onClick={() => reset()}>
                            Reset
                        </Button>
                    </Group>

=======
                    )}
                    {isJamlView && (
                        <>
                            <Button
                                id="analyze-button"
                                onClick={handleJamlSearchClick}
                                color="green"
                                size="sm"
                                fullWidth
                                leftSection={<IconSearch size={16} />}
                            >
                                Search Seeds
                            </Button>
                            <Button
                                id="import-seeds-button"
                                onClick={openBulkSeeds}
                                color="blue"
                                variant="light"
                                size="sm"
                                fullWidth
                                leftSection={<IconUpload size={16} />}
                            >
                                Import Seeds
                            </Button>
                        </>
                    )}
                    {!isJamlView && (
                        <>
                            <Button
                                id="features-button"
                                color="grape"
                                onClick={() => {
                                    GaEvent('view_features');
                                    openFeaturesModal()
                                }}
                                size="sm"
                                fullWidth
                            >
                                Features
                            </Button>
                            <Button color="blue" onClick={() => openSelectOptionModal()} size="sm" fullWidth>
                                Modify Unlocks
                            </Button>
                            <Group grow gap="xs" align="stretch">
                                <Button
                                    id="snapshot-button"
                                    color="cyan"
                                    onClick={() => {
                                        openSnapshotModal();
                                        GaEvent('view_seed_snapshot');
                                    }}
                                    size="sm"
                                >
                                    Seed Summary
                                </Button>
                                <Button color="red" variant={'filled'} onClick={() => reset()} size="sm">
                                    Reset
                                </Button>
                            </Group>
                        </>
                    )}
                    {isJamlView && (
                        <Button color="red" variant={'filled'} onClick={() => reset()} size="sm" fullWidth>
                            Reset
                        </Button>
                    )}
>>>>>>> Stashed changes
                </Stack>
            </AppShell.Section>
        </AppShell.Navbar>
    )
}
