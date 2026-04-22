import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface JamlSearchState {
    searchMode: 'quick' | 'funny';
    funnyMode: 'palindrome' | 'keyword';
    funnyKeywords: Array<string>;
    jamlText: string;
}

interface JamlSearchContextType extends JamlSearchState {
    setSearchMode: (mode: 'quick' | 'funny') => void;
    setFunnyMode: (mode: 'palindrome' | 'keyword') => void;
    setFunnyKeywords: (keywords: Array<string>) => void;
    setJamlText: (text: string) => void;
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

    return (
        <JamlSearchContext.Provider value={{
            searchMode, funnyMode, funnyKeywords, jamlText,
            setSearchMode, setFunnyMode, setFunnyKeywords, setJamlText,
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
