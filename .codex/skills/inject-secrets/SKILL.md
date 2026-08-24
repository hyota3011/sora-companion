---
name: inject-secrets
description: Guidelines for managing API keys, credentials, and secrets, ensuring they are always injected from the environment and never hardcoded or prompted interactively.
---
# Environment Secrets Injection

This skill guides how API keys, credentials, and sensitive configurations must be loaded and managed within this repository.

## Core Rules

1. **No Hardcoded Secrets**: Under no circumstances should API keys, client secrets, database passwords, or private tokens be hardcoded in any source file or committed to version control.
2. **Environment Variable Injection**: All secrets must be loaded from environment variables.
   - For client-side Vite projects, load them using `import.meta.env.VITE_...` (e.g., `import.meta.env.VITE_ANTHROPIC_KEY`, `import.meta.env.VITE_XAI_KEY`, `import.meta.env.VITE_OPENAI_KEY`).
   - For Node.js/server-side files, load them using `process.env.NAME`.
3. **Graceful Degradation & User Prompts**: If an environment variable is not defined, fall back gracefully to alternative configurations (e.g. checking local browser storage) before prompting the user or throwing an error.

## Example Patterns

### Client-Side (React/Vite)
```javascript
// Accessing environment variables using Vite's env mechanism
const anthropicKey = import.meta.env.VITE_ANTHROPIC_KEY;
const openaiKey = import.meta.env.VITE_OPENAI_KEY;

/**
 * Retrieves the API key for a specified provider.
 * Falls back to environment variables.
 * @param {string} providerName - The name of the provider.
 * @returns {string|null} The resolved API key.
 */
function getApiKey(providerName) {
  switch (providerName) {
    case 'anthropic':
      return import.meta.env.VITE_ANTHROPIC_KEY || null;
    case 'openai':
      return import.meta.env.VITE_OPENAI_KEY || null;
    default:
      return null;
  }
}
```
