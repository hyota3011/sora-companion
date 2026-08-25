import { useCallback, useEffect, useRef, useState } from "react";
import { USER_PREFERENCE_MAX_LENGTH } from "../config/preferences";
import { useChatContext } from "../context/ChatContext";

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[href]",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Displays the global instructions editor and commits changes only when Save is selected.
 * @returns {import("react").ReactElement} The modal preferences form.
 */
export default function PreferencesDialog() {
    const {
        userPreference,
        isPreferenceLoading,
        isPreferenceSaving,
        isPreferenceIncognitoEnabled,
        preferenceLoadError,
        preferenceError,
        handleClosePreferences,
        handleSavePreference,
    } = useChatContext();
    const [draft, setDraft] = useState(userPreference);
    const dialogRef = useRef(null);
    const isPreferenceUnavailable = isPreferenceLoading || Boolean(preferenceLoadError);

    /**
     * Closes the dialog without committing the draft and returns focus to the More button.
     * @returns {void}
     */
    const handleClose = useCallback(() => {
        if (isPreferenceSaving) return;
        handleClosePreferences();
        window.requestAnimationFrame(() => document.getElementById("header-more-button")?.focus());
    }, [handleClosePreferences, isPreferenceSaving]);

    useEffect(() => {
        /**
         * Closes the dialog with Escape and keeps Tab navigation inside the modal.
         * @param {KeyboardEvent} event - The document keyboard event.
         * @returns {void}
         */
        function handleDialogKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                handleClose();
                return;
            }
            if (event.key !== "Tab") return;

            const focusableElements = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
            if (!focusableElements.length) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener("keydown", handleDialogKeyDown);
        return () => document.removeEventListener("keydown", handleDialogKeyDown);
    }, [handleClose]);

    useEffect(() => {
        /**
         * Focuses the textarea when editable, otherwise the first available modal control.
         * @returns {void}
         */
        function focusDialogControl() {
            const preferredElement = dialogRef.current?.querySelector("textarea:not([disabled]), button:not([disabled])");
            (isPreferenceSaving ? dialogRef.current : preferredElement || dialogRef.current)?.focus();
        }

        focusDialogControl();
    }, [isPreferenceLoading, isPreferenceSaving, preferenceLoadError]);

    /**
     * Updates the unsaved preference draft as the textarea changes.
     * @param {import("react").ChangeEvent<HTMLTextAreaElement>} event - The textarea change event.
     * @returns {void}
     */
    function handleDraftChange(event) {
        setDraft(event.target.value);
    }

    /**
     * Prevents modal content clicks from being treated as backdrop clicks.
     * @param {import("react").MouseEvent<HTMLFormElement>} event - The modal mouse event.
     * @returns {void}
     */
    function handleDialogMouseDown(event) {
        event.stopPropagation();
    }

    /**
     * Saves the preference draft and closes the dialog after persistence succeeds.
     * @param {import("react").FormEvent<HTMLFormElement>} event - The form submission event.
     * @returns {Promise<void>} A promise that resolves after the save attempt finishes.
     */
    async function handleSubmit(event) {
        event.preventDefault();
        if (isPreferenceUnavailable || isPreferenceSaving) return;
        const didSave = await handleSavePreference(draft);
        if (didSave) handleClose();
    }

    return (
        <div className="preferences-backdrop" role="presentation" onMouseDown={handleClose}>
            <form
                ref={dialogRef}
                className="preferences-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="preferences-title"
                aria-describedby="preferences-description"
                tabIndex="-1"
                onMouseDown={handleDialogMouseDown}
                onSubmit={handleSubmit}
            >
                <div className="preferences-header">
                    <h2 id="preferences-title">Preferences</h2>
                    <p id="preferences-description">Tell the assistant how you want it to respond.</p>
                </div>

                <div className="preferences-body">
                    <label htmlFor="user-preference">Instructions and preferences</label>
                    <textarea
                        id="user-preference"
                        value={draft}
                        onChange={handleDraftChange}
                        placeholder="Example: Be concise, use bullet points for steps, and explain unfamiliar terms."
                        rows="9"
                        maxLength={USER_PREFERENCE_MAX_LENGTH}
                        aria-describedby="preferences-storage-note preferences-character-count"
                        disabled={isPreferenceUnavailable || isPreferenceSaving}
                    />
                    <div className="preferences-meta">
                        <p id="preferences-storage-note" className="preferences-note">
                            {isPreferenceIncognitoEnabled
                                ? "Stored locally. Incognito is on, so these preferences are not sent to your selected provider."
                                : "Stored locally and sent with each request to your selected provider unless Incognito is turned on."}
                        </p>
                        <span id="preferences-character-count" className="preferences-character-count">{draft.length.toLocaleString()} / {USER_PREFERENCE_MAX_LENGTH.toLocaleString()}</span>
                    </div>
                    {preferenceLoadError && <p className="preferences-error" role="alert">{preferenceLoadError}</p>}
                    {preferenceError && <p className="preferences-error" role="alert">{preferenceError}</p>}
                </div>

                <div className="preferences-actions">
                    <button type="button" className="outline-btn preferences-cancel-btn" onClick={handleClose} disabled={isPreferenceSaving}>Cancel</button>
                    <button type="submit" className="preferences-save-btn" disabled={isPreferenceUnavailable || isPreferenceSaving}>
                        {isPreferenceSaving ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
