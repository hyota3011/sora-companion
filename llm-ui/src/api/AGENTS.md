# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Provider Implementation Contract

Every provider file must export a single async generator:

```js
export async function* streamChat(messages, model, profile, { signal } = {}) { ... }
```

- `messages` — array of `{ role, content, images[] }` already trimmed to the context window
- `model` — the raw API model string (the `val` field from the model config)
- `profile` — the active profile object; use `profile.endpoint` for the URL and call `getApiKey(profile.id)` from `src/storage/apiKeys.js` immediately before the request
- `signal` — optional `AbortSignal`; pass it to `fetch` so a discarded stream stops at the network boundary
- Yield plain text strings (deltas only, no metadata)
- Throw a plain, non-secret-bearing `Error` on missing keys, non-200 responses, or stream-level errors — the caller renders `error.message` directly to the user

## SSE Parsing Notes

- **OpenAI / Grok** (OpenAI-compatible): split buffer on `\n`, skip `[DONE]`, parse `choices[0].delta.content`.
- **Claude**: split buffer on `\n\n`, look for `content_block_delta` events with `delta.type === "text_delta"`, yield `delta.text`. Requires headers `x-api-key`, `anthropic-version: 2023-06-01`, and `anthropic-dangerous-direct-browser-access: true`.
- Always release the reader in a `finally` block (`reader.releaseLock()`).
- Swallow `SyntaxError` on individual chunks (log and `continue`); re-throw everything else.
