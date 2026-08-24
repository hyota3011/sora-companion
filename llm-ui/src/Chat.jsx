import { ChatProvider, useChatContext } from "./context/ChatContext";
import Header from "./components/Header";
import InitialView from "./components/InitialView";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import HistorySidebar from "./components/HistorySidebar";
import PreferencesDialog from "./components/PreferencesDialog";
import { defaultProfiles } from "./config/profiles";

/**
 * The main Chat component that serves as the entry point for the UI.
 * It is wrapped in ChatProvider to provide state to all sub-components via context.
 * @returns {import("react").ReactElement} The chat application wrapped in shared state.
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
 * @returns {import("react").ReactElement} The active chat layout and overlays.
 */
function ChatContent() {
    const { isFirstMessage, isPreferencesOpen, userPreference } = useChatContext();

    return (
        <div className="app-container">
            <div className="app-surface" inert={isPreferencesOpen} aria-hidden={isPreferencesOpen ? "true" : undefined}>
                <Header profiles={defaultProfiles} />

                <main className="main-content">
                    {isFirstMessage ? (
                        <InitialView greeting="Hi, what should we dive into today?" />
                    ) : (
                        <MessageList />
                    )}
                </main>

                <ChatInput />
                <HistorySidebar />
            </div>
            {isPreferencesOpen && <PreferencesDialog key={userPreference} />}
        </div>
    );
}
