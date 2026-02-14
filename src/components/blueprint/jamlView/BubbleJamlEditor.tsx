import React, { useState, useCallback, useMemo } from 'react';
import { Box, Group, Stack, Text, Paper, Badge, ActionIcon } from '@mantine/core';
import yaml from 'js-yaml';
import { IconX, IconPlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

// Accessible color palette - high contrast, vision-friendly
const ACCESSIBLE_COLORS = {
  background: '#FFFFFF',
  backgroundAlt: '#F5F5F5',
  text: '#000000',
  textSecondary: '#333333',
  border: '#CCCCCC',
  borderLight: '#E0E0E0',
  must: '#FF6B6B', // Soft red - WCAG compliant
  should: '#4ECDC4', // Teal - WCAG compliant
  mustNot: '#95A5A6', // Gray - WCAG compliant
  complete: '#2ECC71', // Green - WCAG compliant
  incomplete: '#F39C12', // Orange - WCAG compliant
  metadata: '#9B59B6', // Purple - WCAG compliant
  hover: '#E8F4F8',
  selected: '#D1F2EB',
};

interface FilterBubbleProps {
  filter: {
    type: string; // joker, voucher, etc.
    value?: string;
    antes?: number[];
    properties?: Record<string, any>;
  };
  isSelected: boolean;
  onTap: () => void;
  onRemove: () => void;
  section: 'must' | 'should' | 'mustNot';
}

function FilterBubble({ filter, isSelected, onTap, onRemove, section }: FilterBubbleProps) {
  const color = section === 'must' ? ACCESSIBLE_COLORS.must 
    : section === 'should' ? ACCESSIBLE_COLORS.should 
    : ACCESSIBLE_COLORS.mustNot;

  return (
    <Box
      onClick={onTap}
      style={{
        padding: '12px 16px',
        borderRadius: '20px',
        backgroundColor: isSelected ? ACCESSIBLE_COLORS.selected : ACCESSIBLE_COLORS.background,
        border: `2px solid ${isSelected ? color : ACCESSIBLE_COLORS.borderLight}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '200px',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = ACCESSIBLE_COLORS.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = ACCESSIBLE_COLORS.background;
        }
      }}
    >
      <Group justify="space-between" align="center" mb={4}>
        <Text size="sm" fw={700} style={{ color: ACCESSIBLE_COLORS.text }}>
          {filter.type}
        </Text>
        {filter.value && (
          <Badge size="sm" style={{ backgroundColor: `${color}20`, color: color }}>
            {filter.value}
          </Badge>
        )}
      </Group>

      {filter.antes && filter.antes.length > 0 && (
        <Text size="xs" style={{ color: ACCESSIBLE_COLORS.textSecondary }}>
          Antes: {filter.antes.join(', ')}
        </Text>
      )}

      {isSelected && (
        <ActionIcon
          size={20}
          variant="filled"
          color="red"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            borderRadius: '50%',
            border: '2px solid white',
          }}
        >
          <IconX size={12} />
        </ActionIcon>
      )}
    </Box>
  );
}

interface SectionProps {
  title: string;
  color: string;
  filters: Array<{
    type: string;
    value?: string;
    antes?: number[];
    properties?: Record<string, any>;
  }>;
  onAddFilter: () => void;
  onSelectFilter: (index: number) => void;
  onRemoveFilter: (index: number) => void;
  selectedFilterIndex: number | null;
}

function FilterSection({ title, color, filters, onAddFilter, onSelectFilter, onRemoveFilter, selectedFilterIndex }: SectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Paper p="md" radius="lg" style={{ backgroundColor: ACCESSIBLE_COLORS.backgroundAlt, border: `2px solid ${color}40` }}>
      <Group justify="space-between" align="center" mb={12} onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <Text fw={700} size="md" style={{ color }}>
          {title}
        </Text>
        <ActionIcon variant="subtle" color={color}>
          {expanded ? <IconChevronUp /> : <IconChevronDown />}
        </ActionIcon>
      </Group>

      {expanded && (
        <Stack gap={12}>
          <Group gap={8} wrap="wrap">
            {filters.map((filter, index) => (
              <FilterBubble
                key={index}
                filter={filter}
                isSelected={selectedFilterIndex === index}
                onTap={() => onSelectFilter(index)}
                onRemove={() => onRemoveFilter(index)}
                section={title.toLowerCase() as 'must' | 'should' | 'mustNot'}
              />
            ))}
          </Group>

          <Box
            onClick={onAddFilter}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: `2px dashed ${color}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <IconPlus size={16} color={color} />
            <Text size="sm" fw={600} style={{ color }}>
              Add Filter
            </Text>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}

interface BubbleJamlEditorProps {
  initialJaml?: string;
  onJamlChange?: (jamlYaml: string, parsed: any, isValid: boolean) => void;
}

export function BubbleJamlEditor({ initialJaml, onJamlChange }: BubbleJamlEditorProps) {
  const [jaml, setJaml] = useState<any>(() => {
    try {
      return yaml.load(initialJaml || '');
    } catch {
      return {
        name: 'My Filter',
        deck: 'Red',
        stake: 'White',
        must: [],
        should: [],
        mustNot: [],
      };
    }
  });

  const [selectedSection, setSelectedSection] = useState<'must' | 'should' | 'mustNot' | null>(null);
  const [selectedFilterIndex, setSelectedFilterIndex] = useState<number | null>(null);

  // Convert JAML to filter format
  const filters = useMemo(() => {
    const parseFilters = (items: any[]) => {
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => {
        const type = Object.keys(item).find(k => ['joker', 'soulJoker', 'voucher', 'tarotCard', 'planetCard', 'spectralCard', 'standardCard', 'tag', 'boss'].includes(k));
        if (!type) return { type: 'unknown' };
        
        return {
          type,
          value: item[type],
          antes: item.antes,
          properties: Object.fromEntries(
            Object.entries(item).filter(([k]) => k !== type && k !== 'antes')
          ),
        };
      });
    };

    return {
      must: parseFilters(jaml.must || []),
      should: parseFilters(jaml.should || []),
      mustNot: parseFilters(jaml.mustNot || []),
    };
  }, [jaml]);

  // Notify parent of changes
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

  const handleAddFilter = useCallback((section: 'must' | 'should' | 'mustNot') => {
    setSelectedSection(section);
  }, []);

  const handleRemoveFilter = useCallback((section: 'must' | 'should' | 'mustNot', index: number) => {
    setJaml((prev: any) => {
      const newJaml = { ...prev };
      newJaml[section] = newJaml[section].filter((_: any, i: number) => i !== index);
      notifyChange(newJaml);
      return newJaml;
    });
    setSelectedFilterIndex(null);
  }, [notifyChange]);

  const handleSelectFilter = useCallback((section: 'must' | 'should' | 'mustNot', index: number) => {
    setSelectedSection(section);
    setSelectedFilterIndex(selectedFilterIndex === index ? null : index);
  }, [selectedFilterIndex]);

  return (
    <Stack gap="md" p="md" style={{ backgroundColor: ACCESSIBLE_COLORS.background }}>
      {/* Metadata Section */}
      <Paper p="md" radius="lg" style={{ backgroundColor: ACCESSIBLE_COLORS.backgroundAlt, border: `2px solid ${ACCESSIBLE_COLORS.metadata}40` }}>
        <Stack gap={8}>
          <Group gap={12}>
            <Box style={{ flex: 1 }}>
              <Text size="xs" fw={600} mb={2} style={{ color: ACCESSIBLE_COLORS.textSecondary }}>
                Filter Name
              </Text>
              <Text size="md" fw={700} style={{ color: ACCESSIBLE_COLORS.text }}>
                {jaml.name || 'My Filter'}
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" fw={600} mb={2} style={{ color: ACCESSIBLE_COLORS.textSecondary }}>
                Deck
              </Text>
              <Badge size="lg" style={{ backgroundColor: `${ACCESSIBLE_COLORS.metadata}20`, color: ACCESSIBLE_COLORS.metadata }}>
                {jaml.deck || 'Red'}
              </Badge>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" fw={600} mb={2} style={{ color: ACCESSIBLE_COLORS.textSecondary }}>
                Stake
              </Text>
              <Badge size="lg" style={{ backgroundColor: `${ACCESSIBLE_COLORS.metadata}20`, color: ACCESSIBLE_COLORS.metadata }}>
                {jaml.stake || 'White'}
              </Badge>
            </Box>
          </Group>
        </Stack>
      </Paper>

      {/* Filter Sections */}
      <FilterSection
        title="Must"
        color={ACCESSIBLE_COLORS.must}
        filters={filters.must}
        onAddFilter={() => handleAddFilter('must')}
        onSelectFilter={(index) => handleSelectFilter('must', index)}
        onRemoveFilter={(index) => handleRemoveFilter('must', index)}
        selectedFilterIndex={selectedSection === 'must' ? selectedFilterIndex : null}
      />

      <FilterSection
        title="Should"
        color={ACCESSIBLE_COLORS.should}
        filters={filters.should}
        onAddFilter={() => handleAddFilter('should')}
        onSelectFilter={(index) => handleSelectFilter('should', index)}
        onRemoveFilter={(index) => handleRemoveFilter('should', index)}
        selectedFilterIndex={selectedSection === 'should' ? selectedFilterIndex : null}
      />

      <FilterSection
        title="Must Not"
        color={ACCESSIBLE_COLORS.mustNot}
        filters={filters.mustNot}
        onAddFilter={() => handleAddFilter('mustNot')}
        onSelectFilter={(index) => handleSelectFilter('mustNot', index)}
        onRemoveFilter={(index) => handleRemoveFilter('mustNot', index)}
        selectedFilterIndex={selectedSection === 'mustNot' ? selectedFilterIndex : null}
      />

      {/* Instructions */}
      <Text size="sm" style={{ color: ACCESSIBLE_COLORS.textSecondary, textAlign: 'center' }}>
        Tap a bubble to select • Tap X to remove • Tap "Add Filter" to add new criteria
      </Text>
    </Stack>
  );
}

export default BubbleJamlEditor;
