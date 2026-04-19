import { memo } from 'react';
import MessageItem from "./MessageItem";

const StaticMessageList = memo(({ messages }) => {
    return (
        <>
            {messages.map((msg, index) => (
                <MessageItem key={index} message={msg} />
            ))}
        </>
    );
});

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
