import React, { useEffect, useMemo, useState } from "react";
import { Carousel } from "@mantine/carousel";
import {
    Accordion,
    AppShell,
    Badge,
    Box,
    Button,
    Fieldset,
    Flex,
    Group,
    NativeSelect,
    Paper,
    Popover,
    ScrollArea,
    SegmentedControl,
    Stack,
    Tabs,
    Text
} from "@mantine/core";
import { toHeaderCase } from "js-convert-case";
import { useDisclosure, useViewportSize } from "@mantine/hooks";
import { Boss, BoosterPack, Tag as RenderTag, Voucher } from "../../Rendering/gameElements.tsx";
import { BuyMetaData } from "../../../modules/classes/BuyMetaData.ts";
import { BuyWrapper } from "../../buyerWrapper.tsx";
import { LOCATIONS, LOCATION_TYPES, blinds, tagDescriptions } from "../../../modules/const.ts";
import { useCardStore } from "../../../modules/state/store.ts";
import { GameCard } from "../../Rendering/cards.tsx";
import Header from "../layout/header.tsx";
import NavBar from "../layout/navbar.tsx";
import { Aside } from "../layout/aside.tsx";
import Footer from "../layout/footer.tsx";
import HomePage from "../homePage/homepage.tsx";
import Index from "../textView";
import Simple from "../simpleView/simple.tsx";
import JamlView from "../jamlView/JamlView.tsx";
import SnapshotModal from "../snapshotView/SnapshotView.tsx";
import { useSeedResultsContainer } from "../../../modules/state/analysisResultProvider.tsx";
import type { Blinds } from "../../../modules/state/store.ts";
import type { Tag } from "../../../modules/balatrots/enum/Tag.ts";
import type { Ante, Pack } from "../../../modules/GameEngine/CardEngines/Cards.ts";
import type { EmblaCarouselType } from 'embla-carousel';
import { useDownloadSeedResults } from "../../../modules/state/downloadProvider.tsx";

function QueueCarousel({ queue, tabName }: { queue: Array<any>, tabName: string }) {
    const selectedBlind = useCardStore(state => state.applicationState.selectedBlind);
    const selectedSearchResult = useCardStore(state => state.searchState.selectedSearchResult);
    const [embla, setEmbla] = useState<EmblaCarouselType | null>(null);

    useEffect(() => {
        if (!embla) return;


        if (embla && selectedSearchResult) {
            if (selectedSearchResult?.location === LOCATIONS.SHOP && selectedSearchResult?.index) {
                embla.scrollTo(selectedSearchResult.index - 1)
            }
        }

        return () => {

        }

    }, [embla, selectedSearchResult])

    return (
        <Box>
            <Carousel
                getEmblaApi={setEmbla}
                slideGap={{ base: 'xs', sm: 'sm' }}
                slideSize={85}
                withControls={false}
                height={175}
                emblaOptions={{ dragFree: true, containScroll: "keepSnaps" }}
                type={'container'}
            >
                {
                    queue.map((card: any, index: number) => {
                        return (
                            <Carousel.Slide h={190} key={index}>
                                <BuyWrapper
                                    metaData={new BuyMetaData({
                                        location: LOCATIONS.SHOP,
                                        locationType: LOCATION_TYPES.SHOP,
                                        index: index,
                                        ante: tabName,
                                        blind: selectedBlind,
                                        link: `https://balatrowiki.org/w/${card.name}`,
                                        card: card,
                                        name: card.name
                                    })
                                    }
                                >
                                    <GameCard card={card} />
                                </BuyWrapper>
                            </Carousel.Slide>
                        )
                    })
                }
            </Carousel>
        </Box>
    )
}

