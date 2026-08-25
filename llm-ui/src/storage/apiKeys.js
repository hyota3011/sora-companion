const DATABASE_NAME = "sora-api-keys";
const DATABASE_VERSION = 1;
const API_KEYS_STORE = "apiKeys";

/**
 * Creates the generic error used when the browser cannot access API key storage.
 * @returns {Error} A non-secret-bearing storage error.
 */
function createStorageError() {
    return new Error("API key storage is unavailable.");
}

/**
 * Validates and normalizes a provider identifier before using it as an IndexedDB key.
 * @param {string} providerId - The provider identifier to normalize.
 * @returns {string} The normalized provider identifier.
 */
function normalizeProviderId(providerId) {
    const normalizedProviderId = typeof providerId === "string" ? providerId.trim() : "";
    if (!normalizedProviderId) throw new Error("A provider is required to manage an API key.");
    return normalizedProviderId;
}

/**
 * Validates and normalizes a user-entered provider API key before persistence.
 * @param {string} apiKey - The API key to normalize.
 * @returns {string} The non-empty API key.
 */
function normalizeApiKey(apiKey) {
    const normalizedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!normalizedApiKey) throw new Error("Enter a non-empty API key.");
    return normalizedApiKey;
}

/**
 * Opens the dedicated IndexedDB database used for provider API keys.
 * @returns {Promise<IDBDatabase>} The open API-key database.
 */
function openApiKeyDatabase() {
    return new Promise((resolve, reject) => {
        if (!globalThis.indexedDB) {
            reject(createStorageError());
            return;
        }

        const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onerror = () => reject(createStorageError());
        request.onblocked = () => reject(createStorageError());
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(API_KEYS_STORE)) {
                database.createObjectStore(API_KEYS_STORE, { keyPath: "providerId" });
            }
        };
        request.onsuccess = () => {
            const database = request.result;
            database.onversionchange = () => database.close();
            resolve(database);
        };
    });
}

/**
 * Reads a key record or record key from the API-key object store.
 * @param {string} providerId - The normalized provider identifier to look up.
 * @param {boolean} keysOnly - Whether to read only the record key instead of its value.
 * @returns {Promise<Object|string|undefined>} The stored record, record key, or no result.
 */
async function readApiKeyRecord(providerId, keysOnly = false) {
    const database = await openApiKeyDatabase();

    try {
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(API_KEYS_STORE, "readonly");
            const store = transaction.objectStore(API_KEYS_STORE);
            const request = keysOnly ? store.getKey(providerId) : store.get(providerId);

            request.onerror = () => reject(createStorageError());
            request.onsuccess = () => resolve(request.result);
            transaction.onerror = () => reject(createStorageError());
            transaction.onabort = () => reject(createStorageError());
        });
    } finally {
        database.close();
    }
}

/**
 * Applies a write operation to the API-key object store and waits for it to commit.
 * @param {(store: IDBObjectStore) => IDBRequest} operation - The IndexedDB write operation to run.
 * @returns {Promise<void>} Resolves after the write transaction completes.
 */
async function runApiKeyWrite(operation) {
    const database = await openApiKeyDatabase();

    try {
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(API_KEYS_STORE, "readwrite");
            const store = transaction.objectStore(API_KEYS_STORE);

            transaction.onerror = () => reject(createStorageError());
            transaction.onabort = () => reject(createStorageError());
            transaction.oncomplete = () => resolve();

            try {
                const request = operation(store);
                request.onerror = () => reject(createStorageError());
            } catch {
                transaction.abort();
                reject(createStorageError());
            }
        });
    } finally {
        database.close();
    }
}

/**
 * Retrieves the API key stored for a provider without exposing it to application state.
 * @param {string} providerId - The provider identifier whose key should be retrieved.
 * @returns {Promise<string|null>} The stored API key, or null when no valid key exists.
 */
export async function getApiKey(providerId) {
    const normalizedProviderId = normalizeProviderId(providerId);
    const record = await readApiKeyRecord(normalizedProviderId);
    const apiKey = typeof record?.apiKey === "string" ? record.apiKey.trim() : "";
    return apiKey || null;
}

/**
 * Checks whether an API key record exists without reading its secret value into UI state.
 * @param {string} providerId - The provider identifier whose key should be checked.
 * @returns {Promise<boolean>} Whether an API key record exists for the provider.
 */
export async function hasApiKey(providerId) {
    const normalizedProviderId = normalizeProviderId(providerId);
    const storedProviderId = await readApiKeyRecord(normalizedProviderId, true);
    return typeof storedProviderId === "string";
}

/**
 * Stores a trimmed non-empty API key for a provider.
 * @param {string} providerId - The provider identifier that owns the key.
 * @param {string} apiKey - The API key to persist.
 * @returns {Promise<void>} Resolves after the API key is written.
 */
export async function saveApiKey(providerId, apiKey) {
    const normalizedProviderId = normalizeProviderId(providerId);
    const normalizedApiKey = normalizeApiKey(apiKey);
    await runApiKeyWrite((store) => store.put({ providerId: normalizedProviderId, apiKey: normalizedApiKey }));
}

/**
 * Deletes the API key stored for a provider.
 * @param {string} providerId - The provider identifier whose key should be deleted.
 * @returns {Promise<void>} Resolves after the API key is removed.
 */
export async function deleteApiKey(providerId) {
    const normalizedProviderId = normalizeProviderId(providerId);
    await runApiKeyWrite((store) => store.delete(normalizedProviderId));
}
