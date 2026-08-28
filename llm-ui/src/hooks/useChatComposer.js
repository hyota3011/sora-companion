import { useCallback, useMemo, useRef, useState } from "react";
import { readFileAsDataUrl, validateImageData } from "../utils/imageAttachments.js";
import { createChatId } from "../utils/chatMessages.js";

/**
 * Resets a textarea's height after its value is cleared.
 * @param {HTMLTextAreaElement|null} textarea - The textarea element to reset.
 * @returns {void}
 */
function resetTextareaHeight(textarea) {
    if (textarea) textarea.style.height = "auto";
}

/**
 * Manages the transient message draft and its image and browser-tab attachments.
 * @returns {Object} Composer state and actions.
 */
export function useChatComposer() {
    const [inputValue, setInputValue] = useState("");
    const [attachedImages, setAttachedImages] = useState([]);
    const [attachedTabs, setAttachedTabs] = useState([]);
    const [attachmentError, setAttachmentError] = useState("");
    const textareaRef = useRef(null);

    /**
     * Updates the message draft and grows the textarea to fit its content.
     * @param {Object} event - The input change event or compatible command-menu event.
     * @returns {void}
     */
    const handleInput = useCallback((event) => {
        const target = event.target;
        setInputValue(target.value);
        if (target.style && Number.isFinite(target.scrollHeight)) {
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        }
    }, []);

    /**
     * Validates and appends image files to the pending composer attachments.
     * @param {FileList|Array<File>} fileList - The files selected, pasted, or dropped by the user.
     * @returns {Promise<void>} Resolves after every file has been processed.
     */
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
                validImages.push({ id: createChatId(), name: file.name, mimeType: file.type, dataUrl, size: file.size });
            } catch (error) {
                console.error("Image validation failed:", error);
                invalidFiles.push(file.name);
            }
        }
        if (validImages.length) setAttachedImages((previous) => [...previous, ...validImages]);
        setAttachmentError(invalidFiles.length ? `${invalidFiles.length} file${invalidFiles.length === 1 ? "" : "s"} skipped because they were not valid images.` : "");
    }, []);

    /**
     * Removes one pending image attachment.
     * @param {string} imageId - The image attachment identifier to remove.
     * @returns {void}
     */
    const handleRemoveImage = useCallback((imageId) => {
        setAttachedImages((previous) => previous.filter((image) => image.id !== imageId));
        setAttachmentError("");
    }, []);

    /**
     * Adds captured browser tabs, replacing duplicate tab identifiers.
     * @param {Array<Object>} tabs - The captured browser tabs to attach.
     * @returns {void}
     */
    const handleAddTabs = useCallback((tabs) => {
        setAttachedTabs((previous) => {
            const byId = new Map(previous.map((tab) => [tab.id, tab]));
            tabs.forEach((tab) => byId.set(tab.id, tab));
            return [...byId.values()];
        });
    }, []);

    /**
     * Removes one pending browser-tab attachment.
     * @param {number} tabId - The browser tab identifier to remove.
     * @returns {void}
     */
    const handleRemoveTab = useCallback((tabId) => {
        setAttachedTabs((previous) => previous.filter((tab) => tab.id !== tabId));
    }, []);

    /**
     * Clears the transient composer state after a send, reset, or restored conversation.
     * @param {Object} options - Reset behavior options.
     * @param {boolean} options.resetTextarea - Whether to reset the textarea height.
     * @returns {void}
     */
    const clearComposer = useCallback(({ resetTextarea = false } = {}) => {
        setInputValue("");
        setAttachedImages([]);
        setAttachedTabs([]);
        setAttachmentError("");
        if (resetTextarea) resetTextareaHeight(textareaRef.current);
    }, []);

    /**
     * Restores a user message into the composer for editing.
     * @param {Object} message - The user message to edit.
     * @returns {void}
     */
    const restoreComposerMessage = useCallback((message) => {
        setInputValue(message.text || "");
        setAttachedImages(message.images || []);
        setAttachedTabs(message.tabs || []);
        setAttachmentError("");
        requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.focus();
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        });
    }, []);

    return useMemo(() => ({
        inputValue,
        attachedImages,
        attachedTabs,
        attachmentError,
        textareaRef,
        handleInput,
        handleAddImageFiles,
        handleRemoveImage,
        handleAddTabs,
        handleRemoveTab,
        clearComposer,
        restoreComposerMessage,
    }), [attachmentError, attachedImages, attachedTabs, clearComposer, handleAddImageFiles, handleAddTabs, handleInput, handleRemoveImage, handleRemoveTab, inputValue, restoreComposerMessage]);
}
