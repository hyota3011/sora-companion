import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    deleteChats,
    getChat,
    getUserPreference,
    listChats,
    saveChat,
    saveUserPreference,
} from "./chatHistory.js";

const CHAT_HISTORY_DATABASE_NAME = "sora-chat-history";

/**
 * Removes the test database so each storage test starts with no saved chats.
 * @returns {Promise<void>} Resolves after IndexedDB finishes deleting the database.
 */
function resetChatHistoryDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(CHAT_HISTORY_DATABASE_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Creates a minimal saved-chat record for IndexedDB tests.
 * @param {string} id - The saved-chat identifier.
 * @param {number} updatedAt - The chat update time.
 * @returns {Object} A saved-chat record.
 */
function createSavedChat(id, updatedAt) {
    return {
        id,
        title: `Chat ${id}`,
        messages: [],
        compactMemory: null,
        createdAt: updatedAt - 1,
        updatedAt,
    };
}

beforeEach(async () => {
    await resetChatHistoryDatabase();
});

afterEach(async () => {
    await resetChatHistoryDatabase();
});

describe("deleteChats", () => {
    it("deletes only selected records while preserving settings", async () => {
        await saveChat(createSavedChat("first", 1));
        await saveChat(createSavedChat("second", 2));
        await saveChat(createSavedChat("third", 3));
        await saveUserPreference("Keep this setting");

        await deleteChats(["first", "second", "missing", "first"]);

        expect(await getChat("first")).toBeNull();
        expect(await getChat("second")).toBeNull();
        expect(await getChat("third")).toEqual(createSavedChat("third", 3));
        expect((await listChats()).map((chat) => chat.id)).toEqual(["third"]);
        expect(await getUserPreference()).toBe("Keep this setting");
    });

    it("treats an empty or invalid selection as a no-op", async () => {
        await saveChat(createSavedChat("kept", 1));

        await deleteChats([]);
        await deleteChats(["", null, undefined]);

        expect(await getChat("kept")).toEqual(createSavedChat("kept", 1));
    });
});
