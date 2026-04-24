import { createContext, useContext } from "react";
import { useChat } from "../hooks/useChat";

const ChatContext = createContext(null);

/**
 * Provider component that wraps the app and provides chat state via context.
 * This avoids prop drilling for deep components like MessageItem and BotActionButtons.
 */
export function ChatProvider({ children }) {
    const chat = useChat();
    
    return (
        <ChatContext.Provider value={chat}>
            {children}
        </ChatContext.Provider>
    );
}

/**
 * Custom hook to easily consume the ChatContext.
 * @returns {Object} The state and handlers from useChat.
 */
export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
}
