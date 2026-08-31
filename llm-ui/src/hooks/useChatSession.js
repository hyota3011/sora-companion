import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    const activeRequestRef = useRef(null);
    const requestIdRef = useRef(0);
    const sessionGenerationRef = useRef(0);

    /**
     * Checks whether a request still belongs to the visible conversation.
     * @param {Object} request - The request token created for a stream.
     * @returns {boolean} Whether the request may update session state.
     */
    const isRequestCurrent = useCallback((request) => (
        activeRequestRef.current?.id === request.id
        && request.sessionGeneration === sessionGenerationRef.current
        && !request.controller.signal.aborted
    ), []);

    /**
     * Marks a request as finished only when it is still the active request.
     * @param {Object} request - The request token to finish.
     * @returns {void}
     */
    const finishRequest = useCallback((request) => {
        if (activeRequestRef.current?.id !== request.id) return;
        activeRequestRef.current = null;
        setStreamingMessage(null);
        setIsStreaming(false);
    }, []);

    /**
     * Cancels the active request and invalidates any late stream results.
     * @param {boolean} [updateUi=true] - Whether to clear streaming UI state.
     * @returns {boolean} Whether a request was cancelled.
     */
    const cancelActiveRequest = useCallback((updateUi = true) => {
        sessionGenerationRef.current += 1;
        const request = activeRequestRef.current;
        activeRequestRef.current = null;
        request?.controller.abort();

        if (updateUi) {
            setStreamingMessage(null);
            setIsStreaming(false);
        }
        return Boolean(request);
    }, []);

    /**
     * Creates the sole active request and snapshots its provider selection.
     * @returns {Object|null} A request token, or null when another request is active.
     */
    const beginRequest = useCallback(() => {
        if (activeRequestRef.current) return null;
        const request = {
            id: ++requestIdRef.current,
            sessionGeneration: sessionGenerationRef.current,
            controller: new AbortController(),
            profile: activeProfile,
            model: choosenModelRef.current.val,
        };
        activeRequestRef.current = request;
        setIsStreaming(true);
        setStreamingMessage({ text: "...thinking", sender: "assistant", isStreaming: true });
        return request;
    }, [activeProfile]);

    useEffect(() => () => {
        cancelActiveRequest(false);
    }, [cancelActiveRequest]);

    /**
     * Streams an assistant response and commits its completed or failed message.
     * @param {Array<Object>} apiMessages - Provider-neutral messages prepared for the selected provider.
     * @param {Object} request - The active request token.
     * @returns {Promise<void>} Resolves once streaming has ended.
     */
    const streamAssistantResponse = useCallback(async (apiMessages, request) => {
        try {
            let accumulated = "";
            for await (const delta of streamChat(apiMessages, request.model, request.profile, { signal: request.controller.signal })) {
                if (!isRequestCurrent(request)) return;
                accumulated += delta;
                setStreamingMessage({ text: accumulated, sender: "assistant", isStreaming: true });
            }
            if (!isRequestCurrent(request)) return;
            setMessages((previous) => [...previous, { id: createChatId(), text: accumulated, sender: "assistant", isStreaming: false, feedback: null }]);
            setStreamingMessage(null);
        } catch (error) {
            if (!isRequestCurrent(request) || request.controller.signal.aborted || error?.name === "AbortError") return;
            console.error("Streaming error:", error);
            const text = error.message === "Failed to fetch" ? "Invalid API Key or Network error" : error.message;
            setMessages((previous) => [...previous, { id: createChatId(), text, sender: "assistant", isError: true, feedback: null }]);
            setStreamingMessage(null);
        } finally {
            finishRequest(request);
        }
    }, [finishRequest, isRequestCurrent]);

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
     * @returns {Promise<void>|undefined} The request promise when compaction starts.
     */
    const handleCompact = useCallback(() => {
        if (isStreaming || messages.length === 0) return undefined;
        const request = beginRequest();
        if (!request) return undefined;
        const compactApiMessages = [
            ...messages.map((message) => ({ role: message.sender === "user" ? "user" : "assistant", content: message.text, images: message.images || [] })),
            { role: "user", content: COMPACT_PROMPT, images: [] },
        ];
        return (async () => {
            try {
                let summary = "";
                for await (const delta of streamChat(compactApiMessages, request.model, request.profile, { signal: request.controller.signal })) {
                    if (!isRequestCurrent(request)) return;
                    summary += delta;
                    setStreamingMessage({ text: summary, sender: "assistant", isStreaming: true });
                }
                if (!isRequestCurrent(request)) return;
                setStreamingMessage(null);
                setCompactMemory(summary);
                setMessages([]);
            } catch (error) {
                if (!isRequestCurrent(request) || request.controller.signal.aborted || error?.name === "AbortError") return;
                console.error("Compact error:", error);
                const text = error.message === "Failed to fetch" ? "Invalid API Key or Network error" : error.message;
                setMessages((previous) => [...previous, { id: createChatId(), text, sender: "assistant", isError: true, feedback: null }]);
                setStreamingMessage(null);
            } finally {
                finishRequest(request);
            }
        })();
    }, [beginRequest, finishRequest, isRequestCurrent, isStreaming, messages]);

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
        const request = beginRequest();
        if (!request) return null;
        if (!activeChatId) {
            const createdAt = Date.now();
            chatMetaRef.current = { createdAt, title: "" };
            setActiveChatId(createChatId());
        }
        if (isFirstMessage) setIsFirstMessage(false);
        const newUserMessage = { id: createChatId(), text, sender: "user", images, tabs };
        setMessages((previous) => [...previous, newUserMessage]);
        return streamAssistantResponse(buildApiMessages([...messages, newUserMessage], {
            activeProfile: request.profile,
            compactMemory,
            userPreference,
            isPreferenceIncognitoEnabled,
        }), request);
    }, [activeChatId, beginRequest, compactMemory, isFirstMessage, isPreferenceIncognitoEnabled, isPreferenceLoading, isStreaming, messages, streamAssistantResponse, userPreference]);

    /**
     * Regenerates the latest assistant response from the preceding conversation context.
     * @returns {Promise<void>|undefined} The request promise when regeneration starts.
     */
    const handleRefreshLastResponse = useCallback(() => {
        if (isStreaming || isPreferenceLoading) return undefined;
        const lastAssistantIndex = findLastAssistantIndex(messages);
        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastAssistantIndex === -1 || lastUserIndex === -1) return undefined;
        const request = beginRequest();
        if (!request) return undefined;
        const sourceMessages = messages.slice(0, lastAssistantIndex);
        setMessages(sourceMessages);
        return streamAssistantResponse(buildApiMessages(sourceMessages, {
            activeProfile: request.profile,
            compactMemory,
            userPreference,
            isPreferenceIncognitoEnabled,
        }), request);
    }, [beginRequest, compactMemory, isPreferenceIncognitoEnabled, isPreferenceLoading, isStreaming, messages, streamAssistantResponse, userPreference]);

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
     * Cancels any stream and clears the active conversation without changing settings.
     * @returns {void}
     */
    const resetSession = useCallback(() => {
        cancelActiveRequest();
        setMessages([]);
        setIsFirstMessage(true);
        setCompactMemory(null);
        setActiveChatId(null);
        chatMetaRef.current = null;
    }, [cancelActiveRequest]);

    /**
     * Cancels any stream and restores a persisted chat into the active session.
     * @param {Object} chat - The persisted chat record to restore.
     * @returns {void}
     */
    const restoreSession = useCallback((chat) => {
        cancelActiveRequest();
        chatMetaRef.current = { createdAt: chat.createdAt, title: chat.title };
        setActiveChatId(chat.id);
        setMessages(Array.isArray(chat.messages) ? chat.messages : []);
        setCompactMemory(chat.compactMemory || null);
        setIsFirstMessage(!(chat.messages?.length || chat.compactMemory));
    }, [cancelActiveRequest]);

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
        restoreSession,
    }), [activeChatId, activeProfile, compactMemory, handleCompact, handleEditLastUserMessage, handleProfileChange, handleRefreshLastResponse, isFirstMessage, isStreaming, messages, resetSession, restoreSession, sendMessage, streamingMessage]);
}
