<div align="center">

# AgentBrowser

**AI-Powered Browser Automation Platform**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![v0.2.0](https://img.shields.io/badge/version-0.2.0-green.svg)](https://github.com/agentbrowser/agentbrowser/releases)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.59-2EAD33)](https://playwright.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748)](https://www.prisma.io/)

*Give any AI agent a real browser. REST API + Web Dashboard + Vision AI.*

[Getting Started](#-quick-start) · [API Docs](#-rest-api) · [WebSocket](#-websocket-events) · [Configuration](#-configuration) · [AI Agents](#-using-with-ai-agents)

</div>

---

## What is AgentBrowser?

AgentBrowser is an open-source browser automation platform designed to be the **hands and eyes of AI agents**. It provides a REST API and real-time WebSocket interface for controlling real browser instances — letting LLMs, CLIs, and autonomous agents navigate the web, interact with pages, extract data, and perform complex multi-step tasks.

Built on **Next.js 16**, **Playwright**, and **TypeScript**, it ships with a professional web dashboard for real-time monitoring and control, a comprehensive REST API for programmatic access, and a built-in Vision AI system that provides screenshots, simplified DOM, accessibility trees, and interactive element detection.

**Why AgentBrowser?**

- Most browser automation tools are designed for testing. AgentBrowser is designed for **AI agents**.
- Clean REST API that any LLM can call — no browser-specific knowledge required.
- Vision AI reduces web pages to structured data that language models can reason about.
- Session persistence means agents can pick up where they left off.

---

## Features

### Browser Engine
- [x] **Multi-browser support** — Chromium, Firefox, and WebKit via Playwright
- [x] **Session management** — Persistent cookies, localStorage, and browser state across requests
- [x] **Headless & headed modes** — Run headless on servers, headed for debugging
- [x] **Configurable viewports** — Custom screen sizes and resolutions
- [x] **Proxy support** — Route traffic through HTTP/HTTPS proxies with auth

### 25+ Browser Actions
- [x] **Navigation** — `navigate`, `goBack`, `goForward`, `reload`
- [x] **Mouse** — `click`, `dblclick`, `hover`, `rightClick`
- [x] **Keyboard** — `type`, `press`, `select`
- [x] **Scrolling** — `scroll` with direction and element targeting
- [x] **Waiting** — `wait`, `waitForSelector`, `waitForNavigation`
- [x] **Screenshots** — Full page, element-specific, PNG/JPEG
- [x] **JavaScript** — `evaluate` arbitrary JS in the page context
- [x] **Cookies** — `getCookies`, `setCookies`, `clearCookies`
- [x] **Storage** — `getLocalStorage`, `setLocalStorage`, `clearLocalStorage`
- [x] **Info** — `getUrl`, `getTitle`, `getContent`

### Vision AI
- [x] **Screenshots** — Base64 PNG/JPEG screenshots on demand
- [x] **Simplified DOM** — Cleaned HTML with interactive elements highlighted
- [x] **Accessibility tree** — Full a11y tree for screen-reader-style understanding
- [x] **Interactive element detection** — Auto-detects buttons, links, inputs, and more with selectors and coordinates

### Developer Experience
- [x] **REST API** — Clean JSON API compatible with any LLM, CLI, or SDK
- [x] **Real-time WebSocket** — Live updates on actions, screenshots, and session changes
- [x] **Web Dashboard** — Professional UI with session management, live preview, and action logs
- [x] **TypeScript** — End-to-end type safety with exported types
- [x] **SQLite + Prisma** — Zero-config persistence for sessions and action logs
- [x] **Action logging** — Every browser action is recorded with timing and results

---

## Quick Start

### Prerequisites

- **Node.js** 18+ or **Bun** 1.x
- **Playwright browsers** (installed automatically)

### Install

```bash
# Clone the repository
git clone https://github.com/agentbrowser/agentbrowser.git
cd agentbrowser

# Install dependencies
bun install
# or: npm install

# Set up the database
bun run db:push
# or: npx prisma db push

# Install Playwright browsers (if not already installed)
bunx playwright install chromium
```

### Run

```bash
# Development mode (hot reload, port 3000)
bun run dev

# Production mode
bun run build
bun run start
```

Open [http://localhost:3000](http://localhost:3000) to access the web dashboard.

---

## Architecture

AgentBrowser follows a layered architecture:

```
┌─────────────────────────────────────────────────────┐
│                    Clients                          │
│         LLMs · CLIs · Web Dashboard                │
└──────────────┬──────────────────┬──────────────────┘
               │  REST API        │  WebSocket
┌──────────────▼──────────────────▼──────────────────┐
│              Next.js API Routes                     │
│    /api/browser/sessions/*                         │
└──────────────┬─────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────┐
│           Browser Engine Layer                      │
│    Session Manager · Action Executor · Vision       │
└──────────────┬─────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────┐
│              Playwright                             │
│    Chromium · Firefox · WebKit                     │
└────────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────┐
│          SQLite (via Prisma)                        │
│    Sessions · Action Logs                           │
└────────────────────────────────────────────────────┘
```

**Key modules:**

| Module | Path | Description |
|---|---|---|
| API Routes | `src/app/api/browser/sessions/` | REST endpoints for session and action management |
| Browser Engine | `src/lib/browser/engine.ts` | Session lifecycle, browser context management |
| Action Executor | `src/lib/browser/actions.ts` | Executes all 25+ browser actions with logging |
| Vision System | `src/lib/browser/vision.ts` | Screenshots, DOM simplification, accessibility tree |
| Types | `src/lib/browser/types.ts` | TypeScript interfaces for all API types |
| Database | `prisma/schema.prisma` | Session and action log persistence via SQLite |
| Dashboard | `src/app/page.tsx` | Web UI with session sidebar, tabs, and live updates |

---

## REST API

All endpoints return JSON. Base URL: `http://localhost:3000`

### Sessions

#### Create a Session

```bash
curl -X POST http://localhost:3000/api/browser/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent-session",
    "browserType": "chromium",
    "headless": true
  }'
```

```json
{
  "id": "clx7abc123...",
  "name": "my-agent-session",
  "browserType": "chromium",
  "status": "active",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Request body fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | Auto-generated | Session name |
| `browserType` | `"chromium" \| "firefox" \| "webkit"` | `"chromium"` | Browser engine |
| `headless` | `boolean` | `true` | Run without UI |
| `proxy` | `object` | `undefined` | Proxy config (`server`, `username?`, `password?`) |
| `viewport` | `object` | `{width: 1280, height: 720}` | Viewport size |
| `userAgent` | `string` | Browser default | Custom user agent |
| `locale` | `string` | `"en-US"` | Browser locale |
| `timezone` | `string` | `"America/New_York"` | Browser timezone |

#### List Sessions

```bash
curl http://localhost:3000/api/browser/sessions
```

```json
{
  "sessions": [
    {
      "id": "clx7abc123...",
      "name": "my-agent-session",
      "browserType": "chromium",
      "status": "active",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "currentUrl": "https://example.com",
      "currentTitle": "Example Domain",
      "cookiesCount": 5
    }
  ]
}
```

#### Get Session Details

```bash
curl http://localhost:3000/api/browser/sessions/clx7abc123...
```

```json
{
  "id": "clx7abc123...",
  "name": "my-agent-session",
  "browserType": "chromium",
  "status": "active",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "currentUrl": "https://example.com",
  "currentTitle": "Example Domain",
  "cookiesCount": 5,
  "metadata": {},
  "localStorageData": {}
}
```

#### Close a Session

```bash
curl -X DELETE http://localhost:3000/api/browser/sessions/clx7abc123...
```

```json
{
  "success": true,
  "message": "Session closed"
}
```

---

### Actions

#### Execute an Action

```bash
# Navigate to a page
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "navigate",
    "target": "https://example.com"
  }'
```

```json
{
  "success": true,
  "action": "navigate",
  "target": "https://example.com",
  "data": {
    "url": "https://example.com",
    "title": "Example Domain"
  },
  "duration": 1234
}
```

```bash
# Click an element
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "target": "button#submit"
  }'
```

```bash
# Type into an input
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type",
    "target": "input#search",
    "value": "agentbrowser",
    "options": { "pressEnter": true }
  }'
