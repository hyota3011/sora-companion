import { useCallback, useMemo, useRef, useState } from "react";
import { streamChat } from "../api/index.js";
import { getDefaultModel } from "../config/models.jsx";
import { defaultProfiles, getActiveProfile } from "../config/profiles.js";
import {
    buildApiMessages,
    createChatId,
    findLastAssistantIndex,
    findLastUserIndexBefore,
} from "../utils/chatMessages.js";

const COMPACT_PROMPT = "Please provide a concise summary of the above conversation. Focus on key decisions, facts, and context that would be needed to continue the conversation. Be brief and factual.";

/**
 * Manages the active conversation, provider selection, and streamed model requests.
 * @param {Object} options - Settings and callbacks required to run requests.
 * @param {string} options.userPreference - The committed global preference text.
 * @param {boolean} options.isPreferenceIncognitoEnabled - Whether preferences are omitted from requests.
 * @param {boolean} options.isPreferenceLoading - Whether request settings are still loading.
 * @param {(message: Object) => void} options.restoreComposerMessage - Restores a user message for editing.
 * @returns {Object} Conversation state, request actions, and internal persistence controls.
 */
export function useChatSession({
    userPreference,
    isPreferenceIncognitoEnabled,
    isPreferenceLoading,
    restoreComposerMessage,
}) {
    const [messages, setMessages] = useState([]);
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [activeProfile, setActiveProfile] = useState(getActiveProfile());
    const [compactMemory, setCompactMemory] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const choosenModelRef = useRef(getDefaultModel());
    const messagesEndRef = useRef(null);
    const chatMetaRef = useRef(null);

    /**
     * Streams an assistant response and commits its completed or failed message.
     * @param {Array<Object>} apiMessages - Provider-neutral messages prepared for the selected provider.
     * @returns {Promise<void>} Resolves once streaming has ended.
     */
    const streamAssistantResponse = useCallback(async (apiMessages) => {
        setStreamingMessage({ text: "...thinking", sender: "assistant", isStreaming: true });
        try {
            let accumulated = "";
            for await (const delta of streamChat(apiMessages, choosenModelRef.current.val, activeProfile)) {
                accumulated += delta;
                setStreamingMessage({ text: accumulated, sender: "assistant", isStreaming: true });
            }
            setMessages((previous) => [...previous, { id: createChatId(), text: accumulated, sender: "assistant", isStreaming: false, feedback: null }]);
            setStreamingMessage(null);
        } catch (error) {
            console.error("Streaming error:", error);
            const text = error.message === "Failed to fetch" ? "Invalid API Key or Network error" : error.message;
            setMessages((previous) => [...previous, { id: createChatId(), text, sender: "assistant", isError: true, feedback: null }]);
            setStreamingMessage(null);
        } finally {
            setIsStreaming(false);
        }
    }, [activeProfile]);

    /**
     * Switches to a configured provider profile and resets its selected model.
     * @param {string} profileId - The provider profile identifier to select.
     * @returns {void}
     */
    const handleProfileChange = useCallback((profileId) => {
        const newProfile = defaultProfiles.find((profile) => profile.id === profileId);
        if (!newProfile) return;
        setActiveProfile(newProfile);
        localStorage.setItem("activeProfileId", profileId);
        choosenModelRef.current = getDefaultModel();
    }, []);

    /**
     * Runs the full-history compaction request without applying global preferences.
     * @returns {Promise<void>} Resolves once compaction has completed or failed.
     */
    const handleCompact = useCallback(async () => {
        if (isStreaming || messages.length === 0) return;
        setIsStreaming(true);
        setStreamingMessage({ text: "...thinking", sender: "assistant", isStreaming: true });
        const compactApiMessages = [
            ...messages.map((message) => ({ role: message.sender === "user" ? "user" : "assistant", content: message.text, images: message.images || [] })),
            { role: "user", content: COMPACT_PROMPT, images: [] },
        ];
        try {
            let summary = "";
            for await (const delta of streamChat(compactApiMessages, choosenModelRef.current.val, activeProfile)) {
                summary += delta;
                setStreamingMessage({ text: summary, sender: "assistant", isStreaming: true });
            }
            setStreamingMessage(null);
            setCompactMemory(summary);
            setMessages([]);
        } catch (error) {
            console.error("Compact error:", error);
            const text = error.message === "Failed to fetch" ? "Invalid API Key or Network error" : error.message;
            setMessages((previous) => [...previous, { id: createChatId(), text, sender: "assistant", isError: true, feedback: null }]);
            setStreamingMessage(null);
        } finally {
            setIsStreaming(false);
        }
    }, [activeProfile, isStreaming, messages]);

    /**
     * Starts a normal assistant request using a composer snapshot.
     * @param {Object} message - The normalized composer content to send.
     * @param {string} message.text - The trimmed user text.
     * @param {Array<Object>} message.images - The pending image attachments.
     * @param {Array<Object>} message.tabs - The pending browser-tab attachments.
     * @returns {Promise<void>|null} The request promise, or null when no request is started.
     */
    const sendMessage = useCallback((message) => {
        const { text, images, tabs } = message;
        if ((!text && images.length === 0 && tabs.length === 0) || isStreaming || isPreferenceLoading) return null;
        if (!activeChatId) {
            const createdAt = Date.now();
            chatMetaRef.current = { createdAt, title: "" };
            setActiveChatId(createChatId());
        }
        if (isFirstMessage) setIsFirstMessage(false);
        const newUserMessage = { id: createChatId(), text, sender: "user", images, tabs };
        setMessages((previous) => [...previous, newUserMessage]);
        setIsStreaming(true);
        return streamAssistantResponse(buildApiMessages([...messages, newUserMessage], {
            activeProfile,
            compactMemory,
            userPreference,
            isPreferenceIncognitoEnabled,
        }));
    }, [activeChatId, activeProfile, compactMemory, isFirstMessage, isPreferenceIncognitoEnabled, isPreferenceLoading, isStreaming, messages, streamAssistantResponse, userPreference]);

    /**
     * Regenerates the latest assistant response from the preceding conversation context.
     * @returns {Promise<void>|undefined} The request promise when regeneration starts.
     */
    const handleRefreshLastResponse = useCallback(() => {
        if (isStreaming || isPreferenceLoading) return undefined;
        const lastAssistantIndex = findLastAssistantIndex(messages);
        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastAssistantIndex === -1 || lastUserIndex === -1) return undefined;
        const sourceMessages = messages.slice(0, lastAssistantIndex);
        setMessages(sourceMessages);
        setIsStreaming(true);
        return streamAssistantResponse(buildApiMessages(sourceMessages, {
            activeProfile,
            compactMemory,
            userPreference,
            isPreferenceIncognitoEnabled,
        }));
    }, [activeProfile, compactMemory, isPreferenceIncognitoEnabled, isPreferenceLoading, isStreaming, messages, streamAssistantResponse, userPreference]);

    /**
     * Restores the latest user turn to the composer and removes it and later responses.
     * @returns {void}
     */
    const handleEditLastUserMessage = useCallback(() => {
        if (isStreaming) return;
        const lastAssistantIndex = findLastAssistantIndex(messages);
        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastAssistantIndex === -1 || lastUserIndex === -1) return;
        const lastUserMessage = messages[lastUserIndex];
        setMessages(messages.slice(0, lastUserIndex));
        restoreComposerMessage(lastUserMessage);
    }, [isStreaming, messages, restoreComposerMessage]);

    /**
     * Clears the active conversation without changing provider or preference settings.
     * @returns {void}
     */
    const resetSession = useCallback(() => {
        setMessages([]);
        setIsFirstMessage(true);
        setCompactMemory(null);
        setActiveChatId(null);
        chatMetaRef.current = null;
    }, []);

    /**
     * Keeps the current conversation visible while removing its history identity.
     * The next normal send creates a new saved-chat record for the conversation.
     * @returns {void}
     */
    const detachActiveChat = useCallback(() => {
        setActiveChatId(null);
        chatMetaRef.current = null;
    }, []);

    /**
     * Restores a persisted chat into the active conversation state.
     * @param {Object} chat - The persisted chat record to restore.
     * @returns {void}
     */
    const restoreSession = useCallback((chat) => {
        chatMetaRef.current = { createdAt: chat.createdAt, title: chat.title };
        setActiveChatId(chat.id);
        setMessages(Array.isArray(chat.messages) ? chat.messages : []);
        setCompactMemory(chat.compactMemory || null);
        setIsFirstMessage(!(chat.messages?.length || chat.compactMemory));
    }, []);

    return useMemo(() => ({
        messages,
        isFirstMessage,
        isStreaming,
        streamingMessage,
        activeProfile,
        compactMemory,
        choosenModelRef,
        messagesEndRef,
        activeChatId,
        chatMetaRef,
        handleProfileChange,
        handleCompact,
        sendMessage,
        handleRefreshLastResponse,
        handleEditLastUserMessage,
        resetSession,
        detachActiveChat,
        restoreSession,
    }), [activeChatId, activeProfile, compactMemory, detachActiveChat, handleCompact, handleEditLastUserMessage, handleProfileChange, handleRefreshLastResponse, isFirstMessage, isStreaming, messages, resetSession, restoreSession, sendMessage, streamingMessage]);
}
