import {
    AppShell,
    Box,
    Button,
    Divider,
    Group,
    Image,
    InputLabel,
    NativeSelect,
    NumberInput,
    Paper,
    SegmentedControl,
    Select,
    Stack,
    Switch,
    Text,
    TextInput,
    Tooltip,
    useMantineTheme,
} from "@mantine/core";
import {
    IconJoker,
    IconLayout,
    IconPlayCard,
    IconSearch,
    IconSettings,
    IconUpload,
} from "@tabler/icons-react";
import React from "react";
import { useCardStore } from "../../../modules/state/store.ts";
import { useJamlSearch } from "../../../modules/state/jamlSearchContext.tsx";
import { GaEvent } from "../../../modules/useGA.ts";
import SeedInputAutoComplete from "../../SeedInputAutoComplete.tsx";
import UnlocksModal from "../../unlocksModal.tsx";
import FeaturesModal from "../../FeaturesModal.tsx";
import { DrawSimulatorModal } from "../../DrawSimulatorModal.tsx";
import { RerollCalculatorModal } from "../../RerollCalculatorModal.tsx";

export default function Navbar() {
    const theme = useMantineTheme();
    const viewMode = useCardStore(state => state.applicationState.viewMode);
    const isJamlView = viewMode === 'jaml';
    
    // JAML search state from context
    const {
        selectedFilterKey,
        setSelectedFilterKey,
        setCustomJamlText,
    } = useJamlSearch();
    const jamlFileInputRef = React.useRef<HTMLInputElement>(null);
    const setViewMode = useCardStore(state => state.setViewMode);

    const analyzeState = useCardStore(state => state.engineState);
    const { seed, deck, stake, gameVersion: version, cardsPerAnte } = analyzeState;
    const showCardSpoilers = useCardStore(state => state.applicationState.showCardSpoilers);
    const useCardPeek = useCardStore(state => state.applicationState.useCardPeek);
    const setUseCardPeek = useCardStore(state => state.setUseCardPeek);
    const maxMiscCardSource = useCardStore(state => state.applicationState.maxMiscCardSource);
    const setMiscMaxSource = useCardStore(state => state.setMiscMaxSource);
    const maxAnte = useCardStore(state => state.applicationState.selectedAnte ?? 8);

    const setSeed = useCardStore(state => state.setSeed);
    const setDeck = useCardStore(state => state.setDeck);
    const setStake = useCardStore(state => state.setStake);
    const setVersion = useCardStore(state => state.setGameVersion);
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
    const setSelectedAnte = useCardStore(state => state.setSelectedAnte);

    const handleJamlSearchClick = () => {
        // In JAML mode, trigger the search by setting start=true
        // The JamlView component will detect this and start the search
        setStart(true);
    }

    const handleAnalyzeClick = () => {
        setStart(true);
    };

    const openBulkSeeds = () => {
        // TODO: wire bulk seed import modal (e.g. useDisclosure + Modal with textarea)
    };

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
                                </Group>
                            )
                        },
                        {
                            value: 'bp-settings',
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
                            />
                        </Group>

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
                                        const n = Number(val) || 8;
                                        setSelectedAnte(Math.max(1, Math.min(n, 39)));
                                    }}
                                    min={1}
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
            <AppShell.Section
                id="tool-buttons"
                mt="auto"
                pb="xs"
                style={{
                    flex: '0 0 auto',
                    borderTop: `1px solid ${theme.colors.dark[4]}`,
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
                        >
                            Analyze Seed
                        </Button>
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
                </Stack>
            </AppShell.Section>
        </AppShell.Navbar>
    )
}
