# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

A browser-based multi-provider LLM chat UI built as a React + Vite web app (inside `llm-ui/`). Supports OpenAI, Grok, and Claude; Gemini is stubbed out. Calls provider APIs directly from the browser with no backend server. The canonical installed package is the root Manifest V3 Chrome side-panel extension, which loads `llm-ui/dist/index.html`.

## Commands

All commands run from `llm-ui/`:

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server (hot reload)
npm run build      # development build to dist/
npm run build:prod # production build to dist/ with client-secret guard
npm run lint       # run ESLint
npm test           # run the Vitest regression suite
npm run test:watch # run Vitest in watch mode
npm run preview    # preview the production build locally
```

## Browser Tab Context

The app is packaged as a Manifest V3 Chrome side-panel extension. It uses `tabs` and `scripting` permissions plus `<all_urls>` host access. `/tabs` opens a multi-select picker across Chrome windows, captures a selected page's rendered text when confirmed, and attaches it to the next request. Restricted, discarded, and non-HTTP(S) pages are unavailable. See `llm-ui/AGENTS.md` for the state and UI flow.

## API Key Storage

Provider keys are entered through the header's masked API-key dialog and stored per provider in the extension-origin IndexedDB database `sora-api-keys`, store `apiKeys`, as `{ providerId, apiKey }`. `src/storage/apiKeys.js` exposes async get, existence-check, save, and delete functions; provider adapters read a key only immediately before making their request. Keys never enter chat state, chat-history records, user preferences, URLs, or logs.

This storage is persistent and origin-isolated, but plaintext and not a secret vault. Extension DevTools, local profile access, or compromised extension code can read it. Use personal, restricted, revocable, spend-limited provider keys. The app never reads provider keys from `VITE_*` values or `chrome.storage`, and it does not migrate legacy keys; previously bundled keys must be revoked and re-entered.

Both manifests use an extension-page CSP that restricts `connect-src` to the three provider API origins and `img-src` to extension-local and `data:` images. Assistant Markdown images are rendered as inert “Image blocked” notices, and the tab picker uses local placeholders instead of remote favicons. The Vite build guard rejects provider-secret environment references in client source and configured secret values in generated assets without printing a credential.

## Chat History

Chat history is local to the browser profile and is stored in IndexedDB by `llm-ui/src/storage/chatHistory.js`. The `chats` store is keyed by conversation ID and indexed by `updatedAt`; records contain `{ id, title, messages, compactMemory, createdAt, updatedAt }`. A `settings` store contains application-wide settings, including history retention, user preference text, and preference Incognito state.

`useChat` composes the chat domain hooks. `useChatSession` owns the active saved-chat ID and conversation state, while `useChatHistory` persists committed messages after a short debounce. Streaming deltas, composer drafts, and image attachments are never persisted. Persisted messages retain text, feedback/error state, and attached tab data so resumed chats retain their browser-tab context. `/compact` persists its generated `compactMemory` even though it clears the visible messages list; loading that conversation restores the compact banner and resumes with the memory included in provider context. Starting a new chat persists already committed turns, then aborts and discards the in-flight request; request tokens prevent late deltas, errors, or summaries from changing the new session.

The header's More menu opens a left-side History drawer. Selecting an entry loads it into the regular editable chat flow and refreshes its `updatedAt`; continuing the conversation updates that same record. Titles use the latest user text (with a date/time fallback for textless chats). Saved chats are provider/model agnostic: a resumed chat uses the provider and model currently selected in the UI.

Retention defaults to 30 days and can be changed in History to 7, 30, 90 days, or Never. `Never` is stored as an explicit `null` setting, distinct from an absent setting that defaults to 30 days. Expiration is based on `updatedAt` and is cleaned up on app startup, when History opens, and after a retention change. Cleanup is opportunistic while the UI is open; no background alarm is used.

History supports checkbox selection, a tri-state Select all control, and immediate bulk deletion without a confirmation step or undo. `deleteChats()` removes only selected records and writes a durable tombstone for each deleted ID in the same IndexedDB transaction; retention, preferences, and API keys are unaffected. Deletion is unavailable while streaming or another history operation is running. Deleting the active saved chat clears its transcript and composer draft, so no visible content can be re-saved under a new ID. Tombstones make saves with deleted IDs fail across open side panels, but deletion is logical IndexedDB record removal rather than forensic secure erasure of browser-profile storage or backups.

## User Preferences

The header's More menu shows a Preferences action immediately after History and an Incognito switch beneath it, both using temporary icons. Preferences opens a centered, accessible modal with a title, explanatory text, a multiline instructions textarea, and Cancel/Save actions aligned at the bottom right. Escape, a backdrop click, or Cancel closes the modal without changing the committed value; Save trims and persists the draft. The textarea has a visible 4,000-character limit and counter. It is focused on open, keyboard focus stays inside the modal while the background is inert, and focus returns to the More button on close. Load and save errors remain visible; reopening after a load failure retries the stored value before editing is enabled.

Preference and top-level dialog state is owned by `useChatSettings` and distributed through `SettingsContext`; conversation, composer, and history state use their own contexts. The text and its global Incognito switch are stored in IndexedDB's existing `settings` store under `userPreference` and `preferenceIncognitoEnabled`, so they survive new chats, history cleanup, provider changes, and side-panel reloads. The Preferences action, normal message send, and response regeneration are briefly disabled while the saved settings are being read, preventing a request from racing the initial load. An empty Save clears the effective preference.

For normal sends and regenerated responses, `buildApiMessages()` prepends one provider-neutral `system` message containing any compacted conversation memory and, unless preference Incognito is enabled, the current preference before the context-window-limited chat messages. Incognito suppresses only saved preference text; conversation context and compact memory remain unchanged. OpenAI and Grok receive that system message in their message arrays; Claude promotes it to its top-level `system` field. Changes affect the next request, including resumed chats, but do not alter an in-flight response or existing saved-chat records. The internal `/compact` summarization call intentionally excludes user preferences so response-style instructions do not distort compact memory.
