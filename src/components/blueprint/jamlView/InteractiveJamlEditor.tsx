import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Group, Paper, Popover, Stack, Text } from '@mantine/core';
import { useHover, useViewportSize } from '@mantine/hooks';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import yaml from 'js-yaml';
import {
  getValidValuesFor,
  getSuggestedPropertiesFor,
  getTopLevelKeys,
  getClauseTypeKeys,
  ARRAY_KEYS,
} from '../../../utils/jamlValues';

// Balatro Colors
const COLORS = {
  red: '#ff4c40',
  darkRed: '#a02721',
  blue: '#0093ff',
  darkBlue: '#0057a1',
  green: '#429f79',
  darkGreen: '#215f46',
  purple: '#7d60e0',
  darkPurple: '#292189',
  orange: '#ff9800',
  darkOrange: '#a05b00',
  gold: '#b8883a',
  // Editor background - very light cream/orange tint
  editorBg: '#fef9f3',
  editorBgAlt: '#fff5eb',
};

// Consistent monospace font stack - legible but not too nerdy
const MONO_FONT = '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace';

// Consistent block styling - uniform size, very slight rounding
const BLOCK_STYLE = {
  height: '28px',
  minWidth: '28px',
  padding: '0 8px',
  borderRadius: '3px',
  fontSize: '13px',
  fontWeight: 600,
  fontFamily: MONO_FONT,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.1s, border-color 0.1s',
} as const;

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
  arrayValues?: string[]; // Individual array items
}

const DEFAULT_JAML = `# My JAML Filter
name: My Filter
deck: Red
stake: White

must:
  - joker: Blueprint
    edition: Negative
    antes: [1, 2, 3]

should:
  - soulJoker: Any
    edition: Negative
    antes: [7, 8]
    score: 5
`;

// Metadata keys that get purple highlight
const METADATA_KEYS = ['name', 'author', 'description', 'deck', 'stake', 'label'];

// Required keys that MUST have a value
const REQUIRED_KEYS = ['joker', 'soulJoker', 'voucher', 'tarotCard', 'planetCard', 'spectralCard', 'standardCard', 'tag', 'boss'];

