import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";
import { useConversationContext, useHistoryContext } from "../context/ChatContext";
import { RETENTION_OPTIONS } from "../storage/chatHistory";

/**
 * Formats a saved chat's update time for display in the history drawer.
 * @param {number} timestamp - The saved chat update time in milliseconds.
 * @returns {string} A localized display string, or an empty string when absent.
 */
function formatUpdatedAt(timestamp) {
    if (!timestamp) return "";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

/**
 * Overlay drawer used to browse, select, and remove IndexedDB-backed conversations.
 * @returns {import("react").ReactElement|null} The history drawer when it is open.
 */
export default function HistorySidebar() {
    const {
        activeChatId,
        handleCloseHistory,
        handleDeleteChats,
        handleLoadHistory,
        handleRetentionChange,
        history,
        historyError,
        historyNotice,
        isHistoryDeleting,
        isHistoryLoading,
        isHistoryOpen,
        retentionDays,
    } = useHistoryContext();
    const { isStreaming } = useConversationContext();
    const [selectedChatIds, setSelectedChatIds] = useState(() => new Set());
    const selectAllRef = useRef(null);

    const selectedCount = history.reduce((count, chat) => (
        selectedChatIds.has(chat.id) ? count + 1 : count
    ), 0);
    const hasSelectedChats = selectedCount > 0;
    const allChatsSelected = history.length > 0 && selectedCount === history.length;
    const hasPartialSelection = hasSelectedChats && !allChatsSelected;
    const isBusy = isStreaming || isHistoryLoading || isHistoryDeleting;

    /**
     * Clears the local selection before closing the history drawer.
     * @returns {void}
     */
    const handleCloseWithSelectionReset = useCallback(() => {
        setSelectedChatIds(new Set());
        handleCloseHistory();
    }, [handleCloseHistory]);

    useEffect(() => {
        if (!isHistoryOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") handleCloseWithSelectionReset();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [handleCloseWithSelectionReset, isHistoryOpen]);

    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = hasPartialSelection;
    }, [hasPartialSelection]);

    /**
     * Toggles selection for one saved-chat row without loading it.
     * @param {string} chatId - The saved-chat identifier to select or clear.
     * @returns {void}
     */
    const handleToggleChatSelection = (chatId) => {
        setSelectedChatIds((current) => {
            const next = new Set(current);
            next.has(chatId) ? next.delete(chatId) : next.add(chatId);
            return next;
        });
    };

    /**
     * Selects every visible saved chat or clears the current selection.
     * @returns {void}
     */
    const handleToggleAllChats = () => {
        setSelectedChatIds(allChatsSelected ? new Set() : new Set(history.map((chat) => chat.id)));
    };

    /**
     * Deletes every currently selected saved-chat record without a confirmation dialog.
     * @returns {Promise<void>} Resolves once deletion succeeds or fails.
     */
    const handleDeleteSelectedChats = async () => {
        const selectedIds = history
            .filter((chat) => selectedChatIds.has(chat.id))
            .map((chat) => chat.id);
        const didDelete = await handleDeleteChats(selectedIds);
        if (didDelete) setSelectedChatIds(new Set());
    };

    if (!isHistoryOpen) return null;
    const retentionValue = retentionDays === null ? "never" : String(retentionDays);
    const deleteLabel = selectedCount === 1 ? "Delete 1 chat" : `Delete ${selectedCount} chats`;

    return (
        <div className="history-backdrop" role="presentation" onMouseDown={handleCloseWithSelectionReset}>
            <aside className="history-sidebar" role="dialog" aria-modal="true" aria-label="Chat history" onMouseDown={(event) => event.stopPropagation()}>
                <header className="history-sidebar-header">
                    <div>
                        <h2>History</h2>
                        <p>Saved chats on this device</p>
                    </div>
                    <button className="icon-btn" onClick={handleCloseWithSelectionReset} aria-label="Close history"><XIcon /></button>
                </header>

                <label className="history-retention-label" htmlFor="history-retention">
                    Keep saved chats
                    <select id="history-retention" value={retentionValue} onChange={(event) => void handleRetentionChange(event.target.value)} disabled={isBusy}>
                        {RETENTION_OPTIONS.map((option) => (
                            <option key={option.label} value={option.value === null ? "never" : option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <div className="history-selection-controls">
                    <label className="history-select-all-label">
                        <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allChatsSelected}
                            onChange={handleToggleAllChats}
                            disabled={isBusy || history.length === 0}
                            aria-label="Select all saved chats"
                        />
                        <span>Select all</span>
                    </label>
                    <button
                        type="button"
                        className="history-delete-btn"
                        onClick={() => { void handleDeleteSelectedChats(); }}
                        disabled={isBusy || !hasSelectedChats}
                    >
                        {isHistoryDeleting ? "Deleting…" : deleteLabel}
                    </button>
                </div>

                {historyError && <p className="history-status history-error" role="alert">{historyError}</p>}
                {historyNotice && <p className="history-status history-notice" role="status">{historyNotice}</p>}
                {isStreaming && <p className="history-status">Finish the current reply before changing saved chats.</p>}
                {isHistoryLoading && <p className="history-status">Loading saved chats…</p>}
                {!isHistoryLoading && !historyError && history.length === 0 && <p className="history-status">No saved chats yet.</p>}

                <div className="history-list" aria-live="polite">
                    {history.map((chat) => (
                        <div className={`history-item ${chat.id === activeChatId ? "active" : ""}`} key={chat.id}>
                            <input
                                className="history-item-checkbox"
                                type="checkbox"
                                checked={selectedChatIds.has(chat.id)}
                                onChange={() => handleToggleChatSelection(chat.id)}
                                disabled={isBusy}
                                aria-label={`Select ${chat.title}`}
                            />
                            <button
                                type="button"
                                className="history-item-open"
                                disabled={isBusy}
                                onClick={() => { void handleLoadHistory(chat.id); }}
                            >
                                <span className="history-item-title">{chat.title}</span>
                                <span className="history-item-date">{formatUpdatedAt(chat.updatedAt)}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    );
}