```

```bash
# Take a screenshot
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "screenshot",
    "options": { "fullPage": true, "type": "png" }
  }'
```

```bash
# Execute JavaScript
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "evaluate",
    "value": "JSON.stringify(document.querySelectorAll(\"a\").length)"
  }'
```

```bash
# Scroll down
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scroll",
    "value": "500",
    "target": "down"
  }'
```

**Request body:**

| Field | Type | Description |
|---|---|---|
| `action` | `string` | The action to execute (see full list below) |
| `target` | `string` | CSS selector or URL (depends on action) |
| `value` | `string` | Text, key, JSON string, or parameter (depends on action) |
| `options` | `object` | Action-specific options |

**Supported actions:**

| Category | Action | `target` | `value` | `options` |
|---|---|---|---|---|
| **Navigation** | `navigate` | URL | — | `waitUntil`, `timeout` |
| | `goBack` | — | — | — |
| | `goForward` | — | — | — |
| | `reload` | — | — | `waitUntil` |
| **Mouse** | `click` | CSS selector | — | `button`, `clickCount`, `delay` |
| | `dblclick` | CSS selector | — | `delay` |
| | `hover` | CSS selector | — | — |
| | `rightClick` | CSS selector | — | `delay` |
| **Keyboard** | `type` | CSS selector | Text to type | `clear`, `pressEnter`, `delay` |
| | `press` | — | Key name (e.g. `"Enter"`, `"Tab"`) | — |
| | `select` | CSS selector | Option value | — |
| **Scroll** | `scroll` | Direction (`"down"`, `"up"`, `"left"`, `"right"`) | Pixel amount | `element` |
| **Wait** | `wait` | — | Milliseconds | — |
| | `waitForSelector` | CSS selector | — | `state`, `timeout` |
| | `waitForNavigation` | — | — | `waitUntil`, `timeout` |
| **Capture** | `screenshot` | — | — | `fullPage`, `element`, `quality`, `type` |
| **JS** | `evaluate` | — | JS expression string | — |
| **Cookies** | `getCookies` | — | — | — |
| | `setCookies` | — | JSON string of cookies array | — |
| | `clearCookies` | — | — | — |
| **Storage** | `getLocalStorage` | — | — | — |
| | `setLocalStorage` | — | JSON string of key-value pairs | — |
| | `clearLocalStorage` | — | — | — |
| **Info** | `getUrl` | — | — | — |
| | `getTitle` | — | — | — |
| | `getContent` | — | — | — |

---

### Vision AI

#### Get Vision Snapshot

Returns a comprehensive AI-ready snapshot of the current page including a screenshot, simplified DOM, accessibility tree, and detected interactive elements.

```bash
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../vision \
  -H "Content-Type: application/json" \
  -d '{
    "fullPage": false,
    "element": "main"
  }'
