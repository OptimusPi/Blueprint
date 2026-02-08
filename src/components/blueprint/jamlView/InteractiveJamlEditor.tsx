import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Group, Paper, Popover, Stack, Text } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import yaml from 'js-yaml';
import {
  getValidValuesFor,
  getSuggestedPropertiesFor,
  getTopLevelKeys,
  getClauseTypeKeys,
  ARRAY_KEYS,
} from '../../../utils/jamlValues';
import styles from './InteractiveJamlEditor.module.css';

// Mantine theme variables are used instead of local COLORS constant
// var(--mantine-color-polaroidBg-0) etc.

// Consistent monospace font stack - legible but not too nerdy
const MONO_FONT = '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace';

// Consistent block styling - uniform size, very slight rounding

interface InteractiveJamlEditorProps {
  initialJaml?: string;
  onJamlChange?: (jamlYaml: string, parsed: any, isValid: boolean) => void;
}

interface ParsedLine {
  id: string;
  raw: string;
  indent: number;
  key?: string;
  value?: string;
  isComment: boolean;
  isArrayItem: boolean;
  lineNumber: number;
  clauseType?: string;
  validationState: 'required-incomplete' | 'optional-incomplete' | 'complete' | 'invalid' | 'metadata';
  isInvalidValue?: boolean;
  isArrayValue?: boolean; // For antes: [1,2,3] style
  arrayValues?: Array<string>; // Individual array items
}

const DEFAULT_JAML = `# Classic PErkeo Observatory
name: PerkeoObservatory
deck: Ghost
stake: White

must:
  - voucher: Telescope
    antes: [1,2]
  - voucher: Observatory
    antes: [2,3]
  - soulJoker: Perkeo
    antes: [1, 2, 3]

should:
  - soulJoker: Perkeo
    edition: Negative
    antes: [1,2,3]
    score: 5

  # 3 points for every Polychrome Egg 🌈🥚
  - joker: Egg
    edition: Polychrome
    antes: [1,2,3,4,5,6,7,8]
    sources:
      judgement: [0,1,2]
    score: 3

    # 1 point every Egg across normal run antes/shops
  - joker: Egg
`;

// Metadata keys that get purple highlight
const METADATA_KEYS = ['name', 'author', 'description', 'deck', 'stake', 'label'];

// Required keys that MUST have a value
const REQUIRED_KEYS = ['joker', 'soulJoker', 'voucher', 'tarotCard', 'planetCard', 'spectralCard', 'standardCard', 'tag', 'boss'];

// Special toggle display for antes - shows [0][1][2]...[8] as tight toggle buttons
function AntesToggle({
  values,
  onToggle,
  darkColor
}: {
  values: Array<string>;
  onToggle: (val: string) => void;
  darkColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxAnte = 8;

  // Parse current values
  const selectedAntes = new Set(values.map(v => parseInt(v, 10)).filter(n => !isNaN(n)));

  // Compute display text
  const getDisplayText = () => {
    if (selectedAntes.size === 0) return 'tap to select';
    const sorted = Array.from(selectedAntes).sort((a, b) => a - b);
    if (sorted.length === 1) return `Ante ${sorted[0]}`;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    // Check if consecutive
    const isConsecutive = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
    if (isConsecutive) return `Antes ${min}-${max}`;
    return `Antes ${sorted.join(', ')}`;
  };

  if (!expanded) {
    return (
      <Box
        onClick={() => setExpanded(true)}
        className={styles.block}
        style={{
          backgroundColor: selectedAntes.size > 0 ? `${darkColor}15` : 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 10%, transparent)',
          border: `1px solid ${selectedAntes.size > 0 ? darkColor : 'var(--mantine-color-jamlRed-6)'}40`,
          color: selectedAntes.size > 0 ? darkColor : 'var(--mantine-color-jamlRed-8)',
          minWidth: '100px',
        }}
      >
        {getDisplayText()}
      </Box>
    );
  }

  return (
    <Group gap={0} wrap="nowrap">
      {Array.from({ length: maxAnte + 1 }, (_, i) => i).map((ante) => {
        const isSelected = selectedAntes.has(ante);
        return (
          <Box
            key={ante}
            onClick={(e) => {
              e.stopPropagation();
              // Toggle this ante
              // Rebuild array - we need to update parent
              onToggle(ante.toString());
            }}
            className={styles.block}
            style={{
              minWidth: '28px',
              backgroundColor: isSelected ? `${darkColor}30` : 'transparent',
              borderTop: `1px solid ${isSelected ? darkColor : '#ccc'}`,
              borderBottom: `1px solid ${isSelected ? darkColor : '#ccc'}`,
              borderLeft: `1px solid ${isSelected ? darkColor : '#ccc'}`,
              borderRight: ante < maxAnte ? 'none' : `1px solid ${isSelected ? darkColor : '#ccc'}`,
              borderRadius: ante === 0 ? '3px 0 0 3px' : ante === maxAnte ? '0 3px 3px 0' : '0',
              color: isSelected ? darkColor : '#999',
              fontWeight: isSelected ? 700 : 500,
            }}
          >
            {ante}
          </Box>
        );
      })}
      <Box
        onClick={() => setExpanded(false)}
        className={styles.block}
        style={{
          minWidth: '24px',
          marginLeft: '4px',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-jamlGreen-6) 20%, transparent)',
          border: '1px solid var(--mantine-color-jamlGreen-6)',
          borderRadius: '3px',
          color: 'var(--mantine-color-jamlGreen-8)',
        }}
      >
        ✓
      </Box>
    </Group>
  );
}

// Smart popover position logic removed in favor of Mantine's built-in collision detection

