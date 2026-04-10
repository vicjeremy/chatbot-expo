# Chatbot Expo

Polished Expo chatbot app with dual MCP integration and multi-model provider support.

Repository: https://github.com/vicjeremy/chatbot-expo

## Features

- Chat with provider selection: Ollama, Gemini, Groq
- In-app Settings modal to enter API keys/models (no manual .env editing required for end users)
- Fetch and summarize web pages
- Save, list, search, update, and delete notes

## Architecture

- Frontend: Expo React Native app
- Backend: Node.js + Express API
- MCP A: mcp-server-fetch
- MCP B: mcp-server-sqlite
- LLM providers: Ollama local, Gemini API, Groq API

## Quick Start

### Prerequisites

- Node.js 18+
- Python uv/uvx available in environment (for MCP servers)
- Optional: Ollama installed locally (only if using Ollama provider)

### Backend

```bash
cd server
cp .env.example .env
npm install
npm start
```

### Frontend

```bash
cd expo-app
npm install
npx expo start
```

Press w for web, or scan QR for device testing.

## How To Use Chat (Model Picker + Settings)

1. Open Chat screen.
2. Pick model provider in header chips:

- Ollama
- Gemini
- Groq

3. Tap Settings.
4. Enter credentials/model values:

- Gemini API key and optional model
- Groq API key and optional model
- Optional Ollama model override

5. Tap Save and start chatting.

Notes:

- If a setting field is empty, backend falls back to server .env defaults.
- For Ollama, ensure your local/server Ollama instance is running and has the model pulled.

## Example Prompts

- Read https://news.ycombinator.com and tell me the top 3 headlines.
- Summarize https://en.wikipedia.org/wiki/React_Native in 3 bullets.
- Save that summary as a note titled React Native History.
- Show my notes about React Native.

## Environment Variables (Server)

See server/.env.example.

Common keys:

- AI_PROVIDER=ollama|gemini|groq
- OLLAMA_HOST, OLLAMA_MODEL
- GEMINI_API_KEY, GEMINI_MODEL
- GROQ_API_KEY, GROQ_MODEL
- ALLOWED_ORIGINS

## Submission Checklist

1. Code repo link

- https://github.com/vicjeremy/chatbot-expo

## Built With

- Expo + React Native Web
- Node.js + Express
- Model Context Protocol (mcp-server-fetch, mcp-server-sqlite)
- Ollama / Gemini / Groq
- VS Code GitHub Copilot workflow
