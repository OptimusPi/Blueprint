import React, {useCallback, useMemo, useState} from "react";
import {Spotlight, closeSpotlight, openSpotlight} from "@mantine/spotlight";
import {toHeaderCase} from "js-convert-case";
import {
    ActionIcon,
    Checkbox,
    CheckboxGroup,
    Divider,
    Group,
    HoverCard,
    HoverCardDropdown,
    HoverCardTarget,
    SimpleGrid,
    TextInput
} from "@mantine/core";
import {IconSearch, IconSettings} from "@tabler/icons-react";
import {useSetState} from "@mantine/hooks";
import {getMiscCardSources} from "../modules/ImmolateWrapper";
import {LOCATIONS} from "../modules/const.ts";
import {useCardStore} from "../modules/state/store.ts";
import {GaEvent} from "../modules/useGA.ts";
import {useSeedResultsContainer} from "../modules/state/analysisResultProvider.tsx";
import type {BuyMetaData} from "../modules/classes/BuyMetaData.ts";
import type {Ante} from "../modules/ImmolateWrapper/CardEngines/Cards.ts";
import {POKER_HANDS} from "../modules/balatrots/enum/PokerHands.ts";
import {StandardCard_Final} from "../modules/ImmolateWrapper/CardEngines/Cards.ts";

const registeredMiscSources = getMiscCardSources(15).map(source => source.name)

