# Creative Center (AI Creatives Generation) — API & Auth Analysis

> Generated: 2026-02-20
> Source: `/Users/sky/AI creatives generation/`
> Production: `https://ag1.q37fh758g.click`

---

## 1. Current Authentication Mechanism

**The Creative Center has NO application-level authentication.** All security is handled at the infrastructure layer:

- **Nginx basic auth** — The production server (`5.61.63.139`) uses nginx as a reverse proxy with HTTP Basic Authentication configured in `/etc/nginx/sites-available/` config. This protects both the frontend (`:3000`) and the backend API (`:8000`).
- **No tokens, sessions, or JWT** — The FastAPI backend has zero authentication middleware. No `Depends()` security dependencies, no API keys, no session cookies.
- **No user concept** — There is no `users` table in the database. No login, no registration, no user profiles.
- **CORS configured** — Allows `http://localhost:3000` and `https://ag1.q37fh758g.click` origins (see `backend/config.py:24-27`).
- **WebSocket connections** — No authentication check on WebSocket upgrade. Only validates that the agent exists and is not paused/stopped (`backend/api/agents.py:271-289`).

**Implication**: Any user who passes the nginx basic auth prompt has full unrestricted access to ALL features and ALL data.

---

## 2. Complete API Endpoint Inventory

### Health Check
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (DB + memory status) |

### Agents (`/api/agents`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/agents` | Create a new agent (with optional Telegram bot) |
| GET | `/api/agents` | List all agents (paginated) |
| GET | `/api/agents/models/list` | List available AI models by provider |
| GET | `/api/agents/providers/list` | List model providers with defaults |
| GET | `/api/agents/{agent_id}` | Get agent details + recent messages |
| DELETE | `/api/agents/{agent_id}` | Delete an agent (stops Telegram bot too) |
| PATCH | `/api/agents/{agent_id}` | Update agent (name, status, specialty, model provider) |
| PUT | `/api/agents/{agent_id}/telegram` | Add/update/remove Telegram bot token |
| POST | `/api/agents/{agent_id}/upload` | Upload image/video attachment for chat (max 50MB) |
| WS | `/api/agents/ws/{agent_id}` | WebSocket for real-time chat streaming |

### Chat (`/api/chat`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/chat` | Chat endpoint with SSE streaming + memory context |

### Creatives (`/api/creatives`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/creatives` | Generate a new creative (image/video) |
| GET | `/api/creatives` | List creatives (filtered, paginated) |
| GET | `/api/creatives/count` | Count creatives matching filters |
| POST | `/api/creatives/{id}/feedback` | Submit rating/feedback for a creative |
| GET | `/api/creatives/{id}/feedback` | Get all feedback for a creative |
| GET | `/api/creatives/{id}` | Get creative details by ID |

### Brands (`/api/brands`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/brands` | Create a new brand |
| GET | `/api/brands` | List all brands (paginated) |
| GET | `/api/brands/{id}` | Get brand details |
| PUT | `/api/brands/{id}` | Update brand details |
| DELETE | `/api/brands/{id}` | Delete a brand |

### Memory (`/api/memory`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/memory/search` | Hybrid vector search (vector + FTS5 + temporal decay + MMR) |
| POST | `/api/memory/ingest` | Manually ingest knowledge into memory |
| POST | `/api/memory/performance` | Ingest ad performance metrics |
| POST | `/api/memory/consolidate` | Trigger memory consolidation (brand/global) |
| GET | `/api/memory/stats` | Memory system statistics (with optional scope filter) |
| GET | `/api/memory/agent/{agent_id}` | Search agent-scoped memories |
| GET | `/api/memory/agent/{agent_id}/stats` | Per-agent memory stats |
| POST | `/api/memory/promote` | Promote agent-scoped memory to global |
| GET | `/api/memory/entries/all` | List all memory entries (paginated, filterable) |
| GET | `/api/memory/entries` | List raw memory entries by collection |
| DELETE | `/api/memory/agent/{agent_id}/all` | Delete ALL memories for an agent |
| PATCH | `/api/memory/{doc_id}` | Update a memory entry's content |
| DELETE | `/api/memory/{doc_id}` | Delete a single memory entry |
| POST | `/api/memory/fix-scopes` | Admin: fix entries with broken scope metadata |

