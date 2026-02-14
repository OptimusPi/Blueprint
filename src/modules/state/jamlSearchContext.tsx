import React, { createContext, useContext, useState, ReactNode } from 'react';

interface JamlSearchState {
    searchMode: 'quick' | 'sequential' | 'funny';
    searchEngineMode: 'browser-wasm' | 'public-api';
    apiEndpoint: string;
    wasmThreadCount: number;
    wasmBatchSize: number;
    quickSeedCount: 'single' | '1k' | '100k' | '1m' | '10m';
    quickSeedInput: string;
    sequentialStartSeed: string;
    sequentialEndSeed: string;
    funnyMode: 'palindrome' | 'keyword';
    funnyKeywords: string[];
    selectedFilterKey: string;
    customJamlText: string;
}

interface JamlSearchContextType extends JamlSearchState {
    setSearchMode: (mode: 'quick' | 'sequential' | 'funny') => void;
    setSearchEngineMode: (mode: 'browser-wasm' | 'public-api') => void;
    setApiEndpoint: (endpoint: string) => void;
    setWasmThreadCount: (count: number) => void;
    setWasmBatchSize: (size: number) => void;
    setQuickSeedCount: (count: 'single' | '1k' | '100k' | '1m' | '10m') => void;
    setQuickSeedInput: (input: string) => void;
    setSequentialStartSeed: (seed: string) => void;
    setSequentialEndSeed: (seed: string) => void;
    setFunnyMode: (mode: 'palindrome' | 'keyword') => void;
    setFunnyKeywords: (keywords: string[]) => void;
    setSelectedFilterKey: (key: string) => void;
    setCustomJamlText: (text: string) => void;
}

const JamlSearchContext = createContext<JamlSearchContextType | undefined>(undefined);

const defaultThreads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;

export function JamlSearchProvider({ children }: { children: ReactNode }) {
    const [searchMode, setSearchMode] = useState<'quick' | 'sequential' | 'funny'>('quick');
    const [searchEngineMode, setSearchEngineMode] = useState<'browser-wasm' | 'public-api'>('browser-wasm');
    const [apiEndpoint, setApiEndpoint] = useState('https://motelyjaml-pi.8pi.me');
    const [wasmThreadCount, setWasmThreadCount] = useState<number>(defaultThreads);
    const [wasmBatchSize, setWasmBatchSize] = useState<number>(3);
    const [quickSeedCount, setQuickSeedCount] = useState<'single' | '1k' | '100k' | '1m' | '10m'>('1k');
    const [quickSeedInput, setQuickSeedInput] = useState('');
    const [sequentialStartSeed, setSequentialStartSeed] = useState('11111111');
    const [sequentialEndSeed, setSequentialEndSeed] = useState('ZZZZZZZZ');
    const [funnyMode, setFunnyMode] = useState<'palindrome' | 'keyword'>('palindrome');
    const [funnyKeywords, setFunnyKeywords] = useState<string[]>(['']);
    const [selectedFilterKey, setSelectedFilterKey] = useState<string>('default');
    const [customJamlText, setCustomJamlText] = useState<string>('');

    const value = {
        searchMode,
        searchEngineMode,
        apiEndpoint,
        wasmThreadCount,
        wasmBatchSize,
        quickSeedCount,
        quickSeedInput,
        sequentialStartSeed,
        sequentialEndSeed,
        funnyMode,
        funnyKeywords,
        selectedFilterKey,
        customJamlText,
        setSearchMode,
        setSearchEngineMode,
        setApiEndpoint,
        setWasmThreadCount,
        setWasmBatchSize,
        setQuickSeedCount,
        setQuickSeedInput,
        setSequentialStartSeed,
        setSequentialEndSeed,
        setFunnyMode,
        setFunnyKeywords,
        setSelectedFilterKey,
        setCustomJamlText,
    };

    return (
        <JamlSearchContext.Provider value={value}>
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
