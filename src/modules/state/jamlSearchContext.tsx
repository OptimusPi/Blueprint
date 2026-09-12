import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { registerTools } from '../webmcp/registry.ts';
import { useCardStore } from './store.ts';
import type { ReactNode } from 'react';

interface JamlSearchState {
    searchMode: 'quick' | 'funny';
    funnyMode: 'palindrome' | 'keyword';
    funnyKeywords: Array<string>;
    jamlText: string;
    selectedFilterKey: string;
    customJamlText: string;
}

interface JamlSearchContextType extends JamlSearchState {
    setSearchMode: (mode: 'quick' | 'funny') => void;
    setFunnyMode: (mode: 'palindrome' | 'keyword') => void;
    setFunnyKeywords: (keywords: Array<string>) => void;
    setJamlText: (text: string) => void;
    setSelectedFilterKey: (key: string) => void;
    setCustomJamlText: (text: string) => void;
}

const JamlSearchContext = createContext<JamlSearchContextType | undefined>(undefined);

const DEFAULT_JAML = `name: Blueprint Copy Engine
author: jammy
description: Blueprint rare joker with Brainstorm for joker copying synergy
deck: Red
stake: White
must:
  - rareJoker: Blueprint
    antes: [1, 2, 3, 4]
should:
  - rareJoker: Brainstorm
    score: 80
  - rareJoker: Baron
    score: 55
  - legendaryJoker: Triboulet
    score: 55
  - uncommonJoker: OopsAll6s
    score: 50
  - legendaryJoker: Perkeo
    score: 50
  - uncommonJoker: Showman
    score: 35
  - spectral: Hex
    score: 35
  - mixedJoker: Any
    edition: Negative
    score: 40
  - tag: NegativeTag
    score: 35
`;

export function JamlSearchProvider({ children }: { children: ReactNode }) {
    const [searchMode, setSearchMode] = useState<'quick' | 'funny'>('quick');
    const [funnyMode, setFunnyMode] = useState<'palindrome' | 'keyword'>('palindrome');
    const [funnyKeywords, setFunnyKeywords] = useState<Array<string>>(['']);
    const [jamlText, setJamlText] = useState<string>(DEFAULT_JAML);
    const [selectedFilterKey, setSelectedFilterKey] = useState<string>('default');
    const [customJamlText, setCustomJamlText] = useState<string>('');

    const jamlRef = useRef(jamlText);
    useEffect(() => {
        jamlRef.current = jamlText;
    }, [jamlText]);

    useEffect(() => registerTools([
        {
            name: 'get_jaml_filter',
            description: 'Read the JAML filter currently in the JAML search editor.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            execute: () => ({ jaml: jamlRef.current }),
        },
        {
            name: 'set_jaml_filter',
            description: 'Replace the JAML filter in the JAML search editor and switch to the JAML view. JAML is Jimbo\'s Ante Markup Language: name/deck/stake plus must/should/mustNot clause lists.',
            inputSchema: {
                type: 'object',
                properties: { jaml: { type: 'string', minLength: 1 } },
                required: ['jaml'],
                additionalProperties: false,
            },
            execute: (input) => {
                const jaml = String(input.jaml ?? '');
                setJamlText(jaml);
                useCardStore.getState().setViewMode('jaml');
                return { lines: jaml.split('\n').length };
            },
        },
    ]), []);

    return (
        <JamlSearchContext.Provider value={{
            searchMode, funnyMode, funnyKeywords, jamlText, selectedFilterKey, customJamlText,
            setSearchMode, setFunnyMode, setFunnyKeywords, setJamlText, setSelectedFilterKey, setCustomJamlText,
        }}>
            {children}
        </JamlSearchContext.Provider>
    );
}

export function useJamlSearch() {
    const context = useContext(JamlSearchContext);
    if (context === undefined) {
        throw new Error('useJamlSearch must be used within a JamlSearchProvider');
    }
    return context;
}
