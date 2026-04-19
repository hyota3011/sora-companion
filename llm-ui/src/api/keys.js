export function getApiKey(profileId) {
    const storageKey = `apiKey_${profileId}`;

    return new Promise((resolve, reject) => {
        chrome.storage.local.get([storageKey], (result) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(result[storageKey] || null);
        });
    });
}

export function saveApiKey(profileId, apiKey) {
    const storageKey = `apiKey_${profileId}`;

    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [storageKey]: apiKey }, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}

export function deleteApiKey(profileId) {
    const storageKey = `apiKey_${profileId}`;

    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(storageKey, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}
