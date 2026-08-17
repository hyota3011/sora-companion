import { useState, useRef, useEffect } from "react";
import { EditIcon, ChevronDownIcon, HistoryIcon, MoreHorizontalIcon, XIcon } from "./icons";
import keyIcon from "../../static/images/KeyIcon.png";
import { saveApiKey } from "../api/keys";
import { _getApiKey } from "../config/profiles";
import { useChatContext } from "../context/ChatContext";

const VITE_PROFILE = import.meta.env.VITE_PROFILE;

/**
 * A dropdown component for selecting the active LLM provider profile.
 * Consumes data from ChatContext to avoid prop drilling.
 * 
 * @param {Object} props - The component props.
 * @param {Array} props.profiles - List of available provider profiles.
 */
function ProfileSelector({ profiles }) {
    const { activeProfile, handleProfileChange } = useChatContext();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id) => {
        handleProfileChange(id);
        setIsOpen(false);
    };

    return (
        <div className="model-selector-container" ref={menuRef} style={{ marginLeft: '12px' }}>
            <button
                className="outline-btn pill"
                title="Select profile"
                onClick={() => setIsOpen(!isOpen)}
                style={{ backgroundColor: '#fff' }}
            >
                <span>{activeProfile?.name}</span>
                <ChevronDownIcon />
            </button>

            {isOpen && (
                <div className="dropdown-menu" style={{ top: '100%', bottom: 'auto', marginTop: '8px' }}>
                    {profiles.map((p) => (
                        <button
                            key={p.id}
                            className={`dropdown-item ${activeProfile?.id === p.id ? 'active' : ''}`}
                            onClick={() => handleSelect(p.id)}
                        >
                            <div className="dropdown-item-content">
                                <span className="dropdown-item-title">{p.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * The top navigation header of the chat interface.
 * Contains the new chat button, profile selector, and API key management.
 * Consumes data from ChatContext to avoid prop drilling.
 * 
 * @param {Object} props - The component props.
 * @param {Array} props.profiles - List of available provider profiles.
 */
export default function Header({ profiles }) {
    const { activeProfile, handleNewChat, handleOpenHistory } = useChatContext();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setIsMoreOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setIsMoreOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleSetKey = async () => {
        if (!activeProfile) return;
        const key = (VITE_PROFILE != 'prod' ? await _getApiKey() : null) || window.prompt(`Enter secret key for ${activeProfile.name}:`);
        if (key) {
            saveApiKey(activeProfile.id, key)
                .then(() => alert("API key saved successfully!"))
                .catch(err => alert("Failed to save API key: " + err.message));
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <button className="icon-btn" title="New Chat" onClick={handleNewChat}>
                    <EditIcon />
                </button>

                {profiles && activeProfile && (
                    <>
                        <ProfileSelector profiles={profiles} />
                        <button className="icon-btn" title="Set API Key" onClick={handleSetKey}>
                            <img src={keyIcon} alt="Key" style={{ width: '16px', height: '16px' }} />
                        </button>
                    </>
                )}
            </div>
            <div className="header-right">
                <div className="header-more-menu" ref={moreMenuRef}>
                    <button className="icon-btn" title="More options" aria-label="More options" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen((open) => !open)}>
                        <MoreHorizontalIcon />
                    </button>
                    {isMoreOpen && (
                        <div className="dropdown-menu header-dropdown-menu" role="menu">
                            <button className="dropdown-item" role="menuitem" onClick={() => { setIsMoreOpen(false); handleOpenHistory(); }}>
                                <div className="dropdown-item-icon"><HistoryIcon /></div>
                                <div className="dropdown-item-content"><span className="dropdown-item-title">History</span></div>
                            </button>
                        </div>
                    )}
                </div>
                <button className="icon-btn" onClick={() => window.close()} title="Close">
                    <XIcon />
                </button>
            </div>
        </header>
    );
}
