import { useState, useRef, useCallback, useEffect } from "react";
import { streamChat } from "../api/index.js";
import { getDefaultModel } from "../config/models.jsx";
import { USER_PREFERENCE_MAX_LENGTH } from "../config/preferences.js";
import { defaultProfiles, getActiveProfile } from "../config/profiles.js";
import {
    deleteExpiredChats,
    getChat,
    getRetentionDays,
    getUserPreference,
    listChats,
    RETENTION_OPTIONS,
    saveChat,
    saveRetentionDays,
    saveUserPreference,
} from "../storage/chatHistory.js";

function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
        reader.readAsDataURL(file);
    });
}

function validateImageData(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Invalid image file"));
        image.src = dataUrl;
    });
}

function findLastAssistantIndex(messages) {
    return messages.map((msg) => msg.sender).lastIndexOf("assistant");
}

function findLastUserIndexBefore(messages, beforeIndex) {
    return messages.slice(0, beforeIndex).map((msg) => msg.sender).lastIndexOf("user");
}

function withTabContext(text, tabs = []) {
    if (!tabs.length) return text;
    const pageContext = tabs.map((tab) => `Page title: ${tab.title}\nPage URL: ${tab.url}\nPage content:\n${tab.content}`).join("\n\n---\n\n");
    return `${text}${text ? "\n\n" : ""}Attached browser tabs:\n${pageContext}`;
}

function fallbackTitle(createdAt) {
    return `Chat · ${new Date(createdAt).toLocaleString()}`;
}

function getChatTitle(messages, previousTitle, createdAt) {
    const latestUserMessage = [...messages].reverse().find((message) => message.sender === "user");
    if (!latestUserMessage) return previousTitle || fallbackTitle(createdAt);
    const text = (latestUserMessage.text || "").replace(/\s+/g, " ").trim();
    if (!text) return fallbackTitle(createdAt);
    return text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text;
}

