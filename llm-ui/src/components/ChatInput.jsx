import { useState, useRef, useEffect, memo } from "react";
import {
    PlusIcon,
    ChevronDownIcon,
    MicIcon
} from "./icons";
import sendIconImg from "../../static/images/SendIcon.png";
import { getModels } from "../config/models";

// 1. Isolate the dropdown state to prevent re-rendering the whole input area
/**
 * A dropdown component to select the specific model for the active provider.
 * Isolated to prevent re-rendering the whole input area when toggled.
 * 
 * @param {Object} props - The component props.
 * @param {React.MutableRefObject} props.choosenModelRef - Ref containing the currently selected model object.
 */
const ModelSelector = memo(({ choosenModelRef }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState(choosenModelRef.current.id);
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

// 2. Memoize ChatInput to prevent re-renders when the parent (Chat.jsx) updates (e.g., during streaming)
/**
 * The main input area for composing and sending messages.
 * Includes the textarea, attachment buttons, and the model selector.
 * Memoized to prevent re-renders during message streaming.
 * 
 * @param {Object} props - The component props.
 * @param {string} props.inputValue - The current text in the textarea.
 * @param {Function} props.onInputChange - Callback for textarea value changes.
 * @param {Function} props.onKeyDown - Callback for keyboard events (e.g., Enter to send).
 * @param {Function} props.onSend - Callback to trigger sending the message.
 * @param {boolean} props.isStreaming - Whether a response is currently being streamed.
 * @param {React.RefObject} props.textareaRef - Ref to the textarea element for auto-resizing.
 * @param {Object} props.activeProfile - The currently selected provider profile.
 * @param {React.MutableRefObject} props.choosenModelRef - Ref containing the selected model.
 * @param {string} props.providerName - Name of the active AI provider for the placeholder text.
 */
const ChatInput = memo(({
    inputValue,
    onInputChange,
    onKeyDown,
    onSend,
    isStreaming,
    textareaRef,
    activeProfile,
    choosenModelRef,
    providerName
}) => {
    return (
        <footer className="input-area">
            <div className="input-wrapper">
                <textarea
                    ref={textareaRef}
                    id="chat-input"
                    placeholder={`Message ${providerName || "AI"} or @ mention a tab`}
                    rows="1"
                    value={inputValue}
                    onChange={onInputChange}
                    onKeyDown={onKeyDown}
                    disabled={isStreaming}
                ></textarea>

                <div className="input-toolbar">
                    <div className="toolbar-left">
                        <button className="icon-btn outline-btn circular" title="Add">
                            <PlusIcon />
                        </button>

                        <ModelSelector key={activeProfile.id} choosenModelRef={choosenModelRef} />
                    </div>
                    <div className="toolbar-right">
                        {inputValue.trim().length > 0 ? (
                            <button
                                className={`icon-btn action-btn send-btn ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={onSend}
                                title="Send message"
                                disabled={isStreaming}
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
        </footer>
    );
});

export default ChatInput;