export function InteractiveJamlEditor({ initialJaml, onJamlChange }: InteractiveJamlEditorProps) {
  const [lines, setLines] = useState<Array<ParsedLine>>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingPart, setEditingPart] = useState<'key' | 'value' | 'arrayItem' | null>(null);
  const [editingArrayIndex, setEditingArrayIndex] = useState<number | null>(null);
  const [focusedLineIndex, setFocusedLineIndex] = useState<number>(0);

  const editorRef = useRef<HTMLDivElement>(null);

  // Parse JAML text into lines
  const parseJamlToLines = useCallback((text: string): Array<ParsedLine> => {
    const rawLines = text.split('\n');
    let currentClauseType: string | undefined;

    return rawLines.map((raw, index) => {
      const indent = raw.search(/\S|$/);
      const trimmed = raw.trim();
      const isComment = trimmed.startsWith('#');
      const isArrayItem = trimmed.startsWith('- ');

      // Parse key: value
      let key: string | undefined;
      let value: string | undefined;
      let isArrayValue = false;
      let arrayValues: Array<string> | undefined;

      if (!isComment && trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const rawKey = trimmed.slice(isArrayItem ? 2 : 0, colonIndex).trim();
        const rawValue = trimmed.slice(colonIndex + 1).trim();
        key = rawKey;
        value = rawValue || undefined;

        // Check if value is an array like [1, 2, 3]
        if (value && value.startsWith('[') && value.endsWith(']')) {
          isArrayValue = true;
          const inner = value.slice(1, -1);
          arrayValues = inner.split(',').map(v => v.trim()).filter(v => v);
        }
      }

      // Track section context
      if (key === 'must') {
        // inMust = true;
        // inShould = false;
      } else if (key === 'should') {
        // inShould = true;
        // inMust = false;
      }

      // Track clause type
      if (isArrayItem && key && REQUIRED_KEYS.includes(key)) {
        currentClauseType = key;
      } else if (indent === 0) {
        currentClauseType = undefined;
      }

      // Determine validation state
      let validationState: ParsedLine['validationState'] = 'complete';
      let isInvalidValue = false;

      if (key) {
        if (METADATA_KEYS.includes(key)) {
          validationState = 'metadata';
        } else if (REQUIRED_KEYS.includes(key)) {
          validationState = value ? 'complete' : 'required-incomplete';
        } else if (!value && key !== 'must' && key !== 'should' && key !== 'mustNot') {
          validationState = 'optional-incomplete';
        }

        // Check for manual invalid marking (surrounded by ~)
        if (value && value.startsWith('~') && value.endsWith('~')) {
          isInvalidValue = true;
          validationState = 'invalid';
        }

        // Check for invalid combinations (logic specific)
        if (key === 'edition' && (value === 'Negative' || value === '~Negative~') && currentClauseType === 'standardCard') {
          isInvalidValue = true;
          validationState = 'invalid';
        }
        if (['rank', 'suit', 'seal', 'enhancement'].includes(key) && currentClauseType === 'voucher') {
          isInvalidValue = true;
          validationState = 'invalid';
        }
        if (key === 'edition' && ['tag', 'smallBlindTag', 'bigBlindTag', 'boss', 'bossBlind'].includes(currentClauseType || '')) {
          isInvalidValue = true;
          validationState = 'invalid';
        }
      }

      return {
        id: `line-${index}`,
        raw,
        indent,
        key,
        value,
        isComment,
        isArrayItem,
        lineNumber: index,
        clauseType: currentClauseType,
        validationState,
        isInvalidValue,
        isArrayValue,
        arrayValues,
      };
    });
  }, []);

  // Initialize lines
  useEffect(() => {
    const text = initialJaml || DEFAULT_JAML;
    setTimeout(() => setLines(parseJamlToLines(text)), 0);
  }, [initialJaml, parseJamlToLines]);

  // Convert lines back to JAML
  const linesToJaml = useCallback((linesList: Array<ParsedLine>): string => {
    return linesList.map(l => l.raw).join('\n');
  }, []);

  // Update a line's value
  const updateLineValue = useCallback((lineId: string, part: 'key' | 'value', newValue: string) => {
    setLines(prev => {
      const newLines = prev.map(line => {
        if (line.id !== lineId) return line;

        const indent = ' '.repeat(line.indent);
        const prefix = line.isArrayItem ? '- ' : '';
        let newRaw = line.raw;

        if (part === 'value' && line.key) {
          newRaw = `${indent}${prefix}${line.key}: ${newValue}`;
        } else if (part === 'key') {
          const valuePart = line.value ? `: ${line.value}` : ':';
          newRaw = `${indent}${prefix}${newValue}${valuePart}`;
        }

        // Re-parse array values
        let isArrayValue = false;
        let arrayValues: Array<string> | undefined;
        if (newValue && newValue.startsWith('[') && newValue.endsWith(']')) {
          isArrayValue = true;
          const inner = newValue.slice(1, -1);
          arrayValues = inner.split(',').map(v => v.trim()).filter(v => v);
        }

        return {
          ...line,
          raw: newRaw,
          [part]: newValue,
          isArrayValue,
          arrayValues,
        };
      });

      // Notify parent
      const jamlText = linesToJaml(newLines);
      if (onJamlChange) {
        try {
          const parsed = yaml.load(jamlText);
          onJamlChange(jamlText, parsed, true);
        } catch {
          onJamlChange(jamlText, null, false);
        }
      }

      return newLines;
    });
  }, [linesToJaml, onJamlChange]);

  // Update a single array item
  const updateArrayItem = useCallback((lineId: string, arrayIndex: number, newValue: string) => {
    setLines(prev => {
      const newLines = prev.map(line => {
        if (line.id !== lineId || !line.arrayValues) return line;

        const newArrayValues = [...line.arrayValues];
        newArrayValues[arrayIndex] = newValue;
        const newArrayStr = `[${newArrayValues.join(', ')}]`;

        const indent = ' '.repeat(line.indent);
        const prefix = line.isArrayItem ? '- ' : '';
        const newRaw = `${indent}${prefix}${line.key}: ${newArrayStr}`;

        return {
          ...line,
          raw: newRaw,
          value: newArrayStr,
          arrayValues: newArrayValues,
        };
      });

      const jamlText = linesToJaml(newLines);
      if (onJamlChange) {
        try {
          const parsed = yaml.load(jamlText);
          onJamlChange(jamlText, parsed, true);
        } catch {
          onJamlChange(jamlText, null, false);
        }
      }

      return newLines;
    });
  }, [linesToJaml, onJamlChange]);

  // Add item to array
  const addArrayItem = useCallback((lineId: string, newValue: string) => {
    setLines(prev => {
      const newLines = prev.map(line => {
        if (line.id !== lineId) return line;

        const newArrayValues = [...(line.arrayValues || []), newValue];
        const newArrayStr = `[${newArrayValues.join(', ')}]`;

        const indent = ' '.repeat(line.indent);
        const prefix = line.isArrayItem ? '- ' : '';
        const newRaw = `${indent}${prefix}${line.key}: ${newArrayStr}`;

        return {
          ...line,
          raw: newRaw,
          value: newArrayStr,
          arrayValues: newArrayValues,
          isArrayValue: true,
        };
      });

      const jamlText = linesToJaml(newLines);
      if (onJamlChange) {
        try {
          const parsed = yaml.load(jamlText);
          onJamlChange(jamlText, parsed, true);
        } catch {
          onJamlChange(jamlText, null, false);
        }
      }

      return newLines;
    });
  }, [linesToJaml, onJamlChange]);

  // Remove item from array
  const removeArrayItem = useCallback((lineId: string, arrayIndex: number) => {
    setLines(prev => {
      const newLines = prev.map(line => {
        if (line.id !== lineId || !line.arrayValues) return line;

        const newArrayValues = line.arrayValues.filter((_, i) => i !== arrayIndex);
        const newArrayStr = newArrayValues.length > 0 ? `[${newArrayValues.join(', ')}]` : '';

        const indent = ' '.repeat(line.indent);
        const prefix = line.isArrayItem ? '- ' : '';
        const newRaw = `${indent}${prefix}${line.key}: ${newArrayStr}`;

        return {
          ...line,
          raw: newRaw,
          value: newArrayStr || undefined,
          arrayValues: newArrayValues.length > 0 ? newArrayValues : undefined,
          isArrayValue: newArrayValues.length > 0,
        };
      });

      const jamlText = linesToJaml(newLines);
      if (onJamlChange) {
        try {
          const parsed = yaml.load(jamlText);
          onJamlChange(jamlText, parsed, true);
        } catch {
          onJamlChange(jamlText, null, false);
        }
      }

      return newLines;
    });
  }, [linesToJaml, onJamlChange]);

  // Delete a line
  const deleteLine = useCallback((lineId: string) => {
    setLines(prev => {
      const filtered = prev.filter(l => l.id !== lineId);
      const renumbered = filtered.map((l, i) => ({ ...l, lineNumber: i, id: `line-${i}` }));

      const jamlText = linesToJaml(renumbered);
      if (onJamlChange) {
        try {
          const parsed = yaml.load(jamlText);
          onJamlChange(jamlText, parsed, true);
        } catch {
          onJamlChange(jamlText, null, false);
        }
      }

      return renumbered;
    });
  }, [linesToJaml, onJamlChange]);


  // Find next editable line/field
  const findNextEditable = useCallback((currentLineIndex: number): { lineId: string; part: 'key' | 'value' | 'arrayItem'; arrayIndex?: number } | null => {
    for (let i = currentLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.isComment || !line.key) continue;

      // Check if value is incomplete or invalid
      if (!line.value || line.isInvalidValue) {
        return { lineId: line.id, part: 'value' };
      }
      // Check array items
      if (line.isArrayValue && line.arrayValues) {
        return { lineId: line.id, part: 'arrayItem', arrayIndex: line.arrayValues.length };
      }
    }
    return null;
  }, [lines]);

  // Handle Enter key - advance to next field
  const handleEnterAdvance = useCallback((currentLineId: string) => {
    const currentIndex = lines.findIndex(l => l.id === currentLineId);
    const next = findNextEditable(currentIndex);

    if (next) {
      setEditingLineId(next.lineId);
      setEditingPart(next.part);
      if (next.arrayIndex !== undefined) {
        setEditingArrayIndex(next.arrayIndex);
      }
    } else {
      setEditingLineId(null);
      setEditingPart(null);
      setEditingArrayIndex(null);
    }
  }, [lines, findNextEditable]);

  // Global keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!editorRef.current?.contains(document.activeElement)) return;

      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        // Move to next editable field
        const currentIndex = editingLineId
          ? lines.findIndex(l => l.id === editingLineId)
          : focusedLineIndex;
        const next = findNextEditable(currentIndex);
        if (next) {
          setEditingLineId(next.lineId);
          setEditingPart(next.part);
          setEditingArrayIndex(next.arrayIndex ?? null);
        }
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        // Move to previous editable field
        const currentIndex = editingLineId
          ? lines.findIndex(l => l.id === editingLineId)
          : focusedLineIndex;
        for (let i = currentIndex - 1; i >= 0; i--) {
          const line = lines[i];
          if (!line.isComment && line.key) {
            setEditingLineId(line.id);
            setEditingPart('value');
            setEditingArrayIndex(null);
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editingLineId, focusedLineIndex, lines, findNextEditable]);

  // Calculate max key length at each indent level for colon alignment
  const maxKeyLengthByIndent = useMemo(() => {
    const byIndent: Record<number, number> = {};
    for (const line of lines) {
      if (line.key) {
        const indent = line.indent;
        const keyLen = line.key.length;
        byIndent[indent] = Math.max(byIndent[indent] || 0, keyLen);
      }
    }
    return byIndent;
  }, [lines]);

  return (
    <Paper
      ref={editorRef}
      p="md"
      radius="md"
      tabIndex={0}
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: 'var(--mantine-color-polaroidBg-0)',
        fontFamily: MONO_FONT,
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: 1.8,
        outline: 'none',
      }}
    >
      <Stack gap={2}>
        {lines.map((line, index) => (
          <JamlLine
            key={line.id}
            line={line}
            keyWidth={maxKeyLengthByIndent[line.indent] || 8}
            isEditing={editingLineId === line.id}
            editingPart={editingLineId === line.id ? editingPart : null}
            editingArrayIndex={editingLineId === line.id ? editingArrayIndex : null}
            onStartEdit={(part, arrayIndex) => {
              setEditingLineId(line.id);
              setEditingPart(part);
              setEditingArrayIndex(arrayIndex ?? null);
              setFocusedLineIndex(index);
            }}
            onEndEdit={() => {
              setEditingLineId(null);
              setEditingPart(null);
              setEditingArrayIndex(null);
            }}
            onChange={(part, newValue) => updateLineValue(line.id, part, newValue)}
            onArrayItemChange={(idx, newValue) => updateArrayItem(line.id, idx, newValue)}
            onArrayItemAdd={(newValue) => addArrayItem(line.id, newValue)}
            onArrayItemRemove={(idx) => removeArrayItem(line.id, idx)}
            onEnter={() => handleEnterAdvance(line.id)}
            onDelete={() => deleteLine(line.id)}
          />
        ))}
      </Stack>

      <Box mt="md" p="sm" className={styles.legendBox}>
        <Group gap="md" wrap="wrap" mb={4}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ color: 'var(--mantine-color-jamlRed-6)' }}>●</span> required
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ color: 'var(--mantine-color-jamlBlue-6)' }}>●</span> optional
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ color: 'var(--mantine-color-jamlGreen-6)' }}>●</span> complete
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ color: 'var(--mantine-color-jamlPurple-6)' }}>●</span> metadata
          </span>
        </Group>
        <Text size="xs" style={{ fontFamily: MONO_FONT, color: '#888' }}>
          Tab/Shift+Tab to navigate • Enter to confirm • Click to edit
        </Text>
      </Box>
    </Paper>
  );
}

