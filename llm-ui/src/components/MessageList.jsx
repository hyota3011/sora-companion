import { memo } from 'react';
import MessageItem from "./MessageItem";

/**
 * Memoized component to render the static list of historical messages.
 * Prevents unnecessary re-renders of the entire history during streaming.
 * 
 * @param {Object} props - The component props.
 * @param {Array} props.messages - The array of historical message objects.
 */
const StaticMessageList = memo(({ messages }) => {
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
 * 
 * @param {Object} props - The component props.
 * @param {Array} props.messages - The historical messages array.
 * @param {Object|null} props.streamingMessage - The active streaming message object, or null.
 * @param {React.RefObject} props.messagesEndRef - Ref to the bottom of the message list for auto-scrolling.
 * @param {string} props.providerName - Name of the active AI provider to display in the disclaimer.
 */
export default function MessageList({ messages, streamingMessage, messagesEndRef, providerName }) {
    return (
        <div className="chat-view">
            <div className="disclaimer">{providerName || "AI"} is an AI and may make mistakes.</div>
            <div className="divider">
                <span className="divider-text">Today</span>
            </div>
            <div className="messages-container">
                <StaticMessageList messages={messages} />
                {streamingMessage && <MessageItem message={streamingMessage} />}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
