import { useCallback, useMemo } from "react";
import { useChatComposer } from "./useChatComposer.js";
import { useChatHistory } from "./useChatHistory.js";
import { useChatSession } from "./useChatSession.js";
import { useChatSettings } from "./useChatSettings.js";

/**
 * Composes the domain hooks that power the active chat experience.
 * @returns {Object} Memoized conversation, composer, history, and settings context slices.
 */
export function useChat() {
    const composer = useChatComposer();
    const settings = useChatSettings();
    const session = useChatSession({
        userPreference: settings.userPreference,
        isPreferenceIncognitoEnabled: settings.isPreferenceIncognitoEnabled,
        isPreferenceLoading: settings.isPreferenceLoading,
        restoreComposerMessage: composer.restoreComposerMessage,
    });
    const { clearComposer, inputValue, attachedImages, attachedTabs } = composer;
    const { restoreSession, resetSession, sendMessage, handleCompact } = session;

    /**
     * Restores a saved conversation and clears its transient composer state.
     * @param {Object} chat - The persisted chat record to restore.
     * @returns {void}
     */
    const restoreChat = useCallback((chat) => {
        restoreSession(chat);
        clearComposer();
    }, [clearComposer, restoreSession]);

    const history = useChatHistory({
        activeChatId: session.activeChatId,
        messages: session.messages,
        compactMemory: session.compactMemory,
        chatMetaRef: session.chatMetaRef,
        isStreaming: session.isStreaming,
        restoreChat,
        detachActiveChat: session.detachActiveChat,
    });
    const { persistCurrentChat } = history;

    /**
     * Starts a normal request or intercepts the compact slash command.
     * @returns {Promise<void>} Resolves once the requested operation has completed.
     */
    const handleSend = useCallback(async () => {
        if (inputValue.trim() === "/compact") {
            clearComposer({ resetTextarea: true });
            await handleCompact();
            return;
        }
        const request = sendMessage({
            text: inputValue.trim(),
            images: attachedImages,
            tabs: attachedTabs,
        });
        if (!request) return;
        clearComposer({ resetTextarea: true });
        await request;
    }, [attachedImages, attachedTabs, clearComposer, handleCompact, inputValue, sendMessage]);

    /**
     * Sends the composer draft when Enter is pressed without Shift.
     * @param {KeyboardEvent} event - The textarea keyboard event.
     * @returns {void}
     */
    const handleKeyDown = useCallback((event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    }, [handleSend]);

    /**
     * Saves the active conversation before clearing it and its composer draft.
     * @returns {void}
     */
    const handleNewChat = useCallback(() => {
        void persistCurrentChat();
        resetSession();
        clearComposer();
    }, [clearComposer, persistCurrentChat, resetSession]);

    const conversation = useMemo(() => ({
        messages: session.messages,
        isFirstMessage: session.isFirstMessage,
        isStreaming: session.isStreaming,
        streamingMessage: session.streamingMessage,
        activeProfile: session.activeProfile,
        compactMemory: session.compactMemory,
        choosenModelRef: session.choosenModelRef,
        messagesEndRef: session.messagesEndRef,
        handleProfileChange: session.handleProfileChange,
        handleCompact: session.handleCompact,
        handleRefreshLastResponse: session.handleRefreshLastResponse,
        handleEditLastUserMessage: session.handleEditLastUserMessage,
        handleNewChat,
    }), [handleNewChat, session.activeProfile, session.choosenModelRef, session.compactMemory, session.handleCompact, session.handleEditLastUserMessage, session.handleProfileChange, session.handleRefreshLastResponse, session.isFirstMessage, session.isStreaming, session.messages, session.messagesEndRef, session.streamingMessage]);

    const composerContext = useMemo(() => ({
        inputValue: composer.inputValue,
        attachedImages: composer.attachedImages,
        attachedTabs: composer.attachedTabs,
        attachmentError: composer.attachmentError,
        textareaRef: composer.textareaRef,
        handleInput: composer.handleInput,
        handleAddImageFiles: composer.handleAddImageFiles,
        handleRemoveImage: composer.handleRemoveImage,
        handleAddTabs: composer.handleAddTabs,
        handleRemoveTab: composer.handleRemoveTab,
        handleSend,
        handleKeyDown,
    }), [composer, handleKeyDown, handleSend]);

    const historyContext = useMemo(() => ({
        ...history,
        activeChatId: session.activeChatId,
    }), [history, session.activeChatId]);

    return useMemo(() => ({
        conversation,
        composer: composerContext,
        history: historyContext,
        settings,
    }), [composerContext, conversation, historyContext, settings]);
}
