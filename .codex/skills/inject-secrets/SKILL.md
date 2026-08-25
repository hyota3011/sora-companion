---
name: inject-secrets
description: Handle repository secrets safely, using server-side environment injection while preventing client bundles from exposing credentials.
---
# Secret Handling

This skill guides how API keys, credentials, and sensitive configurations must be loaded and managed within this repository.

## Core Rules

1. **No Hardcoded Secrets**: Under no circumstances should API keys, client secrets, database passwords, or private tokens be hardcoded in any source file or committed to version control.
2. **Server-side Secrets**: Node.js or backend-only secrets must be injected through `process.env.NAME` and never sent to a browser client.
3. **Vite Client Boundary**: Never read API keys from `import.meta.env` in Vite client code. `VITE_*` values are compiled into distributable assets and are not secret.
4. **This Browser-only Extension**: Provider keys are user-entered through the masked API-key dialog and stored per provider in extension-origin IndexedDB. This is an explicit plaintext-local-storage tradeoff, not a secret vault: do not claim encryption, log keys, put them in React context, or persist them in chat records.
5. **Requests and Errors**: Read a key only immediately before the provider request. Missing or unavailable storage must fail with a safe actionable message; never echo the key or raw storage errors.
6. **Future Protection**: Meaningful at-rest encryption requires a separately supplied passphrase, a native keychain, or a backend. Do not add co-located encryption that only obscures the key.