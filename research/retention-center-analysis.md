# Retention Center - Auth & API Analysis

## 1. Current Authentication Mechanism

**There is NO authentication whatsoever.** The Retention Center has:

- No middleware.ts file (Next.js middleware for route protection)
- No login page, no session management, no JWT tokens
- No user model in the Prisma schema
- No auth headers checked on any API route (except webhook-specific secrets)
- The header component has a decorative "user menu" dropdown with non-functional "Profile", "Settings", and "Log out" buttons
- The avatar shows static initials "RC" (Retention Center)

**Webhook-level secrets only:**
- `/api/webhooks/keitaro` — checks `x-webhook-secret` header or `?secret=` query param against `KEITARO_WEBHOOK_SECRET` env var
- `/api/webhooks/meta` — verifies `hub.verify_token` against `META_WEBHOOK_VERIFY_TOKEN` env var, plus `x-hub-signature-256` HMAC verification against `META_APP_SECRET`
- `/api/webhooks/instantly` — checks `x-webhook-token` header or `?token=` query param against `INSTANTLY_WEBHOOK_SECRET` env var
- `/api/webhooks/email` — same as instantly webhook (duplicate handler)
- `/api/webhooks/sms` — no auth at all
- `/api/webhooks/vapi` — no auth at all

**Environment variables** (.env.example):
```
DATABASE_URL="file:./dev.db"
INSTANTLY_API_KEY=your_instantly_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
META_WEBHOOK_VERIFY_TOKEN=your_meta_webhook_verify_token
```

No auth-related env vars (no JWT_SECRET, no GOOGLE_CLIENT_ID, etc.).

---

## 2. Complete API Endpoint Catalog

### Leads
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leads` | List leads (paginated, filterable by status/source/search/date) |
| POST | `/api/leads` | Create single lead (with optional campaignId for auto-assignment) |
| GET | `/api/leads/[id]` | Get lead detail with contact attempts and campaign assignments |
| PATCH | `/api/leads/[id]` | Update lead fields (name, phone, email, status, notes) |
| DELETE | `/api/leads/[id]` | Soft-delete a lead (sets status to DELETED) |
| POST | `/api/leads/bulk` | Bulk-create leads (with optional campaignId) |
| GET | `/api/leads/stats` | Get lead statistics (totals by status and source) |

### Campaigns
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/campaigns` | List campaigns (paginated, filterable) |
| POST | `/api/campaigns` | Create campaign (name, channels, dates, auto-assign config, VAPI config) |
| GET | `/api/campaigns/[id]` | Get campaign detail with assigned leads and scripts |
| PATCH | `/api/campaigns/[id]` | Update campaign (name, status, channels, config) |
| DELETE | `/api/campaigns/[id]` | Delete campaign (draft only) |

### Sequences (Retention Sequences)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/sequences` | List retention sequences (filterable) |
| POST | `/api/sequences` | Create retention sequence (name, channels, trigger type, steps) |
| GET | `/api/sequences/[id]` | Get sequence detail with steps and enrollments |
| PUT | `/api/sequences/[id]` | Update sequence (name, status, steps, trigger config) |
| DELETE | `/api/sequences/[id]` | Delete sequence |
| GET | `/api/sequences/dashboard-stats` | Get sequence dashboard stats (active, enrollments, conversion rate, upcoming steps) |

### Scripts (Email/SMS/Call Templates)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/scripts` | List scripts (filterable by type, campaign) |
| POST | `/api/scripts` | Create script (EMAIL/SMS/CALL type, content, VAPI config) |
| GET | `/api/scripts/[id]` | Get script detail |
| PATCH | `/api/scripts/[id]` | Update script |
| DELETE | `/api/scripts/[id]` | Delete script (blocked if used in active campaign/sequence) |

