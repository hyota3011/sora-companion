import { describe, expect, it } from "vitest";
import { buildApiMessages } from "./chatMessages.js";

describe("buildApiMessages preference Incognito", () => {
    it("omits saved preference text while keeping compact memory", () => {
        const messages = buildApiMessages(
            [{ sender: "user", text: "Hello" }],
            {
                activeProfile: { contextMessageCount: 20 },
                compactMemory: "Earlier summary",
                userPreference: "Be brief",
                isPreferenceIncognitoEnabled: true,
            },
        );

        expect(messages[0].content).toContain("Earlier summary");
        expect(messages[0].content).not.toContain("Be brief");
        expect(messages[1]).toMatchObject({ role: "user", content: "Hello" });
    });
});
