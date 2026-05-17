# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