### Integrations
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/integrations` | List all integration configs (sensitive fields redacted) |
| POST | `/api/integrations` | Upsert integration config (provider, type CALL/SMS/EMAIL, config JSON) |
| GET | `/api/integrations/[provider]` | Get specific integration config |
| PATCH | `/api/integrations/[provider]` | Partially update integration config |
| DELETE | `/api/integrations/[provider]` | Deactivate integration (sets isActive=false) |

### Test Send
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/test-send/email` | Test-send email via Instantly (adds lead to Instantly campaign) |
| POST | `/api/test-send/sms` | Test-send SMS via configured SMS provider |
| POST | `/api/test-send/call` | Test-send call via VAPI |

### Conversions
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/conversions` | List conversions (filterable by status/channel/campaign/date, paginated) |
| GET | `/api/conversions/stats` | Get conversion statistics (totals, revenue, rates, by status/channel) |

### Contact Attempts
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/contact-attempts` | List recent contact attempts (filterable by channel, limit) |

### Instantly (Email Provider)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/instantly/analytics` | Get Instantly email analytics (last 30 days) |

### Learning (AI/Analytics)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/learning/insights` | Generate AI insights (optional campaignId filter) |
| GET | `/api/learning/ab-tests` | List A/B tests (filterable by campaign/status) |
| POST | `/api/learning/ab-tests` | Create A/B test (campaignId, channel, variantA/B script IDs) |
| GET | `/api/learning/channel-mix` | Get channel mix analysis |
| GET | `/api/learning/funnel` | Get conversion funnel data (optional campaignId) |
| GET | `/api/learning/heatmap` | Get time-based conversion heatmap (optional channel filter) |
| GET | `/api/learning/recommendations` | Get AI recommendations for optimization |
| GET | `/api/learning/sequence-performance` | Get sequence performance analytics |
| GET | `/api/learning/suggestions` | Suggest optimal script for channel (optional campaign filter) |
| GET | `/api/learning/words` | Get top-performing words/phrases by channel |

### Reports
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reports/overview` | Get overview stats (date range filter) |
| GET | `/api/reports/campaigns` | Get campaign comparison report (date range filter) |
| GET | `/api/reports/channels` | Get channel performance or email analytics (date range + channel filter) |
| GET | `/api/reports/leads` | Get lead funnel report (date range filter) |
| GET | `/api/reports/timeline` | Get activity timeline (date range filter) |

### Scheduler (Internal/Cron)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/scheduler/process` | Process scheduled contact attempts |
| POST | `/api/scheduler/sequences` | Process sequence step executions |

### Webhooks (Inbound)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET/POST | `/api/webhooks/keitaro` | Keitaro conversion postbacks | `x-webhook-secret` or `?secret=` |
| GET/POST | `/api/webhooks/meta` | Meta Lead Ads webhooks | Hub verify token + HMAC signature |
| POST | `/api/webhooks/instantly` | Instantly email event webhooks | `x-webhook-token` or `?token=` |
| POST | `/api/webhooks/email` | Email event webhooks (duplicate of instantly) | `x-webhook-token` or `?token=` |
| POST | `/api/webhooks/sms` | SMS delivery callbacks | None |
| POST | `/api/webhooks/vapi` | VAPI call status callbacks | None |

**Total: 46 endpoint handlers across 30 route files**

---

## 3. User-Facing Features

### Dashboard (/)
- Overview stats: leads, campaigns, sequences, conversions, revenue
- Recent contact attempts feed
- Sequence dashboard stats (active enrollments, upcoming steps)

### Leads Management (/leads)
- View paginated lead list with search, status/source filters
- Add individual leads (manual entry with optional campaign assignment)
- Bulk-import leads
- View lead detail page (contact history timeline, campaign assignments)
- Edit lead info (name, phone, email, status, notes)
- Soft-delete leads
- Auto-routing: new leads are automatically assigned to matching campaigns

### Campaigns (/campaigns)
- View campaign list with filters
- Create campaigns (name, description, channels EMAIL/SMS/CALL, dates, auto-assign config, VAPI config, email sequences via Instantly)
- View campaign detail (assigned leads, scripts, stats)
- Edit campaign settings
- Delete draft campaigns
- Campaign status lifecycle: DRAFT -> ACTIVE -> PAUSED/COMPLETED

