import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface JamlSearchState {
    searchMode: 'quick' | 'funny';
    funnyMode: 'palindrome' | 'keyword';
    funnyKeywords: Array<string>;
    selectedFilterKey: string;
    customJamlText: string;
}

interface JamlSearchContextType extends JamlSearchState {
    setSearchMode: (mode: 'quick' | 'funny') => void;
    setFunnyMode: (mode: 'palindrome' | 'keyword') => void;
    setFunnyKeywords: (keywords: Array<string>) => void;
    setSelectedFilterKey: (key: string) => void;
    setCustomJamlText: (text: string) => void;
}

const JamlSearchContext = createContext<JamlSearchContextType | undefined>(undefined);

export function JamlSearchProvider({ children }: { children: ReactNode }) {
    const [searchMode, setSearchMode] = useState<'quick' | 'funny'>('quick');
    const [funnyMode, setFunnyMode] = useState<'palindrome' | 'keyword'>('palindrome');
    const [funnyKeywords, setFunnyKeywords] = useState<Array<string>>(['']);
    const [selectedFilterKey, setSelectedFilterKey] = useState<string>('default');
    const [customJamlText, setCustomJamlText] = useState<string>('');

    return (
        <JamlSearchContext.Provider value={{
            searchMode, funnyMode, funnyKeywords, selectedFilterKey, customJamlText,
            setSearchMode, setFunnyMode, setFunnyKeywords, setSelectedFilterKey, setCustomJamlText,
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
