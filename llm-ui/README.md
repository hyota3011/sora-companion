# LLM Chat UI

A modern, browser-based chat interface designed for seamless interaction with Large Language Models (LLMs). This project provides a clean and responsive UI for sending prompts and displaying AI-generated responses.

## Architecture & Components

### `src/components/`
The core visual building blocks of the application:
- **`Chat.jsx`**: The primary container that orchestrates the chat experience, managing state for user inputs and displaying the flow of responses.
- **`ChatInput.jsx`**: The dedicated input component where users construct and submit their prompts.
- **`MessageList.jsx`**: Renders the sequential conversation history between the user and the AI.
- **`MessageItem.jsx`**: Parses and displays an individual message bubble (either user prompt or system response).
- **`Header.jsx` & `InitialView.jsx`**: Foundational layout elements that provide the application header and the empty-state landing view.
- **`icon/`**: A directory containing all essential SVG icons used throughout the user interface.

### Infrastructure
- **`src/api/`**: Encapsulates all network communication and API integrations with the backend AI server.
- **`src/config/`**: Houses application-wide configuration settings, constants, and environment variables.
### Workflow
- The application sends input messages from users to server then return messages and display them in the UI.
- This application have some features like copy last message into clipboard, send last N messages of conversation to server to keep the context.
- You can change the models based on combobox in Header.jsx, which changes the profile in profiles.js