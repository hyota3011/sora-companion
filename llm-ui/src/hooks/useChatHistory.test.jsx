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
    it("deletes the active record without recreating it and clears the active session", async () => {
        const activeChat = {
            id: "active-chat",
            title: "Active chat",
            messages: [],
            compactMemory: null,
            createdAt: 1,
            updatedAt: 1,
        };
        const chatMetaRef = { current: { createdAt: 1, title: "Active chat" } };
        const clearActiveChat = vi.fn();
        await saveChat(activeChat);

        const { result, unmount } = renderHook(() => useChatHistory({
            activeChatId: "active-chat",
            messages: [{ id: "message", text: "Keep this visible", sender: "user" }],
            compactMemory: null,
            chatMetaRef,
            isStreaming: false,
            restoreChat: vi.fn(),
            clearActiveChat,
        }));

        await waitFor(() => expect(result.current.isHistoryLoading).toBe(false));

        let didDelete;
        await act(async () => {
            didDelete = await result.current.handleDeleteChats(["active-chat"]);
        });

        expect(didDelete).toBe(true);
        expect(clearActiveChat).toHaveBeenCalledOnce();
        expect(await getChat("active-chat")).toBeNull();

        await new Promise((resolve) => window.setTimeout(resolve, 300));
        expect(await getChat("active-chat")).toBeNull();
        unmount();
    });
});

describe("useChatHistory while preference Incognito is enabled", () => {
    /**
     * Renders history persistence with Incognito writes suppressed.
     * @param {Object} options - Hook option overrides.
     * @returns {import("@testing-library/react").RenderHookResult} The rendered hook.
     */
    function renderIncognitoHistory(options = {}) {
        return renderHook(() => useChatHistory({
            activeChatId: "incognito-chat",
            messages: [{ id: "message", text: "Private turn", sender: "user" }],
            compactMemory: null,
            chatMetaRef: { current: { createdAt: 1, title: "" } },
            isStreaming: false,
            isPreferenceIncognitoEnabled: true,
            isPreferenceLoading: false,
            restoreChat: vi.fn(),
            clearActiveChat: vi.fn(),
            ...options,
        }));
    }

    it("does not autosave the active chat or rewrite a loaded chat", async () => {
        const savedChat = {
            id: "saved-chat",
            title: "Saved chat",
            messages: [{ id: "saved-message", text: "Earlier turn", sender: "user" }],
            compactMemory: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await saveChat(savedChat);
        const restoreChat = vi.fn();
        const { result, unmount } = renderIncognitoHistory({ restoreChat });

        await waitFor(() => expect(result.current.isHistoryLoading).toBe(false));
        await act(async () => {
            await result.current.persistCurrentChat();
        });
        await new Promise((resolve) => window.setTimeout(resolve, 300));

        expect(await getChat("incognito-chat")).toBeNull();
        expect(await getChat("saved-chat")).toEqual(savedChat);

        await act(async () => {
            await result.current.handleLoadHistory("saved-chat");
        });

        expect(restoreChat).toHaveBeenCalledWith(savedChat);
        expect((await getChat("saved-chat")).updatedAt).toBe(savedChat.updatedAt);

        const { result: compactResult, unmount: unmountCompact } = renderIncognitoHistory({
            compactMemory: "Private summary",
            messages: [],
        });
        await waitFor(() => expect(compactResult.current.isHistoryLoading).toBe(false));
        await act(async () => {
            expect(await compactResult.current.persistCurrentChat()).toBe(false);
        });
        expect(await getChat("incognito-chat")).toBeNull();
        unmountCompact();
        unmount();
    });

    it("does not save while the Incognito setting is still loading", async () => {
        const { result, unmount } = renderIncognitoHistory({
            isPreferenceIncognitoEnabled: false,
            isPreferenceLoading: true,
        });

        await waitFor(() => expect(result.current.isHistoryLoading).toBe(false));
        await act(async () => {
            expect(await result.current.persistCurrentChat()).toBe(false);
        });
        await new Promise((resolve) => window.setTimeout(resolve, 300));

        expect(await getChat("incognito-chat")).toBeNull();
        unmount();
    });
});
