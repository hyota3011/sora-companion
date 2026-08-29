import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChat, saveChat } from "../storage/chatHistory.js";
import { useChatHistory } from "./useChatHistory.js";

const CHAT_HISTORY_DATABASE_NAME = "sora-chat-history";

/**
 * Removes the test database so each hook test starts with no saved chats.
 * @returns {Promise<void>} Resolves after IndexedDB finishes deleting the database.
 */
function resetChatHistoryDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(CHAT_HISTORY_DATABASE_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

beforeEach(async () => {
    await resetChatHistoryDatabase();
});

afterEach(async () => {
    await resetChatHistoryDatabase();
});

describe("useChatHistory deletion", () => {
    it("deletes the active record without recreating it and detaches the session", async () => {
        const activeChat = {
            id: "active-chat",
            title: "Active chat",
            messages: [],
            compactMemory: null,
            createdAt: 1,
            updatedAt: 1,
        };
        const chatMetaRef = { current: { createdAt: 1, title: "Active chat" } };
        const detachActiveChat = vi.fn();
        await saveChat(activeChat);

        const { result, unmount } = renderHook(() => useChatHistory({
            activeChatId: "active-chat",
            messages: [{ id: "message", text: "Keep this visible", sender: "user" }],
            compactMemory: null,
            chatMetaRef,
            isStreaming: false,
            restoreChat: vi.fn(),
            detachActiveChat,
        }));

        await waitFor(() => expect(result.current.isHistoryLoading).toBe(false));

        let didDelete;
        await act(async () => {
            didDelete = await result.current.handleDeleteChats(["active-chat"]);
        });

        expect(didDelete).toBe(true);
        expect(detachActiveChat).toHaveBeenCalledOnce();
        expect(await getChat("active-chat")).toBeNull();

        await new Promise((resolve) => window.setTimeout(resolve, 300));
        expect(await getChat("active-chat")).toBeNull();
        unmount();
    });
});
