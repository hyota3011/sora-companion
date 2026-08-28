import { useCallback, useEffect, useMemo, useState } from "react";
import {
    deleteExpiredChats,
    getChat,
    getRetentionDays,
    listChats,
    RETENTION_OPTIONS,
    saveChat,
    saveRetentionDays,
} from "../storage/chatHistory.js";
import { getChatTitle, serializeMessages } from "../utils/chatMessages.js";

/**
 * Manages IndexedDB-backed chat-history loading, persistence, and retention.
 * @param {Object} options - Active session state and restoration controls.
 * @param {string|null} options.activeChatId - The active persisted chat identifier.
 * @param {Array<Object>} options.messages - The committed conversation messages.
 * @param {string|null} options.compactMemory - The current compacted conversation summary.
 * @param {import("react").MutableRefObject<Object|null>} options.chatMetaRef - The active chat metadata reference.
 * @param {boolean} options.isStreaming - Whether an assistant request is in progress.
 * @param {(chat: Object) => void} options.restoreChat - Restores a persisted chat into the active UI state.
 * @returns {Object} History state and actions.
 */
export function useChatHistory({
    activeChatId,
    messages,
    compactMemory,
    chatMetaRef,
    isStreaming,
    restoreChat,
}) {
    const [history, setHistory] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [retentionDays, setRetentionDays] = useState(30);

    /**
     * Refreshes the visible history list and optionally removes expired records first.
     * @param {boolean} shouldClean - Whether to run retention cleanup before loading records.
     * @param {number|null} configuredRetention - The retention value used for cleanup.
     * @returns {Promise<void>} Resolves after the history list has been refreshed.
     */
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

        /**
         * Loads the initial retention setting and visible history records.
         * @returns {Promise<void>} Resolves when initialization has finished.
         */
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

    /**
     * Persists the active conversation and keeps the sidebar list synchronized.
     * @returns {Promise<void>} Resolves once the active chat has been saved or skipped.
     */
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
    }, [activeChatId, chatMetaRef, compactMemory, messages]);

    useEffect(() => {
        if (!activeChatId || (!messages.length && !compactMemory)) return undefined;
        const timer = window.setTimeout(() => { void persistCurrentChat(); }, 250);
        return () => window.clearTimeout(timer);
    }, [activeChatId, compactMemory, messages, persistCurrentChat]);

    /**
     * Opens the history drawer and refreshes the saved records.
     * @returns {void}
     */
    const handleOpenHistory = useCallback(() => {
        setIsHistoryOpen(true);
        void refreshHistory();
    }, [refreshHistory]);

    /**
     * Closes the history drawer.
     * @returns {void}
     */
    const handleCloseHistory = useCallback(() => {
        setIsHistoryOpen(false);
    }, []);

    /**
     * Saves the active chat and restores the selected saved conversation.
     * @param {string} chatId - The persisted chat identifier to load.
     * @returns {Promise<void>} Resolves after loading succeeds or fails.
     */
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
            restoreChat(chat);
            setHistory((current) => [resumedChat, ...current.filter((entry) => entry.id !== chat.id)]);
            setIsHistoryOpen(false);
        } catch (error) {
            console.error("Unable to restore chat history:", error);
            setHistoryError("This saved chat could not be opened.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [isStreaming, persistCurrentChat, refreshHistory, restoreChat]);

    /**
     * Persists a new retention preference, removes expired records, and refreshes history.
     * @param {string} value - The selected retention option value.
     * @returns {Promise<void>} Resolves after the retention update completes.
     */
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

    return useMemo(() => ({
        history,
        isHistoryOpen,
        isHistoryLoading,
        historyError,
        retentionDays,
        persistCurrentChat,
        handleOpenHistory,
        handleCloseHistory,
        handleLoadHistory,
        handleRetentionChange,
    }), [handleCloseHistory, handleLoadHistory, handleOpenHistory, handleRetentionChange, history, historyError, isHistoryLoading, isHistoryOpen, persistCurrentChat, retentionDays]);
}
