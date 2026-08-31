import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChat as streamClaude } from "./claude.js";
import { streamChat as streamGrok } from "./grok.js";
import { streamChat as streamOpenAI } from "./openai.js";

vi.mock("../storage/apiKeys", () => ({
    getApiKey: vi.fn().mockResolvedValue("test-key"),
}));

/**
 * Builds a provider profile sufficient to start a request.
 * @param {string} id - The provider identifier.
 * @returns {Object} A provider profile object.
 */
function createProfile(id) {
    return { endpoint: `https://${id}.example.test`, id, name: id, maxTokens: 32 };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("provider request cancellation", () => {
    it.each([
        ["OpenAI", streamOpenAI, "openai"],
        ["Grok", streamGrok, "grok"],
        ["Claude", streamClaude, "claude"],
    ])("passes an AbortSignal to %s fetch", async (_, stream, id) => {
        const controller = new AbortController();
        const fetchMock = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({}),
            ok: false,
            status: 401,
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(stream([], "model", createProfile(id), { signal: controller.signal }).next()).rejects.toThrow("Invalid API Key");

        expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal }));
    });
});
