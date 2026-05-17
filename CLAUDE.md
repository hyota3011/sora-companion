# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based multi-provider LLM chat UI built as a React + Vite web app (inside `llm-ui/`). It supports OpenAI, Grok, and Claude as providers, with Gemini stubbed out. The app calls provider APIs directly from the browser — there is no backend server.

## Commands

All commands run from `llm-ui/`:

```bash
cd llm-ui
npm install        # install dependencies
npm run dev        # start Vite dev server (hot reload)
npm run build      # development build to dist/
npm run build:prod # production build (clears VITE_SECRET_KEY)
npm run lint       # run ESLint
npm run preview    # preview the production build locally
```

There are no tests configured in this project.

## Architecture

### State Management

All chat state lives in `src/hooks/useChat.js` and is distributed via React Context (`src/context/ChatContext.jsx`). Components consume state through `useChatContext()` — no prop drilling. `choosenModelRef` is a `useRef` (not state) so model switches don't trigger re-renders.

### Provider / Profile System

- **Profiles** (`src/config/profiles.js`): Each LLM provider is a "profile" object with `{ id, name, endpoint, contextMessageCount, maxTokens? }`. The active profile is persisted to `localStorage`.
- **Models** (`src/config/models.jsx`, `src/config/claude.jsx`, `src/config/openai.jsx`, `src/config/grok.jsx`): Each provider exports a model array with `{ id, title, tag, val, desc, default, icon }`. `val` is the model string sent to the API.
- **API routing** (`src/api/index.js`): `streamChat()` dispatches to the correct provider implementation based on `activeProfile.id`.

### Streaming

Each provider (`src/api/openai.js`, `src/api/claude.js`, `src/api/grok.js`) exports an `async function*` named `streamChat` that yields raw text deltas. `useChat` accumulates deltas into `streamingMessage` state and commits the final message to `messages[]` when the stream ends.

### API Key Storage

Keys are stored per-provider in `chrome.storage.local` via `src/api/keys.js` (keys stored as `apiKey_<profileId>`). Keys can also be seeded from env vars `VITE_ANTHROPIC_KEY`, `VITE_XAI_KEY`, `VITE_OPENAI_KEY`. The `VITE_PROFILE` env var controls whether the dev key-entry UI is shown.

### Image Attachments

Images are read as data URLs (`FileReader`), validated by loading them into an `Image` element, then stored in state as `{ id, name, mimeType, dataUrl, size }`. Before API calls, `src/api/imageMessages.js` converts this internal format to provider-specific formats: `image_url` objects for OpenAI/Grok, `base64` source blocks for Claude.

### Adding a New Provider

1. Add a profile entry to `defaultProfiles` in `src/config/profiles.js` and add the provider constant to `provider`.
2. Create `src/config/<provider>.jsx` exporting a model array.
3. Create `src/api/<provider>.js` exporting `async function* streamChat(messages, model, profile)`.
4. Wire the new provider into `src/api/index.js` (`switch` on `activeProfile.id`).
5. Update `src/config/models.jsx` to return the new model list for the provider.