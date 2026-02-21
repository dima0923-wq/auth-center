# Auth Center — Project Snapshot (2026-02-21)

## Overview

Auth Center is a centralized authentication and authorization service for the Fully Automated Media Buying Platform. It provides Telegram-based login, RBAC with 34 granular permissions across 4 project scopes, JWT cross-project tokens, and SDKs (TypeScript + Python) for consuming services.

- **Domain**: https://ag4.q37fh758g.click
- **Server**: 38.180.64.111 (Ubuntu, Node v22.22.0)
- **Server path**: `/opt/auth-center/`
- **Local path**: `/Users/sky/auth-center/`
- **Service**: `auth-center.service` (Next.js on :3000)
- **Status**: Production, active

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5.x |
| Runtime | Node.js 22.22.0 |
| Database | SQLite via Prisma 7.4.1 + better-sqlite3 |
| Auth | Telegram Bot code-based login (HMAC-SHA256) |
| JWT | jose 6.1.3 (HS256, access/refresh tokens) |
| UI | React 19.2.3 + Tailwind CSS 4 + shadcn/ui + Radix UI |
| Testing | Vitest 4.x + Testing Library |
| Proxy | nginx + Let's Encrypt SSL (certbot) |

## Git Status

| Location | Commit | Notes |
|----------|--------|-------|
| Local (HEAD) | `5d9d246` Add cross-project redirect flow, JWKS endpoint, and OpenID discovery | 6 commits ahead of origin |
| GitHub (origin/main) | `04448de` Fix SQLite case-insensitive query | Needs push |
| Server | Deployed from earlier state | Last rsync 2026-02-20 15:47 |

**Remote**: `https://github.com/dima0923-wq/auth-center.git`

### Commit History (all 13 commits)

```
5d9d246 Add cross-project redirect flow, JWKS endpoint, and OpenID discovery
b1034f3 Add Python SDK with local JWKS-based JWT verification
b5c4859 Add Auth Center Admin title and shield favicon
5ef3f02 Security: code-only auth, rate limiting, brute force protection, remove OAuth widget, webhook
bddafc8 Fix logout: use POST request instead of GET link
1da0647 Fix Telegram auth: JWT consistency, isAdmin check, hardcoded bot names, cleanup next-auth
04448de Fix SQLite case-insensitive query
c294c6b Add bot-based code login as alternative to Telegram Widget
989f00d Fix TS error in telegram-login-button cleanup
b6a7341 Fix Telegram Login Widget + clean up login page
93f2cda Add invite-only login + real Telegram credentials
bdcf346 Auth Center -- initial commit
909bf96 Initial commit from Create Next App
```

## Directory Structure

```
auth-center/
  docs/                     # Documentation and snapshots
  prisma/
    schema.prisma           # 11 models (User, Role, Permission, etc.)
    seed.ts                 # Seeds 34 permissions + 4 system roles
  public/                   # Static assets (favicon)
  research/                 # Research and backup docs
  sdk/
    src/                    # TypeScript SDK (verify, permissions, types)
    dist/                   # Compiled SDK output
    python/                 # Python SDK (auth_center_sdk.py)
  src/
    __tests__/              # Vitest test files
    app/
      .well-known/          # OpenID discovery endpoint
      api/auth/             # Auth API routes (login, verify, refresh, JWKS)
      api/invitations/      # Invitation management
      api/permissions/      # Permission & matrix endpoints
      api/roles/            # Role CRUD + permission assignment
      api/telegram/         # Telegram webhook handler
      api/users/            # User CRUD + project role assignment
      dashboard/            # Admin dashboard pages
      login/                # Login page with code-based auth
      logout/               # Logout route
    components/             # React UI components
    generated/prisma/       # Prisma generated client
    lib/                    # Core libraries (see below)
    types/                  # TypeScript type definitions
  middleware.ts             # Next.js edge middleware (session guard)
  deploy.sh                 # Deployment script (rsync + build + restart)
```

## Database Schema (Prisma — SQLite)

### Models (11 total)

| Model | Purpose |
|-------|---------|
| **User** | Telegram-linked users with status (ACTIVE/DISABLED/PENDING) |
| **Account** | OAuth/Telegram provider accounts |
| **Session** | Active session tokens |
| **Role** | Named roles with system flag (Super Admin, Project Admin, Manager, Viewer) |
| **Permission** | Granular permission keys (`project:resource:action` format) |
| **RolePermission** | Many-to-many role-permission junction |
| **UserProjectRole** | Per-user per-project role assignment (unique userId+project) |
| **AuditLog** | Action audit trail with IP tracking |
| **Invitation** | Invite-only user onboarding with expiry + status |
| **BotChat** | Telegram bot chat ID registry |
| **LoginCode** | 6-digit login codes with brute force protection (max 5 attempts) |

## RBAC System

### 4 System Roles

| Role | Permissions | Scope |
|------|------------|-------|
| **Super Admin** | ALL 34 permissions | System-wide, cannot be modified |
| **Project Admin** | All project + user management (no global:roles:manage, no global:settings) | Per-project |
| **Manager** | View + Create + Edit + Import (no delete, no admin) | Per-project |
| **Viewer** | Read-only (view permissions only) | Per-project |

### 34 Permissions Across 4 Scopes

| Scope | Count | Permission Keys |
|-------|-------|----------------|
| **creative_center** | 10 | agents (view/create/edit/delete), generations (view/create), memory (view/manage), history (view/import) |
| **traffic_center** | 8 | campaigns (view/create/edit/delete), analytics (view), budgets (manage), rules (manage), accounts (manage) |
| **retention_center** | 8 | campaigns (view/create/edit/delete), contacts (view/manage), templates (manage), analytics (view) |
| **global** | 8 | users (view/create/edit/delete), roles (view/manage), audit (view), settings (manage) |

