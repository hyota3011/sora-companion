import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Returns an allowed absolute link URL or null for unsafe Markdown destinations.
 * @param {unknown} value - The Markdown link destination.
 * @returns {string|null} A safe HTTP(S) URL, if one was supplied.
 */
function getSafeExternalUrl(value) {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

/**
 * Renders syntax-highlighted fenced code and styled inline code.
 * @param {Object} props - Markdown code element properties.
 * @returns {JSX.Element} The rendered code element.
 */
function MarkdownCode({ children, className, ...rest }) {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
        <SyntaxHighlighter
            {...rest}
            PreTag="div"
            language={match[1]}
            style={oneDark}
        >
            {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
    ) : (
        <code {...rest} className="bg-gray-200 text-red-600 px-1 py-0.5 rounded font-mono text-sm">
            {children}
        </code>
    );
}

/**
 * Replaces assistant-supplied Markdown images without creating a network request.
 * @param {Object} props - Markdown image element properties.
 * @param {string} [props.alt] - The descriptive Markdown alt text.
 * @returns {JSX.Element} An inert blocked-image notice.
 */
function BlockedMarkdownImage({ alt }) {
    return <span className="markdown-image-blocked" role="note">Image blocked{alt ? `: ${alt}` : ""}</span>;
}

/**
 * Renders only safe external HTTP(S) links from assistant Markdown.
 * @param {Object} props - Markdown anchor element properties.
 * @param {string} [props.href] - The Markdown link destination.
 * @param {import("react").ReactNode} props.children - The visible link content.
 * @returns {JSX.Element} A safe external link or inert text.
 */
function SafeMarkdownLink({ href, children }) {
    const safeUrl = getSafeExternalUrl(href);
    if (!safeUrl) return <span>{children}</span>;
    return <a href={safeUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>;
}

const markdownComponents = {
    a: SafeMarkdownLink,
    code: MarkdownCode,
    img: BlockedMarkdownImage,
};

/**
 * Renders assistant text as constrained Markdown without loading remote images.
 * @param {Object} props - The component properties.
 * @param {string} props.text - Assistant response text to render.
 * @returns {JSX.Element} Sanitized Markdown content.
 */
export default function AssistantMarkdown({ text }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {typeof text === "string" ? text : ""}
        </ReactMarkdown>
    );
}
