# Traffic Center (Meta Media Buying) — Auth & API Analysis

**Date**: 2026-02-20
**Source**: `/Users/sky/meta-media-buying/`
**Researcher**: researcher-traffic agent

---

## 1. Current Authentication Mechanism

### 1.1 State: Users Table REMOVED

The project originally had a `users` table with email/password_hash/role columns and a `user_accounts` junction table for per-account access control (migration `0000_initial.sql`). However, **migration `0002_remove_users.sql` dropped both tables entirely**, removing all user-level auth from the database.

The current Drizzle schema (`packages/db/src/schema/accounts.ts`) has **no user model** -- only `adAccounts`.

### 1.2 Current Auth: Effectively NONE (Open API)

**Backend (Fastify API)**:
- **No JWT middleware** exists anywhere in the codebase. There is no `@fastify/jwt` plugin, no `jsonwebtoken` import, no token verification.
- **No session management** -- no cookies, no session store.
- Routes are registered directly with **no auth guards**. Every route handler is publicly accessible once you can reach the API.
- The only protection mechanisms are:
  1. **API Key scope checks** (`requireApiKeyScope` in `middleware/validate.ts`) -- but these are wrapped in `optionalApiKeyScope()` which **skips validation when no X-Api-Key header is present**. This means dashboard requests bypass all scope checks.
  2. **Integration API key** (`X-Api-Key` header checked against `INTEGRATION_API_KEY` env var) -- only for cross-project integration endpoints at `/api/v1/integrations/*`.
  3. **Keitaro IP whitelist** -- only for the postback endpoint.
  4. **Meta webhook HMAC-SHA256** verification -- only for Meta webhook receiver.

**Frontend (Next.js Dashboard)**:
- **No auth guard** on the dashboard layout. No redirect to login page.
- The `api-client.ts` has **no token attachment** -- no Authorization header, no cookie handling.
- No login page exists (no `/login` route in the app directory).
- The project snapshot mentions a login page existed previously, but it appears to have been removed along with the users table.

**Nginx**:
- Proxies requests to Next.js (:3000) and Fastify API (:3001).
- **No basic auth** configured at the nginx level (unlike Creative Center which uses nginx basic auth).
- SSL via certbot.

**WebSocket**:
- Uses `@fastify/websocket`. The `WS_AUTH_TOKEN` env var exists in config but is **optional** and the WebSocket server code does not enforce token verification on connection.

### 1.3 Summary

| Layer | Auth Status |
|-------|------------|
| Nginx | SSL only, no auth |
| Dashboard | No login, no auth guard |
| API routes | No JWT, no session auth |
| API key scopes | Optional (skipped for dashboard) |
| Integration endpoints | X-Api-Key required (env var) |
| Postback endpoint | IP whitelist (optional) |
| Meta webhooks | HMAC-SHA256 signature |
| WebSocket | Token optional, not enforced |

---

## 2. All API Endpoints

### 2.1 Public / Unauthenticated Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Server health check |
| GET/POST | `/api/v1/postback` | Keitaro S2S conversion postback receiver |
| GET/POST | `/api/v1/webhooks/meta` | Meta webhook receiver (HMAC verified) |
| GET | `/api/v1/system/status` | System status — all services health |
| GET | `/api/v1/creative-agents` | List creative agents from Creative Center (cached) |

### 2.2 Ad Account Management

| Method | Path | Purpose | Scope |
|--------|------|---------|-------|
| GET | `/api/v1/ad-accounts` | List all ad accounts | optionalApiKey(read) |
| POST | `/api/v1/ad-accounts/connect` | Connect new Meta ad account | optionalApiKey(write) |
| GET | `/api/v1/ad-accounts/:account_id` | Get account details | none |
| PUT | `/api/v1/ad-accounts/:account_id` | Update account settings | optionalApiKey(write) |
| DELETE | `/api/v1/ad-accounts/:account_id` | Disconnect (disable) account | optionalApiKey(admin) |
| POST | `/api/v1/ad-accounts/:account_id/sync` | Trigger manual Meta sync | optionalApiKey(write) |
| GET | `/api/v1/ad-accounts/:account_id/sync-status` | Get sync job status | none |

### 2.3 Campaign Management

