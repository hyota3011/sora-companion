import { openai } from './openai';
import { grok } from './grok';
import { provider } from './profiles';

/**
 * Retrieves the list of available models for the currently active profile.
 * 
 * @returns {Array<Object>} An array of model definition objects.
 */
export function getModels() {
    const activeId = localStorage.getItem("activeProfileId");
    switch (activeId) {
        case provider.OPENAI:
            return openai;
        case provider.GROK:
            return grok;
        default:
            return openai;
    }
}

/**
 * Finds and returns the default model object for the current profile.
 * 
 * @returns {Object|undefined} The default model object, or undefined if not found.
 */
export function getDefaultModel() {
    return getModels().find(model => model.default);
}

/**
 * Retrieves the API value (identifier) of the default model for the current profile.
 * 
 * @returns {string|undefined} The value of the default model.
 */
export function getValueOfDefaultModel() {
    return getModels().find(model => model.default)?.val;
}

/**
 * Retrieves the internal ID of the default model for the current profile.
 * 
 * @returns {string|undefined} The ID of the default model.
 */
export function getIdOfDefaultModel() {
    return getModels().find(model => model.default)?.id;
}