function AntePanel({ ante, tabName, timeTravelVoucherOffset }: {
    ante: Ante,
    tabName: string,
    timeTravelVoucherOffset: number
}) {
    const queue = ante.queue;
    const selectedBlind = useCardStore(state => state.applicationState.selectedBlind);
    const packs = ante.blinds[selectedBlind].packs;
    return (
        <Tabs.Panel w={'100%'} value={tabName}>
            <Box h={'100%'} p={{ base: 'xs', sm: 'xs' }}>
                <Stack gap={4} mb={'xs'}>
                    <Fieldset flex={1} legend={'Shop'}>
                        <QueueCarousel queue={queue} tabName={tabName} />
                    </Fieldset>
                    <Group align="stretch" gap="xs" wrap="nowrap">
                        <Fieldset legend={'Voucher'} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <Stack gap={4} align="center">
                                <BuyWrapper
                                    bottomOffset={20}
                                    topOffset={20}
                                    metaData={
                                        new BuyMetaData({
                                            location: LOCATIONS.VOUCHER,
                                            locationType: LOCATIONS.VOUCHER,
                                            ante: String(Number(tabName) - timeTravelVoucherOffset),
                                            blind: selectedBlind,
                                            itemType: 'voucher',
                                            name: ante.voucher ?? "",
                                            index: 0,
                                            link: `https://balatrowiki.org/w/vouchers`
                                        })
                                    }
                                >
                                    <Voucher voucherName={ante.voucher} />
                                </BuyWrapper>
                                <Text ta={'center'} fz={'xs'} lineClamp={1}>{ante.voucher}</Text>
                            </Stack>
                        </Fieldset>
                        {packs.slice(0, 2).map((pack: Pack, index: number) => (
                            <Fieldset key={String(pack.name) + String(index)} legend={toHeaderCase(String(pack.name))} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Stack gap={2} style={{ flex: 1 }}>
                                    <Group justify="center" gap="xs">
                                        <Badge color={'blue'} size="xs">Cards: {pack.size}</Badge>
                                        <Badge size="xs">Pick: {pack.choices}</Badge>
                                    </Group>
                                    <Box w={'100%'} style={{ flex: 1 }}>
                                        <Carousel
                                            type={'container'}
                                            slideSize={85}
                                            slideGap={{ base: 'xs' }}
                                            withControls={false}
                                            height={150}
                                            emblaOptions={{
                                                dragFree: true,
                                                containScroll: "keepSnaps",
                                                align: 'start'
                                            }}
                                        >
                                            {pack.cards.map((card, cardIndex) => (
                                                <Carousel.Slide key={cardIndex}>
                                                    <BuyWrapper
                                                        key={cardIndex}
                                                        metaData={
                                                            new BuyMetaData({
                                                                location: pack.name,
                                                                locationType: LOCATION_TYPES.PACK,
                                                                index: cardIndex,
                                                                ante: tabName,
                                                                blind: selectedBlind,
                                                                itemType: 'card',
                                                                link: `https://balatrowiki.org/w/${card!.name}`,
                                                                card: card,
                                                                name: card!.name
                                                            })
                                                        }
                                                    >
                                                        <GameCard card={card!} />
                                                    </BuyWrapper>
                                                </Carousel.Slide>
                                            ))}
                                        </Carousel>
                                    </Box>
                                </Stack>
                            </Fieldset>
                        ))}
                    </Group>
                </Stack>
            </Box>
        </Tabs.Panel>
    )
}
type CustomDetailsType = {
    [K in Tag]?: { renderer: (ante: Ante, navigateToMiscSource: (source: string) => void) => React.ReactNode };
};
const CustomDetails: CustomDetailsType = {
    "Uncommon Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'uncommonTag')?.cards.slice(0, 1).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('uncommonTag')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Rare Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'rareTag')?.cards.slice(0, 1).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('rareTag')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Charm Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'arcanaPack')?.cards.slice(0, 5).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('arcanaPack')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Boss Tag": {
        renderer: (ante: Ante) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.bossQueue[0]
                        }
                    </Text>
                </Stack>

            )
        }
    },
    "Voucher Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.voucherQueue[0]
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('Vouchers')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Top-up Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'topUpTag')?.cards.slice(0, 5).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('topUpTag')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Ethereal Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'spectralPack')?.cards.slice(0, 5).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('spectralPack')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Standard Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'standardPack')?.cards.slice(0, 5).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('standardPack')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Meteor Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'celestialPack')?.cards.slice(0, 5).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('celestialPack')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
    "Buffoon Tag": {
        renderer: (ante: Ante, navigateToMiscSource) => {
            return (
                <Stack>
                    <Text>
                        {
                            ante.miscCardSources.find(({ name }) => name === 'buffoonPack')?.cards.slice(0, 4).map(({ name }) => name).join(', ')
                        }
                    </Text>
                    <Button onClick={() => navigateToMiscSource('buffoonPack')}>
                        More Info
                    </Button>
                </Stack>

            )
        }
    },
}

