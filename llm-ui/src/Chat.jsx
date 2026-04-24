import { useChat } from "./hooks/useChat";
import Header from "./components/Header";
import InitialView from "./components/InitialView";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import { defaultProfiles } from "./config/profiles";

/**
 * The main Chat component that serves as the entry point for the UI.
 * It utilizes the useChat hook to manage state and renders the high-level
 * layout including the Header, MessageList/InitialView, and ChatInput.
 */
export default function Chat() {
    const {
        messages,
        inputValue,
        isFirstMessage,
        isStreaming,
        streamingMessage,
        activeProfile,
        choosenModelRef,
        messagesEndRef,
        textareaRef,
        handleProfileChange,
        handleInput,
        handleSend,
        handleKeyDown,
        handleNewChat
    } = useChat();

    return (
        <div className="app-container">
            <Header
                onNewChat={handleNewChat}
                profiles={defaultProfiles}
                activeProfile={activeProfile}
                onProfileChange={handleProfileChange}
            />

            <main className="main-content">
                {isFirstMessage ? (
                    <InitialView greeting="Hi, what should we dive into today?" />
                ) : (
                    <MessageList
                        messages={messages}
                        streamingMessage={streamingMessage}
                        messagesEndRef={messagesEndRef}
                        providerName={activeProfile?.name}
                    />
                )}
            </main>

            <ChatInput
                inputValue={inputValue}
                onInputChange={handleInput}
                onKeyDown={handleKeyDown}
                onSend={handleSend}
                activeProfile={activeProfile}
                choosenModelRef={choosenModelRef}
                isStreaming={isStreaming}
                textareaRef={textareaRef}
                providerName={activeProfile?.name}
            />
        </div>
    );
}