import React, { useState, useCallback } from 'react';
import { Box, Group, Stack, Text, Paper, Badge, ActionIcon, TextInput, Popover } from '@mantine/core';
import { IconX, IconPlus } from '@tabler/icons-react';
import yaml from 'js-yaml';

// Accessible colors - high contrast, vision-friendly
const COLORS = {
  bg: '#FFFFFF',
  bgAlt: '#F8F9FA',
  text: '#212529',
  textMuted: '#6C757D',
  border: '#DEE2E6',
  must: '#E03131',
  should: '#1971C2',
  complete: '#2F9E44',
  hover: '#E9ECEF',
  selected: '#D0EBFF',
};

interface Filter {
  type: string;
  value?: string;
  antes?: number[];
}

function FilterBubble({ filter, isSelected, onTap, onRemove, color }: {
  filter: Filter;
  isSelected: boolean;
  onTap: () => void;
  onRemove: () => void;
  color: string;
}) {
  return (
    <Box
      onClick={onTap}
      style={{
        padding: '14px 18px',
        borderRadius: '24px',
        backgroundColor: isSelected ? COLORS.selected : COLORS.bg,
        border: `2px solid ${isSelected ? color : COLORS.border}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        minWidth: '180px',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.hover;
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.bg;
      }}
    >
      <Group justify="space-between" align="center">
        <Text size="sm" fw={600} style={{ color: COLORS.text }}>
          {filter.type}
        </Text>
        {filter.value && (
          <Badge size="sm" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}40` }}>
            {filter.value}
          </Badge>
        )}
      </Group>

      {filter.antes && filter.antes.length > 0 && (
        <Text size="xs" mt={4} style={{ color: COLORS.textMuted }}>
          Antes: {filter.antes.join(', ')}
        </Text>
      )}

      {isSelected && (
        <ActionIcon
          size={22}
          variant="filled"
          color="red"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ position: 'absolute', top: '-10px', right: '-10px', borderRadius: '50%', border: '2px solid white' }}
        >
          <IconX size={12} />
        </ActionIcon>
      )}
    </Box>
  );
}

