export const reasoningLevels = ["none", "low", "medium", "high", "xhigh", "max"];

/**
 * Builds the reasoning effort field for a provider request.
 * @param {string} level - The selected session reasoning level.
 * @returns {Object} A request field when the level is supported, otherwise an empty object.
 */
export function reasoningEffortField(level) {
    return reasoningLevels.includes(level) ? { reasoning_effort: level } : {};
}
