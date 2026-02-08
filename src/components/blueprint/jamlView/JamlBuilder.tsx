import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    Group,
    Stack,
    Text,
    Paper,
    Badge,
    ActionIcon,
    Modal,
    TextInput,
    Select,
    NumberInput,
    Checkbox,
    Tabs,
    Fieldset,
    SimpleGrid,
    Tooltip,
    Divider,
    Code,
    ScrollArea,
    MultiSelect,
    SegmentedControl
} from '@mantine/core';
import {
    IconPlus,
    IconTrash,
    IconEdit,
    IconCopy,
    IconDownload,
    IconSearch,
    IconCheck,
    IconX
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import yaml from 'js-yaml';

// Card type options
const CARD_TYPES = [
    { value: 'joker', label: 'Joker' },
    { value: 'soulJoker', label: 'Soul Joker (Legendary)' },
    { value: 'voucher', label: 'Voucher' },
    { value: 'tarotCard', label: 'Tarot Card' },
    { value: 'planetCard', label: 'Planet Card' },
    { value: 'spectralCard', label: 'Spectral Card' },
    { value: 'standardCard', label: 'Playing Card' },
];

const EDITIONS = [
    { value: '', label: 'Any Edition' },
    { value: 'Foil', label: 'Foil' },
    { value: 'Holographic', label: 'Holographic' },
    { value: 'Polychrome', label: 'Polychrome' },
    { value: 'Negative', label: 'Negative' },
];

const SOUL_JOKERS = ['Canio', 'Triboulet', 'Yorick', 'Chicot', 'Perkeo'];
const COMMON_JOKERS = ['Joker', 'Greedy Joker', 'Lusty Joker', 'Wrathful Joker', 'Gluttonous Joker', 'Jolly Joker', 'Zany Joker', 'Mad Joker', 'Crazy Joker', 'Droll Joker', 'Sly Joker', 'Wily Joker', 'Clever Joker', 'Devious Joker', 'Crafty Joker', 'Half Joker', 'Credit Card', 'Banner', 'Mystic Summit', 'Eight Ball', 'Misprint', 'Raised Fist', 'Chaos the Clown', 'Scary Face', 'Abstract Joker', 'Delayed Gratification', 'Gros Michel', 'Even Steven', 'Odd Todd', 'Scholar', 'Business Card', 'Supernova', 'Ride the Bus', 'Egg', 'Runner', 'Ice Cream', 'Splash', 'Blue Joker', 'Faceless Joker'];
const VOUCHERS = ['Overstock', 'Clearance Sale', 'Hone', 'Reroll Surplus', 'Crystal Ball', 'Telescope', 'Grabber', 'Wasteful', 'Tarot Merchant', 'Planet Merchant', 'Seed Money', 'Blank', 'Magic Trick', 'Hieroglyph', 'Petroglyph', 'Directors Cut', 'Paint Brush', 'Antimatter'];
const TAROTS = ['The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot', 'Justice', 'The Hermit', 'The Wheel of Fortune', 'Strength', 'The Hanged Man', 'Death', 'Temperance', 'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'];
const SPECTRALS = ['Familiar', 'Grim', 'Incantation', 'Talisman', 'Aura', 'Wraith', 'Sigil', 'Ouija', 'Ectoplasm', 'Immolate', 'Ankh', 'Deja Vu', 'Hex', 'Trance', 'Medium', 'Cryptid', 'The Soul', 'Black Hole'];

const ANTE_OPTIONS = Array.from({ length: 13 }, (_, i) => ({ value: String(i), label: `Ante ${i}` }));

// Clause interface
interface Clause {
    id: string;
    type: string;
    value: string;
    edition?: string;
    antes: number[];
    shopSlots?: number[];
    packSlots?: number[];
    score?: number;
    sources?: {
        judgement?: number[];
        riffRaff?: number[];
        [key: string]: number[] | undefined;
    };
}

interface JamlBuilderProps {
    onJamlGenerated?: (jamlYaml: string, parsed: any) => void;
    initialJaml?: any;
}

// Clause Editor Modal
function ClauseEditorModal({
    opened,
    onClose,
    clause,
    onSave,
    clauseCategory
}: {
    opened: boolean;
    onClose: () => void;
    clause: Clause | null;
    onSave: (clause: Clause) => void;
    clauseCategory: 'must' | 'should' | 'mustNot';
}) {
    const [type, setType] = useState(clause?.type || 'joker');
    const [value, setValue] = useState(clause?.value || 'Any');
    const [edition, setEdition] = useState(clause?.edition || '');
    const [antes, setAntes] = useState<string[]>(clause?.antes?.map(String) || ['1']);
    const [shopSlots, setShopSlots] = useState<number[]>(clause?.shopSlots || []);
    const [packSlots, setPackSlots] = useState<number[]>(clause?.packSlots || []);
    const [score, setScore] = useState<number>(clause?.score || 1);
    const [useJudgement, setUseJudgement] = useState(!!clause?.sources?.judgement?.length);
    const [judgementSlots, setJudgementSlots] = useState<number[]>(clause?.sources?.judgement || [0, 1]);

    // Get value options based on type
    const valueOptions = useMemo(() => {
        const base = [{ value: 'Any', label: 'Any' }];
        switch (type) {
            case 'soulJoker':
                return [...base, ...SOUL_JOKERS.map(j => ({ value: j, label: j }))];
            case 'joker':
                return [...base, ...COMMON_JOKERS.map(j => ({ value: j, label: j }))];
            case 'voucher':
                return [...base, ...VOUCHERS.map(v => ({ value: v, label: v }))];
            case 'tarotCard':
                return [...base, ...TAROTS.map(t => ({ value: t, label: t }))];
            case 'spectralCard':
                return [...base, ...SPECTRALS.map(s => ({ value: s, label: s }))];
            default:
                return base;
        }
    }, [type]);

    const handleSave = () => {
        const newClause: Clause = {
            id: clause?.id || `clause-${Date.now()}`,
            type,
            value,
            antes: antes.map(Number),
            ...(edition && { edition }),
            ...(shopSlots.length > 0 && { shopSlots }),
            ...(packSlots.length > 0 && { packSlots }),
            ...(clauseCategory === 'should' && { score }),
            ...(useJudgement && judgementSlots.length > 0 && {
                sources: { judgement: judgementSlots }
            })
        };
        onSave(newClause);
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title={clause ? 'Edit Clause' : 'Add Clause'} size="lg">
            <Stack gap="md">
                <Group grow>
                    <Select
                        label="Card Type"
                        data={CARD_TYPES}
                        value={type}
                        onChange={(v) => { setType(v || 'joker'); setValue('Any'); }}
                    />
                    <Select
                        label="Card Value"
                        data={valueOptions}
                        value={value}
                        onChange={(v) => setValue(v || 'Any')}
                        searchable
                        nothingFoundMessage="Type to search..."
                    />
                </Group>

                <Select
                    label="Edition"
                    data={EDITIONS}
                    value={edition}
                    onChange={(v) => setEdition(v || '')}
                    clearable
                />

                <MultiSelect
                    label="Antes"
                    data={ANTE_OPTIONS}
                    value={antes}
                    onChange={setAntes}
                    placeholder="Select antes..."
                />

                <Fieldset legend="Sources (where to find)">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">Shop Slots (0-5)</Text>
                        <Group gap="xs">
                            {[0, 1, 2, 3, 4, 5].map(slot => (
                                <Checkbox
                                    key={slot}
                                    label={String(slot)}
                                    checked={shopSlots.includes(slot)}
                                    onChange={(e) => {
                                        if (e.currentTarget.checked) {
                                            setShopSlots([...shopSlots, slot].sort((a, b) => a - b));
                                        } else {
                                            setShopSlots(shopSlots.filter(s => s !== slot));
                                        }
                                    }}
                                />
                            ))}
                        </Group>

                        <Text size="sm" c="dimmed" mt="xs">Pack Slots (0-4)</Text>
                        <Group gap="xs">
                            {[0, 1, 2, 3, 4].map(slot => (
                                <Checkbox
                                    key={slot}
                                    label={String(slot)}
                                    checked={packSlots.includes(slot)}
                                    onChange={(e) => {
                                        if (e.currentTarget.checked) {
                                            setPackSlots([...packSlots, slot].sort((a, b) => a - b));
                                        } else {
                                            setPackSlots(packSlots.filter(s => s !== slot));
                                        }
                                    }}
                                />
                            ))}
                        </Group>

                        <Text size="sm" c="dimmed" mt="xs">Misc Sources</Text>
                        <Checkbox
                            label="Judgement (Tarot rolls)"
                            checked={useJudgement}
                            onChange={(e) => setUseJudgement(e.currentTarget.checked)}
                        />
                        {useJudgement && (
                            <Group gap="xs" ml="md">
                                {[0, 1, 2, 3].map(slot => (
                                    <Checkbox
                                        key={slot}
                                        size="xs"
                                        label={`${slot}`}
                                        checked={judgementSlots.includes(slot)}
                                        onChange={(e) => {
                                            if (e.currentTarget.checked) {
                                                setJudgementSlots([...judgementSlots, slot].sort((a, b) => a - b));
                                            } else {
                                                setJudgementSlots(judgementSlots.filter(s => s !== slot));
                                            }
                                        }}
                                    />
                                ))}
                            </Group>
                        )}
                        <Group gap="md" mt="xs">
                            <Checkbox label="Rare Tag" disabled />
                            <Checkbox label="Uncommon Tag" disabled />
                            <Checkbox label="Riff Raff" disabled />
                            <Checkbox label="Emperor" disabled />
                            <Checkbox label="Seance" disabled />
                            <Checkbox label="6th Sense" disabled />
                        </Group>
                        <Text size="xs" c="dimmed" mt={4}>More misc sources coming soon</Text>
                    </Stack>
                </Fieldset>

                {clauseCategory === 'should' && (
                    <NumberInput
                        label="Score"
                        description="Points awarded when this is found"
                        value={score}
                        onChange={(v) => setScore(Number(v) || 1)}
                        min={1}
                        max={100}
                    />
                )}

                <Group justify="flex-end" mt="md">
                    <Button variant="light" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Clause</Button>
                </Group>
            </Stack>
        </Modal>
    );
}

// Clause Card Component
function ClauseCard({
    clause,
    category,
    onEdit,
    onDelete
}: {
    clause: Clause;
    category: 'must' | 'should' | 'mustNot';
    onEdit: () => void;
    onDelete: () => void;
}) {
    const categoryColors = {
        must: 'red',
        should: 'blue',
        mustNot: 'gray'
    };

    return (
        <Paper p="xs" radius="sm">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                    <Badge size="sm" color={categoryColors[category]} variant="light">
                        {clause.type}
                    </Badge>
                    <Text size="sm" fw={500}>{clause.value}</Text>
                    {clause.edition && (
                        <Badge size="xs" color="grape" variant="outline">{clause.edition}</Badge>
                    )}
                    {clause.score && category === 'should' && (
                        <Badge size="xs" color="green" variant="filled">+{clause.score}</Badge>
                    )}
                </Group>
                <Group gap={4}>
                    <Text size="xs" c="dimmed">
                        A{clause.antes.join(',')}
                    </Text>
                    <ActionIcon size="sm" variant="subtle" onClick={onEdit}>
                        <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
                        <IconTrash size={14} />
                    </ActionIcon>
                </Group>
            </Group>
            {(clause.shopSlots?.length || clause.packSlots?.length || clause.sources?.judgement?.length) && (
                <Group gap={4} mt={4}>
                    {clause.shopSlots?.length ? (
                        <Badge size="xs" variant="dot" color="cyan">Shop: {clause.shopSlots.join(',')}</Badge>
                    ) : null}
                    {clause.packSlots?.length ? (
                        <Badge size="xs" variant="dot" color="orange">Pack: {clause.packSlots.join(',')}</Badge>
                    ) : null}
                    {clause.sources?.judgement?.length ? (
                        <Badge size="xs" variant="dot" color="violet">Judgement: {clause.sources.judgement.join(',')}</Badge>
                    ) : null}
                </Group>
            )}
        </Paper>
    );
}

export function JamlBuilder({ onJamlGenerated, initialJaml }: JamlBuilderProps) {
    // Filter metadata
    const [filterName, setFilterName] = useState(initialJaml?.name || 'My Filter');
    const [filterAuthor, setFilterAuthor] = useState(initialJaml?.author || '');
    const [filterDeck, setFilterDeck] = useState(initialJaml?.deck || 'Red');
    const [filterStake, setFilterStake] = useState(initialJaml?.stake || 'White');

    // Clauses
    const [mustClauses, setMustClauses] = useState<Clause[]>([]);
    const [shouldClauses, setShouldClauses] = useState<Clause[]>([]);
    const [mustNotClauses, setMustNotClauses] = useState<Clause[]>([]);

    // Editor modal state
    const [editorOpened, { open: openEditor, close: closeEditor }] = useDisclosure(false);
    const [editingClause, setEditingClause] = useState<Clause | null>(null);
    const [editingCategory, setEditingCategory] = useState<'must' | 'should' | 'mustNot'>('must');

    // Active tab
    const [activeTab, setActiveTab] = useState<string | null>('must');

    // Generate JAML YAML
    const generatedJaml = useMemo(() => {
        const jamlObj: any = {
            name: filterName,
            ...(filterAuthor && { author: filterAuthor }),
            deck: filterDeck,
            stake: filterStake,
        };

        const formatClause = (clause: Clause) => {
            const formatted: any = {};
            formatted[clause.type] = clause.value;
            if (clause.edition) formatted.edition = clause.edition;
            formatted.antes = clause.antes;
            if (clause.shopSlots?.length) formatted.shopSlots = clause.shopSlots;
            if (clause.packSlots?.length) formatted.packSlots = clause.packSlots;
            if (clause.score) formatted.score = clause.score;
            if (clause.sources && Object.keys(clause.sources).length > 0) {
                formatted.sources = clause.sources;
            }
            return formatted;
        };

        if (mustClauses.length > 0) {
            jamlObj.must = mustClauses.map(formatClause);
        }
        if (shouldClauses.length > 0) {
            jamlObj.should = shouldClauses.map(formatClause);
        }
        if (mustNotClauses.length > 0) {
            jamlObj.mustNot = mustNotClauses.map(formatClause);
        }

        return yaml.dump(jamlObj, { indent: 2, lineWidth: -1 });
    }, [filterName, filterAuthor, filterDeck, filterStake, mustClauses, shouldClauses, mustNotClauses]);

    // Notify parent of changes
    React.useEffect(() => {
        if (onJamlGenerated) {
            try {
                const parsed = yaml.load(generatedJaml);
                onJamlGenerated(generatedJaml, parsed);
            } catch (e) {
                // Invalid YAML, don't notify
            }
        }
    }, [generatedJaml, onJamlGenerated]);

    const handleAddClause = (category: 'must' | 'should' | 'mustNot') => {
        setEditingClause(null);
        setEditingCategory(category);
        openEditor();
    };

    const handleEditClause = (clause: Clause, category: 'must' | 'should' | 'mustNot') => {
        setEditingClause(clause);
        setEditingCategory(category);
        openEditor();
    };

    const handleSaveClause = (clause: Clause) => {
        const setters = {
            must: setMustClauses,
            should: setShouldClauses,
            mustNot: setMustNotClauses
        };
        const setter = setters[editingCategory];

        if (editingClause) {
            // Update existing
            setter(prev => prev.map(c => c.id === clause.id ? clause : c));
        } else {
            // Add new
            setter(prev => [...prev, clause]);
        }
    };

    const handleDeleteClause = (clauseId: string, category: 'must' | 'should' | 'mustNot') => {
        const setters = {
            must: setMustClauses,
            should: setShouldClauses,
            mustNot: setMustNotClauses
        };
        setters[category](prev => prev.filter(c => c.id !== clauseId));
    };

    const handleCopyYaml = useCallback(() => {
        navigator.clipboard.writeText(generatedJaml);
    }, [generatedJaml]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([generatedJaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filterName.replace(/\s+/g, '-').toLowerCase()}.jaml`;
        a.click();
        URL.revokeObjectURL(url);
    }, [generatedJaml, filterName]);

    return (
        <Paper p="md" radius="md">
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between">
                    <Text fw={600}>JAML Builder</Text>
                    <Group gap="xs">
                        <Tooltip label="Copy YAML">
                            <ActionIcon variant="light" onClick={handleCopyYaml}>
                                <IconCopy size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download .jaml">
                            <ActionIcon variant="light" color="blue" onClick={handleDownload}>
                                <IconDownload size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

                {/* Filter Metadata */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                    <TextInput
                        size="xs"
                        label="Name"
                        value={filterName}
                        onChange={(e) => setFilterName(e.currentTarget.value)}
                    />
                    <TextInput
                        size="xs"
                        label="Author"
                        value={filterAuthor}
                        onChange={(e) => setFilterAuthor(e.currentTarget.value)}
                    />
                    <Select
                        size="xs"
                        label="Deck"
                        data={['Red', 'Blue', 'Yellow', 'Green', 'Black', 'Magic', 'Nebula', 'Ghost', 'Abandoned', 'Checkered', 'Zodiac', 'Painted', 'Anaglyph', 'Plasma', 'Erratic']}
                        value={filterDeck}
                        onChange={(v) => setFilterDeck(v || 'Red')}
                    />
                    <Select
                        size="xs"
                        label="Stake"
                        data={['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold']}
                        value={filterStake}
                        onChange={(v) => setFilterStake(v || 'White')}
                    />
                </SimpleGrid>

                <Divider />

                {/* Clauses Tabs */}
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="must" leftSection={<Badge size="xs" color="red" circle>{mustClauses.length}</Badge>}>
                            MUST
                        </Tabs.Tab>
                        <Tabs.Tab value="should" leftSection={<Badge size="xs" color="blue" circle>{shouldClauses.length}</Badge>}>
                            SHOULD
                        </Tabs.Tab>
                        <Tabs.Tab value="mustNot" leftSection={<Badge size="xs" color="gray" circle>{mustNotClauses.length}</Badge>}>
                            MUST NOT
                        </Tabs.Tab>
                        <Tabs.Tab value="preview">
                            Preview YAML
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="must" pt="xs">
                        <Stack gap="xs">
                            <Button
                                size="xs"
                                variant="light"
                                color="red"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => handleAddClause('must')}
                            >
                                Add Required Clause
                            </Button>
                            {mustClauses.map(clause => (
                                <ClauseCard
                                    key={clause.id}
                                    clause={clause}
                                    category="must"
                                    onEdit={() => handleEditClause(clause, 'must')}
                                    onDelete={() => handleDeleteClause(clause.id, 'must')}
                                />
                            ))}
                            {mustClauses.length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                    No required clauses. Seeds must match ALL clauses here.
                                </Text>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="should" pt="xs">
                        <Stack gap="xs">
                            <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => handleAddClause('should')}
                            >
                                Add Scoring Clause
                            </Button>
                            {shouldClauses.map(clause => (
                                <ClauseCard
                                    key={clause.id}
                                    clause={clause}
                                    category="should"
                                    onEdit={() => handleEditClause(clause, 'should')}
                                    onDelete={() => handleDeleteClause(clause.id, 'should')}
                                />
                            ))}
                            {shouldClauses.length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                    No scoring clauses. These award points for nice-to-have items.
                                </Text>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="mustNot" pt="xs">
                        <Stack gap="xs">
                            <Button
                                size="xs"
                                variant="light"
                                color="gray"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => handleAddClause('mustNot')}
                            >
                                Add Banned Clause
                            </Button>
                            {mustNotClauses.map(clause => (
                                <ClauseCard
                                    key={clause.id}
                                    clause={clause}
                                    category="mustNot"
                                    onEdit={() => handleEditClause(clause, 'mustNot')}
                                    onDelete={() => handleDeleteClause(clause.id, 'mustNot')}
                                />
                            ))}
                            {mustNotClauses.length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                    No banned clauses. Seeds with these items will be excluded.
                                </Text>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="preview" pt="xs">
                        <ScrollArea h={200}>
                            <Code block style={{ whiteSpace: 'pre', fontFamily: 'monospace', fontSize: '12px' }}>
                                {generatedJaml}
                            </Code>
                        </ScrollArea>
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            {/* Clause Editor Modal */}
            <ClauseEditorModal
                opened={editorOpened}
                onClose={closeEditor}
                clause={editingClause}
                onSave={handleSaveClause}
                clauseCategory={editingCategory}
            />
        </Paper>
    );
}

export default JamlBuilder;
