const MEMORY_KEY = "blueprint-assistant-memory";
const MAX_NOTES = 40;

export function listMemory(): Array<string> {
    try {
        const parsed = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string") : [];
    } catch {
        return [];
    }
}

export function remember(note: string): Array<string> {
    const trimmed = note.trim();
    const notes = listMemory().filter((n) => n !== trimmed);
    if (trimmed) notes.push(trimmed);
    const kept = notes.slice(-MAX_NOTES);
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(kept));
    } catch {
        return kept;
    }
    return kept;
}

export function forget(note?: string): Array<string> {
    const kept = note ? listMemory().filter((n) => n !== note) : [];
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(kept));
    } catch {
        return kept;
    }
    return kept;
}