function TagDisplay({ tag, ante }: { tag: Tag, ante: Ante }) {
    const [opened, { close, open }] = useDisclosure(false);
    const navigateToMiscSource = useCardStore(state => state.navigateToMiscSource);
    return (
        <Popover opened={opened}>
            <Popover.Target>
                <Box onMouseEnter={open} onMouseLeave={close}>
                    <RenderTag tagName={tag} />
                </Box>
            </Popover.Target>
            <Popover.Dropdown maw={400}>
                <Box onMouseEnter={open} onMouseLeave={close} w={'100%'}>
                    <Text ta={'center'}>{tag}</Text>
                    <Text>
                        {tagDescriptions[tag] ?? 'No description available'}
                    </Text>
                    {
                        CustomDetails[tag] &&
                        CustomDetails[tag].renderer(ante, navigateToMiscSource)
                    }
                </Box>
            </Popover.Dropdown>
        </Popover>
    )


}

function SeedExplorer() {
    const { width } = useViewportSize();
    const SeedResults = useSeedResultsContainer()
    const selectedAnte = useCardStore(state => state.applicationState.selectedAnte);
    const setSelectedAnte = useCardStore(state => state.setSelectedAnte);

    const selectedBlind = useCardStore(state => state.applicationState.selectedBlind);
    const setSelectedBlind = useCardStore(state => state.setSelectedBlind);

    // const buys = useCardStore(state => state.shoppingState.buys);
    const timeTravelVoucherOffset = useMemo(() => {
        return 0
    }, []);

    if (!SeedResults) {
        return null;
    }

    const pool = SeedResults.antes
    const availableAntes = Object.keys(pool).map(Number).sort((a, b) => a - b);

    // Ensure selectedAnte is valid, default to 1 if undefined/null or not found (but allow ante 0 if explicitly selected)
    let itemPool = selectedAnte;
    if (selectedAnte == null || selectedAnte === undefined || !pool[itemPool] || availableAntes.length === 0) {
        if (availableAntes.length > 0) {
            // Default to ante 1 if it exists, otherwise use first available
            itemPool = pool[1] ? 1 : availableAntes[0];
            setSelectedAnte(itemPool);
        } else {
            return null;
        }
    }

    return (
        <>
            <Box mb="xs">
                <NativeSelect
                    mb="xs"
                    hiddenFrom="sm"
                    value={selectedAnte}
                    onChange={(e) => setSelectedAnte(Number(e.currentTarget.value))}
                    size="xs"
                    data={Object.keys(SeedResults.antes).map((ante: string) => ({
                        label: `Ante ${ante}`,
                        value: String(ante)
                    }))}
                />
                <SegmentedControl
                    value={selectedBlind}
                    onChange={(v) => setSelectedBlind(v as Blinds)}
                    fullWidth
                    radius="xl"
                    size={width > 600 ? 'sm' : 'xs'}
                    mb="xs"
                    data={blinds.map((blind: string, i: number) => ({
                        value: ['smallBlind', 'bigBlind', 'bossBlind'][i],
                        label: <Group justify={'center'} gap={4}>
                            <Text size="xs">{blind}</Text>
                            {i < 2 && pool[itemPool]?.tags?.[i] && (
                                <TagDisplay tag={pool[itemPool].tags[i] as Tag} ante={pool[itemPool]} />
                            )
                            }
                            {
                                i === 2 && pool[itemPool] &&
                                <Popover>
                                    <Popover.Target>
                                        <Box>
                                            <Boss bossName={pool[itemPool].boss ?? ''} />
                                        </Box>
                                    </Popover.Target>
                                    <Popover.Dropdown maw={400}>
                                        <Box>
                                            <Text>{pool[itemPool].boss}</Text>
                                        </Box>
                                    </Popover.Dropdown>
                                </Popover>

                            }

                        </Group>,
                    }))}
                />
            </Box>
            <Tabs
                w={'100%'}
                variant="pills"
                orientation={width > 767 ? "vertical" : "horizontal"}
                defaultValue={'1'}
                keepMounted={false}
                value={String(selectedAnte)}
                onChange={(value) => {
                    setSelectedAnte(Number(value));
                }}
            >
                <Box style={{ display: width > 767 ? 'revert' : 'none' }} mr={{ base: 0, md: '1rem' }} ml={{ base: 0, md: 'xs' }}>
                    <Tabs.List>
                        {
                            Object.keys(SeedResults.antes).map((ante: string) => (
                                <Tabs.Tab
                                    key={ante}
                                    value={String(ante)}
                                    size="sm"
                                >
                                    {`Ante ${ante}`}
                                </Tabs.Tab>
                            ))
                        }
                    </Tabs.List>
                </Box>
                {
                    Object.entries(SeedResults.antes).map(([ante, anteData]: [string, Ante], i: number) => {
                        const currentAnte = String(ante) === String(selectedAnte);
                        const panelData = currentAnte ? pool[itemPool] : anteData;
                        return (
                            <AntePanel key={i} tabName={ante} ante={panelData}
                                timeTravelVoucherOffset={timeTravelVoucherOffset} />
                        )
                    })
                }
            </Tabs>
        </>
    )
}

