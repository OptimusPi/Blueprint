import {
    AppShell,
    Box,
    Button,
    Group,
    InputLabel,
    NativeSelect,
    NumberInput,
    SegmentedControl,
    Select,
    Stack,
    Switch,
    Text,
    Tooltip,
    useMantineTheme
} from "@mantine/core";
import {DeckBackIcon} from "../../Rendering/deckStakeIcons.tsx";
import {StakeChipIcon} from "../../Rendering/deckStakeIcons.tsx";
import React from "react";
import {
    IconFileText,
    IconJoker,
    IconLayout,
    IconListSearch,
    IconPlayCard
} from "@tabler/icons-react";
import {useCardStore} from "../../../modules/state/store.ts";
import UnlocksModal from "../../unlocksModal.tsx";
import FeaturesModal from "../../FeaturesModal.tsx";
import {RerollCalculatorModal} from "../../RerollCalculatorModal.tsx";
import {GaEvent} from "../../../modules/useGA.ts";
import SeedInputAutoComplete from "../../SeedInputAutoComplete.tsx";


export default function NavBar() {
    const theme = useMantineTheme();
    const viewMode = useCardStore(state => state.applicationState.viewMode);
    const setViewMode = useCardStore(state => state.setViewMode);
    const settingsOpen = useCardStore(state => state.applicationState.settingsOpen);
    const toggleSettings = useCardStore(state => state.toggleSettings);

    const analyzeState = useCardStore(state => state.immolateState);
    const { seed, deck, stake, gameVersion: version, minAnte, maxAnte, cardsPerAnte } = analyzeState;
    const showCardSpoilers = useCardStore(state => state.applicationState.showCardSpoilers);
    const useCardPeek = useCardStore(state => state.applicationState.useCardPeek);
    const setUseCardPeek = useCardStore(state => state.setUseCardPeek);
    const maxMiscCardSource = useCardStore(state => state.applicationState.maxMiscCardSource);
    const setMiscMaxSource = useCardStore(state => state.setMiscMaxSource);

    const setSeed = useCardStore(state => state.setSeed);
    const setDeck = useCardStore(state => state.setDeck);
    const setStake = useCardStore(state => state.setStake);
    const setVersion = useCardStore(state => state.setGameVersion);
    const setMinAnte = useCardStore(state => state.setMinAnte);
    const setMaxAnte = useCardStore(state => state.setMaxAnte);
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

    const handleAnalyzeClick = () => {
        setStart(true);
    }
    
    const handleViewModeChange = (value: string) => {
        // If clicking JAML (custom), close the menu
        if (value === 'custom') {
            toggleSettings(); // Close the menu
        } else {
            // If switching from JAML to another view, switch to Blueprint instead
            const nextView = viewMode === 'custom' ? 'blueprint' : value;
            setViewMode(nextView);
        }
        setViewMode(value);
    }

    return (
        <AppShell.Navbar 
            p="xs" 
            hidden={!settingsOpen}
            style={{ 
                minWidth: '250px', 
                maxWidth: 'min(450px, 100%)',
                overscrollBehavior: 'contain',
                overflowX: 'hidden',
                height: '100vh',
                maxHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <UnlocksModal />
            <FeaturesModal />
            <RerollCalculatorModal
                opened={rerollCalculatorModalOpen}
                onClose={closeRerollCalculatorModal}
                targetIndex={rerollCalculatorMetadata?.index ?? 0}
                metaData={rerollCalculatorMetadata}
            />
            <AppShell.Section px={0} style={{ flex: '0 0 auto' }}>
                <SegmentedControl
                    fullWidth
                    value={viewMode}
                    onChange={handleViewModeChange}
                    data={[
                        {
                            value: 'blueprint',
                            label: (
                                <Group gap={4} wrap="nowrap" align="center">
                                    <IconLayout size={12} />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>Blueprint</Text>
                                </Group>
                            )
                        },
                        {
                            value: 'simple',
                            label: (
                                <Group gap={4} wrap="nowrap" align="center">
                                    <IconListSearch size={12} />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>Efficiency</Text>
                                </Group>
                            )
                        },
                        {
                            value: 'text',
                            label: (
                                <Group gap={4} wrap="nowrap" align="center">
                                    <IconFileText size={12} />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>Text</Text>
                                </Group>
                            )
                        },
                        {
                            value: 'custom',
                            label: (
                                <Group gap={4} wrap="nowrap" align="center">
                                    <img 
                                        src="/images/JAML.ico" 
                                        alt="JAML" 
                                        style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                                    />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>JAML</Text>
                                </Group>
                            )
                        }
                    ]}
                    mb="xs"
                    size="sm"
                />
            </AppShell.Section>
            <AppShell.Section 
                pr="xs" 
                grow 
                my={0} 
                style={{ 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    overscrollBehavior: 'contain',
                    flex: '1 1 auto',
                    minHeight: 0, // Important for flex scroll
                }}
            >
                <Group grow gap="xs" mb="xs">
                    <Box flex={1}>
                        <SeedInputAutoComplete
                            seed={seed}
                            setSeed={setSeed}
                        />
                    </Box>
                    <Box flex={1}>
                        <Group gap="xs" wrap="nowrap" align="flex-end">
                            <NumberInput
                                label={'Min Ante'}
                                value={minAnte}
                                onChange={(val) => {
                                    const newMin = Number(val) || 0;
                                    setMinAnte(Math.max(0, Math.min(newMin, maxAnte)));
                                }}
                                min={0}
                                max={maxAnte}
                                size="sm"
                                w="50%"
                                styles={{
                                    input: {
                                        height: 'calc(var(--input-height-sm) + 4px)',
                                        fontSize: 'var(--mantine-font-size-sm)'
                                    },
                                    label: {
                                        fontSize: 'var(--mantine-font-size-sm)'
                                    }
                                }}
                            />
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
                                w="50%"
                                styles={{
                                    input: {
                                        height: 'calc(var(--input-height-sm) + 4px)',
                                        fontSize: 'var(--mantine-font-size-sm)'
                                    },
                                    label: {
                                        fontSize: 'var(--mantine-font-size-sm)'
                                    }
                                }}
                            />
                        </Group>
                    </Box>
                </Group>
                <Group grow gap="xs" mb="xs">
                    <Select
                        label={'Deck'}
                        value={deck}
                        onChange={(value) => {
                            if (value) setDeck(value);
                        }}
                        size="sm"
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
                        styles={{
                            input: {
                                height: 'calc(var(--input-height-sm) + 4px)',
                                fontSize: 'var(--mantine-font-size-sm)'
                            },
                            label: {
                                fontSize: 'var(--mantine-font-size-sm)'
                            },
                            option: {
                                fontSize: 'var(--mantine-font-size-sm)'
                            }
                        }}
                    />
                    <Select
                        label={'Stake'}
                        value={stake}
                        onChange={(value) => {
                            if (value) setStake(value);
                        }}
                        size="sm"
                        data={[
                            "White Stake",
                            "Red Stake",
                            "Green Stake",
                            "Black Stake",
                            "Blue Stake",
                            "Purple Stake",
                            "Orange Stake",
                            "Gold Stake"
                        ]}
                        leftSection={stake ? <StakeChipIcon stakeName={stake} /> : null}
                        styles={{
                            input: {
                                height: 'calc(var(--input-height-sm) + 4px)',
                                fontSize: 'var(--mantine-font-size-sm)'
                            },
                            label: {
                                fontSize: 'var(--mantine-font-size-sm)'
                            },
                            option: {
                                fontSize: 'var(--mantine-font-size-sm)'
                            }
                        }}
                    />
                </Group>
                <InputLabel fz="sm" mb="xs" mt="xs"> Cards per Ante</InputLabel>
                <Text fz={'sm'} c={'dimmed'} mb="xs">
                    It is recommended to keep this number under 200.
                </Text>
                <Button.Group w={'100%'} mb="xs">
                    <Button variant="default" c={'blue'} size="sm" onClick={() => setCardsPerAnte(50)}>50</Button>
                    <Button variant="default" c={'red'} size="sm" onClick={() => setCardsPerAnte(Math.max(cardsPerAnte - 50, 0))}>-50</Button>
                    <Button.GroupSection flex={1} variant="default" bg={theme.colors.dark[0]} miw={60} style={{ fontSize: 'var(--mantine-font-size-sm)', padding: '2px 8px' }}>
                        {cardsPerAnte}
                    </Button.GroupSection>
                    <Button variant="default" c={'green'} size="sm"
                        onClick={() => setCardsPerAnte(Math.min(cardsPerAnte + 50, 1000))}>+50</Button>
                    <Button variant="default" c={'blue'} size="sm" onClick={() => setCardsPerAnte(1000)}>1000</Button>
                </Button.Group>
                <InputLabel fz="sm" mb="xs"> Cards per Misc source</InputLabel>
                <Text fz={'sm'} c={'dimmed'} mb="xs">
                    It is recommended to keep this number under 50.
                </Text>
                <Button.Group w={'100%'} mb="xs">
                    <Button variant="default" c={'blue'} size="sm" onClick={() => setMiscMaxSource(15)}>15</Button>
                    <Button variant="default" c={'red'} size="sm" onClick={() => setMiscMaxSource(Math.max(maxMiscCardSource - 5, 0))}>-5</Button>
<Button.GroupSection flex={1} variant="default" bg={theme.colors.dark[0]} miw={60} style={{ fontSize: 'var(--mantine-font-size-sm)', padding: '2px 8px' }}>
                    {maxMiscCardSource}
                </Button.GroupSection>
                    <Button variant="default" c={'green'} size="sm"
                        onClick={() => setMiscMaxSource(Math.min(maxMiscCardSource + 5, 100))}>+5</Button>
                    <Button variant="default" c={'blue'} size="sm" onClick={() => setMiscMaxSource(100)}>100</Button>
                </Button.Group>
                <Group grow gap="xs" mb="xs">
                    <NativeSelect
                        label={'Version'}
                        value={version}
                        onChange={(e) => setVersion(e.currentTarget.value)}
                        size="sm"
                        styles={{
                            input: {
                                height: 'calc(var(--input-height-sm) + 4px)',
                                fontSize: 'var(--mantine-font-size-sm)'
                            },
                            label: {
                                fontSize: 'var(--mantine-font-size-sm)'
                            }
                        }}
                    >
                        <option value="10106">1.0.1f</option>
                        <option value="10103">1.0.1c</option>
                        <option value="10014">1.0.0n</option>
                    </NativeSelect>
                </Group>
                <Group grow gap="xs" mb="xs">
                    <Box>
                        <Text mb={0} fz={'sm'}>Show Joker Spoilers</Text>
                        <Tooltip label="Cards that give jokers, are replaced with the joker the card would give."
                            refProp="rootRef">
                            <Switch
                                size={'sm'}
                                checked={showCardSpoilers}
                                thumbIcon={showCardSpoilers ? (<IconJoker size={12} color={'black'} />) : (
                                    <IconPlayCard size={12} color={'black'} />)}
                                onChange={() => setShowCardSpoilers(!showCardSpoilers)}
                            />
                        </Tooltip>
                    </Box>
                    <Box>
                        <Text mb={0} fz={'sm'}>Quick Reroll</Text>
                        <Tooltip label="Long pressing a card in the shop queue, will reroll that card."
                            refProp="rootRef">
                            <Switch
                                size={'sm'}
                                checked={useCardPeek}
                                onChange={() => setUseCardPeek(!useCardPeek)}
                            />
                        </Tooltip>
                    </Box>
                </Group>
            </AppShell.Section>
            <AppShell.Section my={0} style={{ flex: '0 0 auto' }}>
                <Stack gap="xs">
                    <Button
                        onClick={handleAnalyzeClick}
                        color="green"
                        size="sm"
                        fullWidth
                    >
                        Analyze Seed
                    </Button>
                    <Button
                        color={theme.colors.grape[9]}
                        onClick={() => {
                            GaEvent('view_features');
                            openFeaturesModal()
                        }}
                        size="sm"
                        fullWidth
                    >
                        Features
                    </Button>
                    <Button color={theme.colors.blue[9]} onClick={() => openSelectOptionModal()} size="sm" fullWidth>
                        Modify Unlocks
                    </Button>
                    <Group grow gap="xs" align="stretch">
                        <Button
                            color={theme.colors.cyan[9]}
                            onClick={() => {
                                openSnapshotModal();
                                GaEvent('view_seed_snapshot');
                            }}
                            size="sm"
                        >
                            Seed Summary
                        </Button>
                        <Button color={theme.colors.red[9]} variant={'filled'} onClick={() => reset()} size="sm">
                            Reset
                        </Button>
                    </Group>

                </Stack>
            </AppShell.Section>
        </AppShell.Navbar>
    )
}
