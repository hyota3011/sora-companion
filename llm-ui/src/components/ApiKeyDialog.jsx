import { useCallback, useEffect, useRef, useState } from "react";
import { deleteApiKey, hasApiKey, saveApiKey } from "../storage/apiKeys";
import { useConversationContext, useSettingsContext } from "../context/ChatContext";

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[href]",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Displays the selected provider's locally stored API-key controls without revealing its value.
 * @returns {import("react").ReactElement|null} The API-key management dialog.
 */
export default function ApiKeyDialog() {
    const { activeProfile } = useConversationContext();
    const { handleCloseApiKeyDialog } = useSettingsContext();
    const [draft, setDraft] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isLoadError, setIsLoadError] = useState(false);
    const [error, setError] = useState("");
    const dialogRef = useRef(null);
    const inputRef = useRef(null);
    const providerId = activeProfile?.id || "";
    const providerName = activeProfile?.name || "selected provider";
    const isBusy = isSaving || isDeleting;
    const isUnavailable = isLoading || isLoadError;

    /**
     * Closes the dialog and restores focus to the API-key button in the header.
     * @returns {void}
     */
    const closeDialog = useCallback(() => {
        setDraft("");
        setError("");
        setIsConfirmingDelete(false);
        setIsLoadError(false);
        handleCloseApiKeyDialog();
        window.requestAnimationFrame(() => document.getElementById("header-api-key-button")?.focus());
    }, [handleCloseApiKeyDialog]);

    /**
     * Closes the dialog only when no persistence operation is in progress.
     * @returns {void}
     */
    const handleClose = useCallback(() => {
        if (isBusy) return;
        closeDialog();
    }, [closeDialog, isBusy]);

    useEffect(() => {
        let cancelled = false;

        /**
         * Loads only the configured status for the active provider's API key.
         * @returns {Promise<void>} Resolves after the status check finishes.
         */
        async function loadKeyStatus() {
            if (!providerId) return;
            setIsLoading(true);
            setError("");
            setIsLoadError(false);
            try {
                const configured = await hasApiKey(providerId);
                if (!cancelled) setIsConfigured(configured);
            } catch {
                if (!cancelled) {
                    setIsLoadError(true);
                    setError("Your saved API key could not be checked. Close and reopen this dialog to retry.");
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void loadKeyStatus();
        return () => { cancelled = true; };
    }, [providerId]);

    useEffect(() => {
        /**
         * Keeps keyboard focus within the modal and closes it with Escape when possible.
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
        if (isBusy || isLoading || isLoadError) {
            dialogRef.current?.focus();
            return;
        }
        inputRef.current?.focus();
    }, [isBusy, isLoadError, isLoading]);

    /**
     * Updates the temporary, masked API-key draft without persisting it.
     * @param {import("react").ChangeEvent<HTMLInputElement>} event - The input change event.
     * @returns {void}
     */
    function handleDraftChange(event) {
        setDraft(event.target.value);
        if (error && !isLoadError) setError("");
    }

    /**
     * Prevents clicks inside the dialog from being treated as backdrop clicks.
     * @param {import("react").MouseEvent<HTMLFormElement>} event - The dialog mouse event.
     * @returns {void}
     */
    function handleDialogMouseDown(event) {
        event.stopPropagation();
    }

    /**
     * Saves or replaces the current provider's API key, then closes the dialog.
     * @param {import("react").FormEvent<HTMLFormElement>} event - The form submit event.
     * @returns {Promise<void>} Resolves after the save attempt finishes.
     */
    async function handleSubmit(event) {
        event.preventDefault();
        if (isUnavailable || isBusy) return;

        const normalizedDraft = draft.trim();
        if (!normalizedDraft) {
            setError("Enter an API key before saving.");
            return;
        }

        setIsSaving(true);
        setError("");
        try {
            await saveApiKey(providerId, normalizedDraft);
            setDraft("");
            setIsConfigured(true);
            setIsSaving(false);
            closeDialog();
        } catch {
            setError("The API key could not be saved.");
            setIsSaving(false);
        }
    }

    /**
     * Starts the delete confirmation step for the saved API key.
     * @returns {void}
     */
    function handleDeleteRequest() {
        if (isBusy || isUnavailable) return;
        setError("");
        setIsConfirmingDelete(true);
    }

    /**
     * Cancels the inline confirmation required before deleting an API key.
     * @returns {void}
     */
    function handleCancelDelete() {
        if (isBusy) return;
        setIsConfirmingDelete(false);
    }

    /**
     * Deletes the current provider's saved API key after explicit confirmation.
     * @returns {Promise<void>} Resolves after the delete attempt finishes.
     */
    async function handleDeleteConfirm() {
        if (!isConfirmingDelete || isBusy || isUnavailable) return;

        setIsDeleting(true);
        setError("");
        try {
            await deleteApiKey(providerId);
            setIsConfigured(false);
            setIsDeleting(false);
            closeDialog();
        } catch {
            setError("The API key could not be deleted.");
            setIsDeleting(false);
        }
    }

    if (!providerId) return null;

    return (
        <div className="api-key-backdrop" role="presentation" onMouseDown={handleClose}>
            <form
                ref={dialogRef}
                className="api-key-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="api-key-title"
                aria-describedby="api-key-description api-key-storage-note"
                aria-busy={isBusy || isLoading}
                tabIndex="-1"
                onMouseDown={handleDialogMouseDown}
                onSubmit={handleSubmit}
            >
                <div className="api-key-header">
                    <h2 id="api-key-title">{providerName} API key</h2>
                    <p id="api-key-description">Manage the key used only for {providerName} requests.</p>
                </div>

                <div className="api-key-body">
                    <p className="api-key-status" aria-live="polite">
                        {isLoading ? "Checking saved key…" : isConfigured ? "A key is saved for this provider." : "No key is saved for this provider."}
                    </p>
                    <label htmlFor="provider-api-key">{isConfigured ? "Replace API key" : "API key"}</label>
                    <input
                        ref={inputRef}
                        id="provider-api-key"
                        type="password"
                        value={draft}
                        onChange={handleDraftChange}
                        placeholder="Paste a new API key"
                        autoComplete="new-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        aria-describedby="api-key-storage-note"
                        disabled={isUnavailable || isBusy}
                    />
                    <p id="api-key-storage-note" className="api-key-note">
                        Stored locally in this browser profile. It is not encrypted and is never shown again by this app.
                    </p>
                    {error && <p className="api-key-error" role="alert">{error}</p>}
                    {isConfirmingDelete && (
                        <p className="api-key-delete-confirmation" role="alert">
                            Delete the saved key for {providerName}? This does not revoke it with the provider.
                        </p>
                    )}
                </div>

                <div className="api-key-actions">
                    {isConfigured && !isConfirmingDelete && (
                        <button type="button" className="api-key-delete-btn" onClick={handleDeleteRequest} disabled={isUnavailable || isBusy}>
                            Delete key
                        </button>
                    )}
                    {isConfirmingDelete && (
                        <>
                            <button type="button" className="outline-btn api-key-cancel-btn" onClick={handleCancelDelete} disabled={isBusy}>
                                Keep key
                            </button>
                            <button type="button" className="api-key-delete-confirm-btn" onClick={() => { void handleDeleteConfirm(); }} disabled={isBusy}>
                                {isDeleting ? "Deleting…" : "Delete key"}
                            </button>
                        </>
                    )}
                    <span className="api-key-actions-spacer" />
                    <button type="button" className="outline-btn api-key-cancel-btn" onClick={handleClose} disabled={isBusy}>
                        Cancel
                    </button>
                    <button type="submit" className="api-key-save-btn" disabled={isUnavailable || isBusy}>
                        {isSaving ? "Saving…" : isConfigured ? "Replace" : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