// Individual line component
interface JamlLineProps {
  line: ParsedLine;
  keyWidth: number; // Character width for key alignment
  isEditing: boolean;
  editingPart: 'key' | 'value' | 'arrayItem' | null;
  editingArrayIndex: number | null;
  onStartEdit: (part: 'key' | 'value' | 'arrayItem', arrayIndex?: number) => void;
  onEndEdit: () => void;
  onChange: (part: 'key' | 'value', newValue: string) => void;
  onArrayItemChange: (index: number, newValue: string) => void;
  onArrayItemAdd: (newValue: string) => void;
  onArrayItemRemove: (index: number) => void;
  onEnter: () => void;
  onDelete: () => void;
}

function JamlLine({
  line,
  keyWidth,
  isEditing,
  editingPart,
  editingArrayIndex,
  onStartEdit,
  onEndEdit,
  onChange,
  onArrayItemChange,
  onArrayItemAdd,
  onArrayItemRemove,
  onEnter,
  onDelete,
}: JamlLineProps) {
  const { hovered: lineHovered, ref: lineRef } = useHover();
  const { hovered: deleteHovered, ref: deleteRef } = useHover();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<string>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localValue, setLocalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const keyTargetRef = useRef<HTMLDivElement>(null);
  const valueTargetRef = useRef<HTMLDivElement>(null);
  const isClickingSuggestion = useRef(false);

  // Long-form array editing: expand to vertical list when editing
  const [isArrayExpanded, setIsArrayExpanded] = useState(false);

  // Mantine handles positioning automatically now
  // const keyPopoverPosition = useSmartPopoverPosition(keyTargetRef, isEditing && editingPart === 'key' && showSuggestions);
  // const valuePopoverPosition = useSmartPopoverPosition(valueTargetRef, isEditing && editingPart === 'value' && showSuggestions);

  // Expand array when we start editing it
  useEffect(() => {
    if (isEditing && editingPart === 'arrayItem' && line.isArrayValue) {
      setTimeout(() => setIsArrayExpanded(true), 0);
    }
  }, [isEditing, editingPart, line.isArrayValue]);

  // Collapse when done editing (with delay to allow transitions)
  useEffect(() => {
    if (!isEditing && isArrayExpanded) {
      const timer = setTimeout(() => setIsArrayExpanded(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing, isArrayExpanded]);

  // Get validation color (for light background, use dark/readable variants)
  const getColor = () => {
    switch (line.validationState) {
      case 'required-incomplete': return 'var(--mantine-color-jamlRed-6)';
      case 'optional-incomplete': return 'var(--mantine-color-jamlBlue-6)';
      case 'complete': return 'var(--mantine-color-jamlGreen-6)';
      case 'invalid': return 'var(--mantine-color-jamlRed-6)';
      case 'metadata': return 'var(--mantine-color-jamlPurple-6)';
      default: return '#666666'; // Dark gray for default text
    }
  };

  // Brighter / High Contrast color for hover/active states
  const getBrightColor = () => {
    switch (line.validationState) {
      case 'required-incomplete': return 'var(--mantine-color-jamlRed-6)';
      case 'optional-incomplete': return 'var(--mantine-color-jamlBlue-6)';
      case 'complete': return 'var(--mantine-color-jamlGreen-6)';
      case 'invalid': return 'var(--mantine-color-jamlRed-6)';
      case 'metadata': return 'var(--mantine-color-jamlPurple-6)';
      default: return 'var(--mantine-color-polaroidText-0)'; // Dark text (#1a1a1a) for focused/hover
    }
  };

  // Get suggestions based on context
  const getSuggestions = useCallback((part: 'key' | 'value' | 'arrayItem', filterText: string) => {
    let options: Array<string> = [];

    if (part === 'key') {
      if (line.isArrayItem && !line.key) {
        options = getClauseTypeKeys();
      } else if (line.clauseType) {
        const properties = getSuggestedPropertiesFor(line.clauseType);
        options = properties.map(p => p.key);
      } else if (line.indent === 0) {
        options = getTopLevelKeys();
      } else {
        options = ['edition', 'antes', 'score', 'shopSlots', 'packSlots', 'label'];
      }
    } else if (part === 'value' && line.key) {
      if (getClauseTypeKeys().includes(line.key)) {
        options = getValidValuesFor(line.key, undefined);
      } else {
        options = getValidValuesFor(line.clauseType || '', line.key);
      }
    } else if (part === 'arrayItem') {
      // For array items like antes, suggest numbers
      if (ARRAY_KEYS.includes(line.key || '')) {
        options = Array.from({ length: 13 }, (_, i) => i.toString());
      }
    }

    // Filter
    const lowerFilter = (filterText || '').toLowerCase();

    // If filter matches exactly one option, don't show it? No, show it for confirmation/Enter.

    let filtered = options.filter(o => o.toLowerCase().includes(lowerFilter));

    // Sort logic: exact match -> starts with -> contains
    // Special handling: 'antes' should be at the BOTTOM if searching for keys (as per user request "pop over above")
    // Wait, SuggestionList renders top-to-bottom. If we want it "closest to cursor" (bottom of list), it should be LAST.
    // My getSuggestedPropertiesFor puts 'antes' LAST.
    // But sorting here invalidates that order!
    // I should Preserve order of `options` as much as possible if filter text is empty!

    if (!filterText) {
      // Return original order (closest to cursor logic preserved from jamlValues.ts)
      return options;
    }

    filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === lowerFilter) return -1;
      if (bLower === lowerFilter) return 1;
      const aStarts = aLower.startsWith(lowerFilter);
      const bStarts = bLower.startsWith(lowerFilter);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      // Stable sort or alphabetically? Alphabetically for others
      return aLower.localeCompare(bLower);
    });

    return filtered.slice(0, 12);
  }, [line.clauseType, line.key, line.isArrayItem, line.indent]);

  // Update suggestions
  useEffect(() => {
    if (isEditing && editingPart) {
      const newSuggestions = getSuggestions(editingPart, localValue);
      setTimeout(() => setSuggestions(newSuggestions), 0);
      setTimeout(() => setShowSuggestions(newSuggestions.length > 0), 0);
      setTimeout(() => setSelectedIndex(0), 0);
    } else {
      setTimeout(() => setShowSuggestions(false), 0);
    }
  }, [isEditing, editingPart, localValue, getSuggestions]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (editingPart === 'key') {
        setTimeout(() => setLocalValue(line.key || ''), 0);
      } else if (editingPart === 'value') {
        // Strip leading/trailing ~ from value to allow clean editing
        const raw = line.value || '';
        setTimeout(() => setLocalValue(raw.replace(/^~|~$/g, '')), 0);
      } else if (editingPart === 'arrayItem' && editingArrayIndex !== null) {
        setTimeout(() => setLocalValue(line.arrayValues?.[editingArrayIndex] || ''), 0);
      }
    }
  }, [isEditing, editingPart, editingArrayIndex, line.key, line.value, line.arrayValues]);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const finalValue = suggestions.length === 1 ? suggestions[0]
        : (selectedIndex >= 0 && selectedIndex < suggestions.length) ? suggestions[selectedIndex]
          : localValue;

      if (editingPart === 'key') {
        onChange('key', finalValue);
      } else if (editingPart === 'value') {
        onChange('value', finalValue);
      } else if (editingPart === 'arrayItem' && editingArrayIndex !== null) {
        if (editingArrayIndex >= (line.arrayValues?.length || 0)) {
          onArrayItemAdd(finalValue);
        } else {
          onArrayItemChange(editingArrayIndex, finalValue);
        }
      }

      onEndEdit();
      onEnter();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEndEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length === 1) {
        setLocalValue(suggestions[0]);
      } else if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        setLocalValue(suggestions[selectedIndex]);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.currentTarget.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    isClickingSuggestion.current = true;

    if (editingPart === 'key') {
      onChange('key', suggestion);
    } else if (editingPart === 'value') {
      onChange('value', suggestion);
    } else if (editingPart === 'arrayItem' && editingArrayIndex !== null) {
      if (editingArrayIndex >= (line.arrayValues?.length || 0)) {
        onArrayItemAdd(suggestion);
      } else {
        onArrayItemChange(editingArrayIndex, suggestion);
      }
    }

    onEndEdit();
    onEnter();

    requestAnimationFrame(() => {
      isClickingSuggestion.current = false;
    });
  };

  const handleBlur = () => {
    requestAnimationFrame(() => {
      if (!isClickingSuggestion.current) {
        onEndEdit();
        setShowSuggestions(false);
      }
    });
  };

  // Comment lines
  if (line.isComment) {
    return (
      <Box style={{
        padding: '2px 8px 2px 32px',
        color: '#6e7a89', // Mid-gray for comments (readable on off-white)
        fontStyle: 'italic',
        fontSize: '12px',
        fontWeight: 500,
      }}>
        {line.raw}
      </Box>
    );
  }

  // Empty lines
  if (!line.key && !line.raw.trim()) {
    return <Box style={{ height: '20px' }} />;
  }

  // Section headers
  if ((line.key === 'must' || line.key === 'should' || line.key === 'mustNot') && !line.value) {
    const sectionColor = line.key === 'must' ? 'var(--mantine-color-jamlRed-8)' : 'var(--mantine-color-jamlBlue-8)';
    return (
      <Box style={{
        padding: '4px 8px 4px 32px',
        color: sectionColor,
        fontWeight: 700,
        fontSize: '13px',
        borderBottom: `1px solid ${sectionColor}33`,
        marginTop: '8px',
      }}>
        {line.raw}
      </Box>
    );
  }

  const indentSpaces = ' '.repeat(line.indent);
  const prefix = line.isArrayItem ? '- ' : '';

  // Handle line click - if clicking on the delete zone area, delete
  const handleLineClick = (e: React.MouseEvent) => {
    // Check if click was in the delete zone (first 30px)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < 30 && line.isArrayItem) {
      e.stopPropagation();
      onDelete();
    }
  };

  return (
    <Group
      ref={lineRef}
      gap={0}
      wrap="nowrap"
      onClick={handleLineClick}
      style={{
        padding: '2px 0',
        position: 'relative',
        backgroundColor: 'transparent',
        cursor: 'default',
      }}
    >
      {/* Delete zone indicator */}
      <Box
        ref={deleteRef}
        className={styles.deleteZone}
        style={{
          color: (lineHovered || deleteHovered) && line.isArrayItem ? 'var(--mantine-color-jamlOrange-6)' : 'transparent',
          backgroundColor: deleteHovered ? 'color-mix(in srgb, var(--mantine-color-jamlOrange-8) 22%, transparent)' : 'transparent',
        }}
      >
        {(lineHovered || deleteHovered) && line.isArrayItem && '−'}
      </Box>

      {/* Indent + prefix */}
      <Text span style={{ whiteSpace: 'pre', color: '#bbb' }}>
        {indentSpaces}{prefix}
      </Text>

      {/* Key - only highlights when hovering the key itself */}
      {line.key && (
        <Popover
          opened={isEditing && editingPart === 'key' && showSuggestions}
          position="bottom-start"
          offset={4}
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <Box
              ref={keyTargetRef}
              onClick={(e) => { e.stopPropagation(); onStartEdit('key'); }}
              className={styles.block}
              style={{
                minWidth: `${keyWidth}ch`,
                justifyContent: 'flex-start',
                color: (isEditing && editingPart === 'key') ? getBrightColor() : getColor(),
                backgroundColor: (isEditing && editingPart === 'key') ? `${getBrightColor()}15` : 'transparent',
                border: `1px solid transparent`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${getBrightColor()}15`;
                e.currentTarget.style.borderColor = `${getBrightColor()}40`;
              }}
              onMouseLeave={(e) => {
                if (!(isEditing && editingPart === 'key')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              {isEditing && editingPart === 'key' ? (
                <input
                  ref={inputRef}
                  value={localValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: getColor(),
                    fontFamily: MONO_FONT,
                    fontSize: '13px',
                    fontWeight: 600,
                    width: `${Math.max(localValue.length, 4)}ch`,
                    padding: 0,
                    margin: 0,
                  }}
                />
              ) : line.key}
            </Box>
          </Popover.Target>
          <Popover.Dropdown p={4} style={{ minWidth: '180px' }}>
            <SuggestionList
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={handleSuggestionClick}
              onHover={setSelectedIndex}
            />
          </Popover.Dropdown>
        </Popover>
      )}

      {/* Colon */}
      {line.key && <Text span style={{ color: '#999' }}>: </Text>}

      {/* Value - Array or Single */}
      {line.key && (
        line.isArrayValue && line.arrayValues ? (
          // Array values - long-form (vertical) when editing, inline when not
          isArrayExpanded ? (
            // Long-form YAML style: vertical list with dashes
            <Stack gap={2} onClick={(e) => e.stopPropagation()} style={{ marginLeft: '4px', marginTop: '4px' }}>
              {line.arrayValues.map((item, idx) => (
                <LongFormArrayItem
                  key={idx}
                  value={item}
                  isEditing={isEditing && editingPart === 'arrayItem' && editingArrayIndex === idx}
                  lineHovered={lineHovered}
                  color={getBrightColor()}
                  darkColor={getColor()}
                  onStartEdit={() => onStartEdit('arrayItem', idx)}
                  onEndEdit={onEndEdit}
                  onChange={(newValue) => onArrayItemChange(idx, newValue)}
                  onRemove={() => onArrayItemRemove(idx)}
                  onEnter={onEnter}
                  suggestions={suggestions}
                  selectedIndex={selectedIndex}
                  onSuggestionSelect={handleSuggestionClick}
                  onSuggestionHover={setSelectedIndex}
                  showSuggestions={isEditing && editingPart === 'arrayItem' && editingArrayIndex === idx && showSuggestions}
                />
              ))}
              {/* Add new item row */}
              <Group gap={4} style={{ paddingLeft: `${line.indent + 2}ch` }}>
                <Text span style={{ color: 'var(--mantine-color-jamlGreen-6)', fontWeight: 600 }}>-</Text>
                <Box
                  onClick={(e) => { e.stopPropagation(); onStartEdit('arrayItem', (line.arrayValues || []).length); }}
                  className={styles.addArrayItemBox}
                  style={{
                    backgroundColor: lineHovered ? 'color-mix(in srgb, var(--mantine-color-jamlGreen-6) 15%, transparent)' : 'color-mix(in srgb, var(--mantine-color-jamlGreen-6) 8%, transparent)',
                    border: '1px dashed var(--mantine-color-jamlGreen-6)',
                  }}
                >
                  {isEditing && editingPart === 'arrayItem' && editingArrayIndex === (line.arrayValues || []).length ? (
                    <input
                      ref={inputRef}
                      value={localValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onBlur={handleBlur}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.input}
                      style={{
                        color: 'var(--mantine-color-jamlGreen-8)',
                        fontSize: '12px',
                        width: `${Math.max(localValue.length, 4)}ch`,
                      }}
                    />
                  ) : (
                    <Group gap={4}>
                      <IconPlus size={12} color={'var(--mantine-color-jamlGreen-6)'} />
                      <Text size="xs" fw={500} c={'var(--mantine-color-jamlGreen-6)'}>add</Text>
                    </Group>
                  )}
                </Box>
              </Group>
            </Stack>
          ) : (
            // Tight toggle buttons - no gaps, no brackets, no x-out overlays
            <Group gap={0} wrap="nowrap" onClick={(e) => e.stopPropagation()} style={{ marginLeft: '4px' }}>
              {line.key === 'antes' ? (
                // Special ante toggle display
                <AntesToggle
                  values={line.arrayValues || []}
                  onToggle={(val) => {
                    const current = line.arrayValues || [];
                    const idx = current.indexOf(val);
                    if (idx >= 0) {
                      // Remove by index
                      onArrayItemRemove(idx);
                    } else {
                      // Add
                      onArrayItemAdd(val);
                    }
                  }}
                  darkColor={getColor()}
                />
              ) : (
                // Regular array items - tight, no gaps
                <>
                  {line.arrayValues.map((item, idx) => (
                    <Box
                      key={idx}
                      onClick={() => { setIsArrayExpanded(true); onStartEdit('arrayItem', idx); }}
                      className={styles.block}
                      style={{
                        minWidth: '24px',
                        backgroundColor: `${getColor()}15`,
                        borderTop: `1px solid ${getColor()}40`,
                        borderBottom: `1px solid ${getColor()}40`,
                        borderLeft: `1px solid ${getColor()}40`,
                        borderRight: idx < line.arrayValues!.length - 1 ? 'none' : `1px solid ${getColor()}40`,
                        borderRadius: idx === 0 ? '3px 0 0 3px' : idx === line.arrayValues!.length - 1 ? '0 3px 3px 0' : '0',
                        color: getColor(),
                      }}
                    >
                      {item}
                    </Box>
                  ))}
                  <Box
                    onClick={(e) => { e.stopPropagation(); setIsArrayExpanded(true); onStartEdit('arrayItem', (line.arrayValues || []).length); }}
                    className={styles.block}
                    style={{
                      minWidth: '24px',
                      backgroundColor: 'color-mix(in srgb, var(--mantine-color-jamlGreen-6) 15%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--mantine-color-jamlGreen-6) 40%, transparent)',
                      borderRadius: '0 3px 3px 0',
                      color: 'var(--mantine-color-jamlGreen-6)',
                      opacity: lineHovered ? 1 : 0.5,
                    }}
                  >
                    +
                  </Box>
                </>
              )}
            </Group>
          )
        ) : (
          // Single value - consistent block style, only highlights on hover of value itself
          <Popover
            opened={isEditing && editingPart === 'value' && showSuggestions}
            position="bottom-start"
            offset={4}
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <Box
                ref={valueTargetRef}
                onClick={(e) => { e.stopPropagation(); onStartEdit('value'); }}
                onMouseEnter={(e) => {
                  if (!line.isInvalidValue) {
                    e.currentTarget.style.backgroundColor = line.value ? `${getColor()}25` : 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 20%, transparent)';
                    e.currentTarget.style.borderColor = line.value ? getColor() : 'var(--mantine-color-jamlRed-6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isEditing && editingPart === 'value')) {
                    e.currentTarget.style.backgroundColor = line.isInvalidValue
                      ? 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 15%, transparent)'
                      : (line.value ? `${getColor()}10` : 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 8%, transparent)');
                    e.currentTarget.style.borderColor = line.isInvalidValue
                      ? 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 60%, transparent)'
                      : (line.value ? `${getColor()}40` : 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 40%, transparent)');
                  }
                }}
                className={styles.block}
                style={{
                  minWidth: line.value ? undefined : '80px',
                  color: line.isInvalidValue ? 'var(--mantine-color-jamlRed-6)' : (line.value ? getColor() : 'var(--mantine-color-jamlRed-8)'),
                  backgroundColor: line.isInvalidValue
                    ? 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 15%, transparent)'
                    : (isEditing && editingPart === 'value')
                      ? `${getColor()}25`
                      : (line.value ? `${getColor()}10` : 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 8%, transparent)'),
                  border: `1px solid ${line.isInvalidValue ? 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 60%, transparent)' : (line.value ? `${getColor()}40` : 'color-mix(in srgb, var(--mantine-color-jamlRed-6) 40%, transparent)')}`,
                  textDecoration: line.isInvalidValue ? 'line-through' : 'none',
                }}
              >
                {isEditing && editingPart === 'value' ? (
                  <input
                    ref={inputRef}
                    value={localValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: getColor(),
                      fontFamily: MONO_FONT,
                      fontSize: '13px',
                      fontWeight: 600,
                      width: `${Math.max(localValue.length, 6)}ch`,
                      padding: 0,
                    }}
                  />
                ) : line.isInvalidValue ? (
                  <span title="Invalid - click to fix">{line.value}</span>
                ) : (
                  line.value || <span style={{ opacity: 0.6, fontWeight: 500 }}>???</span>
                )}
              </Box>
            </Popover.Target>
            <Popover.Dropdown p={4} style={{ minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
              <SuggestionList
                suggestions={suggestions}
                selectedIndex={selectedIndex}
                onSelect={handleSuggestionClick}
                onHover={setSelectedIndex}
              />
            </Popover.Dropdown>
          </Popover>
        )
      )}
    </Group>
  );
}