### Sequences (/sequences)
- View retention sequence list
- Create multi-step retention sequences (name, trigger type, channels, steps with delays)
- Trigger types: manual, new_lead, no_conversion
- Each step: channel (EMAIL/SMS/CALL) + script + delay + conditions
- View sequence detail (steps, enrollments, execution history)
- Edit sequence (add/remove steps, change status)
- Delete sequences
- Dashboard stats view (active enrollments, conversion rates, upcoming steps, recent activity)

### Scripts (/scripts)
- View scripts list
- Create email templates, SMS templates, call scripts (with VAPI config)
- Edit scripts with template variable insertion
- Preview scripts
- Delete scripts (prevented if used in active campaigns/sequences)

### Integrations (/integrations)
- Configure Instantly (email provider) with API key
- Configure SMS providers (with API credentials)
- Configure VAPI (AI voice calls) with API key, assistant ID, phone number
- Configure Keitaro (conversion tracking) webhook
- Test connection for each integration
- View webhook URLs for inbound events
- Toggle integrations active/inactive

### Test Send (/test-send)
- Send test email via Instantly
- Send test SMS via configured provider
- Make test call via VAPI (with voice/model/instructions overrides)

### Conversions (/conversions)
- View conversion list (filterable by status, channel, campaign, date range)
- View conversion stats (total, revenue, rates, by status/channel)

### Learning (/learning)
- AI-generated insights per campaign
- A/B test management (create, view results, auto-end with winner selection)
- Channel mix analysis
- Conversion funnel visualization
- Time-based conversion heatmap
- AI recommendations
- Sequence performance analytics
- Script suggestion engine
- Top-performing words analysis

### Reports (/reports)
- Overview stats with date range picker
- Campaign comparison table
- Channel performance charts (including detailed email analytics from Instantly)
- Lead funnel report
- Activity timeline chart
- Data export functionality

---

## 4. Recommended Permission Levels

### Lead Permissions
| Permission | Description |
|-----------|-------------|
| `leads:view` | View lead list and detail |
| `leads:create` | Add individual leads |
| `leads:edit` | Update lead info and status |
| `leads:delete` | Soft-delete leads |
| `leads:bulk_import` | Bulk-import leads |

### Campaign Permissions
| Permission | Description |
|-----------|-------------|
| `campaigns:view` | View campaign list and detail |
| `campaigns:create` | Create new campaigns |
| `campaigns:edit` | Edit campaign settings and status |
| `campaigns:delete` | Delete draft campaigns |
| `campaigns:assign_leads` | Assign/unassign leads to campaigns |

### Sequence Permissions
| Permission | Description |
|-----------|-------------|
| `sequences:view` | View sequence list and detail |
| `sequences:create` | Create new retention sequences |
| `sequences:edit` | Edit sequence steps and status |
| `sequences:delete` | Delete sequences |

### Script Permissions
| Permission | Description |
|-----------|-------------|
| `scripts:view` | View script list and content |
| `scripts:create` | Create new scripts/templates |
| `scripts:edit` | Edit scripts |
| `scripts:delete` | Delete scripts |

### Integration Permissions
| Permission | Description |
|-----------|-------------|
| `integrations:view` | View integration configs (redacted) |
| `integrations:manage` | Create, edit, delete integrations (sensitive: contains API keys) |

### Communication Permissions
| Permission | Description |
|-----------|-------------|
| `send:email` | Send emails (test or campaign) |
| `send:sms` | Send SMS (test or campaign) |
| `send:call` | Make calls via VAPI (test or campaign) |
| `send:test` | Use the test-send feature |

### Analytics/Reports Permissions
| Permission | Description |
|-----------|-------------|
| `reports:view` | View reports and analytics dashboards |
| `learning:view` | View learning insights, A/B tests, recommendations |
| `learning:manage` | Create and manage A/B tests |
| `conversions:view` | View conversion data and stats |

### Scheduler Permissions
| Permission | Description |
|-----------|-------------|
| `scheduler:execute` | Trigger scheduler processing (internal/admin) |

