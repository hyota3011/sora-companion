import { memo } from 'react';
import MessageItem from "./MessageItem";
import { useConversationContext } from "../context/ChatContext";

const CompactBanner = memo(() => {
    const { compactMemory } = useConversationContext();
    if (!compactMemory) return null;
    return (
        <div className="compact-banner">
            <span>Conversation compacted — context summary active</span>
        </div>
    );
});

/**
 * Memoized component to render the static list of historical messages.
 * Prevents unnecessary re-renders of the entire history during streaming.
 */
const StaticMessageList = memo(() => {
    const { messages } = useConversationContext();
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
 * Consumes conversation data to avoid prop drilling.
 */
export default function MessageList() {
    const { streamingMessage, messagesEndRef, activeProfile } = useConversationContext();
    const providerName = activeProfile?.name;

    return (
        <div className="chat-view">
            <div className="disclaimer">{providerName || "AI"} is an AI and may make mistakes.</div>
            <div className="divider">
                <span className="divider-text">Today</span>
            </div>
            <div className="messages-container">
                <CompactBanner />
                <StaticMessageList />
                {streamingMessage && <MessageItem message={streamingMessage} />}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
