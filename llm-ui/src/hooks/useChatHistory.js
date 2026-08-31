import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    deleteChats,
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
 * Manages IndexedDB-backed chat-history loading, persistence, retention, and deletion.
 * @param {Object} options - Active session state and restoration controls.
 * @param {string|null} options.activeChatId - The active persisted chat identifier.
 * @param {Array<Object>} options.messages - The committed conversation messages.
 * @param {string|null} options.compactMemory - The current compacted conversation summary.
 * @param {import("react").MutableRefObject<Object|null>} options.chatMetaRef - The active chat metadata reference.
 * @param {boolean} options.isStreaming - Whether an assistant request is in progress.
 * @param {(chat: Object) => void} options.restoreChat - Restores a persisted chat into the active UI state.
 * @param {() => void} options.clearActiveChat - Clears the active transcript after its record is deleted.
 * @returns {Object} History state and actions.
 */
export function useChatHistory({
    activeChatId,
    messages,
    compactMemory,
    chatMetaRef,
    isStreaming,
    restoreChat,
    clearActiveChat,
}) {
    const [history, setHistory] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isHistoryDeleting, setIsHistoryDeleting] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [historyNotice, setHistoryNotice] = useState("");
    const [retentionDays, setRetentionDays] = useState(30);
    const autosaveTimerRef = useRef(null);
    const deletedChatIdsRef = useRef(new Set());
    const historyMutationQueueRef = useRef(Promise.resolve());
    const historyReadVersionRef = useRef(0);

    /**
     * Runs a chat-store mutation after every earlier queued mutation has settled.
     * @param {() => Promise<unknown>} operation - The IndexedDB mutation to enqueue.
     * @returns {Promise<unknown>} Resolves or rejects with the requested mutation result.
     */
    const enqueueHistoryMutation = useCallback((operation) => {
        const queuedOperation = historyMutationQueueRef.current.then(operation, operation);
        historyMutationQueueRef.current = queuedOperation.catch(() => undefined);
        return queuedOperation;
    }, []);

    /**
     * Cancels the pending debounced persistence task, if one exists.
     * @returns {void}
     */
    const cancelAutosave = useCallback(() => {
        if (autosaveTimerRef.current !== null) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
    }, []);

    /**
     * Refreshes the visible history list and optionally removes expired records first.
     * @param {boolean} shouldClean - Whether to run retention cleanup before loading records.
     * @param {number|null} configuredRetention - The retention value used for cleanup.
     * @returns {Promise<void>} Resolves after the history list has been refreshed.
     */
    const refreshHistory = useCallback(async (shouldClean = true, configuredRetention = retentionDays) => {
        if (isHistoryDeleting) return;
        const readVersion = ++historyReadVersionRef.current;
        setIsHistoryLoading(true);
        setHistoryError("");
        try {
            if (shouldClean) {
                await enqueueHistoryMutation(() => deleteExpiredChats(configuredRetention));
            }
            const chats = await listChats();
            if (readVersion === historyReadVersionRef.current) setHistory(chats);
        } catch (error) {
            console.error("Chat history error:", error);
            if (readVersion === historyReadVersionRef.current) {
                setHistoryError("Saved chat history is unavailable right now.");
            }
        } finally {
            if (readVersion === historyReadVersionRef.current) setIsHistoryLoading(false);
        }
    }, [enqueueHistoryMutation, isHistoryDeleting, retentionDays]);

    useEffect(() => {
        let cancelled = false;

        /**
         * Loads the initial retention setting and visible history records.
         * @returns {Promise<void>} Resolves when initialization has finished.
         */
        async function initialiseHistory() {
            const readVersion = ++historyReadVersionRef.current;
            try {
                const savedRetention = await getRetentionDays();
                if (cancelled) return;
                setRetentionDays(savedRetention);
                await enqueueHistoryMutation(() => deleteExpiredChats(savedRetention));
                const chats = await listChats();
                if (!cancelled && readVersion === historyReadVersionRef.current) setHistory(chats);
            } catch (error) {
                console.error("Chat history initialization failed:", error);
                if (!cancelled && readVersion === historyReadVersionRef.current) {
                    setHistoryError("Saved chat history is unavailable right now.");
                }
            } finally {
                if (!cancelled && readVersion === historyReadVersionRef.current) setIsHistoryLoading(false);
            }
        }

        void initialiseHistory();
        return () => {
            cancelled = true;
            cancelAutosave();
        };
    }, [cancelAutosave, enqueueHistoryMutation]);

    /**
     * Persists the active conversation and keeps the sidebar list synchronized.
     * @param {Object} options - Persistence behavior options.
     * @param {boolean} options.force - Whether to persist after a failed deletion retry.
     * @returns {Promise<boolean>} Whether a chat record was saved.
     */
    const persistCurrentChat = useCallback(async ({ force = false } = {}) => {
        if (!activeChatId || (!messages.length && !compactMemory)) return false;
        if (!force && deletedChatIdsRef.current.has(activeChatId)) return false;

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
            const didSave = await enqueueHistoryMutation(async () => {
                if (!force && deletedChatIdsRef.current.has(record.id)) return false;
                return saveChat(record);
            });
            if (!didSave) return false;
            chatMetaRef.current = { createdAt: record.createdAt, title };
            setHistory((current) => [record, ...current.filter((chat) => chat.id !== record.id)]);
            setHistoryError("");
            return true;
        } catch (error) {
            console.error("Unable to save chat history:", error);
            setHistoryError("This chat could not be saved.");
            return false;
        }
    }, [activeChatId, chatMetaRef, compactMemory, enqueueHistoryMutation, messages]);

    useEffect(() => {
        if (!activeChatId || (!messages.length && !compactMemory) || deletedChatIdsRef.current.has(activeChatId)) {
            return undefined;
        }

        cancelAutosave();
        const timer = window.setTimeout(() => {
            autosaveTimerRef.current = null;
            void persistCurrentChat();
        }, 250);
        autosaveTimerRef.current = timer;

        return () => {
            if (autosaveTimerRef.current === timer) cancelAutosave();
        };
    }, [activeChatId, cancelAutosave, compactMemory, messages, persistCurrentChat]);

    /**
     * Opens the history drawer and refreshes the saved records.
     * @returns {void}
     */
    const handleOpenHistory = useCallback(() => {
        if (isHistoryDeleting) return;
        setIsHistoryOpen(true);
        void refreshHistory();
    }, [isHistoryDeleting, refreshHistory]);

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
        if (isStreaming || isHistoryLoading || isHistoryDeleting) return;
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
            await enqueueHistoryMutation(() => saveChat(resumedChat));
            restoreChat(chat);
            setHistory((current) => [resumedChat, ...current.filter((entry) => entry.id !== chat.id)]);
            setIsHistoryOpen(false);
        } catch (error) {
            console.error("Unable to restore chat history:", error);
            setHistoryError("This saved chat could not be opened.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [enqueueHistoryMutation, isHistoryDeleting, isHistoryLoading, isStreaming, persistCurrentChat, refreshHistory, restoreChat]);

    /**
     * Deletes selected saved chats while preventing their autosave records from being recreated.
     * Deleting the active record also clears its transcript and composer state.
     * @param {Array<string>} chatIds - Saved-chat identifiers to delete.
     * @returns {Promise<boolean>} Whether the selected records were deleted.
     */
    const handleDeleteChats = useCallback(async (chatIds) => {
        const uniqueChatIds = [...new Set((chatIds || []).filter((chatId) => (
            typeof chatId === "string" && chatId.length > 0
        )))];
        if (!uniqueChatIds.length || isStreaming || isHistoryLoading || isHistoryDeleting) return false;

        const deletedIds = new Set(uniqueChatIds);
        const activeChatWasDeleted = Boolean(activeChatId && deletedIds.has(activeChatId));
        deletedIds.forEach((chatId) => deletedChatIdsRef.current.add(chatId));
        cancelAutosave();
        historyReadVersionRef.current += 1;
        setIsHistoryDeleting(true);
        setHistoryError("");
        setHistoryNotice("");

        try {
            await enqueueHistoryMutation(() => deleteChats(uniqueChatIds));
            setHistory((current) => current.filter((chat) => !deletedIds.has(chat.id)));
            if (activeChatWasDeleted) clearActiveChat();
            setHistoryNotice(`${uniqueChatIds.length} chat${uniqueChatIds.length === 1 ? "" : "s"} deleted.`);
            return true;
        } catch (error) {
            console.error("Unable to delete selected chat history:", error);
            uniqueChatIds.forEach((chatId) => deletedChatIdsRef.current.delete(chatId));
            setHistoryError("Selected chats could not be deleted.");
            if (activeChatWasDeleted) void persistCurrentChat({ force: true });
            return false;
        } finally {
            setIsHistoryDeleting(false);
        }
    }, [activeChatId, cancelAutosave, clearActiveChat, enqueueHistoryMutation, isHistoryDeleting, isHistoryLoading, isStreaming, persistCurrentChat]);

    /**
     * Persists a new retention preference, removes expired records, and refreshes history.
     * @param {string} value - The selected retention option value.
     * @returns {Promise<void>} Resolves after the retention update completes.
     */
    const handleRetentionChange = useCallback(async (value) => {
        const nextRetention = value === "never" ? null : Number(value);
        if (isHistoryDeleting || !RETENTION_OPTIONS.some((option) => option.value === nextRetention)) return;
        setIsHistoryLoading(true);
        setHistoryError("");
        setHistoryNotice("");
        try {
            await persistCurrentChat();
            await saveRetentionDays(nextRetention);
            setRetentionDays(nextRetention);
            await enqueueHistoryMutation(() => deleteExpiredChats(nextRetention));
            setHistory(await listChats());
        } catch (error) {
            console.error("Unable to update history retention:", error);
            setHistoryError("History retention could not be updated.");
        } finally {
            setIsHistoryLoading(false);
        }
    }, [enqueueHistoryMutation, isHistoryDeleting, persistCurrentChat]);

    return useMemo(() => ({
        history,
        isHistoryOpen,
        isHistoryLoading,
        isHistoryDeleting,
        historyError,
        historyNotice,
        retentionDays,
        persistCurrentChat,
        handleOpenHistory,
        handleCloseHistory,
        handleLoadHistory,
        handleDeleteChats,
        handleRetentionChange,
    }), [handleCloseHistory, handleDeleteChats, handleLoadHistory, handleOpenHistory, handleRetentionChange, history, historyError, historyNotice, isHistoryDeleting, isHistoryLoading, isHistoryOpen, persistCurrentChat, retentionDays]);
}