### Historical Data Adaptor (`/api/adaptor`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/adaptor/import-csv` | Import historical CSV (file upload or JSON path) |
| POST | `/api/adaptor/connect-gdrive` | Test Google Drive connection |
| POST | `/api/adaptor/sync-assets` | Download assets from GDrive (background task) |
| GET | `/api/adaptor/sync-result` | Get last sync result |
| GET | `/api/adaptor/download-progress` | Poll GDrive download progress |
| GET | `/api/adaptor/server-files` | Browse files in historical_assets directory |
| POST | `/api/adaptor/match-server-files` | Match server files to CSV records |
| GET | `/api/adaptor/matches` | Get current asset matches |
| POST | `/api/adaptor/analyze` | Run visual analysis on assets |
| POST | `/api/adaptor/generate-insights` | Generate insights from data |
| POST | `/api/adaptor/inject-memory` | Inject data into agent memory |
| POST | `/api/adaptor/run-pipeline` | Run full adaptor pipeline end-to-end |
| GET | `/api/adaptor/status` | Get pipeline status |
| GET | `/api/adaptor/insights` | Get generated insights |
| GET | `/api/adaptor/creatives` | List historical creatives (paginated, sortable) |
| GET | `/api/adaptor/batches` | List all import batches |
| GET | `/api/adaptor/batches/compare` | Compare multiple batches side-by-side |
| GET | `/api/adaptor/batches/{id}` | Get batch details + stats |
| DELETE | `/api/adaptor/batches/{id}` | Delete batch + its memory entries |
| POST | `/api/adaptor/batches/{id}/analyze` | Run analysis for specific batch |
| POST | `/api/adaptor/batches/{id}/insights` | Generate insights for specific batch |
| POST | `/api/adaptor/batches/{id}/inject-memory` | Inject batch data into memory |
| GET | `/api/adaptor/batches/{id}/creatives` | Paginated leaderboard for a batch |
| GET | `/api/adaptor/mappings` | List saved CSV column mappings |
| POST | `/api/adaptor/mappings` | Save a CSV column mapping |
| DELETE | `/api/adaptor/mappings/{id}` | Delete a saved mapping |
| POST | `/api/adaptor/detect-mapping` | Auto-detect column mapping from CSV |

### Usage Tracking (`/api/usage`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/usage/today` | Today's API usage and cost breakdown |

### Rules (`/api/rules`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/rules` | List all rules (active + inactive) |
| GET | `/api/rules/active` | List active rules (filterable by scope/agent) |
| POST | `/api/rules` | Create a new rule |
| PUT | `/api/rules/{id}` | Update a rule |
| DELETE | `/api/rules/{id}` | Delete a rule |

