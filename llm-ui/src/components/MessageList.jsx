import { memo } from 'react';
import MessageItem from "./MessageItem";
import { useChatContext } from "../context/ChatContext";

/**
 * Memoized component to render the static list of historical messages.
 * Prevents unnecessary re-renders of the entire history during streaming.
 */
const StaticMessageList = memo(() => {
    const { messages } = useChatContext();
    return (
        <>
            {messages.map((msg, index) => (
                <MessageItem key={index} message={msg} />
            ))}
        </>
    );
});

/**
 * Renders the full conversation view, including the static history
 * and the currently streaming message (if any).
 * Consumes data from ChatContext to avoid prop drilling.
 */
export default function MessageList() {
    const { streamingMessage, messagesEndRef, activeProfile } = useChatContext();
    const providerName = activeProfile?.name;

    return (
        <div className="chat-view">
            <div className="disclaimer">{providerName || "AI"} is an AI and may make mistakes.</div>
            <div className="divider">
                <span className="divider-text">Today</span>
            </div>
            <div className="messages-container">
                <StaticMessageList />
                {streamingMessage && <MessageItem message={streamingMessage} />}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