import { MantineProvider } from "@mantine/core";
import { BalatroTheme } from "../../../themes/Balatro.ts";

function Main() {
    const SeedResults = useSeedResultsContainer()
    const viewMode = useCardStore(state => state.applicationState.viewMode);
    return (
        <AppShell.Main>
            {!SeedResults && <HomePage />}
            {SeedResults && viewMode === 'blueprint' && <SeedExplorer />}
            {SeedResults && viewMode === 'text' && <Index />}
            {SeedResults && viewMode === 'simple' && <Simple />}
            {SeedResults && viewMode === 'custom' && (
                <MantineProvider theme={JamlTheme} defaultColorScheme="dark">
                    <JamlView />
                </MantineProvider>
            )}
            {SeedResults && <SnapshotModal />}
        </AppShell.Main>
    )
}
// declare window module and saveSeedDebug function
declare global {
    interface Window {
        saveSeedDebug: () => void;
    }
}

export function Blueprint() {
    const { width } = useViewportSize();
    const settingsOpened = useCardStore(state => state.applicationState.settingsOpen);
    const outputOpened = useCardStore(state => state.applicationState.asideOpen);
    const download = useDownloadSeedResults()
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.saveSeedDebug = download
        }
    }, [download]);

    return (
        <AppShell
            header={{ height: { base: 45, md: 50, lg: 55 } }}
            footer={{ height: 'fit-content' }}
            aside={{
                width: { base: 380, sm: 380 },
                breakpoint: 'sm',
                collapsed: {
                    desktop: !outputOpened,
                    mobile: !outputOpened
                },
            }}
            navbar={{
                width: { base: 380, sm: 380 },
                breakpoint: 'sm',
                collapsed: {
                    desktop: !settingsOpened,
                    mobile: !settingsOpened
                },
            }}
            styles={{
                navbar: {
                    maxWidth: '100%',
                    overflowX: 'hidden'
                },
                aside: {
                    maxWidth: '100%',
                    overflowX: 'hidden'
                },
                main: {
                    maxWidth: '100%',
                    overflowX: 'hidden'
                }
            }}
            padding="md"
        >
            <Header />
            <NavBar />
            <Main />
            <Aside />
            <AppShell.Footer>
                <Footer />
            </AppShell.Footer>
        </AppShell>
    )
}
