import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistorySidebar from "./HistorySidebar.jsx";

const mockHistoryContext = vi.hoisted(() => ({ current: null }));
const mockConversationContext = vi.hoisted(() => ({ current: null }));

vi.mock("../context/ChatContext", () => ({
    useConversationContext: () => mockConversationContext.current,
    useHistoryContext: () => mockHistoryContext.current,
}));

/**
 * Creates the history context shape consumed by the drawer component.
 * @returns {Object} A controllable history context value.
 */
function createHistoryContext() {
    return {
        activeChatId: "first",
        handleCloseHistory: vi.fn(),
        handleDeleteChats: vi.fn().mockResolvedValue(true),
        handleLoadHistory: vi.fn(),
        handleRetentionChange: vi.fn(),
        history: [
            { id: "first", title: "First chat", updatedAt: 1 },
            { id: "second", title: "Second chat", updatedAt: 2 },
        ],
        historyError: "",
        historyNotice: "",
        isHistoryDeleting: false,
        isHistoryLoading: false,
        isHistoryOpen: true,
        retentionDays: 30,
    };
}

beforeEach(() => {
    mockHistoryContext.current = createHistoryContext();
    mockConversationContext.current = { isStreaming: false };
});

afterEach(() => {
    cleanup();
});

describe("HistorySidebar", () => {
    it("selects all chats and deletes the selection without opening a confirmation dialog", async () => {
        const user = userEvent.setup();
        render(<HistorySidebar />);

        await user.click(screen.getByLabelText("Select all saved chats"));

        expect(screen.getByRole("button", { name: "Delete 2 chats" })).toBeEnabled();
        expect(screen.getByLabelText("Select First chat")).toBeChecked();
        expect(screen.getByLabelText("Select Second chat")).toBeChecked();

        await user.click(screen.getByRole("button", { name: "Delete 2 chats" }));

        expect(mockHistoryContext.current.handleDeleteChats).toHaveBeenCalledWith(["first", "second"]);
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(mockHistoryContext.current.handleLoadHistory).not.toHaveBeenCalled();
    });

    it("uses an indeterminate select-all checkbox for a partial selection", async () => {
        const user = userEvent.setup();
        render(<HistorySidebar />);

        await user.click(screen.getByLabelText("Select First chat"));

        expect(screen.getByLabelText("Select all saved chats").indeterminate).toBe(true);
        expect(screen.getByRole("button", { name: "Delete 1 chat" })).toBeEnabled();
    });
});
