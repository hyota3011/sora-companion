import { getApiKey } from "../storage/apiKeys";
import { toOpenAICompatibleMessages } from "./imageMessages";

/**
 * Sends a chat completion request to OpenAI and returns an async generator
 * that yields text content deltas as plain strings.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @param {Object} profile - The active provider profile configuration
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat(messages, model, profile) {
    const { endpoint } = profile;

    const apiKey = await getApiKey(profile.id);

    if (!apiKey) {
        throw new Error(`API key is missing for ${profile.name}. Use the API key button to add one.`);
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: toOpenAICompatibleMessages(messages),
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
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const data = line.replace(/^data: /, "").trim();
                if (!data || data === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                        yield delta;
                    }
                } catch (err) {
                    console.error("Error parsing SSE chunk:", err, data);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