// Function to evaluate poker hand from cards
function evaluatePokerHand(cards: Array<StandardCard_Final>): string | null {
    if (!cards || cards.length === 0) return null;
    
    // Filter to only standard playing cards
    const playingCards = cards.filter(card => card instanceof StandardCard_Final && card.rank && card.suit);
    if (playingCards.length < 2) return null;
    
    // Get rank values (Ace high)
    const rankValues: { [key: string]: number } = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'Jack': 11, 'Queen': 12, 'King': 13, 'Ace': 14
    };
    
    // Count ranks and suits
    const rankCounts: { [key: string]: number } = {};
    const suitCounts: { [key: string]: number } = {};
    const ranks: number[] = [];
    
    playingCards.forEach(card => {
        const rank = card.rank;
        const suit = card.suit;
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        suitCounts[suit] = (suitCounts[suit] || 0) + 1;
        ranks.push(rankValues[rank] || 0);
    });
    
    ranks.sort((a, b) => a - b);
    const uniqueRanks = Object.keys(rankCounts);
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    const rankCountValues = Object.values(rankCounts).sort((a, b) => b - a);
    
    // Check for flush (all same suit)
    const isFlush = maxSuitCount === playingCards.length && playingCards.length >= 5;
    
    // Check for straight
    let isStraight = false;
    if (ranks.length >= 5) {
        // Check normal straight
        let consecutive = 1;
        for (let i = 1; i < ranks.length; i++) {
            if (ranks[i] === ranks[i-1] + 1) {
                consecutive++;
            } else if (ranks[i] !== ranks[i-1]) {
                consecutive = 1;
            }
            if (consecutive >= 5) {
                isStraight = true;
                break;
            }
        }
        // Check A-2-3-4-5 straight (wheel)
        if (!isStraight && ranks.includes(14) && ranks.includes(2) && ranks.includes(3) && ranks.includes(4) && ranks.includes(5)) {
            isStraight = true;
        }
    }
    
    // Evaluate hand
    if (isFlush && isStraight) {
        if (rankCountValues[0] === 5) {
            return POKER_HANDS.FIVE_OF_A_KIND;
        }
        if (ranks.includes(14) && ranks.includes(13) && ranks.includes(12) && ranks.includes(11) && ranks.includes(10)) {
            return POKER_HANDS.FLUSH_FIVE;
        }
        return POKER_HANDS.STRAIGHT_FLUSH;
    }
    
    if (rankCountValues[0] === 5) {
        return POKER_HANDS.FIVE_OF_A_KIND;
    }
    
    if (rankCountValues[0] === 4) {
        return POKER_HANDS.FOUR_OF_A_KIND;
    }
    
    if (rankCountValues[0] === 3 && rankCountValues[1] === 2) {
        if (isFlush) {
            return POKER_HANDS.FLUSH_HOUSE;
        }
        return POKER_HANDS.FULL_HOUSE;
    }
    
    if (isFlush) {
        return POKER_HANDS.FLUSH;
    }
    
    if (isStraight) {
        return POKER_HANDS.STRAIGHT;
    }
    
    if (rankCountValues[0] === 3) {
        return POKER_HANDS.THREE_OF_A_KIND;
    }
    
    if (rankCountValues[0] === 2 && rankCountValues[1] === 2) {
        return POKER_HANDS.TWO_PAIR;
    }
    
    if (rankCountValues[0] === 2) {
        return POKER_HANDS.PAIR;
    }
    
    return POKER_HANDS.HIGH_CARD;
}
export default function SearchSeedInput() {
    const SeedResults = useSeedResultsContainer();
    const searchString = useCardStore(state => state.searchState.searchTerm);
    const setSearchString = useCardStore(state => state.setSearchString);
    const goToResults = useCardStore(state => state.setSelectedSearchResult);
    const [searchActive, setSearchActive] = useState(false);
    const handleSearch = useCallback(() => {
        setSearchActive(true)
        openSpotlight()
    }, []);
    type sources = 'shop' | 'packs' | 'misc';
    type filterConfig = { enabled: boolean, children?: { [key: string]: filterConfig } };
    type sourceFilterConfig = {
        [key in sources]: filterConfig;
    };
    const [sourceFilterConfig, setSourceFilterConfig] = useSetState<sourceFilterConfig>({
        shop: {
            enabled: true
        },
        packs: {
            enabled: true
        },
        misc: {
            enabled: true,
            children: registeredMiscSources.reduce((acc, curr) => ({...acc, [curr]: {enabled: true}}), {} as {
                [key: string]: filterConfig
            })
        }
    });

    const updateSourceFilter = useCallback((parent: string, enabled?: boolean, child?: string, childEnabled?: boolean) => {
        if (!child) {
            const current = sourceFilterConfig[parent as sources];
            const newConfig = {...current, enabled: enabled ?? true};
            // If disabling misc, uncheck all children but keep them visible
            if (parent === 'misc' && enabled === false && current.children) {
                const uncheckedChildren: { [key: string]: filterConfig } = {};
                Object.keys(current.children).forEach((key) => {
                    uncheckedChildren[key] = {enabled: false};
                });
                setSourceFilterConfig({[parent]: {...newConfig, children: uncheckedChildren}});
            } else {
                setSourceFilterConfig({[parent]: newConfig});
            }
        } else {
            const current = sourceFilterConfig[parent as sources];
            if (current.children) {
                setSourceFilterConfig({
                    [parent]: {
                        enabled: current.enabled,
                        children: {
                            ...current.children,
                            [child]: {enabled: childEnabled ?? true}
                        }
                    }
                })
            }
        }
    }, [sourceFilterConfig, setSourceFilterConfig]);


    const searchResults = useMemo(() => {
        if (searchString === '' || !searchActive) return [];
        const cards: Array<BuyMetaData> = [];
        const antes: Array<Ante> = Object.values(SeedResults?.antes ?? {});
        
        // Check if search matches any poker hand name
        const searchLower = searchString.toLowerCase();
        const matchingPokerHand = Object.values(POKER_HANDS).find(hand => 
            hand.toLowerCase().includes(searchLower) || searchLower.includes(hand.toLowerCase())
        );
        
        // If searching for a poker hand, evaluate deck draws and add matching results
        if (matchingPokerHand) {
            antes.forEach((ante: Ante) => {
                const blinds = Object.keys(ante.blinds) as Array<keyof typeof ante.blinds>;
                blinds.forEach((blind) => {
                    const deck = ante.blinds[blind]?.deck;
                    if (deck && deck.length > 0) {
                        // Filter to only StandardCard_Final cards
                        const standardCards = deck.filter((card): card is StandardCard_Final => 
                            card instanceof StandardCard_Final && card.rank && card.suit
                        );
                        
                        if (standardCards.length >= 2) {
                            // Evaluate the poker hand
                            const evaluatedHand = evaluatePokerHand(standardCards);
                            
                            // Only add if it matches the searched poker hand
                            if (evaluatedHand === matchingPokerHand) {
                                cards.push({
                                    transactionType: "buy",
                                    location: blind,
                                    locationType: LOCATIONS.MISC,
                                    ante: String(ante.ante),
                                    name: matchingPokerHand,
                                    index: 0,
                                    blind: blind,
                                    // @ts-ignore
                                    card: null
                                });
                            }
                        }
                    }
                });
            });
        }
        
        antes.forEach((ante: Ante) => {
            ante.queue.forEach((card, index) => {
                const cardString = `${(card.edition && card.edition !== 'No Edition') ? card.edition : ''} ${card.name}`.trim();
                if (cardString.toLowerCase().includes(searchString.toLowerCase())) {

                    cards.push({
                        transactionType: "buy",
                        // @ts-ignore I didn't do a great job typing cards throughout the project
                        card: card,
                        location: LOCATIONS.SHOP,
                        locationType: LOCATIONS.SHOP,
                        ante: String(ante.ante),
                        name: cardString,
                        index: index,
                        blind: 'smallBlind'
                    })
                }
            })
            const blinds = Object.keys(ante.blinds) as Array<keyof typeof ante.blinds>;
            blinds
                .forEach((blind) => {
                // @ts-ignore I didn't do a great job typing cards throughout the project
                ante.blinds[blind]?.packs?.forEach((pack) => {
                    // @ts-ignore I didn't do a great job typing cards throughout the project
                    pack.cards.forEach((card, index) => {
                        if(!card) return;
                        const cardString = `${card?.edition ?? ''} ${card.name}`.trim();
                        if (cardString.toLowerCase().includes(searchString.toLowerCase())) {
                            cards.push({
                                transactionType: "buy",
                                card: card,
                                location: pack.name,
                                locationType: LOCATIONS.PACK,
                                ante: String(ante.ante),
                                name: cardString,
                                index: index,
                                blind: blind
                            })
                        }
                    })
                })
            })
            Object.values(ante.miscCardSources).forEach((source) => {
                source.cards.forEach((card, index) => {
                    const cardString = `${card.edition} ${card.name}`.trim();
                    if (cardString.toLowerCase().includes(searchString.toLowerCase())) {
                        cards.push({
                            transactionType: "buy",
                            card: card,
                            location: source.name,
                            locationType: LOCATIONS.MISC,
                            ante: String(ante.ante),
                            name: cardString,
                            index: index,
                            blind: 'smallBlind'
                        })
                    }
                })
            });
        })
        return cards.filter((card) => {
            const locationType = card.locationType;
            const location = card.location;
            if (locationType === LOCATIONS.SHOP) {
                return sourceFilterConfig.shop.enabled;
            }
            if (locationType === LOCATIONS.PACK) {
                return sourceFilterConfig.packs.enabled;
            }
            if (locationType === LOCATIONS.MISC) {
                const miscConfig = sourceFilterConfig.misc;
                if (miscConfig.enabled) {
                    const childConfig = miscConfig.children || {};
                    // Poker hand results (deck draws) use blind names as location
                    // If location is not in childConfig, it's a deck draw - show it if misc is enabled
                    if (!childConfig[location]) {
                        // This is likely a poker hand/deck draw result - show it if misc is enabled
                        return true;
                    }
                    return childConfig[location].enabled;
                }
                return false;
            }
            return false;
        })
    }, [searchString, searchActive, SeedResults?.antes, sourceFilterConfig.shop.enabled, sourceFilterConfig.packs.enabled, sourceFilterConfig.misc])
    return (
        <>
            <Spotlight
                nothingFound={searchString.length > 0 ? `
                    No results found. 
                   If the card you are searching for is unlocked in game, like Eris or Lucky Cat make sure that you enabled that card in the events tab. (The hamburger menu on the right )
                `: 'Start typing to search for cards'}
                highlightQuery
                scrollable
                maxHeight={'80vh'}
                actions={
                    searchResults
                        .map((result: any, index) => {
                            const name = result.name;
                            const edition = result?.['edition'];
                            const label = edition && edition !== 'No Edition' ? `${edition} ${name}` : name;

                            const locationType = result?.locationType;

                            let description = '';
                            if (locationType === LOCATIONS.SHOP) {
                                description += `ANTE ${result.ante} SHOP: Card ${result.index + 1}`;
                            }
                            if (locationType === LOCATIONS.PACK) {
                                description += `ANTE ${result.ante} Blind: ${toHeaderCase(result.blind)} ${result.location}`;
                            }
                            if (locationType === LOCATIONS.MISC) {
                                // Check if this is a poker hand search result (deck draw)
                                const isPokerHandResult = result.name && Object.values(POKER_HANDS).includes(result.name);
                                if (isPokerHandResult) {
                                    description += `ANTE ${result.ante} ${toHeaderCase(result.blind)} Deck Draw`;
                                } else {
                                    description += `ANTE ${result.ante} ${result.location}: Card ${result.index + 1}`;
                                }
                            }

                            return {
                                id: String(index),
                                label,
                                description,
                                group: result.location,
                                onClick: () => {
                                    closeSpotlight()
                                    goToResults(result)
                                }
                            }
                        }
                    )
                }
                searchProps={{
                    value: searchString,
                    onChange: (e) => {
                        const query = e.currentTarget.value;
                        setSearchActive(query !== '')
                        setSearchString(query)
                    },
                }}
            />
            <Group align={'flex-end'}>
                <TextInput
                    flex={1}
                    placeholder={'Search for cards'}
                    onClick={()=>{
                        GaEvent('search_bar_clicked')
                        openSpotlight()
                    }}
                    leftSection={
                        // <ActionIcon>
                        <HoverCard>
                            <HoverCardTarget>
                                <IconSettings/>
                            </HoverCardTarget>
                            <HoverCardDropdown maw={400}>
                                <CheckboxGroup
                                    label={'Search Filters'}
                                    description={'Select which sources to include in search'}
                                    mb={'sm'}
                                    value={
                                    ['shop', 'packs', 'misc'].filter(source => sourceFilterConfig?.[source as sources]?.enabled)
                                    }
                                    onChange={(e:Array<string>) => {
                                        const sources = Object.keys(sourceFilterConfig) as Array<sources>;
                                        for ( const source of sources ) {
                                            if(e.includes(source) && !sourceFilterConfig[source].enabled) {
                                                updateSourceFilter(source, true);
                                                return;
                                            } else if (!e.includes(source) && sourceFilterConfig[source].enabled) {
                                                updateSourceFilter(source, false);
                                                return;
                                            }
                                        }
                                        console.log("no changes detected", e);
                                    }}
                                >
                                    <Group mt={'sm'}>
                                        <Checkbox value="shop" label='shop'/>
                                        <Checkbox value='packs' label='packs' />
                                        <Checkbox value='misc' label='misc' />
                                    </Group>
                                </CheckboxGroup>
                                <Divider my={'md'} label={'misc sources'} />
                                <SimpleGrid cols={{ sm: 2, md: 3}}>
                                    {Object.keys(sourceFilterConfig.misc.children || {}).map((child) => (
                                        <Checkbox
                                            key={child}
                                            label={child}
                                            value={child}
                                            checked={sourceFilterConfig.misc.children ? sourceFilterConfig.misc.children[child]?.enabled && sourceFilterConfig.misc.enabled : false}
                                            disabled={!sourceFilterConfig.misc.enabled}
                                            onChange={(e) => {
                                                updateSourceFilter('misc', true, child, e.currentTarget.checked)
                                            }}
                                        />
                                    ))}
                                </SimpleGrid>
                            </HoverCardDropdown>
                        </HoverCard>

                        // </ActionIcon>
                    }
                    rightSection={
                        <ActionIcon onClick={handleSearch}>
                            <IconSearch/>
                        </ActionIcon>
                    }
                />
            </Group>

        </>

    )
}
