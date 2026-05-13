import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat } from "../api/index.js";
import { getDefaultModel } from "../config/models.jsx";
import { defaultProfiles, getActiveProfile } from "../config/profiles.js";

function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
        reader.readAsDataURL(file);
    });
}

function validateImageData(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Invalid image file"));
        image.src = dataUrl;
    });
}

function findLastAssistantIndex(messages) {
    return messages.map((msg) => msg.sender).lastIndexOf("assistant");
}

function findLastUserIndexBefore(messages, beforeIndex) {
    return messages
        .slice(0, beforeIndex)
        .map((msg) => msg.sender)
        .lastIndexOf("user");
}

/**
 * Custom hook that manages the chat state and logic.
 * This includes message history, input handling, streaming state,
 * profile/model selection, image attachments, and automatic scrolling.
 *
 * @returns {Object} An object containing chat state and handler functions.
 */
export function useChat() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [activeProfile, setActiveProfile] = useState(getActiveProfile());
    const [attachedImages, setAttachedImages] = useState([]);
    const [attachmentError, setAttachmentError] = useState("");
    const choosenModelRef = useRef(getDefaultModel());

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    /**
     * Updates the active provider profile and resets the chosen model to the default for that provider.
     *
     * @param {string} profileId - The ID of the profile to switch to.
     */
    const handleProfileChange = useCallback((profileId) => {
        const newProfile = defaultProfiles.find((p) => p.id === profileId);
        if (newProfile) {
            setActiveProfile(newProfile);
            localStorage.setItem("activeProfileId", profileId);
            choosenModelRef.current = getDefaultModel();
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    /**
     * Handles text input changes and manages the auto-resizing of the textarea.
     *
     * @param {React.ChangeEvent<HTMLTextAreaElement>} e - The input event.
     */
    const handleInput = useCallback((e) => {
        const target = e.target;
        setInputValue(target.value);

        // Auto-resize
        target.style.height = "auto";
        target.style.height = Math.min(target.scrollHeight, 120) + "px";
    }, []);

    const handleAddImageFiles = useCallback(async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        const validImages = [];
        const invalidFiles = [];

        for (const file of files) {
            if (!file.type?.startsWith("image/")) {
                invalidFiles.push(file.name);
                continue;
            }

            try {
                const dataUrl = await readFileAsDataUrl(file);
                await validateImageData(dataUrl);

                validImages.push({
                    id: createId(),
                    name: file.name,
                    mimeType: file.type,
                    dataUrl,
                    size: file.size,
                });
            } catch (error) {
                console.error("Image validation failed:", error);
                invalidFiles.push(file.name);
            }
        }

        if (validImages.length) {
            setAttachedImages((prev) => [...prev, ...validImages]);
        }

        setAttachmentError(
            invalidFiles.length
                ? `${invalidFiles.length} file${invalidFiles.length === 1 ? "" : "s"} skipped because they were not valid images.`
                : ""
        );
    }, []);

    const handleRemoveImage = useCallback((imageId) => {
        setAttachedImages((prev) => prev.filter((image) => image.id !== imageId));
        setAttachmentError("");
    }, []);

    const buildApiMessages = useCallback((sourceMessages) => {
        const contextLimit = activeProfile?.contextMessageCount || 20;
        const contextWindow = sourceMessages.slice(-contextLimit);

        return contextWindow.map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text,
            images: msg.images || [],
        }));
    }, [activeProfile]);

    const streamAssistantResponse = useCallback(async (apiMessages) => {
        setStreamingMessage({
            text: "...thinking",
            sender: "assistant",
            isStreaming: true,
        });

        try {
            let accumulated = "";

            for await (const delta of streamChat(
                apiMessages,
                choosenModelRef.current.val,
                activeProfile
            )) {
                accumulated += delta;
                setStreamingMessage({
                    text: accumulated,
                    sender: "assistant",
                    isStreaming: true,
                });
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: createId(),
                    text: accumulated,
                    sender: "assistant",
                    isStreaming: false,
                    feedback: null,
                },
            ]);
            setStreamingMessage(null);
        } catch (error) {
            console.error("Streaming error:", error);
            let displayError = error.message;
            if (displayError === "Failed to fetch") {
                displayError = "Invalid API Key or Network error";
            }
            setMessages((prev) => [
                ...prev,
                {
                    id: createId(),
                    text: displayError,
                    sender: "assistant",
                    isError: true,
                    feedback: null,
                },
            ]);
            setStreamingMessage(null);
        } finally {
            setIsStreaming(false);
        }
    }, [activeProfile]);

    /**
     * Sends the current input value as a message and initiates the streaming response from the AI.
     * Handles context window management and error display.
     */
    const handleSend = useCallback(async () => {
        const text = inputValue.trim();
        const images = attachedImages;
        if ((!text && images.length === 0) || isStreaming) return;

        if (isFirstMessage) {
            setIsFirstMessage(false);
        }

        const newUserMsg = { id: createId(), text, sender: "user", images };
        setMessages((prev) => [...prev, newUserMsg]);
        setInputValue("");
        setAttachedImages([]);
        setAttachmentError("");

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        setIsStreaming(true);

        const allMessages = [...messages, newUserMsg];
        await streamAssistantResponse(buildApiMessages(allMessages));
    }, [inputValue, attachedImages, isStreaming, isFirstMessage, messages, buildApiMessages, streamAssistantResponse]);

    const handleRefreshLastResponse = useCallback(async () => {
        if (isStreaming) return;

        const lastAssistantIndex = findLastAssistantIndex(messages);
        if (lastAssistantIndex === -1) return;

        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastUserIndex === -1) return;

        const sourceMessages = messages.slice(0, lastAssistantIndex);
        setMessages(sourceMessages);
        setIsStreaming(true);
        await streamAssistantResponse(buildApiMessages(sourceMessages));
    }, [isStreaming, messages, buildApiMessages, streamAssistantResponse]);

    const handleEditLastUserMessage = useCallback(() => {
        if (isStreaming) return;

        const lastAssistantIndex = findLastAssistantIndex(messages);
        if (lastAssistantIndex === -1) return;

        const lastUserIndex = findLastUserIndexBefore(messages, lastAssistantIndex);
        if (lastUserIndex === -1) return;

        const lastUserMessage = messages[lastUserIndex];
        setMessages(messages.slice(0, lastUserIndex));
        setInputValue(lastUserMessage.text || "");
        setAttachedImages(lastUserMessage.images || []);
        setAttachmentError("");

        requestAnimationFrame(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
            }
        });
    }, [isStreaming, messages]);

    /**
     * Handles keydown events in the textarea, specifically "Enter" for sending messages.
     *
     * @param {React.KeyboardEvent<HTMLTextAreaElement>} e - The keyboard event.
     */
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    /**
     * Resets the chat state to start a new conversation.
     */
    const handleNewChat = () => {
        setMessages([]);
        setIsFirstMessage(true);
        setInputValue("");
        setAttachedImages([]);
        setAttachmentError("");
    };

    return {
        messages,
        inputValue,
        attachedImages,
        attachmentError,
        isFirstMessage,
        isStreaming,
        streamingMessage,
        activeProfile,
        choosenModelRef,
        messagesEndRef,
        textareaRef,
        handleProfileChange,
        handleInput,
        handleAddImageFiles,
        handleRemoveImage,
        handleSend,
        handleRefreshLastResponse,
        handleEditLastUserMessage,
        handleKeyDown,
        handleNewChat,
    };
}
