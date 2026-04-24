import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { memo } from "react";


import { LikeIcon, DislikeIcon, ShareIcon, CopyIcon, RefreshIcon, EditIcon } from "./icons";

/**
 * A toolbar of actionable buttons (Like, Dislike, Copy, etc.) for assistant messages.
 * 
 * @param {Object} props - The component props.
 * @param {string} props.text - The message text to be copied to the clipboard.
 */
export function BotActionButtons({ text }) {
    const handleCopy = () => {
        console.log("received text", text);
        if (text) {
            navigator.clipboard.writeText(text).catch(err => console.error("Failed to copy text:", err));
        }
    };

    return (
        <div className="bot-actions px-4">
            <button className="bot-action-btn" title="Like">
                <LikeIcon />
            </button>
            <button className="bot-action-btn" title="Dislike">
                <DislikeIcon />
            </button>
            <button className="bot-action-btn" title="Share">
                <ShareIcon />
            </button>
            <button className="bot-action-btn" title="Copy" onClick={handleCopy}>
                <CopyIcon />
            </button>
            <button className="bot-action-btn" title="Refresh">
                <RefreshIcon />
            </button>
            <button className="bot-action-btn" title="Edit">
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
                                    const { children, className, node, ...rest } = props;
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
                    message.text
                )}
            </div>
            {isBot && !isStreaming && <BotActionButtons text={message.text} />}
        </div>
    );
});

export default MessageItem;
