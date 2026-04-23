import { useState, useRef, useEffect, useCallback } from "react";
import { streamChat } from "../api/index.js";
import { getValueOfDefaultModel } from "../config/models.jsx";
import { defaultProfiles, getActiveProfile } from "../config/profiles.js";

export function useChat() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [activeProfile, setActiveProfile] = useState(getActiveProfile());
    const choosenModelRef = useRef(getValueOfDefaultModel());

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const handleProfileChange = useCallback((profileId) => {
        const newProfile = defaultProfiles.find((p) => p.id === profileId);
        if (newProfile) {
            setActiveProfile(newProfile);
            localStorage.setItem("activeProfileId", profileId);
            choosenModelRef.current = getValueOfDefaultModel();
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    const handleInput = useCallback((e) => {
        const target = e.target;
        setInputValue(target.value);

        // Auto-resize
        target.style.height = "auto";
        target.style.height = Math.min(target.scrollHeight, 120) + "px";
    }, []);

    const handleSend = useCallback(async () => {
        const text = inputValue.trim();
        if (!text || isStreaming) return;

        if (isFirstMessage) {
            setIsFirstMessage(false);
        }

        // 1. Add user message
        const newUserMsg = { text, sender: "user" };
        setMessages((prev) => [...prev, newUserMsg]);
        setInputValue("");

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        setIsStreaming(true);

        // 2. Build context: take the last N messages for conversation history
        const allMessages = [...messages, newUserMsg];
        const contextLimit = activeProfile?.contextMessageCount || 20;
        const contextWindow = allMessages.slice(-contextLimit);
        const apiMessages = contextWindow.map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text,
        }));

        // 3. Stream the response — provider-agnostic
        setStreamingMessage({
            text: "...thinking",
            sender: "assistant",
            isStreaming: true,
        });

        try {
            let accumulated = "";
            let hasStarted = false;

            for await (const delta of streamChat(
                apiMessages,
                choosenModelRef.current,
                activeProfile
            )) {
                if (!hasStarted) {
                    hasStarted = true;
                }
                accumulated += delta;
                setStreamingMessage({
                    text: accumulated,
                    sender: "assistant",
                    isStreaming: true,
                });
            }

            setMessages((prev) => [
                ...prev,
                { text: accumulated, sender: "assistant", isStreaming: false },
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
                { text: displayError, sender: "assistant", isError: true },
            ]);
            setStreamingMessage(null);
        } finally {
            setIsStreaming(false);
        }
    }, [inputValue, isStreaming, isFirstMessage, activeProfile, messages]);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const handleNewChat = () => {
        setMessages([]);
        setIsFirstMessage(true);
        setInputValue("");
    };

    return {
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
        handleNewChat,
    };
}