```

```json
{
  "screenshot": "base64-encoded-png...",
  "dom": "<html><body><nav>...</nav><main>...</main></body></html>",
  "accessibilityTree": {
    "role": "WebArea",
    "name": "Page Title",
    "children": [...]
  },
  "interactiveElements": [
    {
      "selector": "button#login",
      "tag": "button",
      "text": "Sign In",
      "type": "button",
      "rect": { "x": 100, "y": 200, "width": 120, "height": 40 },
      "attributes": { "id": "login", "class": "btn-primary" }
    },
    {
      "selector": "a[href='/about']",
      "tag": "a",
      "text": "About Us",
      "type": "link",
      "rect": { "x": 250, "y": 200, "width": 80, "height": 20 },
      "attributes": { "href": "/about" }
    },
    {
      "selector": "input#search",
      "tag": "input",
      "text": "",
      "type": "input",
      "rect": { "x": 400, "y": 50, "width": 300, "height": 36 },
      "attributes": { "type": "text", "placeholder": "Search..." }
    }
  ],
  "metadata": {
    "title": "Page Title",
    "url": "https://example.com",
    "description": "Page description",
    "ogTitle": "OG Title",
    "ogDescription": "OG Description",
    "ogImage": "https://example.com/og.png",
    "favicon": "https://example.com/favicon.ico",
    "language": "en"
  }
}
```

**Request body:**

| Field | Type | Default | Description |
|---|---|---|---|
| `fullPage` | `boolean` | `false` | Capture full scrollable page screenshot |
| `element` | `string` | `undefined` | CSS selector to scope capture to specific element |

---

### Cookies

#### Get Cookies

```bash
curl http://localhost:3000/api/browser/sessions/clx7abc123.../cookies
```

```json
{
  "cookies": [
    {
      "name": "_ga",
      "value": "GA1.2.1234567890.1234567890",
      "domain": ".example.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ]
}
```

#### Set Cookies

```bash
curl -X POST http://localhost:3000/api/browser/sessions/clx7abc123.../cookies \
  -H "Content-Type: application/json" \
  -d '{
    "cookies": [
      {
        "name": "session_id",
        "value": "abc123",
        "domain": ".example.com",
        "path": "/"
      }
    ]
  }'
```

---

### Logs

#### Get Action Logs

```bash
curl http://localhost:3000/api/browser/sessions/clx7abc123.../logs
```

```json
{
  "logs": [
    {
      "id": "log_001",
      "sessionId": "clx7abc123...",
      "action": "navigate",
      "target": "https://example.com",
      "value": null,
      "result": "{\"success\":true}",
      "duration": 1234,
      "createdAt": "2025-01-15T10:30:01.000Z",
      "metadata": "{}"
    },
    {
      "id": "log_002",
      "sessionId": "clx7abc123...",
      "action": "click",
      "target": "button#submit",
      "value": null,
      "result": "{\"success\":true}",
      "duration": 156,
      "createdAt": "2025-01-15T10:30:03.000Z",
      "metadata": "{}"
    }
  ]
}
```

---

## WebSocket Events

AgentBrowser emits real-time events via WebSocket, enabling live dashboards and reactive AI agent loops.

### Connecting

```javascript
const socket = io('http://localhost:3000');
```

### Event Types

#### `session_created`

Emitted when a new browser session is created.

```json
{
  "type": "session_created",
  "sessionId": "clx7abc123...",
  "data": {
    "name": "my-session",
    "browserType": "chromium",
    "status": "active"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### `session_update`

Emitted when a session's state changes (e.g., URL change, status change).

```json
{
  "type": "session_update",
  "sessionId": "clx7abc123...",
  "data": {
    "status": "active",
    "currentUrl": "https://example.com/page2",
    "currentTitle": "Page 2"
  },
  "timestamp": "2025-01-15T10:30:05.000Z"
}
```

#### `session_closed`

Emitted when a session is closed.

```json
{
  "type": "session_closed",
  "sessionId": "clx7abc123...",
  "data": {
    "status": "closed",
    "reason": "user_request"
  },
  "timestamp": "2025-01-15T10:35:00.000Z"
}
```

#### `action`

Emitted after any browser action is executed.

```json
{
  "type": "action",
  "sessionId": "clx7abc123...",
  "action": "click",
  "target": "button#submit",
  "result": {
    "success": true,
    "action": "click",
    "target": "button#submit",
    "data": { "clicked": "button#submit" },
    "duration": 156
  },
  "timestamp": "2025-01-15T10:30:03.000Z"
}
```

#### `screenshot`

Emitted when a screenshot is taken (via dashboard or API).

```json
{
  "type": "screenshot",
  "sessionId": "clx7abc123...",
  "screenshot": "base64-encoded-png...",
  "timestamp": "2025-01-15T10:30:04.000Z"
}
```

### Listening Example

```javascript
const socket = io('http://localhost:3000');

socket.on('action', (event) => {
  console.log(`[${event.sessionId}] ${event.action} → ${event.result.success ? 'OK' : 'FAIL'}`);
});

socket.on('session_update', (event) => {
  console.log(`Session ${event.sessionId}: ${event.data.currentUrl}`);
});

socket.on('screenshot', (event) => {
  const img = Buffer.from(event.screenshot, 'base64');
  // Process screenshot...
});
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database (SQLite)
DATABASE_URL="file:./custom.db"

# Server
PORT=3000
NODE_ENV="development"

# Browser defaults
DEFAULT_BROWSER_TYPE="chromium"
DEFAULT_HEADLESS=true
DEFAULT_VIEWPORT_WIDTH=1280
DEFAULT_VIEWPORT_HEIGHT=720

# Session
SESSION_TIMEOUT_MS=3600000
MAX_CONCURRENT_SESSIONS=10
```

### Session Configuration

Each session can be customized at creation time:

```json
{
  "name": "custom-session",
  "browserType": "firefox",
  "headless": false,
  "proxy": {
    "server": "http://proxy.example.com:8080",
    "username": "user",
    "password": "pass"
  },
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "userAgent": "CustomBot/1.0",
  "locale": "ja-JP",
  "timezone": "Asia/Tokyo"
}
```

---

## Using with AI Agents

AgentBrowser is designed to be used by any LLM as a tool-calling backend. Here's how to integrate it with an AI agent using the OpenAI function-calling format:

### Define Tools

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "browser_navigate",
        "description": "Navigate to a URL in the browser session",
        "parameters": {
          "type": "object",
          "properties": {
            "session_id": { "type": "string" },
            "url": { "type": "string" }
          },
          "required": ["session_id", "url"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "browser_click",
        "description": "Click an element on the page",
        "parameters": {
          "type": "object",
          "properties": {
            "session_id": { "type": "string" },
            "selector": { "type": "string" }
          },
          "required": ["session_id", "selector"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "browser_type",
        "description": "Type text into an input field",
        "parameters": {
          "type": "object",
          "properties": {
            "session_id": { "type": "string" },
            "selector": { "type": "string" },
            "text": { "type": "string" }
          },
          "required": ["session_id", "selector", "text"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "browser_vision",
        "description": "Get AI vision snapshot — screenshot, simplified DOM, interactive elements, and page metadata",
        "parameters": {
          "type": "object",
          "properties": {
            "session_id": { "type": "string" },
            "full_page": { "type": "boolean", "default": false }
          },
          "required": ["session_id"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "browser_screenshot",
        "description": "Take a screenshot of the current page",
        "parameters": {
          "type": "object",
          "properties": {
            "session_id": { "type": "string" },
            "full_page": { "type": "boolean", "default": false }
          },
          "required": ["session_id"]
        }
      }
    }
  ]
}
```

### Agent Loop Example (Python)

```python
import requests
import json

BASE = "http://localhost:3000/api/browser/sessions"

# 1. Create a session
session = requests.post(f"{BASE}", json={
    "name": "ai-agent-session",
    "browserType": "chromium",
    "headless": True
}).json()
sid = session["id"]
print(f"Session created: {sid}")

# 2. Navigate to a page
requests.post(f"{BASE}/{sid}/action", json={
    "action": "navigate",
    "target": "https://news.ycombinator.com"
}).json()

# 3. Get vision snapshot for the LLM
vision = requests.post(f"{BASE}/{sid}/vision", json={}).json()

# 4. Pass to your LLM
# The vision.dom, vision.interactiveElements, and vision.metadata
# give the LLM everything it needs to understand the page and decide
# what to do next.

# 5. Execute the LLM's chosen action
requests.post(f"{BASE}/{sid}/action", json={
    "action": "click",
    "target": "a.titlelink"  # Selector from interactiveElements
}).json()

# 6. Clean up
requests.delete(f"{BASE}/{sid}")
```

### Typical Agent Workflow

```
1. Create session ──→ POST /api/browser/sessions
2. Navigate ────────→ POST /api/browser/sessions/:id/action  { action: "navigate" }
3. Observe ─────────→ POST /api/browser/sessions/:id/vision
4. Plan ────────────→ LLM decides next action based on vision data
5. Act ─────────────→ POST /api/browser/sessions/:id/action  { action: "click/type/..." }
6. Repeat 3-5 ──────→ Until task is complete
7. Close ───────────→ DELETE /api/browser/sessions/:id
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework, API routes |
| [TypeScript](https://www.typescriptlang.org/) | End-to-end type safety |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI component library |
| [Playwright](https://playwright.dev/) | Browser automation engine |
| [Prisma](https://www.prisma.io/) | Type-safe database ORM (SQLite) |
| [Socket.IO](https://socket.io/) | Real-time WebSocket communication |
| [Zustand](https://zustand.docs.pmnd.rs/) | Client-side state management |

---

## Project Structure

```
agentbrowser/
├── src/
│   ├── app/
│   │   ├── api/browser/sessions/
│   │   │   ├── route.ts              # POST (create), GET (list)
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET (detail), DELETE (close)
│   │   │       ├── action/route.ts   # POST (execute action)
│   │   │       ├── vision/route.ts   # POST (vision snapshot)
│   │   │       ├── cookies/route.ts  # GET, POST (cookies)
│   │   │       └── logs/route.ts     # GET (action logs)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Web dashboard
│   │   └── globals.css
│   ├── components/ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── browser/
│   │   │   ├── engine.ts             # Session lifecycle manager
│   │   │   ├── actions.ts            # 25+ action executor
│   │   │   ├── vision.ts             # Vision AI system
│   │   │   ├── session.ts            # Session helpers
│   │   │   ├── types.ts              # TypeScript interfaces
│   │   │   └── utils.ts              # Utility functions
│   │   ├── db.ts                     # Prisma client
│   │   └── utils.ts                  # General utilities
│   └── hooks/                        # React hooks
├── prisma/
│   └── schema.prisma                 # Database schema
├── public/                           # Static assets
├── examples/
│   └── websocket/                    # WebSocket usage examples
└── package.json
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with Next.js, Playwright, and TypeScript**

Made for AI agents, by developers who build with AI agents.

</div>
