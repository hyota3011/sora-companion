import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { memo } from "react";


import {
    ShareIcon,
    CopyIcon,
    RefreshIcon,
    EditIcon
} from "./icons";
import { useChatContext } from "../context/ChatContext";

/**
 * A toolbar of actionable buttons (Like, Dislike, Copy, etc.) for assistant messages.
 * 
 * @param {Object} props - The component props.
 * @param {Object} props.message - The assistant message for this toolbar.
 */
export function BotActionButtons({ message }) {
    const {
        handleRefreshLastResponse,
        handleEditLastUserMessage,
        isStreaming
    } = useChatContext();

    const text = message.text;

    const handleCopy = () => {
        if (text) {
            navigator.clipboard.writeText(text).catch(err => console.error("Failed to copy text:", err));
        }
    };

    return (
        <div className="bot-actions px-4">
            <button className="bot-action-btn" title="Share" onClick={handleCopy}>
                <ShareIcon />
            </button>
            <button className="bot-action-btn" title="Copy" onClick={handleCopy}>
                <CopyIcon />
            </button>
            <button
                className="bot-action-btn"
                title="Refresh"
                onClick={handleRefreshLastResponse}
                disabled={isStreaming}
            >
                <RefreshIcon />
            </button>
            <button
                className="bot-action-btn"
                title="Edit"
                onClick={handleEditLastUserMessage}
                disabled={isStreaming}
            >
                <EditIcon width={16} height={16} />
            </button>
        </div>
    );
}

/**
 * Renders an individual chat message bubble (user or assistant).
 * Handles markdown rendering and syntax highlighting for assistant messages.
 * 
 * @param {Object} props - The component props.
 * @param {Object} props.message - The message object containing sender and text.
 */
const MessageItem = memo(function MessageItem({ message }) {
    const isBot = message.sender === 'assistant';
    const isStreaming = message.isStreaming;
    const hasImages = message.images?.length > 0;
    const hasTabs = message.tabs?.length > 0;

    return (
        <div className={`message ${message.sender} ${isStreaming ? 'is-streaming' : ''}`}>
            <div className={isBot ? 'content max-w-none p-4 prose prose-ul:list-disc prose-ul:ml-6 prose-ol:list-decimal prose-ol:ml-6 marker:text-black text-gray-800' : 'content'}>
                {isBot ? (
                    message.text === "...thinking" ? (
                        <div className="thinking-text">
                            Thinking<span className="flicker-dots"></span>
                        </div>
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code(props) {
                                    const { children, className, ...rest } = props;
                                    const match = /language-(\w+)/.exec(className || "");
                                    return match ? (
                                        <SyntaxHighlighter
                                            {...rest}
                                            PreTag="div"
                                            children={String(children).replace(/\n$/, "")}
                                            language={match[1]}
                                            style={oneDark}
                                        />
                                    ) : (
                                        <code {...rest} className="bg-gray-200 text-red-600 px-1 py-0.5 rounded font-mono text-sm">
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        >{message.text}</ReactMarkdown>
                    )
                ) : (
                    <>
                        {hasImages && (
                            <div className="message-image-list">
                                {message.images.map((image) => (
                                    <img key={image.id} src={image.dataUrl} alt={image.name} />
                                ))}
                            </div>
                        )}
                        {hasTabs && (
                            <div className="message-tab-list" aria-label="Attached browser tabs">
                                {message.tabs.map((tab) => <span className="message-tab-chip" key={tab.id} title={tab.url}>{tab.title}</span>)}
                            </div>
                        )}
                        {message.text && <div>{message.text}</div>}
                    </>
                )}
            </div>
            {isBot && !isStreaming && <BotActionButtons message={message} />}
        </div>
    );
});

export default MessageItem;
