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

export async function captureBrowserTab() {
    if (!globalThis.chrome?.tabs?.query) {
        return [];
    }

    const tabs = await chrome.tabs.query({});

    return tabs.map((tab) => {
        const availability = getTabAvailability(tab);

        return {
            id: tab.id,
            windowId: tab.windowId,
            title: tab.title || "Untitled tab",
            url: tab.url || "",
            favIconUrl: tab.favIconUrl || "",
            available: availability.available,
            unavailableReason: availability.reason,
        };
    });
}

function getTabAvailability(tab) {
    if (!tab?.id) {
        return {
            available: false,
            reason: "Invalid browser tab."
        };
    }

    if (tab.discarded) {
        return {
            available: false,
            reason: "This tab is discarded and must be opened first."
        };
    }

    const url = tab.url || "";

    if (url.startsWith("chrome://")) {
        return {
            available: false,
            reason: "Chrome internal pages cannot be read by extensions."
        };
    }

    if (url.startsWith("chrome-extension://")) {
        return {
            available: false,
            reason: "Extension pages cannot be captured."
        };
    }

    if (!/^https?:\/\//.test(url)) {
        return {
            available: false,
            reason: "This page type is not supported."
        };
    }

    return {
        available: true,
        reason: ""
    };
}