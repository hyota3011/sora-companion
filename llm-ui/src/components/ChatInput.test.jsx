import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatInput from "./ChatInput.jsx";

const reasoningLevelRef = { current: "none" };

vi.mock("../context/ChatContext", () => ({
    useComposerContext: () => ({
        attachedImages: [],
        attachedTabs: [],
        attachmentError: "",
        handleAddImageFiles: vi.fn(),
        handleAddTabs: vi.fn(),
        handleInput: vi.fn(),
        handleKeyDown: vi.fn(),
        handleRemoveImage: vi.fn(),
        handleRemoveTab: vi.fn(),
        handleSend: vi.fn(),
        inputValue: "",
        textareaRef: { current: null },
    }),
    useConversationContext: () => ({
        activeProfile: { id: "openai", name: "OpenAI" },
        handleCompact: vi.fn(),
        isStreaming: false,
        reasoningLevelRef,
    }),
    useSettingsContext: () => ({ isPreferenceLoading: false }),
}));

describe("ChatInput reasoning effort selector", () => {
    beforeEach(() => {
        reasoningLevelRef.current = "none";
        localStorage.clear();
    });

    it("selects high, updates the session ref, and closes the menu", async () => {
        const user = userEvent.setup();
        render(<ChatInput />);

        await user.click(screen.getByTitle("Effort"));
        expect(screen.getByRole("button", { name: "High" })).toBeVisible();

        await user.click(screen.getByRole("button", { name: "High" }));

        expect(reasoningLevelRef.current).toBe("high");
        expect(screen.getByTitle("Effort")).toHaveTextContent("High");
        expect(screen.queryByRole("button", { name: "Max" })).not.toBeInTheDocument();
    });
});
