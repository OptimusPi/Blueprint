import { Card } from "../enum/cards/Card";
import { JokerData } from "../struct/JokerData";
import { SimulatedCard } from "../SimulationTypes";
import { Edition } from "../enum/Edition";

export class CardTranslator {
    /**
     * Translates a raw engine object (Card or JokerData) into a plain SimulatedCard
     */
    static toSimulatedCard(data: any, showCardSpoilers: boolean = false): SimulatedCard {
        if (!data) return { name: "Unknown", type: "Unknown" };

        // Handle Legendary Spoilers (The Soul, Judgement, Wraith)
        if (showCardSpoilers && typeof data.getName === 'function') {
            const name = data.getName();
            if (name === "The Soul" || name === "Judgement" || name === "Wraith") {
                // In a real scenario, we would peek the next joker from the appropriate source.
                // For now, we'll mark it as a spoiler-ready item.
                // The actual conversion happens in RunSimulator if we pass the flag down,
                // or we can handle it here if we have access to the engine.
            }
        }

        // Handle JokerData (Common from shops/buffoon packs)
        if (data.joker && typeof data.joker !== 'string') {
            const jokerData = data as JokerData;
            return {
                name: jokerData.joker.getName(),
                type: "Joker",
                edition: this.translateEdition(jokerData.edition),
                rarity: jokerData.rarity,
                isEternal: jokerData.stickers.eternal,
                isPerishable: jokerData.stickers.perishable,
                isRental: jokerData.stickers.rental
            };
        }

        // Handle Card (Standard cards, Tarots, etc.)
        if (data instanceof Card || (data.getName && typeof data.getName === 'function')) {
            const card = data as Card;
            const rawName = card.getName();
            let name = rawName;
            let type = "Standard";

            // Infer type from name if possible
            if (rawName.startsWith("c_")) type = "Tarot";
            else if (rawName.startsWith("p_")) type = "Planet";
            else if (rawName.startsWith("s_")) type = "Spectral";
            else if (rawName.includes('_')) {
                const parts = rawName.split('_');
                if (parts.length === 2 && parts[0].length === 1 && parts[1].length === 1) {
                    // Convert "S_A" -> "A_S" for UI
                    const [suit, rank] = parts;
                    name = `${rank}_${suit}`;
                }
            }

            return {
                name,
                type
            };
        }

        // Handle simple string (Fallback for planetary names or simple item names)
        if (typeof data === 'string') {
            return {
                name: data,
                type: "Item"
            };
        }

        // Handle objects that look like cards but aren't instances
        return {
            name: data.name || data.joker || "Unknown",
            type: data.type || "Unknown",
            edition: data.edition
        };
    }

    private static translateEdition(edition: Edition): string {
        switch (edition) {
            case Edition.FOIL: return "Foil";
            case Edition.HOLOGRAPHIC: return "Holographic";
            case Edition.POLYCHROME: return "Polychrome";
            case Edition.NEGATIVE: return "Negative";
            default: return "";
        }
    }

}
