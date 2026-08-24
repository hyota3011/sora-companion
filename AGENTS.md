# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

A browser-based multi-provider LLM chat UI built as a React + Vite web app (inside `llm-ui/`). Supports OpenAI, Grok, and Claude; Gemini is stubbed out. Calls provider APIs directly from the browser — no backend server.

## Commands

All commands run from `llm-ui/`:

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server (hot reload)
npm run build      # development build to dist/
npm run build:prod # production build (clears VITE_SECRET_KEY)
npm run lint       # run ESLint
npm run preview    # preview the production build locally
```

There are no tests configured in this project.

## Browser Tab Context

The app is packaged as a Manifest V3 Chrome toolbar-popup extension. It uses `tabs` and `scripting` permissions plus `<all_urls>` host access. `/tabs` opens a multi-select picker across Chrome windows, captures a selected page's rendered text when confirmed, and attaches it to the next request. Restricted, discarded, and non-HTTP(S) pages are unavailable. See `llm-ui/AGENTS.md` for the state and UI flow.

## Chat History

Chat history is local to the browser profile and is stored in IndexedDB by `llm-ui/src/storage/chatHistory.js`. The `chats` store is keyed by conversation ID and indexed by `updatedAt`; records contain `{ id, title, messages, compactMemory, createdAt, updatedAt }`. A `settings` store contains application-wide settings, including history retention and user preference text.

`useChat` owns the active saved-chat ID and persists committed messages after a short debounce. Streaming deltas, composer drafts, and image attachments are never persisted. Persisted messages retain text, feedback/error state, and attached tab data so resumed chats retain their browser-tab context. `/compact` persists its generated `compactMemory` even though it clears the visible messages list; loading that conversation restores the compact banner and resumes with the memory included in provider context.

The header's More menu opens a left-side History drawer. Selecting an entry loads it into the regular editable chat flow and refreshes its `updatedAt`; continuing the conversation updates that same record. Titles use the latest user text (with a date/time fallback for textless chats). Saved chats are provider/model agnostic: a resumed chat uses the provider and model currently selected in the UI.

Retention defaults to 30 days and can be changed in History to 7, 30, 90 days, or Never. Expiration is based on `updatedAt` and is cleaned up on app startup, when History opens, and after a retention change. Cleanup is opportunistic while the UI is open; no background alarm is used.

## User Preferences

The header's More menu shows a Preferences action immediately after History, using `BrainIcon` as the temporary icon. It opens a centered, accessible modal with a title, explanatory text, a multiline instructions textarea, and Cancel/Save actions aligned at the bottom right. Escape, a backdrop click, or Cancel closes the modal without changing the committed value; Save trims and persists the draft. The textarea has a visible 4,000-character limit and counter. It is focused on open, keyboard focus stays inside the modal while the background is inert, and focus returns to the More button on close. Load and save errors remain visible; reopening after a load failure retries the stored value before editing is enabled.

Preference state is owned by `useChat` and distributed through `ChatContext`. The value is global rather than conversation-specific and is stored in IndexedDB's existing `settings` store under `userPreference`, so it survives new chats, history cleanup, provider changes, and extension-popup reloads. The Preferences action, normal message send, and response regeneration are briefly disabled while the saved value is being read, preventing a request from racing the initial load. An empty Save clears the effective preference.

For normal sends and regenerated responses, `buildApiMessages()` prepends one provider-neutral `system` message containing the current preference and any compacted conversation memory before the context-window-limited chat messages. OpenAI and Grok receive that system message in their message arrays; Claude promotes it to its top-level `system` field. Changes affect the next request, including resumed chats, but do not alter an in-flight response or existing saved-chat records. The internal `/compact` summarization call intentionally excludes user preferences so response-style instructions do not distort compact memory.
