# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Architecture

### State Management

All chat, global-preference, and top-level dialog visibility state lives in `src/hooks/useChat.js` and is distributed via React Context (`src/context/ChatContext.jsx`). Components consume state through `useChatContext()` — never pass chat state as props. API-key values are intentionally local to `ApiKeyDialog` and never enter context. `choosenModelRef` is a `useRef` (not state) so model switches don't trigger re-renders.

### Provider / Profile System

- **Profiles** (`src/config/profiles.js`): Each LLM provider is a "profile" object `{ id, name, endpoint, contextMessageCount, maxTokens? }`. The active profile is persisted to `localStorage`.
- **Models** (`src/config/models.jsx` + per-provider files): Each provider exports a model array with `{ id, title, tag, val, desc, default, icon }`. `val` is the model string sent to the API; `default: true` marks the profile's default.
- **API routing** (`src/api/index.js`): `streamChat()` switches on `activeProfile.id` to delegate to the correct provider.

### Streaming Render Pattern

`useChat` holds two parallel pieces of state: `messages[]` (committed history) and `streamingMessage` (in-flight assistant turn). `MessageList` renders these as two separate children — `StaticMessageList` (memoized, renders `messages[]`) and a bare `<MessageItem>` for `streamingMessage`. Do not collapse them into a single list; the split is what prevents history from re-rendering on every streamed delta.

### API Key Storage

Keys are stored per provider in the dedicated `sora-api-keys` IndexedDB database via `src/storage/apiKeys.js`; the `apiKeys` store contains only `{ providerId, apiKey }`. The header opens `ApiKeyDialog`, a masked accessible dialog that shows configured status, saves/replaces a blank draft, and requires a second confirmation before deletion. Saved values are never revealed or copied into context.

IndexedDB is persistent and origin-isolated but plaintext: extension DevTools, local profile access, and compromised extension code can read it. Do not use organization-wide keys; prefer restricted, revocable, spend-limited provider keys. There is no env fallback or legacy `chrome.storage` migration. Provider adapters call `getApiKey(profile.id)` immediately before their request and guide the user to the key button when none exists.

The root `manifest.json` side-panel package is canonical. `vite.config.js` retains the generated popup manifest for development builds, but both manifests share the same CSP and require no `storage` permission. The build-only `client-secret-guard` rejects the three forbidden provider secret variables in client source and generated artifacts without printing secret values.

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
4. On subsequent sends: `buildApiMessages()` includes compact memory in a provider-neutral system message, combined with the global user preference only when preference Incognito is off.
5. `handleNewChat()` clears `compactMemory`.

**Provider note:** OpenAI and Grok accept `role: "system"` natively in the messages array. Claude does not — `src/api/claude.js` filters out system-role messages and passes them as the top-level `system` field instead.

**UI:** `MessageList` renders a memoized `CompactBanner` component (reads `compactMemory` from context) when compact memory is active. It is memoized separately so streaming deltas don't cause it to re-render.

### User Preferences

The More menu in `Header` opens `PreferencesDialog`, where the textarea draft remains local until Save succeeds and is capped at 4,000 visible characters. The committed `userPreference` and persistent `preferenceIncognitoEnabled` switch are application-wide IndexedDB settings, not part of a chat record. `buildApiMessages()` places the preference in system context before context-window-limited conversation messages only while Incognito is off; Incognito leaves compact memory and conversation context unchanged. Normal sends and regenerated responses use the current setting across profiles and resumed chats. `/compact` does not use the preference for its internal summary request.

## Adding a New Provider

1. Add the id constant to `provider` and a profile entry to `defaultProfiles` in `src/config/profiles.js`.
2. Create `src/config/<provider>.jsx` exporting a model array.
3. Create `src/api/<provider>.js` — see `src/api/AGENTS.md` for the required contract.
4. Add a `case` in `src/api/index.js` to route to the new implementation.
5. Add a `case` in `src/config/models.jsx` to return the new model list.
6. Add the provider API origin to both manifest CSPs. If a new provider's key could be supplied through a `VITE_*` value, add that variable name to the build guard's forbidden list.