### Static Assets
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/assets/*` | Serve generated images/videos from `data/assets/` |

**Total: ~55 endpoints** (including WebSocket and static file serving)

---

## 3. User-Facing Features (Permission Categories)

### Agent Management
- Create AI agents (with name, specialty, model provider selection)
- Configure model provider per agent (OpenAI / BytePlus / Gemini)
- Update agent settings (name, status, specialty, model config)
- Delete agents
- Link/unlink Telegram bots to agents

### Chat & Communication
- Real-time chat with agents via WebSocket
- Upload image/video attachments for multimodal chat
- SSE-based chat streaming (REST endpoint)
- Chat uses memory-augmented context automatically

### Creative Generation
- Generate images (GPT Image 1, Seedream 5.0, Imagen 4)
- Generate videos (Sora 2, Seedance 1.5 Pro, Veo 2)
- View generated creatives gallery (filtered, paginated)
- Submit feedback/ratings on creatives

### Brand Management
- Create/edit/delete brands
- Set brand guidelines, colors, tone

### Memory System
- Search vector memory (hybrid: vector + FTS5 + temporal decay)
- Ingest manual knowledge entries
- View/edit/delete individual memory entries
- Promote agent-scoped memories to global
- Delete all agent memories (bulk)
- Consolidate memory (admin)
- View memory statistics

### Historical Data Pipeline
- Upload CSV performance data
- Connect to Google Drive for asset matching
- Browse server files for asset matching
- Run GPT-4o Vision analysis on assets
- Generate insights from historical data
- Inject insights into agent memory
- Manage import batches (create, delete, compare)
- Save/reuse CSV column mappings

### Rules Management
- Create/edit/delete behavioral rules
- Rules scoped to global or specific agent

### Monitoring
- View daily API usage and cost breakdown
- Health check endpoint

---

## 4. Recommended Granular Permissions

Based on feature analysis, here are the recommended permission scopes:

### Agent Permissions
| Permission | Description |
|------------|-------------|
| `agents:read` | View agent list, details, model info |
| `agents:create` | Create new agents |
| `agents:update` | Update agent settings (name, status, specialty, provider) |
| `agents:delete` | Delete agents |
| `agents:telegram` | Manage Telegram bot connections |

### Chat Permissions
| Permission | Description |
|------------|-------------|
| `chat:send` | Send messages via WebSocket or REST chat |
| `chat:upload` | Upload attachments (images/videos) |

### Creative Permissions
| Permission | Description |
|------------|-------------|
| `creatives:read` | View creative gallery and details |
| `creatives:generate` | Generate new images/videos (costs money) |
| `creatives:feedback` | Submit ratings and feedback |

### Brand Permissions
| Permission | Description |
|------------|-------------|
| `brands:read` | View brand list and details |
| `brands:create` | Create new brands |
| `brands:update` | Update brand details |
| `brands:delete` | Delete brands |

### Memory Permissions
| Permission | Description |
|------------|-------------|
| `memory:read` | Search and view memory entries/stats |
| `memory:write` | Ingest new knowledge, ingest performance data |
| `memory:update` | Edit existing memory entries |
| `memory:delete` | Delete memory entries (individual or bulk) |
| `memory:promote` | Promote agent-scoped to global |
| `memory:consolidate` | Trigger memory consolidation (admin-level) |
| `memory:admin` | Fix scopes, bulk operations |

### Historical Data Permissions
| Permission | Description |
|------------|-------------|
| `adaptor:read` | View batches, creatives, insights, status |
| `adaptor:import` | Upload CSVs, create batches |
| `adaptor:gdrive` | Connect GDrive, sync assets |
| `adaptor:analyze` | Run visual analysis (costs money — GPT-4o Vision) |
| `adaptor:insights` | Generate insights (costs money — GPT) |
| `adaptor:inject` | Inject data into memory |
| `adaptor:delete` | Delete batches, mappings |
| `adaptor:mappings` | Manage CSV column mappings |
| `adaptor:server_files` | Browse server filesystem |

### Rules Permissions
| Permission | Description |
|------------|-------------|
| `rules:read` | View rules |
| `rules:write` | Create/update rules |
| `rules:delete` | Delete rules |

### System Permissions
| Permission | Description |
|------------|-------------|
| `usage:read` | View usage/cost data |
| `health:read` | Access health endpoint |
| `assets:read` | Access static assets (generated files) |

### Suggested Role Templates
| Role | Permissions |
|------|-------------|
| **viewer** | `*:read`, `assets:read`, `health:read` |
| **creator** | viewer + `chat:*`, `creatives:generate`, `creatives:feedback`, `chat:upload` |
| **manager** | creator + `agents:*`, `brands:*`, `rules:*`, `memory:read/write/update` |
| **analyst** | viewer + `adaptor:read/import/analyze/insights`, `memory:read` |
| **admin** | ALL permissions |

---

## 5. Integration Points for SSO/JWT

### API Middleware (FastAPI)
The primary integration point. A JWT validation dependency needs to be added:

```python
# Example: backend/middleware/auth.py
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def require_auth(request: Request, token = Depends(security)):
    # Validate JWT against Auth Center's public key / JWKS endpoint
    # Extract user_id, roles, permissions from claims
    # Attach to request.state.user
    pass

async def require_permission(permission: str):
    # Check request.state.user.permissions includes the required permission
    pass
```

**Where to inject:**
1. **All API routers** — Add `Depends(require_auth)` to every router or as a global middleware
2. **WebSocket connections** (`backend/api/agents.py:271`) — Validate JWT from query param or first message before `websocket.accept()`
3. **Static file serving** (`/assets/*`) — Currently served by FastAPI `StaticFiles` mount, which doesn't support middleware. Would need a custom route or nginx-level auth.

### WebSocket Authentication
WebSocket connections at `/api/agents/ws/{agent_id}` need special handling:
- Browsers can't send custom headers with WebSocket upgrade requests
- **Option A**: Pass JWT as query parameter: `ws://host/api/agents/ws/{id}?token=xxx`
- **Option B**: Send JWT as first message after connection, validate before processing
- **Option C**: Use cookie-based session auth (set by Auth Center login)

### Frontend Integration
- `frontend/src/lib/api.ts` — The `request()` function (line 21-34) needs to include `Authorization: Bearer <token>` header
- Currently only sends `Content-Type: application/json`
- Token should be stored in memory/cookie after SSO redirect
- WebSocket connections need token passed via query param or protocol

### Nginx Layer
- Remove or keep basic auth as a fallback layer
- Add JWT validation at nginx level (optional, using `ngx_http_auth_jwt_module`) or delegate entirely to FastAPI
- Configure redirect to Auth Center login page for unauthenticated requests

### Cross-Service Communication
- If Traffic Center or Retention Center need to call Creative Center APIs (e.g., to fetch creative assets), they should use service-to-service tokens (machine-to-machine JWT with specific scopes)
- The sidebar already links to `ag1.q37fh758g.click` (Creative Center) and `ag2.q37fh758g.click` (Retention Center) — SSO needs shared session/token across these domains

### Static Assets
- Generated files at `/assets/*` are served via FastAPI `StaticFiles` mount
- These bypass any route-level middleware
- Options: (a) Move to nginx-served directory with auth, (b) Replace mount with custom authenticated route, (c) Use signed URLs with expiry

---

## 6. Technical Notes

- **Backend framework**: FastAPI (Python) — supports dependency injection, perfect for auth middleware
- **Frontend framework**: Next.js 16 — can use middleware for auth redirects
- **Database**: SQLite via aiosqlite — no users table exists
- **No CSRF protection** — CORS is configured but no CSRF tokens
- **No rate limiting** — All endpoints are unlimited (relevant for generation endpoints that cost money)
- **Telegram bot** — External integration that bypasses web auth entirely; needs separate consideration
- **SSE endpoint** (`POST /api/chat`) — Uses `sse_starlette` for streaming; auth header should work normally
- **File uploads** — `POST /api/agents/{id}/upload` and `POST /api/adaptor/import-csv` accept multipart; auth header compatible
