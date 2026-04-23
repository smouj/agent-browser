# AgentBrowser - Worklog

## Task 3: Core Browser Engine & API System

### Date: 2026-04-23

---

### Files Created

#### Prisma Schema
- **`prisma/schema.prisma`** - Updated with `BrowserSession` and `ActionLog` models

#### Browser Engine Core (`src/lib/browser/`)
- **`types.ts`** - Complete TypeScript interfaces for sessions, actions, vision, cookies, WebSocket events, and API responses
- **`utils.ts`** - Helper utilities: selector generation, element classification, JSON parsing, time measurement, session data directory management
- **`engine.ts`** - Singleton browser engine managing Playwright browser instances with EventEmitter pattern, graceful shutdown, session lifecycle management
- **`session.ts`** - Session manager for creating/restoring/closing sessions with cookie persistence, localStorage persistence, and disk-based profile storage at `/browser-data/{sessionId}/`
- **`vision.ts`** - Vision system providing screenshot capture (viewport/full-page/element), simplified DOM extraction, accessibility tree snapshot, interactive element detection, and page metadata extraction
- **`actions.ts`** - Action executor supporting 20+ browser actions: navigate, click, type, press, scroll, select, hover, wait, waitForSelector, screenshot, evaluate, goBack, goForward, reload, getCookies, setCookies, clearCookies, getLocalStorage, setLocalStorage, getUrl, getTitle, getContent

#### API Routes (`src/app/api/browser/`)
- **`sessions/route.ts`** - POST (create session) & GET (list sessions)
- **`sessions/[id]/route.ts`** - GET (session details) & DELETE (close/delete session)
- **`sessions/[id]/action/route.ts`** - POST (execute browser action with logging)
- **`sessions/[id]/vision/route.ts`** - POST (capture full AI vision snapshot)
- **`sessions/[id]/cookies/route.ts`** - GET & POST (manage session cookies)
- **`sessions/[id]/logs/route.ts`** - GET (paginated action logs with filtering)

#### WebSocket Mini-Service
- **`mini-services/browser-ws/package.json`** - Dependencies (socket.io)
- **`mini-services/browser-ws/index.ts`** - Socket.IO server on port 3005 with session rooms, screenshot streaming, action execution via WebSocket, and heartbeat support

#### Frontend UI
- **`src/app/page.tsx`** - Complete AgentBrowser dashboard with:
  - Session sidebar with creation, listing, selection, and deletion
  - Browser navigation bar (URL input, back/forward/reload)
  - Screenshot tab with base64 display and copy
  - Actions tab with quick actions (click, type, key press, scroll, etc.)
  - Vision AI tab with full snapshot viewer (screenshot, interactive elements, DOM, accessibility tree)
  - Logs tab with paginated action history
  - API Reference tab with all endpoint documentation
  - Responsive design with shadcn/ui components
- **`public/browser-logo.png`** - AI-generated branding logo

---

### Key Implementation Decisions

1. **Singleton Pattern for Engine**: Browser instances are managed as singletons per browser-type/headless combination, reducing resource usage across multiple sessions
2. **EventEmitter Pattern**: Simple custom EventEmitter allows loose coupling between engine components and WebSocket broadcasting
3. **Persistent Profiles**: Session cookies and localStorage are persisted both to SQLite (via Prisma) and to disk (`/browser-data/`) for redundancy
4. **DOM Simplification**: The vision system strips scripts, styles, hidden elements and limits depth to produce clean, AI-consumable HTML
5. **Element Detection**: Interactive elements are classified by tag and attributes (role, type, onclick) and sorted by visual position for natural reading order
6. **Action Logging**: Every action is automatically logged to the database with duration measurement and result metadata
7. **WebSocket Rooms**: Each session has its own Socket.IO room for targeted event broadcasting
8. **Environment Variable**: `PLAYWRIGHT_BROWSERS_PATH` is used consistently for browser binary resolution
9. **Next.js 16 API Routes**: All routes use proper Next.js App Router patterns with `params: Promise<>` for Next.js 16 compatibility
10. **Error Handling**: All actions return structured `{success, error, duration}` results with graceful error recovery

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/browser/sessions` | Create browser session |
| GET | `/api/browser/sessions` | List all sessions |
| GET | `/api/browser/sessions/:id` | Get session details |
| DELETE | `/api/browser/sessions/:id` | Delete session |
| POST | `/api/browser/sessions/:id/action` | Execute action |
| POST | `/api/browser/sessions/:id/vision` | Capture vision snapshot |
| GET | `/api/browser/sessions/:id/cookies` | Get cookies |
| POST | `/api/browser/sessions/:id/cookies` | Set cookies |
| GET | `/api/browser/sessions/:id/logs` | Get action logs |

### WebSocket Events (Port 3005)
- `subscribe` / `unsubscribe` - Join/leave session rooms
- `request_screenshot` - Start screenshot streaming
- `execute_action` - Execute actions via WebSocket
- `ping` / `pong` - Heartbeat
