# LLM Chat UI

A modern, browser-based chat interface designed for seamless interaction with Large Language Models (LLMs). This project provides a clean and responsive UI for sending prompts and displaying AI-generated responses.

## Architecture & Components

### `src/components/`
The core visual building blocks of the application:
- **`Header.jsx`**: The top navigation header that contains the new chat button, profile selector, and API key management functionality.
- **`InitialView.jsx`**: Displays the initial empty state of the chat with a welcome greeting.
- **`MessageList.jsx`**: Renders the full conversation view. It optimizes performance by memoizing the static history (`StaticMessageList`) while seamlessly integrating the currently streaming message.
- **`MessageItem.jsx`**: Renders an individual chat bubble. For assistant messages, it handles markdown parsing, syntax highlighting for code blocks, and provides a toolbar of actionable buttons (`BotActionButtons`).
- **`ChatInput.jsx`**: The main input area for composing messages. It includes an auto-resizing textarea, attachment buttons, and an isolated `ModelSelector` dropdown. It is memoized to prevent re-renders during message streaming.

### Application Roots
- **`src/main.jsx`**: The application entry point that bootstraps the React environment and mounts the `Chat` component.
- **`src/index.css`**: The central styling hub, integrating Tailwind CSS and defining the application's visual language.

### Infrastructure
- **`src/api/`**: The communication layer that integrates with LLM providers.
  - **`index.js`**: Central dispatcher that provides a unified `streamChat` interface, routing requests to specific provider implementations.
  - **`keys.js`**: Utilities for persistent management of API keys using the browser's storage API.
  - **`openai.js` & `grok.js`**: Provider-specific implementations that handle authentication, request formatting, and Server-Sent Events (SSE) stream parsing.
- **`src/config/`**: Manages application-wide configuration and model definitions.
  - **`profiles.js`**: Defines available LLM providers, their API endpoints, and handles logic for switching between active profiles and retrieving associated API keys.
  - **`models.jsx`**: Acts as a configuration provider for the UI, exporting functions to retrieve the list of models available for the current active profile.
  - **`openai.jsx` & `grok.jsx`**: Metadata repositories for specific model families, including display names, descriptions, and corresponding UI icons.
- **`src/hooks/`**: Custom React hooks that encapsulate complex stateful logic.
  - **`useChat.js`**: The core business logic hook. It manages the entire chat lifecycle, including message history, real-time streaming, auto-resizing inputs, and profile management.
- **`icon/`**: A directory containing all essential SVG icons and images used throughout the user interface.
### Workflow
- The application sends input messages from users to server then return messages and display them in the UI.
- This application have some features like copy last message into clipboard, send last N messages of conversation to server to keep the context.
- You can change the models based on combobox in Header.jsx, which changes the profile in profiles.js
 
## Core Interaction Flow

The application follows a strict separation between UI representation and business logic:

1.  **State Orchestration (`useChat.js`)**: This custom hook acts as the central brain. It maintains the message history, handles the async streaming logic from the API, and manages UI-related states (like whether the AI is currently "thinking").
2.  **UI Representation (`Chat.jsx`)**: This component is purely functional. It consumes the state and handlers from `useChat` and distributes them to sub-components like `Header`, `MessageList`, and `ChatInput`.
3.  **Data Flow**:
    *   User types in `ChatInput` → `handleInput` (hook) updates `inputValue`.
    *   User hits Enter → `handleSend` (hook) triggers the API call.
    *   API yields deltas → `streamingMessage` (hook) updates.
    *   `Chat.jsx` re-renders, passing updated data to `MessageList`.