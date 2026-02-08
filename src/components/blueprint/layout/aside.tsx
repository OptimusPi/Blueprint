import React, {useState, useRef, useEffect} from "react";
import {useMediaQuery} from "@mantine/hooks";
import {
    ActionIcon,
    AppShell,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Divider,
    Grid,
    Group,
    NumberInput,
    Select,
    Stack,
    Tabs,
    Text,
    Title,
    useMantineTheme
} from "@mantine/core";
import {IconCalendarEvent, IconCards, IconCheck, IconPlayCard, IconShoppingCart, IconX} from "@tabler/icons-react";
import {useCardStore} from "../../../modules/state/store.ts";
import SearchSeedInput from "../../searchInput.tsx";
import MiscCardSourcesDisplay from "../../miscSourcesDisplay.tsx";
import PurchaseTimeline from "../../purchaseTimeline.tsx";
import { EVENT_UNLOCKS } from "../../../modules/const.ts";
import { useSeedResultsContainer } from "../../../modules/state/analysisResultProvider.tsx";
import DeckDisplay from "../../DeckDisplay.tsx";


export function EventsPanel() {
    const theme = useMantineTheme();
    const events = useCardStore(state => state.eventState.events);
    const trackEvent = useCardStore(state => state.trackEvent);
    const removeEvent = useCardStore(state => state.removeEvent);
    const clearEvents = useCardStore(state => state.clearEvents);

    const blindOptions = [
        { value: "smallBlind", label: "Small Blind" },
        { value: "bigBlind", label: "Big Blind" },
        { value: "bossBlind", label: "Boss Blind" }
    ];

    // Track local state for each card's ante and blind selection
    const [selections, setSelections] = useState<{ [key: string]: { ante: string, blind: string } }>(
        EVENT_UNLOCKS.reduce((acc, event) => ({
            ...acc,
            [event.name]: { ante: "1", blind: "bigBlind" }
        }), {})
    );

    const handleAnteChange = (cardName: string, value: string) => {
        setSelections(prev => ({
            ...prev,
            [cardName]: { ...prev[cardName], ante: value }
        }));
    };

    const handleBlindChange = (cardName: string, value: string) => {
        setSelections(prev => ({
            ...prev,
            [cardName]: { ...prev[cardName], blind: value }
        }));
    };

    const isEventTracked = (cardName: string, ante: string, blind: string) => {
        return events.some(e =>
            e.name === cardName &&
            e.ante === parseInt(ante) &&
            e.blind === blind
        );
    };

    const toggleEvent = (cardName: string) => {
        const { ante, blind } = selections[cardName];
        const isAlreadyTracked = isEventTracked(cardName, ante, blind);

        if (isAlreadyTracked) {
            // Find and remove the event
            const index = events.findIndex(e =>
                e.name === cardName &&
                e.ante === parseInt(ante) &&
                e.blind === blind
            );
            if (index !== -1) {
                removeEvent(index);
            }
        } else {
            // Add the event
            trackEvent({
                name: cardName,
                ante: parseInt(ante),
                blind: blind
            });
        }
    };

    return (
        <Stack gap={2}>
            <Group justify="space-between" align="center" gap="xs">
                <Title order={5} fz="xs">Unlock Events</Title>
                {events.length > 0 && (
                    <Button variant="light" color="red" size="xs" onClick={clearEvents}>
                        Clear All Events
                    </Button>
                )}
            </Group>

            <Grid gutter={2}>
                {EVENT_UNLOCKS.map((event) => {
                    const { ante, blind } = selections[event.name];
                    const isTracked = isEventTracked(event.name, ante, blind);

                    return (
                        <Grid.Col span={12} key={event.name}>
                            <Card p="xs" radius="sm" style={{ border: `1px solid ${theme.colors.dark[3]}` }}>
                                <Group justify="space-between" mb={1} gap="xs">
                                    <Group gap={2}>
                                        <IconCalendarEvent size={12}/>
                                        <Text fw={600} size="xs">{event.name}</Text>

                                    </Group>
                                    {isTracked && (
                                        <Badge color="green" size="xs">Tracked</Badge>
                                    )}
                                </Group>

                                <Text size="xs" c="dimmed" mb={2}>{event.condition}</Text>

                                <Group gap={4}>
                                    <NumberInput
                                        size="xs"
                                        label="Ante"
                                        disabled={isTracked}
                                        value={ante}
                                        onChange={(value) => handleAnteChange(event.name, String(value) || "1")}
                                        w={70}
                                    />
                                    <Select
                                        size="xs"
                                        label="Blind"
                                        disabled={isTracked}
                                        value={blind}
                                        onChange={(value) => handleBlindChange(event.name, value || "bigBlind")}
                                        data={blindOptions}
                                        w={100}
                                    />
                                    <Button
                                        variant={isTracked ? "outline" : "filled"}
                                        color={isTracked ? "red" : "blue"}
                                        ml="auto"
                                        size="xs"
                                        onClick={() => toggleEvent(event.name)}
                                        leftSection={isTracked ? undefined : <IconCheck size={12}/>}
                                    >
                                        {isTracked ? "Remove" : "Activate"}
                                    </Button>
                                </Group>
                            </Card>
                        </Grid.Col>
                    );
                })}
            </Grid>
        </Stack>
    );
}


