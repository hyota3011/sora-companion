# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Architecture

### State Management

All chat and global-preference state lives in `src/hooks/useChat.js` and is distributed via React Context (`src/context/ChatContext.jsx`). Components consume state through `useChatContext()` — never pass chat state as props. `choosenModelRef` is a `useRef` (not state) so model switches don't trigger re-renders.

### Provider / Profile System

- **Profiles** (`src/config/profiles.js`): Each LLM provider is a "profile" object `{ id, name, endpoint, contextMessageCount, maxTokens? }`. The active profile is persisted to `localStorage`.
- **Models** (`src/config/models.jsx` + per-provider files): Each provider exports a model array with `{ id, title, tag, val, desc, default, icon }`. `val` is the model string sent to the API; `default: true` marks the profile's default.
- **API routing** (`src/api/index.js`): `streamChat()` switches on `activeProfile.id` to delegate to the correct provider.

### Streaming Render Pattern

`useChat` holds two parallel pieces of state: `messages[]` (committed history) and `streamingMessage` (in-flight assistant turn). `MessageList` renders these as two separate children — `StaticMessageList` (memoized, renders `messages[]`) and a bare `<MessageItem>` for `streamingMessage`. Do not collapse them into a single list; the split is what prevents history from re-rendering on every streamed delta.

### API Key Storage

Keys are stored per-provider in `chrome.storage.local` via `src/api/keys.js` (key name: `apiKey_<profileId>`). In a plain browser build keys must come from env vars (`VITE_ANTHROPIC_KEY`, `VITE_XAI_KEY`, `VITE_OPENAI_KEY`). The Manifest V3 build is configured through `@crxjs/vite-plugin` in `vite.config.js`. `VITE_PROFILE=prod` hides the existing key from the prompt dialog in the header.

### Image Attachments

Images are read as data URLs (`FileReader`), validated by loading into an `Image` element, then stored as `{ id, name, mimeType, dataUrl, size }`. `src/api/imageMessages.js` converts this to provider format before each API call: `image_url` objects for OpenAI/Grok, `base64` source blocks for Claude.

### Browser Tab Attachments

`src/api/tabCapture.js` queries all Chrome windows and uses `chrome.scripting.executeScript()` to capture a selected page's rendered text. `useChat` stores selected tabs as `{ id, title, url, content }` in `attachedTabs`; on send, each tab is retained on the user message and `buildApiMessages()` appends its title, URL, and captured text to the provider-bound user content. The composer and message bubble intentionally render only tab-title chips. Tab capture requires the extension's `tabs`, `scripting`, and `<all_urls>` permissions; non-HTTP(S), discarded, restricted, or injection-failed tabs are unavailable.

### Slash Commands

Typing `/` opens a keyboard-accessible composer menu. `/tabs` opens the multi-select tab picker and `/compact` runs the existing conversation compaction flow. Arrow keys change the active command, Enter selects it, and Escape clears the command input.

### `/compact` Command

Typing `/compact` and pressing Enter (or clicking Send) triggers conversation compaction:

1. `handleSend()` in `useChat.js` intercepts the literal string `/compact` before normal send logic.
2. `handleCompact()` streams a LLM-generated summary of the full `messages[]` history (no context-window slicing — everything is sent).
3. On success: `compactMemory` state is set to the summary text, `messages[]` is cleared, and `isFirstMessage` stays `false` so the chat view remains visible.
4. On subsequent sends: `buildApiMessages()` includes compact memory in a provider-neutral system message, combined with the global user preference when one is saved.
5. `handleNewChat()` clears `compactMemory`.

**Provider note:** OpenAI and Grok accept `role: "system"` natively in the messages array. Claude does not — `src/api/claude.js` filters out system-role messages and passes them as the top-level `system` field instead.

**UI:** `MessageList` renders a memoized `CompactBanner` component (reads `compactMemory` from context) when compact memory is active. It is memoized separately so streaming deltas don't cause it to re-render.

### User Preferences

The More menu in `Header` opens `PreferencesDialog`, where the textarea draft remains local until Save succeeds and is capped at 4,000 visible characters. The committed `userPreference` is an application-wide IndexedDB setting, not part of a chat record. `buildApiMessages()` places it in the system context before context-window-limited conversation messages, so normal sends and regenerated responses use the current value across profiles and resumed chats. `/compact` does not use the preference for its internal summary request.

## Adding a New Provider

1. Add the id constant to `provider` and a profile entry to `defaultProfiles` in `src/config/profiles.js`.
2. Create `src/config/<provider>.jsx` exporting a model array.
3. Create `src/api/<provider>.js` — see `src/api/AGENTS.md` for the required contract.
4. Add a `case` in `src/api/index.js` to route to the new implementation.
5. Add a `case` in `src/config/models.jsx` to return the new model list.