function AddFilterBubble({ onAdd, color }: { onAdd: (type: string) => void; color: string }) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState('');

  const filterTypes = [
    'joker', 'soulJoker', 'voucher', 'tarotCard', 'planetCard', 
    'spectralCard', 'standardCard', 'tag', 'boss'
  ];

  const filtered = filterTypes.filter(t => 
    t.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="lg" radius="lg">
      <Popover.Target>
        <Box
          onClick={() => setOpened(!opened)}
          style={{
            padding: '14px 24px',
            borderRadius: '24px',
            border: `2px dashed ${color}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}15`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <IconPlus size={18} color={color} />
          <Text size="sm" fw={600} style={{ color }}>
            Add Filter
          </Text>
        </Box>
      </Popover.Target>

      <Popover.Dropdown p="xs" style={{ minWidth: '280px' }}>
        <TextInput
          placeholder="Search filters..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          size="sm"
          mb="xs"
          autoFocus
        />
        <Stack gap={4}>
          {filtered.map(type => (
            <Box
              key={type}
              onClick={() => { onAdd(type); setOpened(false); setSearch(''); }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Text size="sm" fw={500} style={{ color: COLORS.text }}>
                {type}
              </Text>
            </Box>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

interface SimpleBubbleEditorProps {
  initialJaml?: string;
  onJamlChange?: (jamlYaml: string, parsed: any, isValid: boolean) => void;
}

export function SimpleBubbleEditor({ initialJaml, onJamlChange }: SimpleBubbleEditorProps) {
  const [jaml, setJaml] = useState<any>(() => {
    try {
      return yaml.load(initialJaml || '');
    } catch {
      return { name: 'My Filter', deck: 'Red', stake: 'White', must: [], should: [] };
    }
  });

  const [selectedSection, setSelectedSection] = useState<'must' | 'should' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const notifyChange = useCallback((newJaml: any) => {
    const yamlStr = yaml.dump(newJaml);
    if (onJamlChange) {
      try {
        const parsed = yaml.load(yamlStr);
        onJamlChange(yamlStr, parsed, true);
      } catch {
        onJamlChange(yamlStr, null, false);
      }
    }
  }, [onJamlChange]);

  const parseFilters = useCallback((items: any[]): Filter[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item: any) => {
      const type = Object.keys(item).find(k => ['joker', 'soulJoker', 'voucher', 'tarotCard', 'planetCard', 'spectralCard', 'standardCard', 'tag', 'boss'].includes(k));
      if (!type) return { type: 'unknown' };
      return { type, value: item[type], antes: item.antes };
    });
  }, []);

  const filters = {
    must: parseFilters(jaml.must || []),
    should: parseFilters(jaml.should || []),
  };

  const addFilter = useCallback((section: 'must' | 'should', type: string) => {
    setJaml((prev: any) => {
      const newJaml = { ...prev };
      const newFilter: any = { [type]: '' };
      newJaml[section] = [...(newJaml[section] || []), newFilter];
      notifyChange(newJaml);
      return newJaml;
    });
  }, [notifyChange]);

  const removeFilter = useCallback((section: 'must' | 'should', index: number) => {
    setJaml((prev: any) => {
      const newJaml = { ...prev };
      newJaml[section] = newJaml[section].filter((_: any, i: number) => i !== index);
      notifyChange(newJaml);
      return newJaml;
    });
    setSelectedIndex(null);
  }, [notifyChange]);

  return (
    <Stack gap="lg" p="lg" style={{ backgroundColor: COLORS.bg }}>
      <Paper p="md" radius="lg" style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}>
        <Group gap={16}>
          <Box style={{ flex: 1 }}>
            <Text size="xs" fw={600} mb={2} style={{ color: COLORS.textMuted }}>NAME</Text>
            <Text size="md" fw={700} style={{ color: COLORS.text }}>{jaml.name || 'My Filter'}</Text>
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="xs" fw={600} mb={2} style={{ color: COLORS.textMuted }}>DECK</Text>
            <Badge size="lg" style={{ backgroundColor: COLORS.complete + '20', color: COLORS.complete }}>
              {jaml.deck || 'Red'}
            </Badge>
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="xs" fw={600} mb={2} style={{ color: COLORS.textMuted }}>STAKE</Text>
            <Badge size="lg" style={{ backgroundColor: COLORS.complete + '20', color: COLORS.complete }}>
              {jaml.stake || 'White'}
            </Badge>
          </Box>
        </Group>
      </Paper>

      <Paper p="md" radius="lg" style={{ backgroundColor: COLORS.bgAlt, border: `2px solid ${COLORS.must}40` }}>
        <Text fw={700} size="md" mb={12} style={{ color: COLORS.must }}>Must Have</Text>
        <Group gap={8} wrap="wrap">
          {filters.must.map((filter, i) => (
            <FilterBubble
              key={i}
              filter={filter}
              isSelected={selectedSection === 'must' && selectedIndex === i}
              onTap={() => { setSelectedSection('must'); setSelectedIndex(selectedIndex === i ? null : i); }}
              onRemove={() => removeFilter('must', i)}
              color={COLORS.must}
            />
          ))}
          <AddFilterBubble onAdd={(type) => addFilter('must', type)} color={COLORS.must} />
        </Group>
      </Paper>

      <Paper p="md" radius="lg" style={{ backgroundColor: COLORS.bgAlt, border: `2px solid ${COLORS.should}40` }}>
        <Text fw={700} size="md" mb={12} style={{ color: COLORS.should }}>Should Have</Text>
        <Group gap={8} wrap="wrap">
          {filters.should.map((filter, i) => (
            <FilterBubble
              key={i}
              filter={filter}
              isSelected={selectedSection === 'should' && selectedIndex === i}
              onTap={() => { setSelectedSection('should'); setSelectedIndex(selectedIndex === i ? null : i); }}
              onRemove={() => removeFilter('should', i)}
              color={COLORS.should}
            />
          ))}
          <AddFilterBubble onAdd={(type) => addFilter('should', type)} color={COLORS.should} />
        </Group>
      </Paper>

      <Text size="sm" style={{ color: COLORS.textMuted, textAlign: 'center' }}>
        Tap a bubble to select • Tap X to remove • Tap "Add Filter" to add new criteria
      </Text>
    </Stack>
  );
}

export default SimpleBubbleEditor;