Prefix: `/api/v1/ad-accounts/:account_id/campaigns`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List campaigns (paginated, filterable) |
| POST | `/` | Create campaign (local or Meta) |
| GET | `/:campaign_id` | Get campaign details |
| PUT | `/:campaign_id` | Update campaign |
| DELETE | `/:campaign_id` | Delete campaign |
| POST | `/:campaign_id/pause` | Pause campaign |
| POST | `/:campaign_id/resume` | Resume campaign |
| POST | `/:campaign_id/duplicate` | Duplicate campaign |
| POST | `/:campaign_id/sync` | Sync local campaign to Meta |
| POST | `/bulk` | Bulk actions (pause/resume/delete/label) |

### 2.4 Ad Set Management

Prefix: `/api/v1/ad-accounts/:account_id/adsets`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List ad sets |
| POST | `/` | Create ad set |
| GET | `/:adset_id` | Get ad set details |
| PUT | `/:adset_id` | Update ad set |
| DELETE | `/:adset_id` | Delete ad set |
| POST | `/:adset_id/pause` | Pause ad set |
| POST | `/:adset_id/resume` | Resume ad set |
| POST | `/:adset_id/duplicate` | Duplicate ad set |
| POST | `/:adset_id/adjust-budget` | Adjust budget (with 30% safety cap) |
| POST | `/bulk` | Bulk actions |

### 2.5 Ad Management

Prefix: `/api/v1/ad-accounts/:account_id/ads`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List ads |
| POST | `/` | Create ad |
| GET | `/:ad_id` | Get ad details |
| PUT | `/:ad_id` | Update ad |
| DELETE | `/:ad_id` | Delete ad |
| POST | `/:ad_id/pause` | Pause ad |
| POST | `/:ad_id/resume` | Resume ad |
| POST | `/bulk` | Bulk actions |

### 2.6 Creative Management

Prefix: `/api/v1/ad-accounts/:account_id/creatives`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List creatives |
| GET | `/:creative_id` | Get creative details |
| POST | `/` | Upload image creative (multipart) |
| POST | `/upload-video` | Upload video creative (multipart) |

### 2.7 Audience Management

Prefix: `/api/v1/ad-accounts/:account_id/audiences`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List custom audiences |
| GET | `/:audience_id` | Get audience details |
| POST | `/` | Create custom audience |
| POST | `/lookalike` | Create lookalike audience |
| POST | `/:audience_id/users` | Add users to audience |
| GET | `/interests` | Search interest targeting |
| GET | `/overlap` | Check audience overlap |
| DELETE | `/:audience_id` | Delete audience |

### 2.8 Insights & Analytics

Prefix: `/api/v1/ad-accounts/:account_id/insights`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Query time-series insights |
| GET | `/compare` | Compare periods/entities |
| GET | `/top-performers` | Top performing entities |
| GET | `/account-overview` | Account overview KPIs |

### 2.9 Conversions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/ad-accounts/:account_id/conversions` | List conversions (account-scoped) |
| GET | `/api/v1/ad-accounts/:account_id/conversions/stats` | Conversion statistics |
| GET | `/api/v1/ad-accounts/:account_id/conversions/timeline` | Timeline breakdown |
| GET | `/api/v1/conversions` | Cross-account conversions |
| GET | `/api/v1/conversions/stats` | Cross-account stats |
| GET | `/api/v1/conversions/timeline` | Cross-account timeline |

### 2.10 Lead Forms

Prefix: `/api/v1/ad-accounts/:account_id/lead-forms`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List lead forms |
| POST | `/` | Create lead form |
| GET | `/:form_id` | Get form details |
| GET | `/:form_id/submissions` | Get form submissions |
| POST | `/:form_id/forward` | Forward leads to Retention Center |

### 2.11 Automation Rules

Prefix: `/api/v1/ad-accounts/:account_id/rules`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List rules |
| POST | `/` | Create rule |
| GET | `/:rule_id` | Get rule details |
| PATCH | `/:rule_id` | Update rule |
| DELETE | `/:rule_id` | Delete rule |
| POST | `/:rule_id/enable` | Enable rule |
| POST | `/:rule_id/disable` | Disable rule |
| POST | `/:rule_id/test` | Dry-run test rule |
| GET | `/execution-log` | Rule execution history |
| POST | `/apply-template` | Apply rule template |