// Array item component

// Long-form array item component (vertical YAML style with dashes)

interface LongFormArrayItemProps {
  value: string;
  isEditing: boolean;
  lineHovered: boolean;
  color: string;
  darkColor: string;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onChange: (newValue: string) => void;
  onRemove: () => void;
  onEnter: () => void;
  suggestions: Array<string>;
  selectedIndex: number;
  onSuggestionSelect: (suggestion: string) => void;
  onSuggestionHover: (index: number) => void;
  showSuggestions: boolean;
}

function LongFormArrayItem({
  value,
  isEditing,
  lineHovered,
  color,
  darkColor,
  onStartEdit,
  onEndEdit,
  onChange,
  onRemove,
  onEnter,
  suggestions,
  selectedIndex,
  onSuggestionSelect,
  onSuggestionHover,
  showSuggestions,
}: LongFormArrayItemProps) {
  const { hovered, ref } = useHover();
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const isClickingSuggestion = useRef(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setTimeout(() => setLocalValue(value), 0);
    }
  }, [isEditing, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const finalValue = suggestions.length === 1 ? suggestions[0]
        : (selectedIndex >= 0 && selectedIndex < suggestions.length) ? suggestions[selectedIndex]
          : localValue;
      onChange(finalValue);
      onEndEdit();
      onEnter();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onSuggestionHover(Math.min(selectedIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onSuggestionHover(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Escape') {
      onEndEdit();
    } else if (e.key === 'Backspace' && localValue === '') {
      e.preventDefault();
      onRemove();
      onEndEdit();
    }
  };

  const handleBlur = () => {
    requestAnimationFrame(() => {
      if (!isClickingSuggestion.current) {
        onEndEdit();
      }
    });
  };

  return (
    <Group ref={ref} gap={4} wrap="nowrap" style={{ paddingLeft: '2ch' }}>
      {/* Dash prefix */}
      <Text span style={{ color: darkColor, fontWeight: 600, width: '12px' }}>-</Text>

      {/* Delete button on hover */}
      <Box
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (hovered || lineHovered) ? 'color-mix(in srgb, var(--mantine-color-jamlOrange-8) 20%, transparent)' : 'transparent',
          borderRadius: '3px',
          cursor: 'pointer',
          opacity: (hovered || lineHovered) ? 1 : 0,
          transition: 'all 0.15s',
        }}
      >
        <IconMinus size={12} color={'var(--mantine-color-jamlOrange-6)'} />
      </Box>

      {/* Value */}
      <Popover opened={showSuggestions} position="bottom-start" withinPortal offset={4} withArrow shadow="md">
        <Popover.Target>
          <Box
            ref={targetRef}
            onClick={onStartEdit}
            className={styles.block}
            style={{
              height: 'auto',
              minWidth: value ? undefined : '60px',
              color: (isEditing) ? color : darkColor,
              backgroundColor: (isEditing) ? `${color}15` : 'transparent',
              border: `1px solid ${isEditing ? color : 'transparent'}`,
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onClick={(e) => e.stopPropagation()}
                className={styles.input}
                style={{
                  color: darkColor,
                  width: `${Math.max(localValue.length, 3)}ch`,
                }}
              />
            ) : (
              <Text span>{value || ' '}</Text>
            )}
          </Box>
        </Popover.Target>
        <Popover.Dropdown p={4} style={{ minWidth: '120px' }}>
          <SuggestionList
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            onSelect={(s) => {
              isClickingSuggestion.current = true;
              onSuggestionSelect(s);
              requestAnimationFrame(() => { isClickingSuggestion.current = false; });
            }}
            onHover={onSuggestionHover}
          />
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}

// Suggestion list
interface SuggestionListProps {
  suggestions: Array<string>;
  selectedIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

function SuggestionList({ suggestions, selectedIndex, onSelect, onHover }: SuggestionListProps) {
  if (suggestions.length === 0) {
    return (
      <Box p="xs">
        <Text size="xs" c="dimmed" fs="italic">No suggestions matching...</Text>
      </Box>
    );
  }

  return (
    <Stack gap={0} onMouseDown={(e) => e.preventDefault()} className={styles.suggestionList}>
      {suggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        // Determine category color based on simple heuristics or passed types? 
        // For now, use Balatro Blue as standard highlight

        return (
          <Box
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHover(index)}
            className={styles.suggestionItem}
            data-selected={isSelected}
          >
            <span>{suggestion}</span>
            {isSelected && <span className={styles.selectionIndicator}>↵</span>}
          </Box>
        );
      })}
    </Stack>
  );
}
