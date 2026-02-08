import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Group, TextInput, Popover, Stack, Text, ActionIcon, Divider } from '@mantine/core';
import { IconTrash, IconInfoCircle } from '@tabler/icons-react';
import { useHover } from '@mantine/hooks';
import {
  getValidValuesFor,
  getSuggestedPropertiesFor,
  isPropertyValidForClauseType,
  CLAUSE_TYPES,
} from '../../../utils/jamlValues';

interface JamlNode {
  id: string;
  type: 'root' | 'section' | 'clause' | 'property' | 'array-item';
  key?: string;
  value?: any;
  indent: number;
  parent?: string;
  children: string[];
  isEditing: boolean;
  isValid: boolean;
  validationState: 'required-incomplete' | 'optional-incomplete' | 'complete' | 'invalid' | 'metadata';
}

interface JamlEditorLineProps {
  node: JamlNode;
  isEditing: boolean;
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
  onChange: (newValue: any) => void;
  children?: React.ReactNode;
}

export function JamlEditorLine({
  node,
  isEditing,
  onEnterEditMode,
  onExitEditMode,
  onChange,
  children,
}: JamlEditorLineProps) {
  const [inputValue, setInputValue] = useState(node.value?.toString() || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { hovered: isHovered, ref: hoverRef } = useHover();
  const { hovered: isMinusHovered, ref: minusHoverRef } = useHover();

  // Get color based on validation state
  const getValidationColor = () => {
    switch (node.validationState) {
      case 'required-incomplete':
        return 'red'; // Balatro Red
      case 'optional-incomplete':
        return 'blue'; // Balatro Blue
      case 'complete':
        return 'green'; // Balatro Green
      case 'invalid':
        return 'red'; // Balatro Red
      case 'metadata':
        return 'purple'; // Balatro Purple
      default:
        return 'gray';
    }
  };

  // Get background color for editing/hovering
  const getBackgroundColor = () => {
    if (isEditing) {
      const color = getValidationColor();
      return `var(--mantine-color-${color}-9)`;
    }
    if (isHovered) {
      const color = getValidationColor();
      return `var(--mantine-color-${color}-9)`;
    }
    return 'transparent';
  };

  // Update suggestions based on input
  const updateSuggestions = useCallback((value: string, clauseType?: string) => {
    if (!node.key) return;

    // Get valid values for this property
    const validValues = getValidValuesFor(clauseType || '', node.key);
    
    // Filter by user input (type-ahead)
    const filtered = validValues.filter(v => 
      v.toLowerCase().includes(value.toLowerCase())
    );

    // Sort: exact matches first, then startsWith, then contains
    filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const valueLower = value.toLowerCase();

      if (aLower === valueLower) return -1;
      if (bLower === valueLower) return 1;
      if (aLower.startsWith(valueLower) && !bLower.startsWith(valueLower)) return -1;
      if (bLower.startsWith(valueLower) && !aLower.startsWith(valueLower)) return 1;
      return aLower.localeCompare(bLower);
    });

    setSuggestions(filtered);
    setSelectedSuggestionIndex(0);
  }, [node.key]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setInputValue(newValue);
    
    // Update suggestions as user types
    updateSuggestions(newValue);
    setShowSuggestions(true);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If there's exactly one suggestion or user selected one, use it
      if (suggestions.length === 1) {
        setInputValue(suggestions[0]);
        onChange(suggestions[0]);
      } else if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        setInputValue(suggestions[selectedSuggestionIndex]);
        onChange(suggestions[selectedSuggestionIndex]);
      } else {
        // User typed it manually - accept as-is
        onChange(inputValue);
      }
      
      onExitEditMode();
      setShowSuggestions(false);
      
      // TODO: Auto-advance to next field
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onExitEditMode();
      setShowSuggestions(false);
    }
  };

  // Handle clicking a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    onExitEditMode();
    setShowSuggestions(false);
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      
      // Show suggestions immediately
      updateSuggestions(inputValue);
      setShowSuggestions(true);
    }
  }, [isEditing, inputValue, updateSuggestions]);

  // Render based on node type
  if (node.type === 'section') {
    return (
      <Box>
        <Text 
          size="sm" 
          fw={700} 
          c={getValidationColor()}
          style={{ marginBottom: '4px' }}
        >
          {node.key}:
        </Text>
        <Box pl="md">{children}</Box>
      </Box>
    );
  }

  if (node.type === 'clause') {
    return (
      <Box
        ref={hoverRef}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: getBackgroundColor(),
          transition: 'background-color 0.15s ease',
          marginBottom: '2px',
        }}
      >
        <Group gap="xs" wrap="nowrap">
          {/* Delete button (shows on hover) */}
          <ActionIcon
            ref={minusHoverRef}
            size="xs"
            variant="subtle"
            color={isMinusHovered ? 'orange' : 'gray'}
            style={{ 
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            <IconTrash size={12} />
          </ActionIcon>

          {/* Clause content */}
          <Box style={{ flex: 1 }}>
            {/* Render clause key-value pairs */}
            {node.value && typeof node.value === 'object' && !Array.isArray(node.value) && (
              <Stack gap={2}>
                {Object.entries(node.value).map(([key, value]) => (
                  <Group key={key} gap="xs" wrap="nowrap">
                    <Text size="sm" c="dimmed" style={{ minWidth: '80px' }}>
                      {key}:
                    </Text>
                    <Text size="sm" fw={500}>
                      {Array.isArray(value) ? `[${value.join(', ')}]` : String(value)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Box>
        </Group>
      </Box>
    );
  }

  if (node.type === 'property') {
    const color = getValidationColor();
    
    return (
      <Popover 
        opened={isEditing && showSuggestions && suggestions.length > 0} 
        position="top"
        withArrow
        shadow="md"
      >
        <Popover.Target>
          <Box
            ref={hoverRef}
            onClick={onEnterEditMode}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: getBackgroundColor(),
              border: isEditing ? `2px solid var(--mantine-color-${color}-6)` : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isEditing ? (
              <TextInput
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Delay to allow clicking suggestions
                  setTimeout(() => {
                    onExitEditMode();
                    setShowSuggestions(false);
                  }, 200);
                }}
                size="xs"
                variant="unstyled"
                styles={{
                  input: {
                    fontFamily: 'var(--mantine-font-family-monospace)',
                    fontSize: '13px',
                    padding: '2px 4px',
                    backgroundColor: 'transparent',
                    color: `var(--mantine-color-${color}-4)`,
                  },
                }}
              />
            ) : (
              <Group gap="xs" wrap="nowrap">
                <Text 
                  size="xs" 
                  c={isHovered ? `${color}.5` : 'dimmed'}
                  fw={isHovered ? 600 : 400}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  {node.key}:
                </Text>
                <Text size="xs" c={color} fw={500}>
                  {Array.isArray(node.value) ? `[${node.value.join(', ')}]` : String(node.value)}
                </Text>
              </Group>
            )}
          </Box>
        </Popover.Target>

        <Popover.Dropdown style={{ padding: '4px', minWidth: '200px' }}>
          <Stack gap={0}>
            {suggestions.map((suggestion, index) => (
              <Box
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '6px 8px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedSuggestionIndex ? 'var(--mantine-color-blue-9)' : 'transparent',
                  borderRadius: '4px',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
              >
                <Text size="xs" fw={index === selectedSuggestionIndex ? 600 : 400}>
                  {suggestion}
                </Text>
              </Box>
            ))}
            
            {suggestions.length > 5 && (
              <>
                <Divider my={4} />
                <Text size="xs" c="dimmed" ta="center">
                  {suggestions.length} options • Type to filter
                </Text>
              </>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  }

  return null;
}
