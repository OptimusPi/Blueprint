import React, { useCallback, useMemo, useState } from 'react';
import {
    ActionIcon,
    Box,
    Button,
    Collapse,
    CopyButton,
    Group,
    Paper,
    Select,
    Stack,
    Text,
    TextInput,
    Textarea,
    Tooltip,
    useMantineTheme,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import yaml from 'js-yaml';

const DECKS = [
    'Red Deck', 'Blue Deck', 'Yellow Deck', 'Green Deck', 'Black Deck',
    'Magic Deck', 'Nebula Deck', 'Ghost Deck', 'Abandoned Deck', 'Checkered Deck',
    'Zodiac Deck', 'Painted Deck', 'Anaglyph Deck', 'Plasma Deck', 'Erratic Deck',
];

const STAKES = [
    'White Stake', 'Red Stake', 'Green Stake', 'Black Stake', 'Blue Stake',
    'Purple Stake', 'Orange Stake', 'Gold Stake',
];

const CLAUSE_TYPES = [
    { value: 'joker', label: 'Joker' },
    { value: 'soulJoker', label: 'Soul Joker' },
    { value: 'voucher', label: 'Voucher' },
    { value: 'tarotCard', label: 'Tarot' },
    { value: 'planetCard', label: 'Planet' },
    { value: 'tag', label: 'Tag' },
    { value: 'boss', label: 'Boss' },
];

interface ClauseRow {
    type: string;
    value: string;
    antes: string;
}

function clauseToYaml(clause: ClauseRow): Record<string, unknown> {
    const key = clause.type;
    const out: Record<string, unknown> = { [key]: clause.value || 'Any' };
    if (clause.antes.trim()) {
        const nums = clause.antes.split(/[\s,]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
        if (nums.length) out.antes = nums;
    }
    return out;
}

function yamlToClause(item: any): ClauseRow {
    const type = Object.keys(item || {}).find((k) =>
        ['joker', 'soulJoker', 'voucher', 'tarotCard', 'planetCard', 'tag', 'boss'].includes(k)
    );
    const value = type ? (item[type] ?? '') : '';
    const antes = Array.isArray(item?.antes) ? item.antes.join(', ') : '';
    return { type: type || 'joker', value: String(value), antes };
}

const DEFAULT_JAML = {
    name: 'My Filter',
    deck: 'Red Deck',
    stake: 'White Stake',
    must: [] as Array<any>,
    should: [] as Array<any>,
};

interface JamlConfiguratorProps {
    initialJaml?: string;
    onJamlChange?: (yamlStr: string, parsed: any, isValid: boolean) => void;
}

export function JamlConfigurator({ initialJaml, onJamlChange }: JamlConfiguratorProps) {
    const theme = useMantineTheme();
    const [showYaml, { toggle: toggleYaml }] = useDisclosure(false);
    const [rawMode, setRawMode] = useState(false);
    const [rawText, setRawText] = useState('');

    const initialParsed = useMemo(() => {
        try {
            const parsed = yaml.load(initialJaml || '') as any;
            if (parsed && typeof parsed === 'object') {
                const deckVal = parsed.deck ?? DEFAULT_JAML.deck;
                const stakeVal = parsed.stake ?? DEFAULT_JAML.stake;
                const deck = DECKS.includes(deckVal) ? deckVal : (DECKS.find((d) => d.startsWith(deckVal)) ?? DEFAULT_JAML.deck);
                const stake = STAKES.includes(stakeVal) ? stakeVal : (STAKES.find((s) => s.startsWith(stakeVal)) ?? DEFAULT_JAML.stake);
                return {
                    name: parsed.name ?? DEFAULT_JAML.name,
                    deck,
                    stake,
                    must: (parsed.must && Array.isArray(parsed.must))
                        ? parsed.must.map(yamlToClause)
                        : [],
                    should: (parsed.should && Array.isArray(parsed.should))
                        ? parsed.should.map(yamlToClause)
                        : [],
                };
            }
        } catch {
            // ignore
        }
        return {
            name: DEFAULT_JAML.name,
            deck: DEFAULT_JAML.deck,
            stake: DEFAULT_JAML.stake,
            must: [] as Array<ClauseRow>,
            should: [] as Array<ClauseRow>,
        };
    }, [initialJaml]);

    const [name, setName] = useState(initialParsed.name);
    const [deck, setDeck] = useState(initialParsed.deck);
    const [stake, setStake] = useState(initialParsed.stake);
    const [must, setMust] = useState<Array<ClauseRow>>(initialParsed.must);
    const [should, setShould] = useState<Array<ClauseRow>>(initialParsed.should);

    const applyParsedToForm = useCallback((parsed: any) => {
        if (parsed && typeof parsed === 'object') {
            setName(parsed.name ?? DEFAULT_JAML.name);
            setDeck(parsed.deck ?? DEFAULT_JAML.deck);
            setStake(parsed.stake ?? DEFAULT_JAML.stake);
            setMust((parsed.must && Array.isArray(parsed.must)) ? parsed.must.map(yamlToClause) : []);
            setShould((parsed.should && Array.isArray(parsed.should)) ? parsed.should.map(yamlToClause) : []);
        }
    }, []);


    const buildYaml = useCallback(() => {
        const obj = {
            name: name.trim() || 'My Filter',
            deck,
            stake,
            must: must.map(clauseToYaml),
            should: should.map(clauseToYaml),
        };
        return yaml.dump(obj, { lineWidth: -1 });
    }, [name, deck, stake, must, should]);

    const emit = useCallback(
        (yamlStr: string) => {
            try {
                const parsed = yaml.load(yamlStr);
                onJamlChange?.(yamlStr, parsed, true);
            } catch {
                onJamlChange?.(yamlStr, null, false);
            }
        },
        [onJamlChange]
    );

    const addRule = useCallback((section: 'must' | 'should') => {
        const newRow: ClauseRow = { type: 'joker', value: 'Any', antes: '' };
        if (section === 'must') setMust((p) => [...p, newRow]);
        else setShould((p) => [...p, newRow]);
    }, []);

    const removeRule = useCallback((section: 'must' | 'should', index: number) => {
        if (section === 'must') setMust((p) => p.filter((_, i) => i !== index));
        else setShould((p) => p.filter((_, i) => i !== index));
    }, []);

    const updateRule = useCallback(
        (section: 'must' | 'should', index: number, field: keyof ClauseRow, value: string) => {
            const setter = section === 'must' ? setMust : setShould;
            setter((p) =>
                p.map((row, i) => (i === index ? { ...row, [field]: value } : row))
            );
        },
        []
    );

    React.useEffect(() => {
        emit(buildYaml());
    }, [buildYaml, emit]);

    // Raw text mode: user edits YAML directly
    if (rawMode) {
        const yamlStr = rawText || buildYaml();
        return (
            <Stack gap="sm">
                <Text size="xs" c="dimmed">
                    Edit YAML directly. Valid changes will sync back to the form when you switch back.
                </Text>
                <Textarea
                    value={yamlStr}
                    onChange={(e) => setRawText(e.currentTarget.value)}
                    minRows={16}
                    autosize
                    styles={{
                        input: {
                            fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
                            fontSize: '13px',
                            lineHeight: 1.5,
                        },
                    }}
                />
                <Group>
                    <Button size="xs" variant="light" onClick={() => setRawMode(false)}>
                        Back to form
                    </Button>
                    <Button
                        size="xs"
                        onClick={() => {
                            try {
                                const parsed = yaml.load(rawText);
                                emit(rawText);
                                applyParsedToForm(parsed);
                                setRawMode(false);
                            } catch {
                                emit(rawText);
                            }
                        }}
                    >
                        Apply and close
                    </Button>
                </Group>
            </Stack>
        );
    }

    const yamlStr = buildYaml();

    function RuleRow({
        section,
        index,
        row,
    }: {
        section: 'must' | 'should';
        index: number;
        row: ClauseRow;
    }) {
        return (
            <Group key={index} gap="xs" align="flex-start" wrap="nowrap">
                <Select
                    size="xs"
                    w={120}
                    data={CLAUSE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    value={row.type}
                    onChange={(v) => v && updateRule(section, index, 'type', v)}
                />
                <TextInput
                    size="xs"
                    placeholder="e.g. Blueprint or Any"
                    value={row.value}
                    onChange={(e) => updateRule(section, index, 'value', e.currentTarget.value)}
                    style={{ flex: 1 }}
                />
                <TextInput
                    size="xs"
                    placeholder="1,2,3"
                    value={row.antes}
                    onChange={(e) => updateRule(section, index, 'antes', e.currentTarget.value)}
                    w={80}
                />
                <Tooltip label="Remove">
                    <ActionIcon size="sm" color="red" variant="subtle" onClick={() => removeRule(section, index)}>
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        );
    }

    return (
        <Stack gap="md">
            <Paper p="md" radius="md" bg={theme.colors.dark[6]}>
                <Text size="xs" fw={600} c="dimmed" mb={4}>BASIC INFO</Text>
                <Group grow align="flex-end" wrap="wrap">
                    <TextInput
                        label="Filter name"
                        placeholder="My Filter"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        size="sm"
                    />
                    <Select
                        label="Deck"
                        data={DECKS}
                        value={deck}
                        onChange={(v) => v && setDeck(v)}
                        size="sm"
                    />
                    <Select
                        label="Stake"
                        data={STAKES}
                        value={stake}
                        onChange={(v) => v && setStake(v)}
                        size="sm"
                    />
                </Group>
            </Paper>

            <Paper p="md" radius="md" bg={theme.colors.dark[6]}>
                <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={700} c="red">Must have (all required)</Text>
                    <Button size="xs" leftSection={<IconPlus size={12} />} variant="light" onClick={() => addRule('must')}>
                        Add rule
                    </Button>
                </Group>
                <Stack gap={6}>
                    {must.length === 0 && (
                        <Text size="xs" c="dimmed">No rules. Add one to require e.g. a specific joker or voucher.</Text>
                    )}
                    {must.map((row, i) => (
                        <RuleRow key={i} section="must" index={i} row={row} />
                    ))}
                </Stack>
            </Paper>

            <Paper p="md" radius="md" bg={theme.colors.dark[6]}>
                <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={700} c="blue">Should have (preferred)</Text>
                    <Button size="xs" leftSection={<IconPlus size={12} />} variant="light" onClick={() => addRule('should')}>
                        Add rule
                    </Button>
                </Group>
                <Stack gap={6}>
                    {should.length === 0 && (
                        <Text size="xs" c="dimmed">Optional. Add rules you’d like the seed to satisfy.</Text>
                    )}
                    {should.map((row, i) => (
                        <RuleRow key={i} section="should" index={i} row={row} />
                    ))}
                </Stack>
            </Paper>

            <Box>
                <Button
                    size="xs"
                    variant="subtle"
                    leftSection={showYaml ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    onClick={toggleYaml}
                >
                    {showYaml ? 'Hide' : 'View'} YAML
                </Button>
                <Collapse in={showYaml}>
                    <Paper p="sm" mt="xs" bg={theme.colors.dark[8]} style={{ borderRadius: 8 }}>
                        <Group justify="space-between" mb="xs">
                            <Text size="xs" c="dimmed">Plaintext output (copy to use in Motely or files)</Text>
                            <CopyButton value={yamlStr}>
                                {({ copied, copy }) => (
                                    <Button size="xs" variant="light" onClick={copy}>
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Button>
                                )}
                            </CopyButton>
                        </Group>
                        <Textarea
                            value={yamlStr}
                            readOnly
                            minRows={8}
                            autosize
                            styles={{
                                input: {
                                    fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
                                    fontSize: '12px',
                                    lineHeight: 1.5,
                                },
                            }}
                        />
                    </Paper>
                </Collapse>
            </Box>

            <Button size="xs" variant="default" onClick={() => { setRawText(buildYaml()); setRawMode(true); }}>
                Edit as plain text
            </Button>
        </Stack>
    );
}

export default JamlConfigurator;
