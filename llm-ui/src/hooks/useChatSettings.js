import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { USER_PREFERENCE_MAX_LENGTH } from "../config/preferences.js";
import {
    getPreferenceIncognitoEnabled,
    getUserPreference,
    savePreferenceIncognitoEnabled,
    saveUserPreference,
} from "../storage/chatHistory.js";

/**
 * Manages global preferences, preference Incognito state, and top-level dialogs.
 * @returns {Object} Settings state and actions.
 */
export function useChatSettings() {
    const [userPreference, setUserPreference] = useState("");
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
    const [isPreferenceLoading, setIsPreferenceLoading] = useState(true);
    const [isPreferenceSaving, setIsPreferenceSaving] = useState(false);
    const [preferenceLoadError, setPreferenceLoadError] = useState("");
    const [preferenceError, setPreferenceError] = useState("");
    const [isPreferenceIncognitoEnabled, setIsPreferenceIncognitoEnabled] = useState(false);
    const [isPreferenceIncognitoSaving, setIsPreferenceIncognitoSaving] = useState(false);
    const [preferenceIncognitoError, setPreferenceIncognitoError] = useState("");
    const preferenceLoadIdRef = useRef(0);

    /**
     * Loads global preference settings while ignoring results from superseded reads.
     * @returns {Promise<boolean>} Whether the preference settings were loaded successfully.
     */
    const loadPreferenceSettings = useCallback(async () => {
        const loadId = preferenceLoadIdRef.current + 1;
        preferenceLoadIdRef.current = loadId;
        setIsPreferenceLoading(true);
        try {
            const [savedPreference, savedIncognitoEnabled] = await Promise.all([
                getUserPreference(),
                getPreferenceIncognitoEnabled(),
            ]);
            if (preferenceLoadIdRef.current !== loadId) return false;
            setUserPreference(savedPreference);
            setIsPreferenceIncognitoEnabled(savedIncognitoEnabled);
            setPreferenceLoadError("");
            return true;
        } catch (error) {
            if (preferenceLoadIdRef.current === loadId) {
                console.error("Preference settings initialization failed:", error);
                setPreferenceLoadError("Your saved preference settings could not be loaded. Close and reopen this dialog to retry.");
            }
            return false;
        } finally {
            if (preferenceLoadIdRef.current === loadId) setIsPreferenceLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadPreferenceSettings();
        return () => { preferenceLoadIdRef.current += 1; };
    }, [loadPreferenceSettings]);

    /**
     * Opens the global preferences dialog and retries a failed settings read.
     * @returns {void}
     */
    const handleOpenPreferences = useCallback(() => {
        setPreferenceError("");
        setIsApiKeyDialogOpen(false);
        setIsPreferencesOpen(true);
        if (preferenceLoadError) void loadPreferenceSettings();
    }, [loadPreferenceSettings, preferenceLoadError]);

    /**
     * Closes the global preferences dialog and clears transient save errors.
     * @returns {void}
     */
    const handleClosePreferences = useCallback(() => {
        setIsPreferencesOpen(false);
        setPreferenceError("");
    }, []);

    /**
     * Opens the selected provider's API-key management dialog.
     * @returns {void}
     */
    const handleOpenApiKeyDialog = useCallback(() => {
        setIsPreferencesOpen(false);
        setIsApiKeyDialogOpen(true);
    }, []);

    /**
     * Closes the API-key dialog without retaining transient API-key input.
     * @returns {void}
     */
    const handleCloseApiKeyDialog = useCallback(() => {
        setIsApiKeyDialogOpen(false);
    }, []);

    /**
     * Persists a new global preference for subsequent model requests.
     * @param {string} value - The preference draft entered by the user.
     * @returns {Promise<boolean>} Whether the preference was saved successfully.
     */
    const handleSavePreference = useCallback(async (value) => {
        const normalizedPreference = value.trim();
        if (normalizedPreference.length > USER_PREFERENCE_MAX_LENGTH) {
            setPreferenceError(`Preferences must be ${USER_PREFERENCE_MAX_LENGTH.toLocaleString()} characters or fewer.`);
            return false;
        }
        setIsPreferenceSaving(true);
        setPreferenceError("");
        try {
            await saveUserPreference(normalizedPreference);
            setUserPreference(normalizedPreference);
            return true;
        } catch (error) {
            console.error("Unable to save user preference:", error);
            setPreferenceError("Your preferences could not be saved.");
            return false;
        } finally {
            setIsPreferenceSaving(false);
        }
    }, []);

    /**
     * Toggles preference Incognito mode and persists the requested setting.
     * @returns {Promise<boolean>} Whether the requested setting was saved successfully.
     */
    const handleTogglePreferenceIncognito = useCallback(async () => {
        if (isPreferenceIncognitoSaving) return false;
        const nextValue = !isPreferenceIncognitoEnabled;
        setIsPreferenceIncognitoEnabled(nextValue);
        setIsPreferenceIncognitoSaving(true);
        setPreferenceIncognitoError("");
        try {
            await savePreferenceIncognitoEnabled(nextValue);
            return true;
        } catch (error) {
            console.error("Unable to save preference Incognito setting:", error);
            setPreferenceIncognitoError(nextValue
                ? "Incognito is active for this popup, but the setting could not be saved."
                : "Incognito is off for this popup, but the setting could not be saved.");
            return false;
        } finally {
            setIsPreferenceIncognitoSaving(false);
        }
    }, [isPreferenceIncognitoEnabled, isPreferenceIncognitoSaving]);

    return useMemo(() => ({
        userPreference,
        isPreferencesOpen,
        isApiKeyDialogOpen,
        isPreferenceLoading,
        isPreferenceSaving,
        preferenceLoadError,
        preferenceError,
        isPreferenceIncognitoEnabled,
        isPreferenceIncognitoSaving,
        preferenceIncognitoError,
        handleOpenPreferences,
        handleClosePreferences,
        handleOpenApiKeyDialog,
        handleCloseApiKeyDialog,
        handleSavePreference,
        handleTogglePreferenceIncognito,
    }), [handleCloseApiKeyDialog, handleClosePreferences, handleOpenApiKeyDialog, handleOpenPreferences, handleSavePreference, handleTogglePreferenceIncognito, isApiKeyDialogOpen, isPreferenceIncognitoEnabled, isPreferenceIncognitoSaving, isPreferenceLoading, isPreferenceSaving, isPreferencesOpen, preferenceError, preferenceIncognitoError, preferenceLoadError, userPreference]);
}
