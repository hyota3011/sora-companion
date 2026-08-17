import { useEffect } from "react";
import { XIcon } from "./icons";
import { useChatContext } from "../context/ChatContext";
import { RETENTION_OPTIONS } from "../storage/chatHistory";

function formatUpdatedAt(timestamp) {
    if (!timestamp) return "";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

/** Overlay drawer used to browse and resume IndexedDB-backed conversations. */
export default function HistorySidebar() {
    const {
        activeChatId,
        handleCloseHistory,
        handleLoadHistory,
        handleRetentionChange,
        history,
        historyError,
        isHistoryLoading,
        isHistoryOpen,
        isStreaming,
        retentionDays,
    } = useChatContext();

    useEffect(() => {
        if (!isHistoryOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") handleCloseHistory();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [handleCloseHistory, isHistoryOpen]);

    if (!isHistoryOpen) return null;
    const retentionValue = retentionDays === null ? "never" : String(retentionDays);

    return (
        <div className="history-backdrop" role="presentation" onMouseDown={handleCloseHistory}>
            <aside className="history-sidebar" role="dialog" aria-modal="true" aria-label="Chat history" onMouseDown={(event) => event.stopPropagation()}>
                <header className="history-sidebar-header">
                    <div>
                        <h2>History</h2>
                        <p>Saved chats on this device</p>
                    </div>
                    <button className="icon-btn" onClick={handleCloseHistory} aria-label="Close history"><XIcon /></button>
                </header>

                <label className="history-retention-label" htmlFor="history-retention">
                    Keep saved chats
                    <select id="history-retention" value={retentionValue} onChange={(event) => void handleRetentionChange(event.target.value)} disabled={isHistoryLoading}>
                        {RETENTION_OPTIONS.map((option) => (
                            <option key={option.label} value={option.value === null ? "never" : option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                {historyError && <p className="history-status history-error" role="alert">{historyError}</p>}
                {isStreaming && <p className="history-status">Finish the current reply before opening a saved chat.</p>}
                {isHistoryLoading && <p className="history-status">Loading saved chats…</p>}
                {!isHistoryLoading && !historyError && history.length === 0 && <p className="history-status">No saved chats yet.</p>}

                <div className="history-list" aria-live="polite">
                    {history.map((chat) => (
                        <button
                            className={`history-item ${chat.id === activeChatId ? "active" : ""}`}
                            disabled={isStreaming || isHistoryLoading}
                            key={chat.id}
                            onClick={() => void handleLoadHistory(chat.id)}
                        >
                            <span className="history-item-title">{chat.title}</span>
                            <span className="history-item-date">{formatUpdatedAt(chat.updatedAt)}</span>
                        </button>
                    ))}
                </div>
            </aside>
        </div>
    );
}