### Suggested Roles
| Role | Permissions |
|------|------------|
| **Viewer** | `*:view`, `conversions:view`, `reports:view`, `learning:view` |
| **Operator** | Viewer + `leads:create/edit`, `send:*`, `scripts:view` |
| **Manager** | Operator + `campaigns:*`, `sequences:*`, `scripts:*`, `leads:*`, `learning:manage` |
| **Admin** | Manager + `integrations:manage`, `scheduler:execute` |

---

## 5. Integration Points for SSO/JWT

### A. Next.js Middleware (PRIMARY)
- **Location**: Create `/Users/sky/retention-center/src/middleware.ts`
- **Purpose**: Intercept ALL requests, validate JWT token from cookie or Authorization header
- **Exclude**: `/api/webhooks/*` (these use their own auth), `/_next/*`, `/favicon.ico`
- **Redirect**: Unauthenticated users to Auth Center login page

### B. API Route Protection
Every API route handler currently has NO auth check. Auth must be added at one of these levels:
1. **Middleware level** (recommended) — single middleware.ts validates JWT, injects user context via headers
2. **Per-route wrapper** — auth utility function called at the top of each route handler
3. **Service layer** — auth checks in service classes (not recommended, too deep)

### C. Webhook Routes (Keep Separate Auth)
These routes must remain accessible without JWT — they use provider-specific secrets:
- `/api/webhooks/keitaro` — keep `KEITARO_WEBHOOK_SECRET` check
- `/api/webhooks/meta` — keep Meta signature verification
- `/api/webhooks/instantly` — keep `INSTANTLY_WEBHOOK_SECRET` check
- `/api/webhooks/email` — keep existing token check
- `/api/webhooks/sms` — **ADD** a webhook secret check (currently unprotected)
- `/api/webhooks/vapi` — **ADD** a webhook secret check (currently unprotected)

### D. Scheduler Routes (Internal-Only)
- `/api/scheduler/process` and `/api/scheduler/sequences`
- Currently no auth — should be restricted to admin role or internal service token
- These are likely called by a cron job, so may need a service token mechanism

### E. Frontend Integration Points
- **Layout** (`src/app/(dashboard)/layout.tsx`) — wrap with auth check, redirect to login if no session
- **Header** (`src/components/layout/header.tsx`) — replace static "RC" avatar with actual user data from JWT claims
- **Sidebar** (`src/components/layout/sidebar.tsx`) — conditionally show nav items based on user permissions

### F. Cross-Project Navigation
The sidebar has links to:
- Creative Center (`https://ag1.q37fh758g.click/`)
- Traffic Center (`https://ag3.q37fh758g.click/`)

These will need shared JWT/SSO cookies or token passing for seamless cross-project auth.

---

## 6. Technical Stack Summary

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| ORM | Prisma 7 with libsql adapter |
| Database | SQLite (via libsql) |
| Validation | Zod |
| Email | Instantly.ai API V2 |
| SMS | Configurable provider (via IntegrationConfig) |
| Calls | VAPI.ai |
| Conversions | Keitaro postbacks |
| Leads | Meta Lead Ads webhooks |
| Output | Standalone (Next.js standalone build) |

## 7. Database Models (13 total)

1. **Lead** — contact record (name, phone, email, source, status)
2. **Campaign** — marketing campaign with channels and config
3. **CampaignLead** — many-to-many campaign-lead assignment
4. **Script** — email/SMS/call templates
5. **ContactAttempt** — log of every outreach attempt
6. **IntegrationConfig** — provider configs (API keys, etc.)
7. **Conversion** — conversion events from Keitaro postbacks
8. **ConversionRule** — learned conversion rules
9. **ABTest** — A/B test tracking
10. **RetentionSequence** — multi-step retention automation
11. **SequenceStep** — individual step in a sequence
12. **SequenceEnrollment** — lead enrollment in a sequence
13. **SequenceStepExecution** — execution log for each step

**No User/Session/Auth models exist** — these need to be added to Auth Center or a shared auth layer.
