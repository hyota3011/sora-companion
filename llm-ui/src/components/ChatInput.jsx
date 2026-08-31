import { useState, useRef, useEffect, memo } from "react";
import {
    PlusIcon,
    ChevronDownIcon,
    MicIcon,
    XIcon
} from "./icons";
import sendIconImg from "../../static/images/SendIcon.png";
import imageMenuIcon from "../assets/image-icon.svg";
import { getDefaultModel, getModels } from "../config/models";
import { useComposerContext, useConversationContext, useSettingsContext } from "../context/ChatContext";
import { captureBrowserTab, listBrowserTabs } from "../api/tabCapture";

const COMMANDS = [
    { id: "tabs", label: "/tabs", description: "Attach content from browser tabs" },
    { id: "compact", label: "/compact", description: "Summarize this conversation" },
];

const TabPicker = memo(function TabPicker({ selectedTabs, onConfirm, onClose }) {
    const [tabs, setTabs] = useState([]);
    const [selectedIds, setSelectedIds] = useState(() => new Set(selectedTabs.map((tab) => tab.id)));
    const [isLoading, setIsLoading] = useState(true);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        listBrowserTabs()
            .then(setTabs)
            .catch(() => setError("Unable to list browser tabs. Open this app from Chrome's extension toolbar."))
            .finally(() => setIsLoading(false));
    }, []);

    const toggleTab = (tab) => {
        if (!tab.available || isCapturing) return;
        setSelectedIds((current) => {
            const next = new Set(current);
            next.has(tab.id) ? next.delete(tab.id) : next.add(tab.id);
            return next;
        });
    };

    const confirm = async () => {
        const selected = tabs.filter((tab) => selectedIds.has(tab.id));
        setIsCapturing(true);
        setError("");
        const results = await Promise.allSettled(selected.map(captureBrowserTab));
        const captured = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
        const failures = results.length - captured.length;
        if (failures) setError(`${failures} selected tab${failures === 1 ? "" : "s"} could not be read.`);
        onConfirm(captured);
        if (!failures) onClose();
        setIsCapturing(false);
    };

    return (
        <div className="tab-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section className="tab-modal" role="dialog" aria-modal="true" aria-labelledby="tab-picker-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="tab-modal-header">
                    <div><h2 id="tab-picker-title">Attach browser tabs</h2><p>Selected pages are captured and sent with your next message.</p></div>
                    <button className="icon-btn" onClick={onClose} aria-label="Close tab picker"><XIcon /></button>
                </div>
                <div className="tab-list" aria-live="polite">
                    {isLoading && <div className="tab-picker-status">Loading tabs…</div>}
                    {!isLoading && tabs.map((tab) => (
                        <button key={tab.id} className={`tab-list-item ${selectedIds.has(tab.id) ? "selected" : ""} ${!tab.available ? "unavailable" : ""}`} onClick={() => toggleTab(tab)} disabled={!tab.available || isCapturing}>
                            <span className="tab-checkbox" aria-hidden="true">{selectedIds.has(tab.id) ? "✓" : ""}</span>
                            <span className="tab-favicon-placeholder" aria-hidden="true" />
                            <span className="tab-list-text"><strong>{tab.title}</strong><span>{tab.available ? tab.url : tab.unavailableReason}</span></span>
                        </button>
                    ))}
                    {!isLoading && tabs.length === 0 && <div className="tab-picker-status">No browser tabs are available.</div>}
                </div>
                {error && <div className="tab-picker-error">{error}</div>}
                <div className="tab-modal-actions"><button className="outline-btn tab-cancel-btn" onClick={onClose} disabled={isCapturing}>Cancel</button><button className="tab-confirm-btn" onClick={confirm} disabled={isCapturing}>{isCapturing ? "Capturing…" : `Attach ${selectedIds.size || ""} tab${selectedIds.size === 1 ? "" : "s"}`}</button></div>
            </section>
        </div>
    );
});

// 1. Isolate the dropdown state to prevent re-rendering the whole input area
/**
 * A dropdown component to select the specific model for the active provider.
 * Isolated to prevent re-rendering the whole input area when toggled.
 */
