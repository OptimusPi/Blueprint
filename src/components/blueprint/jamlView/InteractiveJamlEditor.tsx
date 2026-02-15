import React, { useState, useCallback, useMemo } from 'react';
import {
    Paper,
    Textarea,
    Text,
    Alert,
    useMantineTheme
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import yaml from 'js-yaml';

interface InteractiveJamlEditorProps {
    initialJaml: string;
    onJamlChange: (yamlStr: string, parsed: any, isValid: boolean) => void;
}

export function InteractiveJamlEditor({ initialJaml, onJamlChange }: InteractiveJamlEditorProps) {
    const theme = useMantineTheme();
    const [jamlText, setJamlText] = useState<string>(initialJaml);

    // Validate and parse JAML
    const validation = useMemo(() => {
        try {
            const parsed = yaml.load(jamlText);
            return { isValid: true, parsed };
        } catch (e: any) {
            return { 
                isValid: false, 
                error: e.message || 'Invalid JAML syntax',
                parsed: null
            };
        }
    }, [jamlText]);

    // Notify parent of changes
    React.useEffect(() => {
        onJamlChange(jamlText, validation.parsed, validation.isValid);
    }, [jamlText, validation, onJamlChange]);

    return (
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
    );
}

export default InteractiveJamlEditor;