**Permission format**: `{scope}:{resource}:{action}` (e.g., `creative:agents:create`)
**Wildcard support**: `*` matches any segment (e.g., `*:*:*` = full access)

## Authentication Flow

### Login Flow (Code-Based)

1. User enters Telegram username on `/login`
2. Server generates 6-digit code, hashes (SHA256), stores in `LoginCode` table
3. Telegram bot sends code to user's chat via webhook
4. User enters code on login page
5. Server verifies code hash, checks attempts (max 5), checks expiry
6. On success: creates/updates User, creates Session, sets session cookie
7. Rate limiting: in-memory sliding window per IP

### Cross-Project SSO

1. External project (ag1/ag2/ag3) redirects to Auth Center with `?redirect_url=<url>`
2. Auth Center validates redirect URL against allowlist: `ag1-ag4.q37fh758g.click` + `localhost`
3. After login, Auth Center issues project-scoped JWT with permissions
4. Sets `ac_access` cookie on shared domain `.q37fh758g.click`
5. Redirects back to originating project with token
6. **Domain mapping**: ag1 = creative_center, ag2 = retention_center, ag3 = traffic_center

### JWT Tokens

- **Algorithm**: HS256 (via jose library)
- **Issuer**: `auth-center`
- **Access token**: 1 hour expiry
- **Refresh token**: 7 days expiry
- **Payload**: userId, telegramId, username, firstName, photoUrl, role, project, permissions[], type

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/request-code` | POST | Request login code via Telegram |
| `/api/auth/verify-code` | POST | Verify login code |
| `/api/auth/verify` | GET/POST | Verify JWT token |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/logout` | POST | Destroy session |
| `/api/auth/jwks` | GET | JWKS public key endpoint |
| `/.well-known/openid-configuration` | GET | OpenID discovery |
| `/api/auth/token` | POST | Issue project-scoped token |
| `/api/users` | GET/POST | User list / create |
| `/api/users/[id]` | GET/PATCH/DELETE | User CRUD |
| `/api/users/[id]/projects` | GET/POST | User project roles |
| `/api/users/[id]/projects/[project]` | DELETE | Remove project role |
| `/api/roles` | GET/POST | Role list / create |
| `/api/roles/[id]` | GET/PATCH/DELETE | Role CRUD |
| `/api/roles/[id]/permissions` | PUT | Set role permissions |
| `/api/permissions` | GET | List all permissions |
| `/api/permissions/matrix` | GET | Full role-permission matrix |
| `/api/invitations` | GET/POST | Invitation management |
| `/api/invitations/[username]` | GET | Check invitation by username |
| `/api/telegram/webhook` | POST | Telegram bot webhook |

## Dashboard Pages

| Path | Purpose |
|------|---------|
| `/dashboard` | Main dashboard overview |
| `/dashboard/account` | User account settings |
| `/dashboard/account/permissions` | View own permissions |
| `/dashboard/admin/users` | User management (admin) |
| `/dashboard/admin/users/[id]` | Edit user details + project roles |
| `/dashboard/admin/roles` | Role management (admin) |
| `/dashboard/admin/roles/[id]` | Edit role permissions |
| `/dashboard/admin/permissions` | Permission matrix view |

## SDKs

### TypeScript SDK (`sdk/src/`)

- Token verification with JWKS-based JWT validation
- Permission checking: `hasPermission()`, `requirePermission()`, `hasAllPermissions()`, `hasAnyPermission()`
- Bearer token extraction utility
- Token caching with invalidation
- Express middleware adapter

### Python SDK (`sdk/python/`)

- `auth_center_sdk.py` — JWKS-based JWT verification
- `auth_center.py` — Alternative implementation
- Dependencies: `PyJWT`, `cryptography`, `requests`

## Security Features

- **Code-only authentication** (Telegram OAuth widget removed)
- **Rate limiting**: In-memory sliding window per IP
- **Brute force protection**: Max 5 code attempts, code expiry
- **Invite-only**: Users must be invited before they can log in
- **Redirect URL validation**: Allowlist-based, HTTPS-only (except localhost)
- **Session cookies**: HttpOnly, Secure, SameSite
- **Audit logging**: All auth events tracked with IP

## Server Configuration

### Environment Variables (Production)

```
DATABASE_URL=file:./data/auth.db
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=fdsjgdsfigj2n432bot
NEXTAUTH_URL=https://ag4.q37fh758g.click
NODE_ENV=production
JWT_SECRET=<redacted>
TELEGRAM_BOT_TOKEN=<redacted>
```

### Nginx

```nginx
server {
    server_name ag4.q37fh758g.click;
    listen 443 ssl;                        # Certbot managed
    location / {
        proxy_pass http://127.0.0.1:3000;  # Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Systemd Service

- **Unit**: `auth-center.service`
- **Status**: Active (running)
- **Port**: 3000 (proxied via nginx)

## Deployment

**Script**: `/Users/sky/auth-center/deploy.sh`

```bash
# 1. rsync (excludes: node_modules, .next, .git, .env, *.db, sdk/dist)
# 2. npm install --production=false
# 3. npx prisma generate + db push
# 4. npx prisma db seed (idempotent)
# 5. npm run build
# 6. systemctl restart auth-center.service
```

**SSH**: Key-based auth (`~/.ssh/id_ed25519`), no sshpass needed.

## Known Issues / Notes

- Local is 6 commits ahead of GitHub origin — needs `git push origin main`
- Server deployment is from 2026-02-20 — may be behind latest local changes
- Telegram bot username in .env (`fdsjgdsfigj2n432bot`) appears to be a placeholder
- JWKS endpoint added but JWT still uses symmetric HS256 (JWKS useful for future asymmetric migration)
