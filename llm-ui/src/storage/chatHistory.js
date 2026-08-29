const DB_NAME = "sora-chat-history";
const DB_VERSION = 1;
const CHATS_STORE = "chats";
const SETTINGS_STORE = "settings";
const RETENTION_KEY = "retentionDays";
const USER_PREFERENCE_KEY = "userPreference";
const PREFERENCE_INCOGNITO_KEY = "preferenceIncognitoEnabled";

export const RETENTION_OPTIONS = [
    { value: 7, label: "7 days" },
    { value: 30, label: "30 days" },
    { value: 90, label: "90 days" },
    { value: null, label: "Never" },
];

function getDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error || new Error("Unable to open chat history"));
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CHATS_STORE)) {
                const chats = db.createObjectStore(CHATS_STORE, { keyPath: "id" });
                chats.createIndex("updatedAt", "updatedAt");
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

async function runTransaction(storeName, mode, operation) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;

        transaction.onerror = () => reject(transaction.error || new Error("Unable to update chat history"));
        transaction.onabort = () => reject(transaction.error || new Error("Chat history update was cancelled"));
        transaction.oncomplete = () => resolve(result);

        try {
            result = operation(store);
        } catch (error) {
            transaction.abort();
            reject(error);
        }
    }).finally(() => db.close());
}

export async function listChats() {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHATS_STORE, "readonly");
        const index = transaction.objectStore(CHATS_STORE).index("updatedAt");
        const chats = [];
        const request = index.openCursor(null, "prev");

        request.onerror = () => reject(request.error || new Error("Unable to read chat history"));
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                chats.push(cursor.value);
                cursor.continue();
            }
        };
        transaction.onerror = () => reject(transaction.error || new Error("Unable to read chat history"));
        transaction.oncomplete = () => resolve(chats);
    }).finally(() => db.close());
}

export async function getChat(id) {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(CHATS_STORE, "readonly").objectStore(CHATS_STORE).get(id);
        request.onerror = () => reject(request.error || new Error("Unable to load this chat"));
        request.onsuccess = () => resolve(request.result || null);
    }).finally(() => db.close());
}

export function saveChat(chat) {
    return runTransaction(CHATS_STORE, "readwrite", (store) => store.put(chat));
}

/**
 * Removes duplicate or invalid identifiers before a bulk history operation.
 * @param {Array<unknown>} chatIds - Candidate saved-chat identifiers.
 * @returns {Array<string>} Unique non-empty chat identifiers.
 */
function normalizeChatIds(chatIds) {
    return [...new Set((chatIds || []).filter((chatId) => (
        typeof chatId === "string" && chatId.length > 0
    )))];
}

/**
 * Deletes saved chat records in one IndexedDB transaction.
 * @param {Array<string>} chatIds - Saved-chat identifiers to delete.
 * @returns {Promise<void>} Resolves after the deletion transaction commits.
 */
export async function deleteChats(chatIds) {
    const normalizedChatIds = normalizeChatIds(chatIds);
    if (!normalizedChatIds.length) return;

    await runTransaction(CHATS_STORE, "readwrite", (store) => {
        normalizedChatIds.forEach((chatId) => store.delete(chatId));
    });
}

export async function getRetentionDays() {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(RETENTION_KEY);
        request.onerror = () => reject(request.error || new Error("Unable to read history settings"));
        request.onsuccess = () => resolve(request.result?.value ?? 30);
    }).finally(() => db.close());
}

export function saveRetentionDays(value) {
    return runTransaction(SETTINGS_STORE, "readwrite", (store) => store.put({ key: RETENTION_KEY, value }));
}

/**
 * Reads the global instructions and preferences applied to assistant requests.
 * @returns {Promise<string>} The saved preference text, or an empty string when none exists.
 */
export async function getUserPreference() {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(USER_PREFERENCE_KEY);
        request.onerror = () => reject(request.error || new Error("Unable to read user preferences"));
        request.onsuccess = () => resolve(typeof request.result?.value === "string" ? request.result.value : "");
    }).finally(() => db.close());
}

/**
 * Persists the global instructions and preferences applied to assistant requests.
 * @param {string} value - The normalized preference text to save.
 * @returns {Promise<void>} A promise that resolves after the preference is stored.
 */
export async function saveUserPreference(value) {
    await runTransaction(SETTINGS_STORE, "readwrite", (store) => store.put({ key: USER_PREFERENCE_KEY, value }));
}

/**
 * Reads whether saved preferences should be omitted from provider requests.
 * @returns {Promise<boolean>} Whether preference Incognito mode is enabled.
 */
export async function getPreferenceIncognitoEnabled() {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(PREFERENCE_INCOGNITO_KEY);
        request.onerror = () => reject(request.error || new Error("Unable to read preference Incognito setting"));
        request.onsuccess = () => resolve(request.result?.value === true);
    }).finally(() => db.close());
}

/**
 * Persists whether saved preferences should be omitted from provider requests.
 * @param {boolean} value - Whether preference Incognito mode is enabled.
 * @returns {Promise<void>} A promise that resolves after the setting is stored.
 */
export async function savePreferenceIncognitoEnabled(value) {
    await runTransaction(SETTINGS_STORE, "readwrite", (store) => store.put({ key: PREFERENCE_INCOGNITO_KEY, value: Boolean(value) }));
}

export async function deleteExpiredChats(retentionDays) {
    if (retentionDays === null) return 0;

    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHATS_STORE, "readwrite");
        const index = transaction.objectStore(CHATS_STORE).index("updatedAt");
        const request = index.openCursor(IDBKeyRange.upperBound(cutoff, true));
        let deleted = 0;

        request.onerror = () => reject(request.error || new Error("Unable to remove expired chats"));
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            cursor.delete();
            deleted += 1;
            cursor.continue();
        };
        transaction.onerror = () => reject(transaction.error || new Error("Unable to remove expired chats"));
        transaction.oncomplete = () => resolve(deleted);
    }).finally(() => db.close());
}
