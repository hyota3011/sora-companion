import { streamChat as streamOpenAI } from "./openai";
import { streamChat as streamGrok } from "./grok";
import { streamChat as streamClaude } from "./claude";
import { provider } from "../config/profiles";

/**
 * Provider-agnostic streaming entry point.
 * Returns an async generator that yields text deltas as plain strings.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @param {Object} activeProfile - The selected profile object.
 * @param {Object} [options] - Request controls.
 * @param {AbortSignal} [options.signal] - Cancels the provider fetch and stream.
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat(messages, model, activeProfile, options = {}) {
    if (!activeProfile) throw new Error("No active profile selected");

    switch (activeProfile.id) {
        case provider.OPENAI:
            yield* streamOpenAI(messages, model, activeProfile, options);
            break;
        case provider.GROK:
            yield* streamGrok(messages, model, activeProfile, options);
            break;
        case provider.CLAUDE:
            yield* streamClaude(messages, model, activeProfile, options);
            break;
        case "gemini":
            throw new Error("Gemini stream handler not implemented yet.");
        default:
            throw new Error(`Unknown provider: "${activeProfile.id}"`);
    }
}
