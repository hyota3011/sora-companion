---
name: conventions
description: Coding and documentation conventions for this repository, including camelCase, JSDoc, and synchronized AGENTS.md guidance.
---
# Coding and Function Conventions

This skill governs the structure, naming, and documentation of functions added or refactored within this project.

## Conventions

1. **Function Naming**: Always use `camelCase` for function names. Names should be descriptive, starting with a verb where possible (e.g., `fetchUserData`, `calculateTotal`, `toggleTheme`).
2. **Inline Documentation**: Always write JSDoc-style documentation blocks directly above the function definition.
   - Provide a clear, concise description of what the function does.
   - Document all parameters using `@param` with their types and descriptions.
   - Document the return value using `@returns` with the type and description.
3. **Documentation Synchronization**: When a change alters behavior, architecture, storage, commands, or security boundaries, update the root `AGENTS.md` and the nearest applicable nested `AGENTS.md` in the same change. Update a skill's frontmatter description and body when the rule it governs changes.

## Example Patterns

### Proper Function Definition and Documentation
```javascript
/**
 * Sends a message to the active LLM provider and retrieves the response.
 * @param {string} messageText - The user prompt content to send.
 * @param {Object} activeProfile - The current active provider profile configurations.
 * @param {Array<Object>} chatHistory - Previous message objects in the active chat.
 * @returns {Promise<Object>} Resolves to the response message structure.
 */
async function sendMessageToProvider(messageText, activeProfile, chatHistory) {
  // Function logic goes here
}
```

### Contrast Table

| Rule | Incorrect | Correct |
| :--- | :--- | :--- |
| **Function Naming** | `function send_message()` (snake_case)<br>`function SendMessage()` (PascalCase) | `function sendMessage()` (camelCase) |
| **Documentation Location** | Inside the function body, or missing entirely. | Directly above the function definition. |