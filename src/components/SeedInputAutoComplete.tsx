import {Autocomplete, Button, Group, NativeSelect, Paper, Stack, Modal, Textarea, Text} from "@mantine/core";
import {useMediaQuery, useDisclosure} from "@mantine/hooks";
import {IconUpload} from "@tabler/icons-react";
import {popularSeeds, SeedsWithLegendary} from "../modules/const.ts";
import {useCardStore} from "../modules/state/store.ts";
import {useState, useCallback} from "react";


export function QuickAnalyze() {
    const seed = useCardStore(state => state.immolateState.seed);
    const setSeed = useCardStore(state => state.setSeed);
    const deck = useCardStore(state => state.immolateState.deck);
    const setDeck = useCardStore(state => state.setDeck);
    const setStart = useCardStore(state => state.setStart);
    const isMobile = useMediaQuery('(max-width: 600px)');
    const sectionWidth = 130;
    const select = (
        <NativeSelect
            rightSectionWidth={28}
            styles={{
                input: {
                    fontWeight: 500,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    width: sectionWidth,
                    marginRight: -2,
                },
            }}
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
    );

    const deckSelectStandalone = (
        <NativeSelect
            label="Deck"
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
    );

    return (
        <Paper withBorder shadow={'lg'} p={{ base: 'xs', sm: 'sm' }} radius={'md'}>
            <Stack gap="sm">
                {isMobile ? (
                    <>
                        <Autocomplete
                            label="Analyze Seed"
                            placeholder="Enter Seed"
                            data={[
                                {
                                    group: 'Popular Seeds',
                                    items: popularSeeds
                                }, {
                                    group: 'Generated Seeds With Legendary Jokers',
                                    items: SeedsWithLegendary

                                }
                            ]}
                            value={seed}
                            onChange={(e) => setSeed(e)}
                        />
                        {deckSelectStandalone}
                    </>
                ) : (
                    <Autocomplete
                        label="Analyze Seed"
                        placeholder="Enter Seed"
                        data={[
                            {
                                group: 'Popular Seeds',
                                items: popularSeeds
                            }, {
                                group: 'Generated Seeds With Legendary Jokers',
                                items: SeedsWithLegendary

                            }
                        ]}
                        value={seed}
                        onChange={(e) => setSeed(e)}
                        rightSection={select}
                        rightSectionWidth={sectionWidth}
                        styles={{
                            input: {
                                minWidth: 0
                            }
                        }}
                    />
                )}
                <Button
                    fullWidth
                    onClick={() => setStart(seed.length >= 5)}
                    size={isMobile ? 'sm' : 'md'}
                >
                    Analyze Seed
                </Button>
            </Stack>
        </Paper>
    );

}

export default function SeedInputAutoComplete({seed, setSeed, onBulkImport}: { seed: string, setSeed: (seed: string) => void, onBulkImport?: (seeds: string[]) => void }) {
    const [bulkOpened, { open: openBulk, close: closeBulk }] = useDisclosure(false);
    const [bulkText, setBulkText] = useState('');
    
    const handleBulkImport = useCallback(() => {
        const parsed = bulkText
            .split(/[\n,\s]+/)
            .map(s => s.trim().toUpperCase())
            .filter(s => s.length > 0 && /^[A-Z0-9]+$/.test(s));
        if (parsed.length > 0) {
            if (onBulkImport) {
                onBulkImport(parsed);
            } else {
                // Default: just set the first seed
                setSeed(parsed[0]);
            }
            closeBulk();
            setBulkText('');
        }
    }, [bulkText, closeBulk, onBulkImport, setSeed]);
    
    const handleChange = useCallback((value: string) => {
        if (value === '📋 Seed List...') {
            openBulk();
        } else {
            setSeed(value);
        }
    }, [setSeed, openBulk]);
    
    return (
        <>
            <Autocomplete
                flex={1}
                label={'Seed'}
                placeholder={'Enter Seed'}
                value={seed}
                onChange={handleChange}
                size="sm"
                data={[
                    {
                        group: 'Actions',
                        items: ['📋 Seed List...']
                    },
                    {
                        group: 'Popular Seeds',
                        items: popularSeeds
                    }, {
                        group: 'Generated Seeds With Legendary Jokers',
                        items: SeedsWithLegendary

                    }
                ]}
                comboboxProps={{
                    withinPortal: true
                }}
                maxDropdownHeight={300}
                styles={{
                    input: {
                        minWidth: 0,
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
            
            <Modal opened={bulkOpened} onClose={closeBulk} title="Bulk Import Seeds" size="md">
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Paste seeds or drop a .txt/.csv file (one per line, comma-separated, or space-separated)
                    </Text>
                    <Textarea
                        placeholder="KDBX2SMH&#10;3BCUYMCI&#10;11KH17QI&#10;..."
                        value={bulkText}
                        onChange={(e) => setBulkText(e.currentTarget.value)}
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
                                    setBulkText(content);
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
                            {bulkText.split(/[\n,\s]+/).filter(s => s.trim().length > 0).length} seeds detected
                        </Text>
                        <Group gap="xs">
                            <Button variant="light" onClick={closeBulk}>Cancel</Button>
                            <Button onClick={handleBulkImport} leftSection={<IconUpload size={14} />}>
                                Import Seeds
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
