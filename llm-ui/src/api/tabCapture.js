function isCapturableTab(tab) {
    return Boolean(tab?.id) && !tab.discarded && /^https?:\/\//.test(tab.url || "");
}

function extractRenderedText() {
    return document.body?.innerText || document.documentElement?.innerText || "";
}

export async function listBrowserTabs() {
    if (!globalThis.chrome?.tabs?.query) {
        return [];
    }

    const tabs = await chrome.tabs.query({});
    return tabs.map((tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title || "Untitled tab",
        url: tab.url || "",
        favIconUrl: tab.favIconUrl || "",
        available: isCapturableTab(tab),
        unavailableReason: tab.discarded
            ? "This tab is discarded and must be opened first."
            : !/^https?:\/\//.test(tab.url || "")
                ? "Chrome cannot read this type of page."
                : "",
    }));
}

export async function captureBrowserTab(tab) {
    if (!tab.available) {
        throw new Error(tab.unavailableReason || "This tab cannot be attached.");
    }

    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractRenderedText,
        });
        const content = results?.[0]?.result || "";
        return { id: tab.id, title: tab.title, url: tab.url, content };
    } catch (error) {
        throw new Error(error?.message || "Chrome could not read this page.");
    }
}