// Special toggle display for antes - shows [0][1][2]...[8] as tight toggle buttons
function AntesToggle({ 
  values, 
  onToggle, 
  onStartEdit,
  color,
  darkColor 
}: { 
  values: string[]; 
  onToggle: (val: string) => void;
  onStartEdit: () => void;
  color: string;
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
        style={{
          ...BLOCK_STYLE,
          backgroundColor: selectedAntes.size > 0 ? `${darkColor}15` : `${COLORS.red}10`,
          border: `1px solid ${selectedAntes.size > 0 ? darkColor : COLORS.red}40`,
          color: selectedAntes.size > 0 ? darkColor : COLORS.darkRed,
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
              const newValues = isSelected
                ? values.filter(v => parseInt(v, 10) !== ante)
                : [...values, ante.toString()];
              // Rebuild array - we need to update parent
              onToggle(ante.toString());
            }}
            style={{
              ...BLOCK_STYLE,
              minWidth: '28px',
              backgroundColor: isSelected ? `${darkColor}30` : 'transparent',
              border: `1px solid ${isSelected ? darkColor : '#ccc'}`,
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
        style={{
          ...BLOCK_STYLE,
          minWidth: '24px',
          marginLeft: '4px',
          backgroundColor: `${COLORS.green}20`,
          border: `1px solid ${COLORS.green}`,
          borderRadius: '3px',
          color: COLORS.darkGreen,
        }}
      >
        ✓
      </Box>
    </Group>
  );
}

// Smart popover position: above unless would clip at top, then right
type PopoverPosition = 'top' | 'top-start' | 'right' | 'right-start';

function useSmartPopoverPosition(
  targetRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean
): PopoverPosition {
  const { height: viewportHeight } = useViewportSize();
  const [position, setPosition] = useState<PopoverPosition>('top-start');

  useEffect(() => {
    if (!isOpen || !targetRef.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    // If target is in top 180px of viewport, popover might clip - use right position
    const topThreshold = 180;
    
    if (rect.top < topThreshold) {
      setPosition('right-start');
    } else {
      setPosition('top-start');
    }
  }, [isOpen, targetRef, viewportHeight]);

  return position;
}

export function InteractiveJamlEditor({ initialJaml, onJamlChange }: InteractiveJamlEditorProps) {
  const [lines, setLines] = useState<ParsedLine[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingPart, setEditingPart] = useState<'key' | 'value' | 'arrayItem' | null>(null);
  const [editingArrayIndex, setEditingArrayIndex] = useState<number | null>(null);
  const [focusedLineIndex, setFocusedLineIndex] = useState<number>(0);
  
  const editorRef = useRef<HTMLDivElement>(null);

  // Parse JAML text into lines
  const parseJamlToLines = useCallback((text: string): ParsedLine[] => {
    const rawLines = text.split('\n');
    let currentClauseType: string | undefined;
    let inMust = false;
    let inShould = false;

    return rawLines.map((raw, index) => {
      const indent = raw.search(/\S|$/);
      const trimmed = raw.trim();
      const isComment = trimmed.startsWith('#');
      const isArrayItem = trimmed.startsWith('- ');
      
      // Parse key: value
      let key: string | undefined;
      let value: string | undefined;
      let isArrayValue = false;
      let arrayValues: string[] | undefined;
      
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
        inMust = true;
        inShould = false;
      } else if (key === 'should') {
        inShould = true;
        inMust = false;
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

        // Check for invalid combinations
        if (key === 'edition' && value === 'Negative' && currentClauseType === 'standardCard') {
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
    setLines(parseJamlToLines(text));
  }, [initialJaml, parseJamlToLines]);

  // Convert lines back to JAML
  const linesToJaml = useCallback((linesList: ParsedLine[]): string => {
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
        let arrayValues: string[] | undefined;
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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
          onJamlChange(jamlText, null, false);
        }
      }

      return renumbered;
    });
  }, [linesToJaml, onJamlChange]);

  // Add new line after current
  const addLineAfter = useCallback((afterLineId: string, content: string) => {
    setLines(prev => {
      const index = prev.findIndex(l => l.id === afterLineId);
      if (index === -1) return prev;

      const currentLine = prev[index];
      const newLineRaw = ' '.repeat(currentLine.indent) + content;
      
      // Parse the new line
      const newParsed = parseJamlToLines(newLineRaw)[0];
      const newLine: ParsedLine = {
        ...newParsed,
        id: `line-new-${Date.now()}`,
        clauseType: currentLine.clauseType,
      };

      const newLines = [...prev];
      newLines.splice(index + 1, 0, newLine);
      
      // Renumber
      const renumbered = newLines.map((l, i) => ({ ...l, lineNumber: i, id: `line-${i}` }));

      const jamlText = linesToJaml(renumbered);
      if (onJamlChange) {
        try {
          const parsed = yaml.load(jamlText);
          onJamlChange(jamlText, parsed, true);
        } catch (e) {
          onJamlChange(jamlText, null, false);
        }
      }

      return renumbered;
    });
  }, [parseJamlToLines, linesToJaml, onJamlChange]);

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
      withBorder 
      p="md" 
      radius="md" 
      tabIndex={0}
      style={{ 
        flex: 1, 
        minWidth: 0, 
        backgroundColor: COLORS.editorBg,
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
            onArrayItemChange={(index, newValue) => updateArrayItem(line.id, index, newValue)}
            onArrayItemAdd={(newValue) => addArrayItem(line.id, newValue)}
            onArrayItemRemove={(index) => removeArrayItem(line.id, index)}
            onEnter={() => handleEnterAdvance(line.id)}
            onDelete={() => deleteLine(line.id)}
            onAddLine={(content) => addLineAfter(line.id, content)}
          />
        ))}
      </Stack>

      <Box mt="md" p="sm" style={{ backgroundColor: COLORS.editorBgAlt, borderRadius: '4px', border: `1px solid ${COLORS.gold}40` }}>
        <Group gap="md" wrap="wrap" mb={4}>
          <span style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#666' }}>
            <span style={{ color: COLORS.red }}>●</span> required
          </span>
          <span style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#666' }}>
            <span style={{ color: COLORS.blue }}>●</span> optional
          </span>
          <span style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#666' }}>
            <span style={{ color: COLORS.green }}>●</span> complete
          </span>
          <span style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#666' }}>
            <span style={{ color: COLORS.purple }}>●</span> metadata
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
  onAddLine: (content: string) => void;
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
  onAddLine,
}: JamlLineProps) {
  const { hovered: lineHovered, ref: lineRef } = useHover();
  const { hovered: deleteHovered, ref: deleteRef } = useHover();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localValue, setLocalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const keyTargetRef = useRef<HTMLSpanElement>(null);
  const valueTargetRef = useRef<HTMLDivElement>(null);
  const isClickingSuggestion = useRef(false);
  
  // Long-form array editing: expand to vertical list when editing
  const [isArrayExpanded, setIsArrayExpanded] = useState(false);
  
  // Smart popover positioning
  const keyPopoverPosition = useSmartPopoverPosition(keyTargetRef, isEditing && editingPart === 'key' && showSuggestions);
  const valuePopoverPosition = useSmartPopoverPosition(valueTargetRef, isEditing && editingPart === 'value' && showSuggestions);
  
  // Expand array when we start editing it
  useEffect(() => {
    if (isEditing && editingPart === 'arrayItem' && line.isArrayValue) {
      setIsArrayExpanded(true);
    }
  }, [isEditing, editingPart, line.isArrayValue]);
  
  // Collapse when done editing (with delay to allow transitions)
  useEffect(() => {
    if (!isEditing && isArrayExpanded) {
      const timer = setTimeout(() => setIsArrayExpanded(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing, isArrayExpanded]);

  // Get validation color (for light background, use darker variants as base)
  const getColor = () => {
    switch (line.validationState) {
      case 'required-incomplete': return COLORS.darkRed;
      case 'optional-incomplete': return COLORS.darkBlue;
      case 'complete': return COLORS.darkGreen;
      case 'invalid': return COLORS.darkRed;
      case 'metadata': return COLORS.darkPurple;
      default: return '#555';
    }
  };

  // Brighter color for hover/active states
  const getBrightColor = () => {
    switch (line.validationState) {
      case 'required-incomplete': return COLORS.red;
      case 'optional-incomplete': return COLORS.blue;
      case 'complete': return COLORS.green;
      case 'invalid': return COLORS.red;
      case 'metadata': return COLORS.purple;
      default: return '#888';
    }
  };

  // Get suggestions based on context
  const getSuggestions = useCallback((part: 'key' | 'value' | 'arrayItem', filterText: string) => {
    let options: string[] = [];

    if (part === 'key') {
      if (line.isArrayItem && !line.key) {
        options = getClauseTypeKeys();
      } else if (line.clauseType) {
        const props = getSuggestedPropertiesFor(line.clauseType);
        options = props.map(p => p.key);
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
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      options = options.filter(o => o.toLowerCase().includes(lowerFilter));
    }

    // Sort
    const lowerFilter = (filterText || '').toLowerCase();
    options.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === lowerFilter) return -1;
      if (bLower === lowerFilter) return 1;
      const aStarts = aLower.startsWith(lowerFilter);
      const bStarts = bLower.startsWith(lowerFilter);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      return aLower.localeCompare(bLower);
    });

    return options.slice(0, 12);
  }, [line.clauseType, line.key, line.isArrayItem, line.indent]);

  // Update suggestions
  useEffect(() => {
    if (isEditing && editingPart) {
      const newSuggestions = getSuggestions(editingPart, localValue);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [isEditing, editingPart, localValue, getSuggestions]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (editingPart === 'key') {
        setLocalValue(line.key || '');
      } else if (editingPart === 'value') {
        setLocalValue(line.value || '');
      } else if (editingPart === 'arrayItem' && editingArrayIndex !== null) {
        setLocalValue(line.arrayValues?.[editingArrayIndex] || '');
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
        color: '#7a8599', 
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
    const sectionColor = line.key === 'must' ? COLORS.darkRed : COLORS.darkBlue;
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
        style={{
          width: '24px',
          minWidth: '24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: (lineHovered || deleteHovered) && line.isArrayItem ? COLORS.orange : 'transparent',
          backgroundColor: deleteHovered ? `${COLORS.darkOrange}22` : 'transparent',
          transition: 'all 0.15s',
          borderRadius: '2px',
          fontWeight: 700,
          fontSize: '16px',
        }}
      >
        {(lineHovered || deleteHovered) && line.isArrayItem && '−'}
      </Box>

      {/* Indent + prefix */}
      <Text span style={{ whiteSpace: 'pre', color: '#999' }}>
        {indentSpaces}{prefix}
      </Text>

      {/* Key - only highlights when hovering the key itself */}
      {line.key && (
        <Popover 
          opened={isEditing && editingPart === 'key' && showSuggestions}
          position={keyPopoverPosition}
          offset={4}
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <Box
              ref={keyTargetRef}
              onClick={(e) => { e.stopPropagation(); onStartEdit('key'); }}
              style={{
                ...BLOCK_STYLE,
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
      {line.key && <Text span style={{ color: '#888' }}>: </Text>}

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
                  index={idx}
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
                <Text span style={{ color: COLORS.green, fontWeight: 600 }}>-</Text>
                <Box
                  onClick={(e) => { e.stopPropagation(); onStartEdit('arrayItem', line.arrayValues!.length); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minWidth: '60px',
                    height: '22px',
                    backgroundColor: lineHovered ? `${COLORS.green}15` : `${COLORS.green}08`,
                    border: `1px dashed ${COLORS.green}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: '0 8px',
                    transition: 'all 0.15s',
                  }}
                >
                  {isEditing && editingPart === 'arrayItem' && editingArrayIndex === line.arrayValues!.length ? (
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
                        color: COLORS.darkGreen,
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 600,
                        width: `${Math.max(localValue.length, 4)}ch`,
                        padding: 0,
                      }}
                    />
                  ) : (
                    <Group gap={4}>
                      <IconPlus size={12} color={COLORS.green} />
                      <Text size="xs" fw={500} c={COLORS.green}>add</Text>
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
                  onStartEdit={() => { setIsArrayExpanded(true); onStartEdit('arrayItem', 0); }}
                  color={getBrightColor()}
                  darkColor={getColor()}
                />
              ) : (
                // Regular array items - tight, no gaps
                <>
                  {line.arrayValues.map((item, idx) => (
                    <Box
                      key={idx}
                      onClick={() => { setIsArrayExpanded(true); onStartEdit('arrayItem', idx); }}
                      style={{
                        ...BLOCK_STYLE,
                        minWidth: '24px',
                        backgroundColor: `${getColor()}15`,
                        border: `1px solid ${getColor()}40`,
                        borderRight: idx < line.arrayValues!.length - 1 ? 'none' : `1px solid ${getColor()}40`,
                        borderRadius: idx === 0 ? '3px 0 0 3px' : idx === line.arrayValues!.length - 1 ? '0 3px 3px 0' : '0',
                        color: getColor(),
                      }}
                    >
                      {item}
                    </Box>
                  ))}
                  <Box
                    onClick={(e) => { e.stopPropagation(); setIsArrayExpanded(true); onStartEdit('arrayItem', line.arrayValues!.length); }}
                    style={{
                      ...BLOCK_STYLE,
                      minWidth: '24px',
                      backgroundColor: `${COLORS.green}15`,
                      border: `1px solid ${COLORS.green}40`,
                      borderRadius: '0 3px 3px 0',
                      color: COLORS.green,
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
            position={valuePopoverPosition}
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
                    e.currentTarget.style.backgroundColor = line.value ? `${getColor()}25` : `${COLORS.red}20`;
                    e.currentTarget.style.borderColor = line.value ? getColor() : COLORS.red;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isEditing && editingPart === 'value')) {
                    e.currentTarget.style.backgroundColor = line.isInvalidValue 
                      ? `${COLORS.red}15` 
                      : (line.value ? `${getColor()}10` : `${COLORS.red}08`);
                    e.currentTarget.style.borderColor = line.isInvalidValue 
                      ? `${COLORS.red}60` 
                      : (line.value ? `${getColor()}40` : `${COLORS.red}40`);
                  }
                }}
                style={{
                  ...BLOCK_STYLE,
                  minWidth: line.value ? undefined : '80px',
                  color: line.isInvalidValue ? COLORS.red : (line.value ? getColor() : COLORS.darkRed),
                  backgroundColor: line.isInvalidValue 
                    ? `${COLORS.red}15` 
                    : (isEditing && editingPart === 'value') 
                      ? `${getColor()}25` 
                      : (line.value ? `${getColor()}10` : `${COLORS.red}08`),
                  border: `1px solid ${line.isInvalidValue ? `${COLORS.red}60` : (line.value ? `${getColor()}40` : `${COLORS.red}40`)}`,
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
interface ArrayItemProps {
  value: string;
  index: number;
  isEditing: boolean;
  lineHovered: boolean;
  color: string;
  darkColor: string;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onChange: (newValue: string) => void;
  onRemove: () => void;
  onEnter: () => void;
  suggestions: string[];
  selectedIndex: number;
  onSuggestionSelect: (suggestion: string) => void;
  onSuggestionHover: (index: number) => void;
  showSuggestions: boolean;
}

function ArrayItem({
  value,
  index,
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
}: ArrayItemProps) {
  const { hovered, ref } = useHover();
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const isClickingSuggestion = useRef(false);
  
  const popoverPosition = useSmartPopoverPosition(targetRef, showSuggestions);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setLocalValue(value);
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
    <Popover opened={showSuggestions} position={popoverPosition} offset={8} withArrow shadow="lg">
      <Popover.Target>
        <Box
          ref={(node) => {
            // Merge refs
            (ref as any).current = node;
            (targetRef as any).current = node;
          }}
          onClick={onStartEdit}
          style={{
            ...BLOCK_STYLE,
            minWidth: '24px',
            backgroundColor: isEditing ? `${color}20` : (hovered ? `${color}15` : `${darkColor}08`),
            border: `1px solid ${hovered || isEditing ? color : `${darkColor}40`}`,
          }}
        >
          {/* No floating x-out button - use left delete zone instead */}
          {isEditing ? (
            <input
              ref={inputRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: darkColor,
                fontFamily: MONO_FONT,
                fontSize: '13px',
                fontWeight: 600,
                width: `${Math.max(localValue.length, 2)}ch`,
                padding: 0,
                textAlign: 'center',
              }}
            />
          ) : (
            <span style={{ color: darkColor, fontSize: '13px', fontWeight: 600 }}>
              {value}
            </span>
          )}
        </Box>
      </Popover.Target>
      <Popover.Dropdown p={6} style={{ minWidth: '100px' }}>
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
  );
}

// Long-form array item component (vertical YAML style with dashes)
interface LongFormArrayItemProps {
  value: string;
  index: number;
  isEditing: boolean;
  lineHovered: boolean;
  color: string;
  darkColor: string;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onChange: (newValue: string) => void;
  onRemove: () => void;
  onEnter: () => void;
  suggestions: string[];
  selectedIndex: number;
  onSuggestionSelect: (suggestion: string) => void;
  onSuggestionHover: (index: number) => void;
  showSuggestions: boolean;
}

function LongFormArrayItem({
  value,
  index,
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
  
  const popoverPosition = useSmartPopoverPosition(targetRef, showSuggestions);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setLocalValue(value);
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
          backgroundColor: (hovered || lineHovered) ? `${COLORS.darkOrange}20` : 'transparent',
          borderRadius: '3px',
          cursor: 'pointer',
          opacity: (hovered || lineHovered) ? 1 : 0,
          transition: 'all 0.15s',
        }}
      >
        <IconMinus size={12} color={COLORS.orange} />
      </Box>
      
      {/* Value */}
      <Popover opened={showSuggestions} position={popoverPosition} offset={4} withArrow shadow="md">
        <Popover.Target>
          <Box
            ref={targetRef}
            onClick={onStartEdit}
            style={{
              ...BLOCK_STYLE,
              minWidth: '32px',
              backgroundColor: isEditing ? `${color}20` : (hovered ? `${color}15` : `${darkColor}08`),
              border: `1px solid ${hovered || isEditing ? color : `${darkColor}40`}`,
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: darkColor,
                  fontFamily: MONO_FONT,
                  fontSize: '13px',
                  fontWeight: 600,
                  width: `${Math.max(localValue.length, 3)}ch`,
                  padding: 0,
                }}
              />
            ) : (
              <span style={{ color: darkColor, fontSize: '13px', fontWeight: 600 }}>
                {value}
              </span>
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
  suggestions: string[];
  selectedIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

function SuggestionList({ suggestions, selectedIndex, onSelect, onHover }: SuggestionListProps) {
  if (suggestions.length === 0) {
    return <Text size="sm" c="dimmed" fw={500}>Type something...</Text>;
  }

  return (
    <Stack gap={2} onMouseDown={(e) => e.preventDefault()}>
      {suggestions.map((suggestion, index) => (
        <Box
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(index)}
          style={{
            ...BLOCK_STYLE,
            height: 'auto',
            padding: '6px 10px',
            justifyContent: 'flex-start',
            backgroundColor: index === selectedIndex ? `${COLORS.blue}20` : 'transparent',
            border: `1px solid ${index === selectedIndex ? `${COLORS.blue}60` : 'transparent'}`,
          }}
        >
          <span style={{ 
            fontFamily: MONO_FONT,
            fontSize: '13px',
            fontWeight: index === selectedIndex ? 600 : 500, 
            color: index === selectedIndex ? COLORS.darkBlue : '#444' 
          }}>
            {suggestion}
          </span>
        </Box>
      ))}
    </Stack>
  );
}
