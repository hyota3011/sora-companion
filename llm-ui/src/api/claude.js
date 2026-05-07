import { _getApiKey } from "../config/profiles";

const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Sends a Messages API request to Claude and returns an async generator
 * that yields text content deltas as plain strings.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @param {Object} profile - The active provider profile configuration
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat(messages, model, profile) {
    const { endpoint, maxTokens = 4096 } = profile;

    const apiKey = await _getApiKey(profile.id);

    if (!apiKey) {
        throw new Error(`API KEY is missing for ${profile.name}.`);
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            stream: true,
        }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Invalid API Key");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `${profile.name} request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const event of events) {
                const dataLines = event
                    .split("\n")
                    .filter((line) => line.startsWith("data:"))
                    .map((line) => line.replace(/^data:\s?/, ""));

                if (!dataLines.length) continue;

                try {
                    const parsed = JSON.parse(dataLines.join("\n"));

                    if (parsed.type === "error") {
                        throw new Error(parsed.error?.message || `${profile.name} stream failed`);
                    }

                    const delta = parsed.delta;
                    if (parsed.type === "content_block_delta" && delta?.type === "text_delta" && delta.text) {
                        yield delta.text;
                    }
                } catch (err) {
                    if (err instanceof SyntaxError) {
                        console.error("Error parsing Claude SSE chunk:", err, dataLines);
                        continue;
                    }
                    throw err;
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