Rule Templates (not account-scoped):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/rule-templates` | List rule templates |

### 2.12 AI Decisions

Prefix: `/api/v1/ad-accounts/:account_id/ai`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/decisions` | List AI decisions |
| GET | `/decisions/:decision_id` | Get decision details |
| POST | `/decisions/:decision_id/approve` | Approve AI decision |
| POST | `/decisions/:decision_id/reject` | Reject AI decision |
| POST | `/decisions/:decision_id/undo` | Undo executed decision |
| GET | `/decisions/stats` | AI decision statistics |

### 2.13 AI Memory

Prefix: `/api/v1/ad-accounts/:account_id/ai/memory`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List learned patterns |
| GET | `/:memory_id` | Get pattern details |
| POST | `/:memory_id/feedback` | Give feedback on pattern |
| POST | `/submit` | Submit manual insight |
| DELETE | `/:memory_id` | Delete pattern |

### 2.14 Account Settings

Prefix: `/api/v1/ad-accounts/:account_id/settings`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Get account settings |
| PUT | `/` | Update account settings |
| PUT | `/notifications` | Update notification preferences |
| POST | `/notifications/test` | Send test notification |

### 2.15 Webhook Management (CRUD)

Prefix: `/api/v1/webhooks`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List registered webhooks |
| POST | `/` | Create webhook registration |
| GET | `/:webhook_id` | Get webhook details |
| PATCH | `/:webhook_id` | Update webhook |
| DELETE | `/:webhook_id` | Delete webhook |
| GET | `/:webhook_id/deliveries` | Get delivery log |
| POST | `/:webhook_id/test` | Test webhook delivery |

### 2.16 Cross-Project Integration Endpoints

Prefix: `/api/v1/integrations` (all require X-Api-Key header)

| Method | Path | Purpose | Direction |
|--------|------|---------|-----------|
| POST | `/creative-delivery` | Receive generated creatives from Creative Center | Inbound |
| POST | `/conversion-update` | Receive conversion updates from Retention Center | Inbound |
| POST | `/conversion-update/batch` | Batch conversion updates from Retention Center | Inbound |
| POST | `/orchestrator-command` | Receive commands from Orchestrator | Inbound |
| POST | `/config-update` | Receive global config from Orchestrator | Inbound |
| POST | `/events` | Generic integration events | Inbound |
| POST | `/creative-center/request` | Request creatives from Creative Center | Outbound |
| GET | `/creative-center/agents` | List Creative Center agents | Outbound |
| GET | `/creative-center/creatives` | List Creative Center creatives | Outbound |
| GET | `/creative-center/creatives/:creative_id` | Get specific creative | Outbound |
| POST | `/retention/forward-lead` | Forward lead to Retention Center | Outbound |
| GET | `/status` | Integration health status | Status |
| GET | `/health` | Simple health check | Status |

### 2.17 WebSocket

| Protocol | Path | Purpose |
|----------|------|---------|
| WSS | `/ws` | Real-time updates (conversions, sync progress, rule executions, AI decisions) |

**WebSocket message types**:
- `subscribe_account` / `unsubscribe_account` — join/leave account rooms
- `subscribe_entity` / `unsubscribe_entity` — join/leave entity-level rooms
- Server pushes: conversion events, sync updates, rule executions, AI decisions, alerts

---

## 3. User-Facing Features (Dashboard Pages)

