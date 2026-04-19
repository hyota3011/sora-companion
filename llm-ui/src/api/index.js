import { streamChat as streamOpenAI } from "./openai";

/**
 * Provider-agnostic streaming entry point.
 * Returns an async generator that yields text deltas as plain strings.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @param {Object} activeProfile - The selected profile object
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat(messages, model, activeProfile) {
    if (!activeProfile) throw new Error("No active profile selected");

    switch (activeProfile.id) {
        case "openai":
            yield* streamOpenAI(messages, model, activeProfile);
            break;
        case "gemini":
            // Normally you would route to a streamGemini() here. 
            // For now, depending on compatibility, you might throw or fallback.
            throw new Error("Gemini stream handler not implemented yet.");
        default:
            throw new Error(`Unknown provider: "${activeProfile.id}"`);
    }
}