export function Aside() {
    const [addedSourceNames, setAddedSourceNames] = React.useState<Set<string>>(new Set());
    const asideOpen = useCardStore(state => state.applicationState.asideOpen);
    const viewMode = useCardStore(state => state.applicationState.viewMode);

    // Resizable aside state
    const asideRef = useRef<HTMLDivElement>(null);
    const resizeHandleRef = useRef<HTMLDivElement>(null);
    const [asideWidth, setAsideWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!isResizing) return;
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            setAsideWidth(Math.max(250, Math.min(800, newWidth)));
        };
        const handleMouseUp = () => setIsResizing(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    React.useEffect(() => {
        const handleCustomSourcesUpdated = (event: Event) => {
            const customEvent = event as CustomEvent;
            setAddedSourceNames(customEvent.detail.addedSourceNames);
        };

        window.addEventListener('customSourcesUpdated', handleCustomSourcesUpdated);
        return () => {
            window.removeEventListener('customSourcesUpdated', handleCustomSourcesUpdated);
        };
    }, []);
    const SeedResults = useSeedResultsContainer()
    const selectedAnte = useCardStore(state => state.applicationState.selectedAnte);
    const anteData = SeedResults?.antes[selectedAnte];
    const miscSources = anteData?.miscCardSources;
    const voucherQueue = anteData?.voucherQueue;
    const tagsQueue = anteData?.tagsQueue;
    const bossesQueue = anteData?.bossQueue;
    const wheelQueue = anteData?.wheelQueue;
    const auraQueue = anteData?.auraQueue;
    const boosterQueue = anteData?.packQueue
    const buys = useCardStore(state => state.shoppingState.buys);
    const sells = useCardStore(state => state.shoppingState.sells);
    const transactionsCount = Object.keys(buys).length + Object.keys(sells).length;
    const blinds = Object
        .entries(anteData?.blinds ?? {})
        .reduce((acc, [k, v]) => {
            return { ...acc, [k]: v.deck };
        }, {})
    const theme = useMantineTheme();

    const tab = useCardStore(state => state.applicationState.asideTab);
    const setTab = useCardStore(state => state.setAsideTab);
    const media = useMediaQuery("(min-width: 600px)");

    return (
        <AppShell.Aside
            ref={asideRef}
            p="xs"
            hidden={!asideOpen}
            style={{
                width: `${asideWidth}px`,
                minWidth: '250px',
                maxWidth: 'min(800px, calc(100% - 20px))',
                overscrollBehavior: 'contain',
                overflowX: 'hidden'
            }}
        >
            <Box
                ref={resizeHandleRef}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                    zIndex: 10,
                    transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (!isResizing) {
                        e.currentTarget.style.backgroundColor = theme.colors.blue[6];
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isResizing) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
            />
            {!media && (
                <AppShell.Section hiddenFrom={'sm'} mb="xs">
                    <SearchSeedInput/>
                </AppShell.Section>
            )}
            <AppShell.Section>
                <Text size="sm" fw={500} mb="xs">Card Sources</Text>
                <Divider mb="xs" />
                <Tabs value={tab} onChange={(e) => setTab(`${e}`)}>
                    <Tabs.List grow mb="xs" style={{ overflow: 'visible', minWidth: 0 }}>
                        <Tabs.Tab
                            id="aside-tab-sources"
                            value="sources"
                            leftSection={<IconCards size={12}/>}
                            style={{ overflow: 'visible', minWidth: 0 }}
                        >
                            Card Sources
                        </Tabs.Tab>
                        <Tabs.Tab
                            id="aside-tab-purchases"
                            value="purchases"
                            leftSection={<IconShoppingCart size={12}/>}
                            rightSection={
                                <Badge size="xs" circle variant="filled" color={theme.colors.blue[7]} style={{ flexShrink: 0, marginLeft: '4px' }}>
                                    {transactionsCount}
                                </Badge>
                            }
                            style={{ overflow: 'visible', minWidth: 0, paddingRight: '8px' }}
                        >
                            Purchases
                        </Tabs.Tab>
                        <Tabs.Tab
                            id="aside-tab-deck"
                            value="deck"
                            leftSection={<IconPlayCard size={16} />}
                        >
                            Deck
                        </Tabs.Tab>
                        <Tabs.Tab id="aside-tab-events" value="events">
                            Events
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>
            </AppShell.Section>
            <AppShell.Section style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
                <Tabs value={tab}>
                    <Tabs.Panel value="sources" maw={'100%'}>
                        {SeedResults ? (
                            <MiscCardSourcesDisplay
                                miscSources={miscSources}
                                bossQueue={bossesQueue}
                                tagQueue={tagsQueue}
                                voucherQueue={voucherQueue}
                                wheelQueue={wheelQueue}
                                auraQueue={auraQueue}
                                boosterQueue={boosterQueue}
                                draws={blinds}
                                onAddSource={(viewMode === 'custom' || viewMode === 'jaml') ? (sourceName, cards, sourceType) => {
                                    // Dispatch custom event that Custom view can listen to
                                    // Use the currently selected ante from the store
                                    const currentAnte = selectedAnte || 1;
                                    // Key format matches MiscCardSourcesDisplay: ${sourceType}-${sourceName}
                                    const sourceKey = `${sourceType}-${sourceName}`;
                                    const isAdded = addedSourceNames.has(sourceKey);
                                    window.dispatchEvent(new CustomEvent('addCustomSource', {
                                        detail: { 
                                            sourceName, 
                                            cards, 
                                            sourceType,
                                            ante: currentAnte,
                                            action: isAdded ? 'remove' : 'add'
                                        }
                                    }));
                                } : undefined}
                                addedSourceNames={(viewMode === 'custom' || viewMode === 'jaml') ? addedSourceNames : undefined}
                            />
                        ) : (
                            <Center h={200}>
                                <Text c="dimmed">Select a seed to view card sources</Text>
                            </Center>
                        )}
                    </Tabs.Panel>
                    <Tabs.Panel value="purchases">
                        <PurchaseTimeline buys={buys} sells={sells} />
                    </Tabs.Panel>
                    <Tabs.Panel value="deck">
                        <DeckDisplay />
                    </Tabs.Panel>
                    <Tabs.Panel value="events">
                        <EventsPanel />
                    </Tabs.Panel>
                </Tabs>
            </AppShell.Section>
        </AppShell.Aside>
    )
}