| Page | Path | Actions |
|------|------|---------|
| **Overview** | `/` | View KPI cards, spend chart, date range selection |
| **Campaigns** | `/campaigns` | List, filter, pause/resume/delete campaigns, actions dropdown |
| **Campaign Detail** | `/campaigns/[id]` | View campaign data, pause/resume/delete/duplicate, view Ads tab, set agent preference |
| **Create Campaign** | `/campaigns/new` | 6-step wizard: objective, targeting, budget, creative (upload + library), preview, launch/draft |
| **Analytics** | `/analytics` | Time-series charts, breakdowns by dimension |
| **Conversions** | `/conversions` | Postback log, stats, timeline, CSV export |
| **Creatives** | `/creatives` | Gallery view, upload image/video, request creative from Creative Center agent |
| **Audiences** | `/audiences` | Custom/lookalike audience list, overlap tool |
| **Rules** | `/rules` | Automation rule list, enable/disable toggle |
| **AI Decisions** | `/ai` | Decision log, approve/reject queue, stats |
| **AI Memory** | `/ai/memory` | Learned patterns, scope filtering, feedback |
| **Settings: General** | `/settings` | Target CPA/ROAS, budget caps, safety settings |
| **Settings: Accounts** | `/settings/accounts` | Connected Meta ad accounts management |
| **Settings: Notifications** | `/settings/notifications` | Notification preferences (email, Telegram, Slack) |
| **Settings: API Keys** | `/settings/api-keys` | API key management (create, revoke, view scopes) |
| **Settings: AI Config** | `/settings/ai` | AI autonomy settings, confidence thresholds |
| **Header** | (shared) | Cmd+K search, user dropdown (logout), notifications bell |
| **Sidebar** | (shared) | Navigation + links to Creative Center (ag1) and Retention Center (ag2) |

---

## 4. Recommended Permission Levels

Based on the endpoints and features, here are the granular permissions needed:

### 4.1 Account-Level Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `accounts:read` | View ad account details and settings | account |
| `accounts:write` | Update account settings, connect/disconnect | account |
| `accounts:admin` | Delete/disconnect accounts, manage access | account |

### 4.2 Campaign Hierarchy Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `campaigns:read` | View campaigns, ad sets, ads | account |
| `campaigns:write` | Create/update campaigns, ad sets, ads | account |
| `campaigns:pause_resume` | Pause/resume campaigns, ad sets, ads | account |
| `campaigns:delete` | Delete campaigns, ad sets, ads | account |
| `campaigns:duplicate` | Duplicate campaigns/ad sets | account |
| `campaigns:bulk` | Perform bulk operations | account |

### 4.3 Budget Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `budgets:read` | View budget information | account |
| `budgets:adjust` | Adjust ad set budgets (within safety limits) | account |
| `budgets:override_safety` | Override 30% safety cap on budget changes | account |

### 4.4 Creative Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `creatives:read` | View creatives gallery | account |
| `creatives:upload` | Upload image/video creatives | account |
| `creatives:request` | Request creatives from Creative Center | account |

### 4.5 Audience Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `audiences:read` | View audiences, overlap | account |
| `audiences:write` | Create/modify audiences, add users | account |
| `audiences:delete` | Delete audiences | account |

### 4.6 Analytics Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `analytics:read` | View insights, analytics, conversions | account |
| `analytics:export` | Export data (CSV) | account |

### 4.7 Automation Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `rules:read` | View automation rules and execution log | account |
| `rules:write` | Create/update rules, apply templates | account |
| `rules:toggle` | Enable/disable rules | account |
| `rules:delete` | Delete rules | account |
| `rules:test` | Dry-run test rules | account |

### 4.8 AI Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `ai:read` | View AI decisions and memory | account |
| `ai:approve_reject` | Approve/reject/undo AI decisions | account |
| `ai:memory_write` | Submit insights, give feedback, delete patterns | account |
| `ai:config` | Modify AI autonomy settings | account |

### 4.9 Settings & Admin Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `settings:read` | View account settings | account |
| `settings:write` | Update settings (targets, budgets, safety, sync) | account |
| `notifications:manage` | Update notification preferences | account |
| `api_keys:manage` | Create/revoke API keys | account |
| `webhooks:manage` | CRUD webhook registrations | account |
| `lead_forms:read` | View lead forms and submissions | account |
| `lead_forms:write` | Create forms, forward leads | account |

### 4.10 Integration Permissions

| Permission | Description | Scope |
|-----------|-------------|-------|
| `integrations:read` | View integration status | global |
| `integrations:manage` | Configure cross-project integrations | global |

### 4.11 Suggested Role Templates

| Role | Permissions | Description |
|------|------------|-------------|
| **viewer** | `*:read`, `analytics:read` | Read-only access to all data |
| **analyst** | viewer + `analytics:export` | Can export data |
| **media_buyer** | analyst + `campaigns:write/pause_resume/duplicate`, `budgets:adjust`, `creatives:upload/request`, `audiences:write` | Day-to-day campaign management |
| **manager** | media_buyer + `campaigns:delete/bulk`, `rules:*`, `ai:approve_reject`, `settings:write` | Full campaign + automation control |
| **admin** | manager + `accounts:admin`, `api_keys:manage`, `webhooks:manage`, `ai:config`, `budgets:override_safety` | Full admin access |
| **owner** | All permissions | Platform owner |

