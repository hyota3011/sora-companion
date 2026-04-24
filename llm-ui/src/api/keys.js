/**
 * Retrieves the API key for a specific profile from local storage.
 * 
 * @param {string} profileId - The unique identifier for the profile.
 * @returns {Promise<string|null>} A promise that resolves to the API key or null if not found.
 */
export function getApiKey(profileId) {
    const storageKey = `apiKey_${profileId}`;

    return new Promise((resolve, reject) => {
        chrome.storage.local.get([storageKey], (result) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(result[storageKey] || null);
        });
    });
}

/**
 * Saves the API key for a specific profile to local storage.
 * 
 * @param {string} profileId - The unique identifier for the profile.
 * @param {string} apiKey - The API key to store.
 * @returns {Promise<void>} A promise that resolves when the key is successfully saved.
 */
export function saveApiKey(profileId, apiKey) {
    const storageKey = `apiKey_${profileId}`;

    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [storageKey]: apiKey }, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}

/**
 * Removes the API key for a specific profile from local storage.
 * 
 * @param {string} profileId - The unique identifier for the profile.
 * @returns {Promise<void>} A promise that resolves when the key is successfully removed.
 */
export function deleteApiKey(profileId) {
    const storageKey = `apiKey_${profileId}`;

    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(storageKey, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}
