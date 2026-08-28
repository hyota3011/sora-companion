/**
 * Creates an identifier for a chat record or message.
 * @returns {string} A locally unique identifier.
 */
export function createChatId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Finds the last assistant message in a conversation.
 * @param {Array<Object>} messages - The conversation messages to inspect.
 * @returns {number} The assistant message index, or -1 when absent.
 */
export function findLastAssistantIndex(messages) {
    return messages.map((message) => message.sender).lastIndexOf("assistant");
}

/**
 * Finds the last user message before a given message index.
 * @param {Array<Object>} messages - The conversation messages to inspect.
 * @param {number} beforeIndex - The exclusive ending index for the search.
 * @returns {number} The user message index, or -1 when absent.
 */
export function findLastUserIndexBefore(messages, beforeIndex) {
    return messages.slice(0, beforeIndex).map((message) => message.sender).lastIndexOf("user");
}

/**
 * Appends captured browser-tab details to a user message's provider-bound text.
 * @param {string} text - The user-entered message text.
 * @param {Array<Object>} tabs - Captured browser tabs attached to the message.
 * @returns {string} The text prepared with any captured tab context.
 */
export function withTabContext(text, tabs = []) {
    if (!tabs.length) return text;
    const pageContext = tabs.map((tab) => `Page title: ${tab.title}\nPage URL: ${tab.url}\nPage content:\n${tab.content}`).join("\n\n---\n\n");
    return `${text}${text ? "\n\n" : ""}Attached browser tabs:\n${pageContext}`;
}

/**
 * Builds the fallback title for a chat that has no user-entered text.
 * @param {number} createdAt - The chat creation timestamp.
 * @returns {string} A timestamp-based chat title.
 */
export function getFallbackChatTitle(createdAt) {
    return `Chat · ${new Date(createdAt).toLocaleString()}`;
}

/**
 * Derives a persisted chat title from its latest user message.
 * @param {Array<Object>} messages - The committed conversation messages.
 * @param {string} previousTitle - The most recently persisted title.
 * @param {number} createdAt - The chat creation timestamp.
 * @returns {string} A concise chat title.
 */
export function getChatTitle(messages, previousTitle, createdAt) {
    const latestUserMessage = [...messages].reverse().find((message) => message.sender === "user");
    if (!latestUserMessage) return previousTitle || getFallbackChatTitle(createdAt);
    const text = (latestUserMessage.text || "").replace(/\s+/g, " ").trim();
    if (!text) return getFallbackChatTitle(createdAt);
    return text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text;
}

/**
 * Removes non-persisted image data from committed messages before saving history.
 * @param {Array<Object>} messages - The committed messages to serialize.
 * @returns {Array<Object>} The history-safe message records.
 */
export function serializeMessages(messages) {
    return messages.map(({ id, text, sender, isError, feedback, tabs }) => ({
        id,
        text: text || "",
        sender,
        ...(isError ? { isError: true } : {}),
        ...(feedback !== undefined ? { feedback } : {}),
        ...(tabs?.length ? { tabs } : {}),
    }));
}

/**
 * Builds provider-neutral request messages from the current conversation state.
 * @param {Array<Object>} sourceMessages - The committed conversation messages to include.
 * @param {Object} options - The request-context options.
 * @param {Object|null} options.activeProfile - The selected provider profile.
 * @param {string|null} options.compactMemory - The compacted conversation summary.
 * @param {string} options.userPreference - The saved global preference text.
 * @param {boolean} options.isPreferenceIncognitoEnabled - Whether preferences are omitted from requests.
 * @returns {Array<Object>} Context-window-limited messages ready for provider formatting.
 */
export function buildApiMessages(sourceMessages, {
    activeProfile,
    compactMemory,
    userPreference,
    isPreferenceIncognitoEnabled,
}) {
    const contextLimit = activeProfile?.contextMessageCount || 20;
    const mapped = sourceMessages.slice(-contextLimit).map((message) => ({
        role: message.sender === "user" ? "user" : "assistant",
        content: withTabContext(message.text, message.tabs),
        images: message.images || [],
    }));
    const normalizedPreference = userPreference.trim();
    const systemContext = [
        compactMemory ? `Previous conversation summary:\n${compactMemory}` : "",
        !isPreferenceIncognitoEnabled && normalizedPreference ? `User preferences and instructions:\n${normalizedPreference}` : "",
    ].filter(Boolean).join("\n\n");

    return systemContext
        ? [{ role: "system", content: systemContext, images: [] }, ...mapped]
        : mapped;
}