/** Images are deliberately excluded from durable history. */
function serializeMessages(messages) {
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
 * Manages the active chat, global preferences, and IndexedDB-backed history.
 * @returns {Object} The chat state, shared references, and event handlers exposed through context.
 */
export function useChat() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [activeProfile, setActiveProfile] = useState(getActiveProfile());
    const [attachedImages, setAttachedImages] = useState([]);
    const [attachedTabs, setAttachedTabs] = useState([]);
    const [attachmentError, setAttachmentError] = useState("");
    const [compactMemory, setCompactMemory] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [history, setHistory] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [retentionDays, setRetentionDays] = useState(30);
    const [userPreference, setUserPreference] = useState("");
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [isPreferenceLoading, setIsPreferenceLoading] = useState(true);
    const [isPreferenceSaving, setIsPreferenceSaving] = useState(false);
    const [preferenceLoadError, setPreferenceLoadError] = useState("");
    const [preferenceError, setPreferenceError] = useState("");

    const choosenModelRef = useRef(getDefaultModel());
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const chatMetaRef = useRef(null);
    const preferenceLoadIdRef = useRef(0);

    /**
     * Loads the global user preference while ignoring results from superseded reads.
     * @returns {Promise<boolean>} Whether the preference was loaded successfully.
     */
    const loadUserPreference = useCallback(async () => {
        const loadId = preferenceLoadIdRef.current + 1;
        preferenceLoadIdRef.current = loadId;
        setIsPreferenceLoading(true);
        try {
            const savedPreference = await getUserPreference();
            if (preferenceLoadIdRef.current !== loadId) return false;
            setUserPreference(savedPreference);
            setPreferenceLoadError("");
            return true;
        } catch (error) {
            if (preferenceLoadIdRef.current === loadId) {
                console.error("User preference initialization failed:", error);
                setPreferenceLoadError("Your saved preferences could not be loaded. Close and reopen this dialog to retry.");
            }
            return false;
        } finally {
            if (preferenceLoadIdRef.current === loadId) setIsPreferenceLoading(false);
        }
    }, []);

    const refreshHistory = useCallback(async (shouldClean = true, configuredRetention = retentionDays) => {
        setIsHistoryLoading(true);
        setHistoryError("");
        try {
            if (shouldClean) await deleteExpiredChats(configuredRetention);
            setHistory(await listChats());
        } catch (error) {
            console.error("Chat history error:", error);
            setHistoryError("Saved chat history is unavailable right now.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [retentionDays]);

    useEffect(() => {
        let cancelled = false;
        async function initialiseHistory() {
            try {
                const savedRetention = await getRetentionDays();
                if (cancelled) return;
                setRetentionDays(savedRetention);
                await deleteExpiredChats(savedRetention);
                const chats = await listChats();
                if (!cancelled) setHistory(chats);
            } catch (error) {
                console.error("Chat history initialization failed:", error);
                if (!cancelled) setHistoryError("Saved chat history is unavailable right now.");
            }
        }
        void initialiseHistory();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        void loadUserPreference();
        return () => { preferenceLoadIdRef.current += 1; };
    }, [loadUserPreference]);

    const persistCurrentChat = useCallback(async () => {
        if (!activeChatId || (!messages.length && !compactMemory)) return;
        const meta = chatMetaRef.current || { createdAt: Date.now(), title: "" };
        const title = getChatTitle(messages, meta.title, meta.createdAt);
        const record = {
            id: activeChatId,
            title,
            messages: serializeMessages(messages),
            compactMemory: compactMemory || null,
            createdAt: meta.createdAt,
            updatedAt: Date.now(),
        };
        try {
            await saveChat(record);
            chatMetaRef.current = { createdAt: record.createdAt, title };
            setHistory((current) => [record, ...current.filter((chat) => chat.id !== record.id)]);
            setHistoryError("");
        } catch (error) {
            console.error("Unable to save chat history:", error);
            setHistoryError("This chat could not be saved.");
        }
    }, [activeChatId, compactMemory, messages]);

    useEffect(() => {
        if (!activeChatId || (!messages.length && !compactMemory)) return undefined;
        const timer = window.setTimeout(() => { void persistCurrentChat(); }, 250);
        return () => window.clearTimeout(timer);
    }, [activeChatId, compactMemory, messages, persistCurrentChat]);

    const handleProfileChange = useCallback((profileId) => {
        const newProfile = defaultProfiles.find((profile) => profile.id === profileId);
        if (!newProfile) return;
        setActiveProfile(newProfile);
        localStorage.setItem("activeProfileId", profileId);
        choosenModelRef.current = getDefaultModel();
    }, []);

    const handleInput = useCallback((event) => {
        const target = event.target;
        setInputValue(target.value);
        if (target.style && Number.isFinite(target.scrollHeight)) {
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        }
    }, []);

    const handleAddImageFiles = useCallback(async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const validImages = [];
        const invalidFiles = [];
        for (const file of files) {
            if (!file.type?.startsWith("image/")) {
                invalidFiles.push(file.name);
                continue;
            }
            try {
                const dataUrl = await readFileAsDataUrl(file);
                await validateImageData(dataUrl);
                validImages.push({ id: createId(), name: file.name, mimeType: file.type, dataUrl, size: file.size });
            } catch (error) {
                console.error("Image validation failed:", error);
                invalidFiles.push(file.name);
            }
        }
        if (validImages.length) setAttachedImages((previous) => [...previous, ...validImages]);
        setAttachmentError(invalidFiles.length ? `${invalidFiles.length} file${invalidFiles.length === 1 ? "" : "s"} skipped because they were not valid images.` : "");
    }, []);

    const handleRemoveImage = useCallback((imageId) => {
        setAttachedImages((previous) => previous.filter((image) => image.id !== imageId));
        setAttachmentError("");
    }, []);

    const handleAddTabs = useCallback((tabs) => {
        setAttachedTabs((previous) => {
            const byId = new Map(previous.map((tab) => [tab.id, tab]));
            tabs.forEach((tab) => byId.set(tab.id, tab));
            return [...byId.values()];
        });
    }, []);

    const handleRemoveTab = useCallback((tabId) => {
        setAttachedTabs((previous) => previous.filter((tab) => tab.id !== tabId));
    }, []);

    /**
     * Converts committed messages into provider-neutral context with global system instructions.
     * @param {Array<Object>} sourceMessages - The committed conversation messages to include.
     * @returns {Array<Object>} The context-window-limited messages ready for provider formatting.
     */
    const buildApiMessages = useCallback((sourceMessages) => {
        const contextLimit = activeProfile?.contextMessageCount || 20;
        const mapped = sourceMessages.slice(-contextLimit).map((message) => ({
            role: message.sender === "user" ? "user" : "assistant",
            content: withTabContext(message.text, message.tabs),
            images: message.images || [],
        }));
        const normalizedPreference = userPreference.trim();
        const systemContext = [
            compactMemory ? `Previous conversation summary:\n${compactMemory}` : "",
            normalizedPreference ? `User preferences and instructions:\n${normalizedPreference}` : "",
        ].filter(Boolean).join("\n\n");

        return systemContext
            ? [{ role: "system", content: systemContext, images: [] }, ...mapped]
            : mapped;
    }, [activeProfile, compactMemory, userPreference]);

    const streamAssistantResponse = useCallback(async (apiMessages) => {
        setStreamingMessage({ text: "...thinking", sender: "assistant", isStreaming: true });
        try {
            let accumulated = "";
            for await (const delta of streamChat(apiMessages, choosenModelRef.current.val, activeProfile)) {
                accumulated += delta;
                setStreamingMessage({ text: accumulated, sender: "assistant", isStreaming: true });
            }
            setMessages((previous) => [...previous, { id: createId(), text: accumulated, sender: "assistant", isStreaming: false, feedback: null }]);
            setStreamingMessage(null);
        } catch (error) {
            console.error("Streaming error:", error);
            const text = error.message === "Failed to fetch" ? "Invalid API Key or Network error" : error.message;
            setMessages((previous) => [...previous, { id: createId(), text, sender: "assistant", isError: true, feedback: null }]);
            setStreamingMessage(null);
        } finally {
            setIsStreaming(false);
        }
    }, [activeProfile]);

    const handleCompact = useCallback(async () => {
        if (isStreaming || messages.length === 0) return;
        setIsStreaming(true);
        setStreamingMessage({ text: "...thinking", sender: "assistant", isStreaming: true });
        const compactApiMessages = [
            ...messages.map((message) => ({ role: message.sender === "user" ? "user" : "assistant", content: message.text, images: message.images || [] })),
            { role: "user", content: "Please provide a concise summary of the above conversation. Focus on key decisions, facts, and context that would be needed to continue the conversation. Be brief and factual.", images: [] },
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
            setMessages((previous) => [...previous, { id: createId(), text, sender: "assistant", isError: true, feedback: null }]);
            setStreamingMessage(null);
        } finally {
            setIsStreaming(false);
        }
    }, [activeProfile, isStreaming, messages]);

    const handleSend = useCallback(async () => {
        if (inputValue.trim() === "/compact") {
            setInputValue("");
            if (textareaRef.current) textareaRef.current.style.height = "auto";
            await handleCompact();
            return;
        }
        const text = inputValue.trim();
        const images = attachedImages;
        const tabs = attachedTabs;
        if ((!text && images.length === 0 && tabs.length === 0) || isStreaming || isPreferenceLoading) return;
        if (!activeChatId) {
            const createdAt = Date.now();
            chatMetaRef.current = { createdAt, title: "" };
            setActiveChatId(createId());
        }
        if (isFirstMessage) setIsFirstMessage(false);
        const newUserMessage = { id: createId(), text, sender: "user", images, tabs };
        setMessages((previous) => [...previous, newUserMessage]);
        setInputValue("");
        setAttachedImages([]);
        setAttachedTabs([]);
        setAttachmentError("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setIsStreaming(true);
        await streamAssistantResponse(buildApiMessages([...messages, newUserMessage]));
    }, [activeChatId, attachedImages, attachedTabs, buildApiMessages, handleCompact, inputValue, isFirstMessage, isPreferenceLoading, isStreaming, messages, streamAssistantResponse]);

    const handleRefreshLastResponse = useCallback(async () => {
        if (isStreaming || isPreferenceLoading) return;
        const lastAssistantIndex = findLastAssistantIndex(messages);
        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastAssistantIndex === -1 || lastUserIndex === -1) return;
        const sourceMessages = messages.slice(0, lastAssistantIndex);
        setMessages(sourceMessages);
        setIsStreaming(true);
        await streamAssistantResponse(buildApiMessages(sourceMessages));
    }, [buildApiMessages, isPreferenceLoading, isStreaming, messages, streamAssistantResponse]);

    const handleEditLastUserMessage = useCallback(() => {
        if (isStreaming) return;
        const lastAssistantIndex = findLastAssistantIndex(messages);
        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastAssistantIndex === -1 || lastUserIndex === -1) return;
        const lastUserMessage = messages[lastUserIndex];
        setMessages(messages.slice(0, lastUserIndex));
        setInputValue(lastUserMessage.text || "");
        setAttachedImages(lastUserMessage.images || []);
        setAttachedTabs(lastUserMessage.tabs || []);
        setAttachmentError("");
        requestAnimationFrame(() => {
            if (!textareaRef.current) return;
            textareaRef.current.focus();
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        });
    }, [isStreaming, messages]);

    const handleKeyDown = useCallback((event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    }, [handleSend]);

    const handleNewChat = useCallback(() => {
        void persistCurrentChat();
        setMessages([]);
        setIsFirstMessage(true);
        setInputValue("");
        setAttachedImages([]);
        setAttachedTabs([]);
        setAttachmentError("");
        setCompactMemory(null);
        setActiveChatId(null);
        chatMetaRef.current = null;
    }, [persistCurrentChat]);

    const handleOpenHistory = useCallback(() => {
        setIsHistoryOpen(true);
        void refreshHistory();
    }, [refreshHistory]);

    const handleCloseHistory = useCallback(() => setIsHistoryOpen(false), []);

    /**
     * Opens the global preferences dialog.
     * @returns {void}
     */
    const handleOpenPreferences = useCallback(() => {
        setPreferenceError("");
        setIsPreferencesOpen(true);
        if (preferenceLoadError) void loadUserPreference();
    }, [loadUserPreference, preferenceLoadError]);

    /**
     * Closes the global preferences dialog and clears transient save errors.
     * @returns {void}
     */
    const handleClosePreferences = useCallback(() => {
        setIsPreferencesOpen(false);
        setPreferenceError("");
    }, []);

    /**
     * Persists a new global preference and commits it for subsequent model requests.
     * @param {string} value - The preference draft entered by the user.
     * @returns {Promise<boolean>} Whether the preference was saved successfully.
     */
    const handleSavePreference = useCallback(async (value) => {
        const normalizedPreference = value.trim();
        if (normalizedPreference.length > USER_PREFERENCE_MAX_LENGTH) {
            setPreferenceError(`Preferences must be ${USER_PREFERENCE_MAX_LENGTH.toLocaleString()} characters or fewer.`);
            return false;
        }
        setIsPreferenceSaving(true);
        setPreferenceError("");
        try {
            await saveUserPreference(normalizedPreference);
            setUserPreference(normalizedPreference);
            return true;
        } catch (error) {
            console.error("Unable to save user preference:", error);
            setPreferenceError("Your preferences could not be saved.");
            return false;
        } finally {
            setIsPreferenceSaving(false);
        }
    }, []);

    const handleLoadHistory = useCallback(async (chatId) => {
        if (isStreaming) return;
        await persistCurrentChat();
        setIsHistoryLoading(true);
        setHistoryError("");
        try {
            const chat = await getChat(chatId);
            if (!chat) {
                await refreshHistory();
                return;
            }
            const resumedChat = { ...chat, updatedAt: Date.now() };
            await saveChat(resumedChat);
            chatMetaRef.current = { createdAt: chat.createdAt, title: chat.title };
            setActiveChatId(chat.id);
            setMessages(Array.isArray(chat.messages) ? chat.messages : []);
            setCompactMemory(chat.compactMemory || null);
            setInputValue("");
            setAttachedImages([]);
            setAttachedTabs([]);
            setAttachmentError("");
            setIsFirstMessage(!(chat.messages?.length || chat.compactMemory));
            setHistory((current) => [resumedChat, ...current.filter((entry) => entry.id !== chat.id)]);
            setIsHistoryOpen(false);
        } catch (error) {
            console.error("Unable to restore chat history:", error);
            setHistoryError("This saved chat could not be opened.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [isStreaming, persistCurrentChat, refreshHistory]);

    const handleRetentionChange = useCallback(async (value) => {
        const nextRetention = value === "never" ? null : Number(value);
        if (!RETENTION_OPTIONS.some((option) => option.value === nextRetention)) return;
        setIsHistoryLoading(true);
        setHistoryError("");
        try {
            await persistCurrentChat();
            await saveRetentionDays(nextRetention);
            setRetentionDays(nextRetention);
            await deleteExpiredChats(nextRetention);
            setHistory(await listChats());
        } catch (error) {
            console.error("Unable to update history retention:", error);
            setHistoryError("History retention could not be updated.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [persistCurrentChat]);

    return {
        messages, inputValue, attachedImages, attachedTabs, attachmentError, isFirstMessage, isStreaming,
        streamingMessage, activeProfile, choosenModelRef, messagesEndRef, textareaRef, compactMemory,
        activeChatId, history, isHistoryOpen, isHistoryLoading, historyError, retentionDays,
        userPreference, isPreferencesOpen, isPreferenceLoading, isPreferenceSaving, preferenceLoadError, preferenceError,
        handleProfileChange, handleInput, handleAddImageFiles, handleRemoveImage, handleAddTabs,
        handleRemoveTab, handleSend, handleRefreshLastResponse, handleEditLastUserMessage, handleKeyDown,
        handleNewChat, handleCompact, handleOpenHistory, handleCloseHistory, handleLoadHistory,
        handleRetentionChange, handleOpenPreferences, handleClosePreferences, handleSavePreference,
    };
}
