import { useState, useRef, useEffect } from "react";
import { EditIcon, ChevronDownIcon, MoreHorizontalIcon, XIcon } from "./icons";
import keyIcon from "../../static/images/KeyIcon.png";
import { saveApiKey } from "../api/keys";
import { _getApiKey } from "../config/profiles";

const VITE_PROFILE = import.meta.env.VITE_PROFILE;

/**
 * A dropdown component for selecting the active LLM provider profile.
 * 
 * @param {Object} props - The component props.
 * @param {Array} props.profiles - List of available provider profiles.
 * @param {Object} props.activeProfile - The currently selected profile.
 * @param {Function} props.onProfileChange - Callback fired when a new profile is selected.
 */
function ProfileSelector({ profiles, activeProfile, onProfileChange }) {
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
        onProfileChange(id);
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
                <span>{activeProfile.name}</span>
                <ChevronDownIcon />
            </button>

            {isOpen && (
                <div className="dropdown-menu" style={{ top: '100%', bottom: 'auto', marginTop: '8px' }}>
                    {profiles.map((p) => (
                        <button
                            key={p.id}
                            className={`dropdown-item ${activeProfile.id === p.id ? 'active' : ''}`}
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
 * 
 * @param {Object} props - The component props.
 * @param {Function} props.onNewChat - Callback to start a new chat session.
 * @param {Array} props.profiles - List of available provider profiles.
 * @param {Object} props.activeProfile - The currently selected profile.
 * @param {Function} props.onProfileChange - Callback fired when a new profile is selected.
 */
export default function Header({ onNewChat, profiles, activeProfile, onProfileChange }) {

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
                <button className="icon-btn" title="New Chat" onClick={onNewChat}>
                    <EditIcon />
                </button>

                {profiles && activeProfile && (
                    <>
                        <ProfileSelector
                            profiles={profiles}
                            activeProfile={activeProfile}
                            onProfileChange={onProfileChange}
                        />
                        <button className="icon-btn" title="Set API Key" onClick={handleSetKey}>
                            <img src={keyIcon} alt="Key" style={{ width: '16px', height: '16px' }} />
                        </button>
                    </>
                )}
            </div>
            <div className="header-right">
                <button className="icon-btn">
                    <MoreHorizontalIcon />
                </button>
                <button className="icon-btn" onClick={() => window.close()} title="Close">
                    <XIcon />
                </button>
            </div>
        </header>
    );
}
