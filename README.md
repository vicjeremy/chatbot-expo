# 🤖 Chatbot Expo — Smart Research & Notes Assistant

A polished chatbot app powered by **Google Gemini AI** with dual **MCP (Model Context Protocol)** integration.

## ✨ Features

| Feature | MCP Server | Type |
|---------|-----------|------|
| 🔍 Fetch & summarize any web page | `@modelcontextprotocol/server-fetch` | **Read (MCP A)** |
| 📝 Save notes from conversations | `@modelcontextprotocol/server-sqlite` | **Write (MCP B)** |
| 📋 List, search, update, delete notes | `@modelcontextprotocol/server-sqlite` | **Read/Write (MCP B)** |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                 Expo App (Frontend)              │
│  ┌──────────┐  ┌──────────┐                      │
│  │  Chat    │  │  Notes   │                      │
│  │  Screen  │  │  Screen  │                      │
│  └────┬─────┘  └────┬─────┘                      │
│       └──────┬───────┘                            │
│              ▼                                    │
│     REST API (fetch / POST / DELETE)             │
└──────────────┬───────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────┐
│           Node.js + Express Server               │
│  ┌─────────────┐  ┌──────────────────────────┐   │
│  │ Gemini AI   │  │ Security Middleware       │   │
│  │ (tool calls)│  │ (Helmet, CORS, Rate Limit)│  │
│  └──────┬──────┘  └──────────────────────────┘   │
│         ▼                                        │
│  ┌──────────────────────────────────────────┐    │
│  │          MCP Client Manager               │    │
│  │  ┌────────────┐  ┌─────────────────────┐ │    │
│  │  │ MCP A:     │  │ MCP B:              │ │    │
│  │  │ Fetch      │  │ SQLite              │ │    │
│  │  │ (read web) │  │ (CRUD notes)        │ │    │
│  │  └────────────┘  └─────────────────────┘ │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A free [Google AI Studio API key](https://aistudio.google.com/apikey)

### 1. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm install
npm start
```

### 2. Frontend Setup

```bash
cd expo-app
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `w` for web.

### 3. Try It Out

- **Fetch a page:** "Summarize https://en.wikipedia.org/wiki/Node.js"
- **Save a note:** "Save that as a note titled Node.js Overview"
- **List notes:** "Show me all my notes"
- **Delete a note:** "Delete the Node.js Overview note"

## 🔒 Security

- **Helmet** — Secure HTTP headers
- **CORS** — Configurable origin whitelist
- **Rate Limiting** — 30 req/min (chat), 100 req/min (API)
- **XSS Sanitization** — Input cleaning on all endpoints
- **Input Validation** — Message length & format checks
- **Parameterized Queries** — SQL injection prevention via MCP

## 🚢 Deployment

### Railway / Render

1. Push to GitHub
2. Connect repo to Railway/Render
3. Set environment variable: `GEMINI_API_KEY`
4. Deploy (uses `Dockerfile` or `npm start`)

## 📁 Project Structure

```
chatbot-expo/
├── server/                    # Backend
│   ├── src/
│   │   ├── index.js           # Express server & routes
│   │   ├── mcp-client.js      # Dual MCP connection manager
│   │   ├── gemini-client.js   # Google Gemini AI + tool calling
│   │   ├── tools.js           # Tool definitions
│   │   └── middleware/
│   │       └── security.js    # Helmet, rate limit, XSS, validation
│   ├── Dockerfile
│   └── package.json
├── expo-app/                  # Frontend (React Native Expo)
│   ├── App.js                 # Tab navigation
│   └── src/
│       ├── screens/
│       │   ├── ChatScreen.js  # Chat interface
│       │   └── NotesScreen.js # Notes management
│       ├── components/
│       │   └── MessageBubble.js
│       ├── services/
│       │   └── api.js         # Backend API client
│       └── theme.js           # Design tokens
└── README.md
```

## 🛠 Built With

- **Google Gemini AI** (via AI Studio free API)
- **MCP** — Model Context Protocol (`server-fetch` + `server-sqlite`)
- **Expo** — React Native framework
- **Express** — Node.js web server
- **Google Antigravity** — AI coding agent (built entire project)
