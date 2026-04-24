import { ChatProvider, useChatContext } from "./context/ChatContext";
import Header from "./components/Header";
import InitialView from "./components/InitialView";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import { defaultProfiles } from "./config/profiles";

/**
 * The main Chat component that serves as the entry point for the UI.
 * It is wrapped in ChatProvider to provide state to all sub-components via context.
 */
export default function Chat() {
    return (
        <ChatProvider>
            <ChatContent />
        </ChatProvider>
    );
}

/**
 * The actual layout of the chat interface.
 * Consumes the ChatContext to determine what to render.
 */
function ChatContent() {
    const { isFirstMessage } = useChatContext();

    return (
        <div className="app-container">
            <Header profiles={defaultProfiles} />

            <main className="main-content">
                {isFirstMessage ? (
                    <InitialView greeting="Hi, what should we dive into today?" />
                ) : (
                    <MessageList />
                )}
            </main>

            <ChatInput />
        </div>
    );
}