---

## 5. Integration Points for SSO/JWT

### 5.1 Where JWT Tokens Must Be Validated

1. **Fastify API — Global onRequest hook**
   - File: `apps/api/src/server.ts` — register a global `onRequest` hook or Fastify plugin
   - Must verify JWT from `Authorization: Bearer <token>` header
   - Extract `user_id`, `role`, `permissions` from token payload
   - Attach to `request.user` for downstream handlers
   - **Skip for**: `/health`, `/api/v1/postback`, `/api/v1/webhooks/meta`, `/api/v1/system/status`, `/api/v1/integrations/*` (these use their own auth)

2. **Per-route permission checks**
   - Replace `optionalApiKeyScope()` with a proper `requirePermission()` middleware
   - Check `request.user.permissions` against required permission for each route
   - Account-scoped routes must also verify `request.user` has access to `params.account_id`

3. **WebSocket connection auth**
   - File: `apps/api/src/websocket/server.ts`
   - Validate JWT token on WebSocket upgrade request (query param `?token=` or first message)
   - Reject connections without valid tokens
   - Use token claims to restrict which account rooms the client can subscribe to

4. **Next.js Dashboard — Middleware**
   - File: `apps/dashboard/src/middleware.ts` (create new)
   - Check for auth cookie/token on every request
   - Redirect to Auth Center login if not authenticated
   - Pass user info to React context/store

5. **API Client — Token attachment**
   - File: `apps/dashboard/src/lib/api-client.ts`
   - Add `Authorization: Bearer <token>` header to all `request()` calls
   - Handle 401 responses — redirect to Auth Center login or refresh token

6. **Integration endpoints — Dual auth**
   - Keep existing `X-Api-Key` for machine-to-machine integration calls
   - Add JWT validation as an alternative for user-initiated integration actions

### 5.2 Token Flow for Auth Center SSO

```
User -> Auth Center Login (Google SSO)
     -> Auth Center issues JWT (access + refresh)
     -> Redirect to Traffic Center with token
     -> Traffic Center stores token (httpOnly cookie or localStorage)
     -> All API calls include Authorization: Bearer <token>
     -> Fastify verifies JWT signature (shared secret or JWKS)
     -> Extract user_id + permissions from claims
     -> Check user has access to requested account_id
```

### 5.3 Required Changes Summary

| Component | Current State | Required Change |
|-----------|--------------|----------------|
| Fastify server | No auth plugin | Add JWT verification plugin/hook |
| Route handlers | No permission checks | Add `requirePermission()` middleware |
| Account routes | `optionalApiKeyScope()` | Replace with `requirePermission()` + API key dual-auth |
| WebSocket | No auth on connect | Validate JWT on upgrade |
| Dashboard layout | No auth guard | Add Next.js middleware for auth redirect |
| API client | No token headers | Attach JWT to all requests |
| User model | Deleted from DB | Rely on Auth Center for user data; add `user_accounts` junction for account access |
| Config | No JWT_SECRET | Add `JWT_SECRET` or `JWKS_URL` to env config |

---

## 6. Key Findings & Risks

1. **CRITICAL: API is completely unprotected** — Anyone who knows the server URL can access all endpoints, manage campaigns, modify budgets, and delete data. The users table was removed and no alternative auth was implemented.

2. **API Key system exists but is bypassed** — The `optionalApiKeyScope()` wrapper explicitly skips auth for dashboard requests (no X-Api-Key header).

3. **Integration endpoints are properly secured** — Cross-project calls require `X-Api-Key` header matching `INTEGRATION_API_KEY` env var. This is correct for M2M auth.

4. **Account-level isolation partially exists** — Routes are scoped by `account_id` in the URL path, but no middleware verifies the requesting user has access to that account.

5. **The snapshot mentions login/auth features** but the actual code has them removed. This suggests a deliberate cleanup waiting for centralized auth.

6. **WebSocket has token support in config** (`WS_AUTH_TOKEN`) but it's optional and not enforced.

---

*End of Analysis*
