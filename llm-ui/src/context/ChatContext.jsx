/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import { useChat } from "../hooks/useChat";

const ConversationContext = createContext(null);
const ComposerContext = createContext(null);
const HistoryContext = createContext(null);
const SettingsContext = createContext(null);

/**
 * Reads a required chat domain context.
 * @param {import("react").Context<Object|null>} context - The React context to read.
 * @param {string} contextName - The context name used in the missing-provider error.
 * @returns {Object} The provided context value.
 */
function useRequiredContext(context, contextName) {
    const value = useContext(context);
    if (!value) throw new Error(`${contextName} must be used within a ChatProvider`);
    return value;
}

/**
 * Provides independently memoized conversation, composer, history, and settings slices.
 * @param {Object} props - The provider props.
 * @param {import("react").ReactNode} props.children - The chat application content.
 * @returns {import("react").ReactElement} Nested domain context providers.
 */
export function ChatProvider({ children }) {
    const { conversation, composer, history, settings } = useChat();

    return (
        <ConversationContext.Provider value={conversation}>
            <ComposerContext.Provider value={composer}>
                <HistoryContext.Provider value={history}>
                    <SettingsContext.Provider value={settings}>
                        {children}
                    </SettingsContext.Provider>
                </HistoryContext.Provider>
            </ComposerContext.Provider>
        </ConversationContext.Provider>
    );
}

/**
 * Reads active conversation and request state.
 * @returns {Object} The conversation context value.
 */
export function useConversationContext() {
    return useRequiredContext(ConversationContext, "useConversationContext");
}

/**
 * Reads the transient composer state and actions.
 * @returns {Object} The composer context value.
 */
export function useComposerContext() {
    return useRequiredContext(ComposerContext, "useComposerContext");
}

/**
 * Reads saved-chat history state and actions.
 * @returns {Object} The history context value.
 */
export function useHistoryContext() {
    return useRequiredContext(HistoryContext, "useHistoryContext");
}

/**
 * Reads global settings, preference, and dialog state.
 * @returns {Object} The settings context value.
 */
export function useSettingsContext() {
    return useRequiredContext(SettingsContext, "useSettingsContext");
}
