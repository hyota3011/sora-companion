# LLM Chat UI

A browser-based chat interface for working with multiple LLM providers from one UI. The app supports streaming responses, provider/model switching, API key storage, and image attachments in the composer.

## What matters most

If you only read one section, read this one:

- `src/hooks/useChat.js` is the main state engine. It owns messages, streaming state, selected images, and send logic.
- `src/context/ChatContext.jsx` exposes that state to the UI so components stay thin.
- `src/components/ChatInput.jsx` is the composer surface. It handles typing, image upload, drag-and-drop, image preview, and send actions.
- `src/api/index.js` dispatches requests to the active provider.
- `src/api/imageMessages.js` is the image payload adapter. If image requests break, start here.

## Current user-facing features

- Text chat with streaming assistant responses
- Provider switching and model switching
- Persistent per-provider API key management through a masked dialog
- Image upload from file picker
- Drag-and-drop images into the input area
- Paste images directly from the clipboard
- Thumbnail previews for attached images
- Remove attached images before send
- Attached images remain part of sent user messages, so they can still be included in later requests while that message stays inside the context window
- **Message Action Toolbar**: Actionable buttons on assistant responses for enhanced control
- **Regenerate (Refresh)**: Resends the last user message to obtain a new response
- **Message Editing**: Restores the last user message (including images) to the composer for quick modification
- **Response Feedback**: Toggleable Like/Dislike buttons for rating assistant output
- **Copy & Share**: Easy one-click copying of assistant messages to the clipboard

## API key security

Provider keys are saved per provider in the extension-origin IndexedDB database `sora-api-keys`. They persist across side-panel sessions but are plaintext local storage, not a password vault. The app never displays a saved key again, never stores keys in chats or preferences, and reads each key only immediately before a provider request.

Do not put provider credentials in Vite `VITE_*` variables: they are bundled into client assets. Use personal, restricted, revocable, spend-limited keys, and use the header key button to save, replace, or delete them.

## Project structure

### `src/components/`

- `Header.jsx`: top bar with new chat, provider selection, and API key actions
- `InitialView.jsx`: empty-state screen before the first message
- `MessageList.jsx`: renders chat history plus the current streaming message
- `MessageItem.jsx`: renders each message bubble; assistant messages support markdown, code blocks, and an action toolbar (Refresh, Edit, Feedback, Copy/Share); user messages can also render sent images
- `ChatInput.jsx`: chat composer with textarea, attachment menu, drag-and-drop support, image previews, and model selector
- `ApiKeyDialog.jsx`: accessible masked dialog for saving, replacing, and deleting the active provider key

### `src/context/`

- `ChatContext.jsx`: provides the full chat state and handlers from `useChat`

### `src/hooks/`

- `useChat.js`: the core workflow for message history, image attachment state, validation, streaming, and context window construction. Now includes handlers for message regeneration, editing history, and feedback toggling.

### `src/api/`

- `index.js`: provider-agnostic router for `streamChat`
- `openai.js`, `grok.js`, `claude.js`: provider-specific request/stream handling
- `imageMessages.js`: converts the app's internal message shape into the image format expected by each provider

### `src/storage/`

- `apiKeys.js`: IndexedDB storage utilities for per-provider API keys
- `chatHistory.js`: IndexedDB storage for chats, retention, and user preferences

### `src/config/`

- `profiles.js`: provider config, endpoints, and active profile lookup
- `models.jsx`: returns the models available for the current provider
- `openai.jsx`, `grok.jsx`, `claude.jsx`: model metadata and icons

### App entry and styling

- `src/Chat.jsx`: top-level layout shell
- `src/main.jsx`: React entry point
- `src/index.css`: shared styling for layout, dropdowns, composer, thumbnails, and drag/drop states

## Image attachment flow

This is the most important newer behavior in the app.

1. `ChatInput.jsx` lets users attach images in three ways:
   - file picker via the attachment menu
   - drag-and-drop onto the input area
   - pasting images directly from the clipboard
2. All paths call `handleAddImageFiles` from `useChat.js`.
3. `useChat.js` validates each file by:
   - checking MIME type starts with `image/`
   - reading it as a data URL
   - loading it through `Image()` to confirm it is a valid image
4. Valid images are stored in `attachedImages`.
5. `ChatInput.jsx` renders those images as thumbnails above the textarea, each with a remove button.
6. On send, the current user message is saved as `{ text, sender, images }`.
7. Future requests reuse prior messages from the context window, so sent images are still available to the API until that message falls out of the configured context limit.

## Request formatting rules

Internally, the app keeps a simple message shape:

```js
{
  role: "user" | "assistant",
  content: string,
  images: []
}
```

Before sending to a provider, `src/api/imageMessages.js` transforms that shape:

- OpenAI and Grok:
  - messages with images become `content: [{ type: "text" }, { type: "image_url" }]`
- Claude:
  - messages with images become `content: [{ type: "text" }, { type: "image", source: { type: "base64", ... } }]`

When working on multimodal requests, keep provider-specific formatting inside `imageMessages.js` rather than scattering it across UI code.

## Core interaction flow

1. The user types or attaches images in `ChatInput.jsx`.
2. `ChatInput.jsx` calls handlers from `ChatContext`.
3. `useChat.js` updates local UI state, builds the context window, and starts streaming.
4. `src/api/index.js` routes the request to the active provider adapter.
5. Provider adapters stream text deltas back into `useChat.js`.
6. `MessageList.jsx` and `MessageItem.jsx` re-render automatically from context state.

## Important implementation notes

- If you want to change attachment behavior, start in `src/hooks/useChat.js` and `src/components/ChatInput.jsx`.
- If previews look wrong or drag/drop feels broken, inspect `src/index.css`.
- If images stop reaching the backend, inspect `src/api/imageMessages.js` first.
- Image persistence across later prompts is not a separate cache. It works because sent user messages, including `images`, remain in `messages` and are reused when the context window is built.
- The number of earlier messages sent back to the API is controlled by `activeProfile.contextMessageCount`.

## Message Action Toolbar

The `BotActionButtons` component in `MessageItem.jsx` provides several ways to interact with the latest exchange. These actions are powered by shared logic in `useChat.js`:

1.  **Refresh (`handleRefreshLastResponse`)**:
    - Identifies the last user prompt before the current assistant message.
    - Removes the current response and restarts the stream from that prompt.
2.  **Edit (`handleEditLastUserMessage`)**:
    - Removes the last user message and the following assistant response from the list.
    - Moves the original text and all attached images back into the composer.
    - Automatically focuses the textarea and adjusts its height to fit the restored content.
3.  **Copy/Share**:
    - Uses the `navigator.clipboard` API to copy the message text. Both buttons currently share this logic for convenience.

## Workflow summary

- User input updates `inputValue`
- Image attachments update `attachedImages`
- Send creates a user message and clears the composer
- The last `N` messages are converted into API messages
- The provider response streams back into the assistant message list
