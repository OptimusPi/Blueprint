import React from 'react';
import { MiscCardSource } from "../modules/ImmolateWrapper";
import { Accordion, Box, Center, Group, Paper, Text, Title } from "@mantine/core";
import { useCardStore } from "../modules/state/store.ts";
import { useEffect, useState } from "react";
import { EmblaCarouselType } from 'embla-carousel';
import { Carousel } from "@mantine/carousel";
import { LOCATIONS } from "../modules/const.ts";
import { toHeaderCase } from "js-convert-case";
import { BuyWrapper } from "./buyerWrapper.tsx";
import { GameCard } from "./Rendering/cards.tsx";
import { BoosterPack, Voucher } from "./Rendering/gameElements.tsx";
import { Boss } from "./Rendering/gameElements.tsx";
import { Tag } from "./Rendering/gameElements.tsx";
import { Joker_Final, StandardCard_Final } from "../modules/ImmolateWrapper/CardEngines/Cards.ts";

import * as React from 'react';
import { useEffect, useState } from "react";
import {
    Accordion,
    Box,
    Center,
    Group,
    Text,
    Title,
    Tooltip,
    useMantineTheme
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { type EmblaCarouselType } from 'embla-carousel';
import { toHeaderCase } from "js-convert-case";
import { LOCATIONS } from "../modules/const.ts";
import { type MiscCardSource } from "../modules/GameEngine";
import { type Joker_Final, type StandardCard_Final } from "../modules/GameEngine/CardEngines/Cards.ts";
import { BuyWrapper } from "./buyerWrapper.tsx";
import { GameCard } from "./Rendering/cards.tsx";
import { BoosterPack, Boss, Tag, Voucher } from "./Rendering/gameElements.tsx";
import { useCardStore } from "../modules/state/store.ts";

export default function MiscCardSourcesDisplay({ miscSources, boosterQueue, bossQueue, tagQueue, voucherQueue, wheelQueue, auraQueue, draws, onAddSource, addedSourceNames }: {
    miscSources?: MiscCardSource[],
    bossQueue?: any[],
    boosterQueue?: any[],
    tagQueue?: any[],
    voucherQueue?: any[]
    wheelQueue?: any[]
    auraQueue?: any[]
    draws?: Record<string, any[]>
    onAddSource?: (sourceName: string, cards: any[], sourceType: 'misc' | 'voucher' | 'tag' | 'boss' | 'booster') => void
    addedSourceNames?: Set<string>
}) {
    // Helper function to render add/remove button
    const renderAddRemoveButton = (sourceName: string, sourceType: 'misc' | 'voucher' | 'tag' | 'boss' | 'booster', cards: any[]) => {
        if (!onAddSource || !cards || cards.length === 0) return null;
        const sourceKey = `${sourceType}-${sourceName}`;
        const isAdded = addedSourceNames?.has(sourceKey);
        return (
            <Tooltip label={isAdded ? 'Remove from Custom view' : 'Add to Custom view'}>
                <Box
                    component="div"
                    data-add-source
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onAddSource(sourceName, cards, sourceType);
                    }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        color: isAdded ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-blue-6)',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isAdded ? 'var(--mantine-color-red-0)' : 'var(--mantine-color-blue-0)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    {isAdded ? <IconMinus size={14} /> : <IconPlus size={14} />}
                </Box>
            </Tooltip>
        );
    };
    if (!miscSources || Object.keys(miscSources).length === 0) {
        return (
            <Box p="xs" mb={4}>
                <Text c="dimmed" size="xs" ta="center">No miscellaneous card sources available for this ante</Text>
            </Box>
        );
    }
    const selectedResult = useCardStore(state => state.searchState.selectedSearchResult);
    const currentSource = useCardStore(state => state.applicationState.miscSource);
    const setCurrentSource = useCardStore(state => state.setMiscSource);
    const currentAnte = useCardStore(state => state.applicationState.selectedAnte);
    const theme = useMantineTheme();
    const [embla, setEmbla] = useState<EmblaCarouselType | null>(null);
    useEffect(() => {
        if (!embla) return;
        embla.reInit()
    }, [embla])
    useEffect(() => {
        if (!selectedResult || !embla) return;
        if (selectedResult?.locationType === LOCATIONS.MISC) {
            if (selectedResult?.index) {
                embla.scrollTo(selectedResult.index)
            }
        }
    }, [currentSource, selectedResult, currentSource])
    return (
        <Box p="xs" mb={2}>
            <Title order={5} fz="xs" mb={1}>Card Sources</Title>
            <Accordion onChange={e => setCurrentSource(`${e}`)} variant={'default'} value={currentSource} chevronPosition="left">
                {miscSources.map(({ name, cards }: { name: string, cards: any }) => (
                    <Accordion.Item key={String(name)} value={String(name)}>
                        <Accordion.Control>
                            <Group gap={4} justify="space-between" wrap="nowrap" onClick={(e) => {
                                if (onAddSource && (e.target as HTMLElement).closest('[data-add-source]')) {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }
                            }}>
                                <Text fw={500} size="xs">{toHeaderCase(String(name))}</Text>
                                {onAddSource && (
                                    <Tooltip label={addedSourceNames?.has(`misc-${name}`) ? 'Remove from Custom view' : 'Add to Custom view'}>
                                        <Box
                                            component="div"
                                            data-add-source
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                onAddSource(name, cards || [], 'misc');
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                color: addedSourceNames?.has(`misc-${name}`) ? theme.colors.red[6] : theme.colors.blue[6],
                                                backgroundColor: 'transparent',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = addedSourceNames?.has(`misc-${name}`) ? theme.colors.red[0] : theme.colors.blue[0];
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            {addedSourceNames?.has(`misc-${name}`) ? <IconMinus size={14} /> : <IconPlus size={14} />}
                                        </Box>
                                    </Tooltip>
                                )}
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel p={0}>
                            {
                                name === currentSource &&
                                <Box>
                                    <Carousel
                                        getEmblaApi={setEmbla}
                                        type={'container'}
                                        slideSize={{ base: '50px', sm: '70px', md: '90px' }}
                                        slideGap={{ base: 'xs' }}
                                        withControls={false}
                                        height={{ base: 120, sm: 150, md: 190 }}
                                        emblaOptions={{
                                            dragFree: true,
                                            align: 'start'
                                        }}

                                    >
                                        {cards?.map((card: any, i: number) => (
                                            <Carousel.Slide key={i}>
                                                <BuyWrapper
                                                    metaData={{
                                                        transactionType: "buy",
                                                        location: name,
                                                        locationType: LOCATIONS.MISC,
                                                        index: i,
                                                        ante: String(currentAnte),
                                                        blind: "smallBlind",
                                                        name: card?.name,
                                                        link: `https://balatrowiki.org/w/${card.name}`,
                                                        card: card
                                                    }}
                                                >
                                                    <GameCard card={card} />
                                                </BuyWrapper>

                                            </Carousel.Slide>
                                        ))}
                                    </Carousel>
                                </Box>
                            }

                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
                {/*    Voucher Queue */}
                <Accordion.Item key={"Vouchers"} value={"Vouchers"}>
                    <Accordion.Control>
                        <Group>
                            <Text fw={500}>Vouchers</Text>
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel p={0}>
                        {
                            "Vouchers" === currentSource &&
                            <Box>
                                <Carousel
                                    getEmblaApi={setEmbla}
                                    type={'container'}
                                    slideSize="90px"
                                    slideGap={{ base: 'xs' }}
                                    withControls={false}
                                    height={190}
                                    emblaOptions={{
                                        dragFree: true,
                                        align: 'start'
                                    }}
                                >
                                    {voucherQueue?.map((voucher: any, i: number) => (
                                        <Carousel.Slide key={i}>
                                            <BuyWrapper
                                                metaData={{
                                                    transactionType: "buy",
                                                    location: "Vouchers",
                                                    locationType: LOCATIONS.MISC,
                                                    index: i,
                                                    ante: String(currentAnte),
                                                    blind: "smallBlind",
                                                    name: voucher,
                                                    link: `https://balatrowiki.org/w/${voucher}`,
                                                    card: voucher
                                                }}
                                            >
                                                <Voucher voucherName={voucher} />
                                            </BuyWrapper>

                                        </Carousel.Slide>
                                    ))}
                                </Carousel>
                            </Box>
                        }
                    </Accordion.Panel>
                </Accordion.Item>
                {/*    Boss Queue */}
                <Accordion.Item key={"Bosses"} value={"Bosses"}>
                    <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap" onClick={(e) => {
                            if (onAddSource && (e.target as HTMLElement).closest('[data-add-source]')) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                        }}>
                            <Text fw={500}>Bosses</Text>
                            {renderAddRemoveButton('Bosses', 'boss', bossQueue || [])}
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel p={0}>
                        {
                            "Bosses" === currentSource &&
                            <Box>
                                <Carousel
                                    getEmblaApi={setEmbla}
                                    type={'container'}
                                    slideSize="90px"
                                    slideGap={{ base: 'xs' }}
                                    withControls={false}
                                    height={70}
                                    emblaOptions={{
                                        dragFree: true,
                                        align: 'start'
                                    }}
                                >
                                    {bossQueue?.map((boss: any, i: number) => (
                                        <Carousel.Slide key={i}>
                                            <Center w={'100%'} h={'50'}>
                                                <Boss bossName={boss} />
                                            </Center>
                                        </Carousel.Slide>
                                    ))}
                                </Carousel>
                            </Box>
                        }
                    </Accordion.Panel>
                </Accordion.Item>
                {/*    Tag Queue */}
                <Accordion.Item key={"Tags"} value={"Tags"}>
                    <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap">
                            <Text fw={500}>Tags</Text>
                            {renderAddRemoveButton('Tags', 'tag', tagQueue || [])}
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel p={0}>
                        {
                            "Tags" === currentSource &&
                            <Box>
                                <Carousel
                                    getEmblaApi={setEmbla}
                                    type={'container'}
                                    slideSize="90px"
                                    slideGap={{ base: 'xs' }}
                                    withControls={false}
                                    height={70}
                                    emblaOptions={{
                                        dragFree: true,
                                        align: 'start'
                                    }}
                                >
                                    {tagQueue?.map((tag: any, i: number) => (
                                        <Carousel.Slide key={i}>
                                            <Center w={'100%'} h={'50'}>
                                                <Tag tagName={tag} />
                                            </Center>
                                        </Carousel.Slide>
                                    ))}
                                </Carousel>
                            </Box>
                        }
                    </Accordion.Panel>
                </Accordion.Item>
                {/*    Wheel Queue*/}
                <Accordion.Item key={'WheelOfFortune'} value={'WheelOfFortune'}>
                    <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap" onClick={(e) => {
                            if (onAddSource && (e.target as HTMLElement).closest('[data-add-source]')) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                        }}>
                            <Text fw={500}>Wheel of Fortune</Text>
                            {renderAddRemoveButton('Wheel of Fortune', 'misc', wheelQueue || [])}
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel p={0}>
                        {
                            "WheelOfFortune" === currentSource && (
                                <Box>
                                    <Carousel
                                        getEmblaApi={setEmbla}
                                        type={'container'}
                                        slideSize={{ base: '50px', sm: '70px', md: '90px' }}
                                        slideGap={{ base: 'xs' }}
                                        withControls={false}
                                        height={{ base: 120, sm: 150, md: 190 }}
                                        emblaOptions={{
                                            dragFree: true,
                                            align: 'start'
                                        }}

                                    >
                                        {wheelQueue?.map((card: any, i: number) => (
                                            <Carousel.Slide key={i}>
                                                <GameCard card={
                                                    new Joker_Final({
                                                        ...card,
                                                        name: "Joker",
                                                        type: "Joker",
                                                    })
                                                } />
                                            </Carousel.Slide>
                                        ))}
                                    </Carousel>
                                </Box>
                            )
                        }
                    </Accordion.Panel>
                </Accordion.Item>
                {/*    Aura Queue*/}
                <Accordion.Item key={'aura'} value={'aura'}>
                    <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap" onClick={(e) => {
                            if (onAddSource && (e.target as HTMLElement).closest('[data-add-source]')) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                        }}>
                            <Text fw={500}>Aura</Text>
                            {renderAddRemoveButton('Aura', 'misc', auraQueue || [])}
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel p={0}>
                        {
                            "aura" === currentSource && (
                                <Box>
                                    <Carousel
                                        getEmblaApi={setEmbla}
                                        type={'container'}
                                        slideSize={{ base: '50px', sm: '70px', md: '90px' }}
                                        slideGap={{ base: 'xs' }}
                                        withControls={false}
                                        height={{ base: 120, sm: 150, md: 190 }}
                                        emblaOptions={{
                                            dragFree: true,
                                            align: 'start'
                                        }}

                                    >
                                        {auraQueue?.map((card: any, i: number) => (
                                            <Carousel.Slide key={i}>
                                                <GameCard card={
                                                    new StandardCard_Final({
                                                        ...card,
                                                        type: "Standard",
                                                    })
                                                } />
                                            </Carousel.Slide>
                                        ))}
                                    </Carousel>
                                </Box>
                            )
                        }
                    </Accordion.Panel>
                </Accordion.Item>
                {/* Booster Queue */}
                <Accordion.Item key={'boosters'} value={'boosters'}>
                    <Accordion.Control>
                        <Group justify="space-between" wrap="nowrap" onClick={(e) => {
                            if (onAddSource && (e.target as HTMLElement).closest('[data-add-source]')) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                        }}>
                            <Text fw={500}>Boosters</Text>
                            {renderAddRemoveButton('Boosters', 'booster', boosterQueue || [])}
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel p={0}>
                        {
                            "boosters" === currentSource &&
                            <Box>
                                <Carousel
                                    getEmblaApi={setEmbla}
                                    type={'container'}
                                    slideSize="90px"
                                    slideGap={{ base: 'xs' }}
                                    withControls={false}
                                    height={190}
                                    emblaOptions={{
                                        dragFree: true,
                                        align: 'start'
                                    }}
                                >
                                    {boosterQueue?.map((packname: string, i: number) => (
                                        <Carousel.Slide key={i}>
                                            <BuyWrapper
                                                metaData={{
                                                    transactionType: "buy",
                                                    location: "boosters",
                                                    locationType: LOCATIONS.MISC,
                                                    index: i,
                                                    ante: String(currentAnte),
                                                    blind: "smallBlind",
                                                    name: packname,
                                                    link: `https://balatrowiki.org/w/${packname}`,
                                                }}
                                            >
                                                <BoosterPack packName={packname} />
                                            </BuyWrapper>
                                        </Carousel.Slide>
                                    ))}
                                </Carousel>
                            </Box>
                        }
                    </Accordion.Panel>
                </Accordion.Item>
                {/* Draws Sections */}
                {
                    draws && Object.entries(draws).map(([k, v]) => {
                        return (
                            <Accordion.Item key={String(k)} value={String(k)}>
                                <Accordion.Control>
                                    <Group justify="space-between" wrap="nowrap" onClick={(e) => {
                                        if (onAddSource && (e.target as HTMLElement).closest('[data-add-source]')) {
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }
                                    }}>
                                        <Text fw={500}>{toHeaderCase(String(k))}</Text>
                                        {renderAddRemoveButton(toHeaderCase(String(k)), 'misc', Array.isArray(v) ? v : [])}
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel p={0}>
                                    {
                                        String(k) === currentSource &&
                                        <Box>
                                            <Carousel
                                                getEmblaApi={setEmbla}
                                                type={'container'}
                                                slideSize={{ base: '50px', sm: '70px', md: '90px' }}
                                                slideGap={{ base: 'xs' }}
                                                withControls={false}
                                                height={{ base: 120, sm: 150, md: 190 }}
                                                emblaOptions={{
                                                    dragFree: true,
                                                    align: 'start'
                                                }}

                                            >
                                                {v?.map((card: any, i: number) => (
                                                    <Carousel.Slide key={i}>
                                                        <BuyWrapper
                                                            metaData={{
                                                                location: '',
                                                                blind: 'smallBlind',
                                                                transactionType: "buy",
                                                                locationType: LOCATIONS.MISC,
                                                                index: i,
                                                                ante: String(currentAnte),
                                                                name: card?.name,
                                                                card: card
                                                            }}
                                                        >
                                                            <GameCard card={
                                                                card
                                                            } />
                                                        </BuyWrapper>

                                                    </Carousel.Slide>
                                                ))}
                                            </Carousel>
                                        </Box>
                                    }
                                </Accordion.Panel>
                            </Accordion.Item>
                        )
                    })
                }





            </Accordion>
        </Box>
    );
}
