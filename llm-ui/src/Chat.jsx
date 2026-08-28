import { ChatProvider, useConversationContext, useSettingsContext } from "./context/ChatContext";
import Header from "./components/Header";
import InitialView from "./components/InitialView";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import HistorySidebar from "./components/HistorySidebar";
import PreferencesDialog from "./components/PreferencesDialog";
import ApiKeyDialog from "./components/ApiKeyDialog";
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
 * Consumes conversation and settings contexts to determine what to render.
 * @returns {import("react").ReactElement} The active chat layout and overlays.
 */
function ChatContent() {
    const { activeProfile, isFirstMessage } = useConversationContext();
    const { isPreferencesOpen, isApiKeyDialogOpen, userPreference } = useSettingsContext();
    const isModalOpen = isPreferencesOpen || isApiKeyDialogOpen;

    return (
        <div className="app-container">
            <div className="app-surface" inert={isModalOpen} aria-hidden={isModalOpen ? "true" : undefined}>
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
            {isApiKeyDialogOpen && <ApiKeyDialog key={activeProfile?.id} />}
        </div>
    );
}