const ModelSelector = memo(() => {
    const { choosenModelRef } = useConversationContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState(() => getDefaultModel()?.id);
    const menuRef = useRef(null);

    const models = getModels();
    const activeModel = models.find(m => m.id === selectedModel);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleModelSelect = (model) => {
        setSelectedModel(model.id);
        choosenModelRef.current = model;
        setIsMenuOpen(false);
    };

    return (
        <div className="model-selector-container" ref={menuRef}>
            <button
                className="outline-btn pill"
                title="Select model"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
                <span>{activeModel?.title}</span>
                <ChevronDownIcon />
            </button>

            {isMenuOpen && (
                <div className="dropdown-menu" >
                    {models.map((model) => (
                        <button
                            key={model.id}
                            className={`dropdown-item ${selectedModel === model.id ? 'active' : ''}`}
                            onClick={() => handleModelSelect(model)}
                        >
                            <div className="dropdown-item-icon">
                                {model.icon}
                            </div>
                            <div className="dropdown-item-content">
                                <div className="dropdown-item-title-row">
                                    <span className="dropdown-item-title">{model.title}</span>
                                    {model.tag && <span className="model-tag">{model.tag}</span>}
                                </div>
                                <span className="dropdown-item-desc">{model.desc}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

const AttachmentMenu = memo(() => {
    const { handleAddImageFiles } = useComposerContext();
    const { isStreaming } = useConversationContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddImages = () => {
        setIsMenuOpen(false);
        fileInputRef.current?.click();
    };

    const handleImageSelection = (event) => {
        handleAddImageFiles(event.target.files);
        event.target.value = "";
    };

    return (
        <div className="model-selector-container" ref={menuRef}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden-file-input"
                onChange={handleImageSelection}
            />
            <button
                className="icon-btn outline-btn circular"
                title="Add"
                onClick={() => setIsMenuOpen((open) => !open)}
                disabled={isStreaming}
            >
                <PlusIcon />
            </button>

            {isMenuOpen && (
                <div className="dropdown-menu attachment-menu">
                    <button className="dropdown-item" onClick={handleAddImages}>
                        <div className="dropdown-item-icon attachment-menu-icon">
                            <img src={imageMenuIcon} alt="" aria-hidden="true" />
                        </div>
                        <div className="dropdown-item-content">
                            <span className="dropdown-item-title">Add images</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
});

// 2. Memoize ChatInput to prevent re-renders when the parent (Chat.jsx) updates (e.g., during streaming)
/**
 * The main input area for composing and sending messages.
 * Includes the textarea, attachment buttons, and the model selector.
 * Consumes composer, conversation, and settings contexts to avoid prop drilling.
 */
const ChatInput = memo(() => {
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [isTabPickerOpen, setIsTabPickerOpen] = useState(false);
    const [commandIndex, setCommandIndex] = useState(0);
    const {
        inputValue,
        attachedImages,
        attachedTabs,
        attachmentError,
        handleInput,
        handleKeyDown,
        handleSend,
        handleAddImageFiles,
        handleRemoveImage,
        handleAddTabs,
        handleRemoveTab,
        textareaRef,
    } = useComposerContext();
    const {
        handleCompact,
        isStreaming,
        activeProfile
    } = useConversationContext();
    const { isPreferenceLoading } = useSettingsContext();

    const providerName = activeProfile?.name;
    const dragDepthRef = useRef(0);
    const showCommandMenu = /^\/\w*$/.test(inputValue);

    const selectCommand = (command) => {
        if (command.id === "tabs") {
            handleInput({ target: { value: "", style: textareaRef.current?.style || {} } });
            setIsTabPickerOpen(true);
            return;
        }
        handleInput({ target: { value: "", style: textareaRef.current?.style || {} } });
        handleCompact();
    };

    const handleComposerKeyDown = (event) => {
        if (showCommandMenu) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setCommandIndex((current) => (current + (event.key === "ArrowDown" ? 1 : COMMANDS.length - 1)) % COMMANDS.length);
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                handleInput({ target: { value: "", style: textareaRef.current?.style || {} } });
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                selectCommand(COMMANDS[commandIndex]);
                return;
            }
        }
        handleKeyDown(event);
    };

    const hasImageFiles = (dataTransfer) => {
        return Array.from(dataTransfer?.items || []).some((item) => (
            item.kind === "file" && item.type.startsWith("image/")
        ));
    };

    const handleDragEnter = (event) => {
        if (isStreaming || !hasImageFiles(event.dataTransfer)) return;

        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDraggingImage(true);
    };

    const handleDragOver = (event) => {
        if (isStreaming || !hasImageFiles(event.dataTransfer)) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (event) => {
        if (isStreaming || !hasImageFiles(event.dataTransfer)) return;

        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
            setIsDraggingImage(false);
        }
    };

    const handleDrop = (event) => {
        if (isStreaming) return;

        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDraggingImage(false);
        handleAddImageFiles(event.dataTransfer.files);
    };

    const handlePaste = (event) => {
        if (isStreaming) return;

        const items = event.clipboardData?.items;
        if (!items) return;

        const files = [];
        let hasText = false;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
                const file = items[i].getAsFile();
                if (file) files.push(file);
            } else if (items[i].type === "text/plain") {
                hasText = true;
            }
        }

        if (files.length > 0) {
            handleAddImageFiles(files);
            if (!hasText) {
                event.preventDefault();
            }
        }
    };

    return (
        <footer className="input-area">
            <div
                className={`input-wrapper ${isDraggingImage ? "drag-active" : ""}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {(attachedImages.length > 0 || attachmentError) && (
                    <div className="image-attachment-area" aria-live="polite">
                        {attachedImages.length > 0 && (
                            <div className="image-preview-list">
                                {attachedImages.map((image) => (
                                    <div className="image-preview-item" key={image.id}>
                                        <img src={image.dataUrl} alt={image.name} />
                                        <button
                                            className="image-remove-btn"
                                            title={`Remove ${image.name}`}
                                            onClick={() => handleRemoveImage(image.id)}
                                            disabled={isStreaming}
                                        >
                                            <XIcon width={14} height={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {attachmentError && <div className="attachment-error">{attachmentError}</div>}
                    </div>
                )}
                {attachedTabs.length > 0 && (
                    <div className="tab-attachment-list" aria-label="Attached browser tabs">
                        {attachedTabs.map((tab) => (
                            <span className="tab-attachment-chip" key={tab.id} title={tab.url}>
                                <span>{tab.title}</span>
                                <button onClick={() => handleRemoveTab(tab.id)} disabled={isStreaming} aria-label={`Remove ${tab.title}`}><XIcon width={12} height={12} /></button>
                            </span>
                        ))}
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    id="chat-input"
                    placeholder={`Message ${providerName || "AI"} or @ mention a tab`}
                    rows="1"
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={handleComposerKeyDown}
                    onPaste={handlePaste}
                    disabled={isStreaming}
                ></textarea>
                {showCommandMenu && (
                    <div className="command-menu" role="listbox" aria-label="Slash commands">
                        {COMMANDS.map((command, index) => (
                            <button key={command.id} className={`command-item ${index === commandIndex ? "active" : ""}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectCommand(command)} role="option" aria-selected={index === commandIndex}>
                                <strong>{command.label}</strong><span>{command.description}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="input-toolbar">
                    <div className="toolbar-left">
                        <AttachmentMenu />

                        <ModelSelector key={activeProfile.id} />
                    </div>
                    <div className="toolbar-right">
                        {inputValue.trim().length > 0 || attachedImages.length > 0 ? (
                            <button
                                className={`icon-btn action-btn send-btn ${isStreaming || isPreferenceLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleSend}
                                title="Send message"
                                disabled={isStreaming || isPreferenceLoading}
                            >
                                <img src={sendIconImg} alt="Send" style={{ width: '16px', height: '16px' }} />
                            </button>
                        ) : (
                            <button className="icon-btn action-btn mic-btn" title="Microphone" disabled={isStreaming}>
                                <MicIcon />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {isTabPickerOpen && <TabPicker selectedTabs={attachedTabs} onConfirm={handleAddTabs} onClose={() => setIsTabPickerOpen(false)} />}
        </footer>
    );
});

export default ChatInput;
