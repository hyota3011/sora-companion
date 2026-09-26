/**
 * Reads the rendered text of the page the capture script is injected into.
 * @returns {string} The page's visible text.
 */
function extractRenderedText() {
    return document.body?.innerText || document.documentElement?.innerText || "";
}

/**
 * Explains why a browser tab cannot be captured.
 * @param {Object} tab - A Chrome tab object.
 * @returns {{ available: boolean, reason: string }} Capture availability.
 */
function getTabAvailability(tab) {
    if (!tab?.id) {
        return { available: false, reason: "Invalid browser tab." };
    }

    if (tab.discarded) {
        return { available: false, reason: "This tab is discarded and must be opened first." };
    }

    const url = tab.url || "";

    if (url.startsWith("chrome://")) {
        return { available: false, reason: "Chrome internal pages cannot be read by extensions." };
    }

    if (url.startsWith("chrome-extension://")) {
        return { available: false, reason: "Extension pages cannot be captured." };
    }

    if (url.startsWith("https://chrome.google.com/webstore") || url.startsWith("https://chromewebstore.google.com")) {
        return { available: false, reason: "Chrome cannot read this type of page." };
    }

    if (!/^https?:\/\//.test(url)) {
        return { available: false, reason: "This page type is not supported." };
    }

    return { available: true, reason: "" };
}

/**
 * Maps a Chrome tab into the picker row shape.
 * @param {chrome.tabs.Tab} tab - A Chrome tab object.
 * @returns {Object} A picker row.
 */
function toListedTab(tab) {
    const availability = getTabAvailability(tab);
    return {
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title || "Untitled tab",
        url: tab.url || "",
        available: availability.available,
        unavailableReason: availability.reason,
    };
}

/**
 * Lists every open browser tab for the picker.
 * @returns {Promise<Array<Object>>} Picker rows, or an empty list outside the extension.
 */
export async function listBrowserTabs() {
    if (!globalThis.chrome?.tabs?.query) {
        return [];
    }

    const tabs = await chrome.tabs.query({});
    return tabs.map(toListedTab);
}

/**
 * Captures one selected tab's rendered text.
 * @param {Object} tab - A listed tab with `id`, `title`, and `url`.
 * @returns {Promise<{ id: number, title: string, url: string, content: string }>} The captured tab.
 */
export async function captureBrowserTab(tab) {
    const availability = getTabAvailability(tab);
    if (!availability.available) {
        throw new Error(availability.reason || "This tab cannot be captured.");
    }

    if (!globalThis.chrome?.scripting?.executeScript) {
        throw new Error("Unable to capture browser tabs. Open this app from Chrome's extension toolbar.");
    }

    const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractRenderedText,
    });
    const content = result?.result;
    if (typeof content !== "string") {
        throw new Error("This tab could not be read.");
    }

    return {
        id: tab.id,
        title: tab.title || "Untitled tab",
        url: tab.url || "",
        content,
    };
}
