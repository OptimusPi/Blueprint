import React, { useState, useCallback, useMemo } from 'react';
import {
    Group,
    Stack,
    Text,
    Textarea,
    Paper,
    Badge,
    Tooltip,
    ActionIcon,
    Alert,
    CopyButton,
    SegmentedControl,
    useMantineTheme
} from '@mantine/core';
import { 
    IconUpload, 
    IconDownload, 
    IconRefresh,
    IconCheck,
    IconCopy,
    IconAlertCircle,
    IconFileText,
    IconClipboard
} from '@tabler/icons-react';
import yaml from 'js-yaml';
import { InteractiveJamlEditor } from './InteractiveJamlEditor';
import { BubbleJamlEditor } from './BubbleJamlEditor';
import { SimpleBubbleEditor } from './SimpleBubbleEditor';

// Default JAML template - loads from default.jaml
const DEFAULT_JAML = `# Default.jaml
name: Default JAML file, good for a generic test filter, or for a JAML Map View.
author: pifreak
description: A fast SIMD filter for Balatro Seeds.
deck: Red
stake: White
must:
  # This is literally *always* true in Balatro
  #   - RULE: The FIRST booster pack in a shop is ALWAYS a 2-joker, $4 bufoon pack.
  - joker: Any
    antes: [1]
    packSlots: [0]
should:
  - joker: Blueprint
    antes: [1, 2, 3, 4, 5, 6, 7, 8]
    packSlots: [0, 1, 2, 3, 4, 5]
    shopSlots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
seeds:
  - "PIFREAK"
  - "LOVESYOU"
`;

interface JamlEditorProps {
    onJamlChange?: (jaml: any, isValid: boolean) => void;
    initialJaml?: string;
}

interface ValidationResult {
    isValid: boolean;
    error?: string;
    parsed?: any;
}

export function JamlEditor({ onJamlChange, initialJaml }: JamlEditorProps) {
    const theme = useMantineTheme();
    const [jamlText, setJamlText] = useState<string>(initialJaml || DEFAULT_JAML);
    const [editorMode, setEditorMode] = useState<'text' | 'interactive' | 'bubble' | 'simple'>('simple');

    // Validate and parse JAML
    const validation = useMemo((): ValidationResult => {
        try {
            const parsed = yaml.load(jamlText);
            return { isValid: true, parsed };
        } catch (e: any) {
            return { 
                isValid: false, 
                error: e.message || 'Invalid JAML syntax'
            };
        }
    }, [jamlText]);

    // Notify parent of changes
    React.useEffect(() => {
        if (onJamlChange) {
            onJamlChange(validation.parsed, validation.isValid);
        }
    }, [validation, onJamlChange]);

    const handleReset = useCallback(() => {
        setJamlText(DEFAULT_JAML);
    }, []);

    const handleDownload = useCallback(() => {
        const blob = new Blob([jamlText], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'filter.jaml';
        a.click();
        URL.revokeObjectURL(url);
    }, [jamlText]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setJamlText(content);
            };
            reader.readAsText(file);
        }
    }, []);
    
    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setJamlText(text);
            }
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    }, []);

    return (
        <Paper p="sm" radius="md" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
            <Stack gap="sm">
                {/* Header */}
                <Group justify="space-between" align="center">
                    <Group gap="xs">
                        <IconFileText size={18} />
                        <Text fw={600} size="sm">JAML Editor</Text>
                        {validation.isValid ? (
                            <Badge color="green" size="xs" leftSection={<IconCheck size={10} />}>Valid</Badge>
                        ) : (
                            <Badge color="red" size="xs" leftSection={<IconAlertCircle size={10} />}>Invalid</Badge>
                        )}
                    </Group>
                    <Group gap={4}>
                        <Tooltip label="Paste from clipboard">
                            <ActionIcon variant="light" size="sm" color="violet" onClick={handlePasteFromClipboard}>
                                <IconClipboard size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Upload file">
                            <ActionIcon variant="light" size="sm" color="green" component="label">
                                <IconUpload size={14} />
                                <input
                                    type="file"
                                    accept=".jaml,.yaml,.yml"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download">
                            <ActionIcon variant="light" size="sm" color="blue" onClick={handleDownload}>
                                <IconDownload size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <CopyButton value={jamlText}>
                            {({ copied, copy }) => (
                                <Tooltip label={copied ? "Copied!" : "Copy"}>
                                    <ActionIcon variant="light" size="sm" color={copied ? "teal" : "gray"} onClick={copy}>
                                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </CopyButton>
                        <Tooltip label="Reset">
                            <ActionIcon variant="light" size="sm" onClick={handleReset}>
                                <IconRefresh size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

                {/* Editor Mode Toggle - small switch in corner */}
                <Group justify="flex-end" mb={4}>
                    <SegmentedControl
                        value={editorMode}
                        onChange={(value) => setEditorMode(value as 'text' | 'interactive' | 'bubble' | 'simple')}
                        data={[
                            { label: '🫧 Simple', value: 'simple' },
                            { label: '🫧 Bubble', value: 'bubble' },
                            { label: '✨ Interactive', value: 'interactive' },
                            { label: '📝 Raw', value: 'text' },
                        ]}
                        size="xs"
                    />
                </Group>

                {/* Simple Mode (most accessible, tap-friendly, no useEffect) */}
                {editorMode === 'simple' && (
                    <SimpleBubbleEditor
                        initialJaml={jamlText}
                        onJamlChange={(yamlStr, parsed, isValid) => {
                            setJamlText(yamlStr);
                            if (onJamlChange) {
                                onJamlChange(parsed, isValid);
                            }
                        }}
                    />
                )}

                {/* Bubble Mode (accessible, tap-friendly) */}
                {editorMode === 'bubble' && (
                    <BubbleJamlEditor
                        initialJaml={jamlText}
                        onJamlChange={(yamlStr, parsed, isValid) => {
                            setJamlText(yamlStr);
                            if (onJamlChange) {
                                onJamlChange(parsed, isValid);
                            }
                        }}
                    />
                )}

                {/* Dream Editor (Interactive) */}
                {editorMode === 'interactive' && (
                    <InteractiveJamlEditor
                        initialJaml={jamlText}
                        onJamlChange={(yamlStr, parsed, isValid) => {
                            setJamlText(yamlStr);
                            if (onJamlChange) {
                                onJamlChange(parsed, isValid);
                            }
                        }}
                    />
                )}

                {/* Raw Text Mode (fallback) */}
                {editorMode === 'text' && (
                    <Paper p="xs" radius="sm" bg={theme.colors.dark[8]}>
                        <Textarea
                            value={jamlText}
                            onChange={(e) => setJamlText(e.currentTarget.value)}
                            minRows={20}
                            maxRows={30}
                            autosize
                            styles={{
                                input: {
                                    fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    backgroundColor: 'transparent',
                                }
                            }}
                            placeholder="Paste your JAML configuration here..."
                        />
                        {!validation.isValid && (
                            <Alert icon={<IconAlertCircle size={14} />} color="red" mt="xs" p="xs" title="Syntax Error">
                                <Text size="xs">{validation.error}</Text>
                            </Alert>
                        )}
                    </Paper>
                )}
            </Stack>
        </Paper>
    );
}

export default JamlEditor;
