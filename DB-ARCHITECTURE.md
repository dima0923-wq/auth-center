# Auth Center — Complete Database Architecture

## Overview

Auth Center provides centralized authentication and role-based access control (RBAC) for the fully automated media buying platform. It manages user authentication via Telegram Login Widget, issues JWT tokens for cross-project access, and enforces fine-grained permissions across multiple projects.

- **Stack**: Next.js 16 + Prisma 7 + SQLite (BetterSqlite3)
- **Database**: SQLite with better-sqlite3 adapter
- **Auth**: Telegram Login Widget + JWT (HS256)
- **RBAC**: 4 system roles, 34 permissions, project-scoped role assignment
- **Server**: 38.180.64.111 (ag4.q37fh758g.click)

---

## Database Schema

### 1. User

Primary user authentication model for Telegram login integration.

```prisma
model User {
  id               String   @id @default(cuid())
  telegramId       BigInt   @unique
  username         String?
  firstName        String
  lastName         String?
  email            String?
  photoUrl         String?
  status           String   @default("ACTIVE")        // ACTIVE | DISABLED | PENDING
  lastLoginAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  telegramChatId   BigInt?

  // Relations
  accounts         Account[]
  sessions         Session[]
  projectRoles     UserProjectRole[]
  auditLogs        AuditLog[]
  invitations      Invitation[]  @relation("InvitedByUser")
}
```

**Key Fields**:
- `telegramId`: Primary identifier from Telegram Login Widget (verified by HMAC-SHA256)
- `status`: Controls user access (ACTIVE, DISABLED, PENDING)
- `telegramChatId`: Optional bot integration for notifications
- **Unique Constraint**: `telegramId`

---

### 2. Account

OAuth/provider account linking (currently Telegram only, extensible for future providers).

```prisma
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String  @default("telegram")
  provider           String  @default("telegram")
  providerAccountId  String
  authDate           Int?
  hash               String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

**Purpose**: Stores OAuth connection details. Currently hardcoded to Telegram but architecture supports multiple providers.

---

### 3. Session

Session token management for active user sessions.

```prisma
model Session {
  id            String   @id @default(cuid())
  sessionToken  String   @unique
  userId        String
  expires       DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Purpose**: Server-side session tracking with JWT expiration. Cascades delete on user removal.

---

### 4. Role

RBAC role definitions with 4 immutable system roles (Super Admin, Project Admin, Manager, Viewer).

```prisma
model Role {
  id            String   @id @default(cuid())
  name          String   @unique
  description   String?
  isSystem      Boolean  @default(false)  // immutable system roles
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  permissions   RolePermission[]
  projectRoles  UserProjectRole[]
}
```

**System Roles** (isSystem=true):
1. **Super Admin**: All 34 permissions across all projects
2. **Project Admin**: All project permissions + user management (excludes global:settings, global:roles:manage)
3. **Manager**: View + Create + Edit + Import only (no delete, no admin functions)
4. **Viewer**: View-only access (read permissions only)

**Key Constraint**: Role `name` is unique and cannot be modified/deleted if `isSystem=true`.

---

### 5. Permission

Fine-grained permission definitions — 34 total across 4 project scopes.

```prisma
model Permission {
  id            String   @id @default(cuid())
  key           String   @unique  // e.g. "creative:agents:create"
  name          String
  description   String?
  project       String   // creative_center | traffic_center | retention_center | global
  createdAt     DateTime @default(now())

  roles RolePermission[]

  @@index([project])
}
```

**Permission Format**: `{project}:{resource}:{action}`

**Permissions by Project Scope**:

#### Creative Center (10 permissions)
- `creative:agents:view` — View creative agents list
- `creative:agents:create` — Create new creative agents
- `creative:agents:edit` — Edit agent configuration
- `creative:agents:delete` — Delete creative agents
- `creative:generations:view` — View generated creatives
- `creative:generations:create` — Generate new creatives
- `creative:memory:view` — View agent memory entries
- `creative:memory:manage` — Add/edit/delete memory entries
- `creative:history:view` — View historical data and batches
- `creative:history:import` — Import CSV/GDrive historical data

#### Traffic Center (8 permissions)
- `traffic:campaigns:view` — View ad campaigns
- `traffic:campaigns:create` — Create new ad campaigns
- `traffic:campaigns:edit` — Edit campaign settings
- `traffic:campaigns:delete` — Delete ad campaigns
- `traffic:analytics:view` — View traffic analytics and reports
- `traffic:budgets:manage` — Set and adjust campaign budgets
- `traffic:rules:manage` — Create/edit automation rules
- `traffic:accounts:manage` — Connect and manage Meta ad accounts

#### Retention Center (8 permissions)
- `retention:campaigns:view` — View email/SMS campaigns
- `retention:campaigns:create` — Create email/SMS campaigns
- `retention:campaigns:edit` — Edit retention campaign settings
- `retention:campaigns:delete` — Delete retention campaigns
- `retention:contacts:view` — View CRM contacts
- `retention:contacts:manage` — Import/edit/delete contacts
- `retention:templates:manage` — Create/edit message templates
- `retention:analytics:view` — View retention reports

#### Global (8 permissions)
- `global:users:view` — View user list
- `global:users:create` — Invite new users
- `global:users:edit` — Edit user profiles and status
- `global:users:delete` — Disable or remove users
- `global:roles:view` — View roles and permissions
- `global:roles:manage` — Create/edit/delete roles
- `global:audit:view` — View system audit log
- `global:settings:manage` — Manage system settings

**Total**: 34 permissions across 4 scopes. **Index** on `project` for efficient scope-based lookups.

---

### 6. RolePermission

Join table linking roles to permissions (many-to-many relationship).

```prisma
model RolePermission {
  roleId       String
  permissionId String

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}
```

**Key**: Composite primary key `(roleId, permissionId)` ensures no duplicate role-permission assignments. Cascades delete on role or permission removal.

---

### 7. UserProjectRole

Project-scoped role assignment for users (enforces one role per user per project).

```prisma
model UserProjectRole {
  id        String   @id @default(cuid())
  userId    String
  project   String   // creative_center | traffic_center | retention_center | global
  roleId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, project])
  @@index([userId])
  @@index([project])
}
```

**Critical Constraint**: `@@unique([userId, project])` enforces exactly one role assignment per user per project.

**Indexes**:
- `userId` — Get all projects a user has access to
- `project` — Get all users in a project

**Example**:
- User A: Manager in creative_center, Viewer in traffic_center, Super Admin in global
- User B: Viewer in retention_center only

---

### 8. AuditLog

System-wide audit trail for security, compliance, and debugging.

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // e.g. "user.login", "role.create", "permission.assign"
  resource  String?  // e.g. "user:clxyz123", "role:admin"
  details   String?  // JSON string with extra context
  ip        String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

**Fields**:
- `action`: String action type (e.g., "user.login", "role.create", "permission.assign")
- `resource`: Optional resource identifier (e.g., "user:clxyz123", "role:admin")
- `details`: Optional JSON string with extra context
- `ip`: Client IP address for security tracking

**Indexes**:
- `userId` — Get audit trail for a specific user
- `action` — Get all events of a specific action type
- `createdAt` — Get recent audit events

**Data Integrity**: `SetNull` on user delete (preserves audit trail).

---

### 9. Invitation

User invitations with token-based onboarding workflow.

```prisma
model Invitation {
  id                String   @id @default(cuid())
  telegramUsername  String
  invitedById       String
  roleId            String
  project           String   // creative_center | traffic_center | retention_center | global
  status            String   @default("PENDING")  // PENDING | ACCEPTED | EXPIRED | REVOKED
  token             String   @unique @default(cuid())
  expiresAt         DateTime
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  invitedBy User @relation("InvitedByUser", fields: [invitedById], references: [id])

  @@index([telegramUsername])
  @@index([token])
  @@index([status])
}
```

**Workflow**:
1. Admin invites user by Telegram username
2. System generates unique secure token (cuid)
3. Token sent via Telegram bot
4. Invitee signs in with Telegram
5. System accepts token, creates UserProjectRole
6. Invitation status → "ACCEPTED"

**Indexes**:
- `telegramUsername` — Find invitations for a user
- `token` — Validate and accept invitations
- `status` — Get pending/accepted invitations

---

### 10. BotChat

Telegram bot chat sessions for notifications and messages.

```prisma
model BotChat {
  id        String   @id @default(cuid())
  username  String   @unique  // telegram username (lowercase)
  chatId    BigInt   // telegram chat ID
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Purpose**: Stores Telegram chat IDs for bot message delivery (notifications, invitations).

---

### 11. LoginCode

Rate-limited 6-digit OTP codes for Telegram login.

```prisma
model LoginCode {
  id          String   @id @default(cuid())
  username    String
  codeHash    String   // SHA256 hash of the 6-digit code
  chatId      BigInt   // Telegram chat ID
  attempts    Int      @default(0)
  maxAttempts Int      @default(5)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@index([username])
  @@index([expiresAt])
}
```

**Security**:
- Stores SHA256 hash of code (never plain text)
- Tracks failed attempts (max 5)
- Expires after timeout

**Indexes**:
- `username` — Look up active codes for user
- `expiresAt` — Cleanup expired codes

---

## Database Relationships & Cardinality

### User Relationships

```
User (1) ──── (many) Account         [CASCADE delete]
User (1) ──── (many) Session         [CASCADE delete]
User (1) ──── (many) UserProjectRole [CASCADE delete]
User (1) ──── (many) AuditLog        [SET NULL on delete - audit preserved]
User (1) ──── (many) Invitation      [FK to invitedById]
```

### Role-Permission Relationships

```
Role (1) ──── (many) RolePermission ──── (many) Permission
             [CASCADE delete]            [CASCADE delete]
```

### Project-Scoped Access

```
User (1) ──many── UserProjectRole ──many── Role ──many── RolePermission ──many── Permission
         ↓                          (project-scoped)
    One role per user per project
    (enforced by @@unique([userId, project]))
```

---

## Role Permission Assignments

### Permission Distribution Across Roles

| Role | Super Admin | Project Admin | Manager | Viewer |
|------|------------|---------------|---------|--------|
| All 34 permissions | ✅ | ❌ | ❌ | ❌ |
| Project-scoped permissions (30) | ✅ | ✅ | ❌ | ❌ |
| View only (9) | ✅ | ✅ | ❌ | ✅ |
| Create/Edit/Import (18) | ✅ | ✅ | ✅ | ❌ |
| Delete/Manage (reserved) | ✅ | ⚠️ | ❌ | ❌ |

### Detailed Permission Assignment

**Super Admin**: All 34 permissions
- Assigned: Every permission key in database

**Project Admin**: 30 permissions
- Excludes: `global:roles:manage`, `global:settings:manage`, `global:audit:view`
- Rationale: System-wide settings restricted to Super Admin

**Manager**: ~18 permissions (view + create + edit + import)
- Filters: Keys containing `:view`, `:create`, `:edit`, or `:import`
- Excludes: All `:delete`, `:manage` (admin-only), and all `global:*` permissions
- Rationale: Can operate resources but cannot delete or administrate

**Viewer**: ~9 permissions (view-only)
- Filters: Keys containing `:view` only
- Rationale: Read-only access for reporting/monitoring

---

## Authentication & JWT Flow

### Two-Tier JWT Architecture

#### 1. Session JWT (httpOnly Cookie)

**When Issued**: After successful Telegram Login Widget verification

**Token Details**:
- Algorithm: HS256
- Payload: `{ sub: userId, type: "session" }`
- Expiry: 7 days
- Storage: httpOnly cookie (`auth-session`)
- Issuer: `auth-center`
- SecureFlag: Enabled in production
- SameSite: Lax

**Usage**: Maintains user session across Auth Center domain. Verified by middleware on `/dashboard/*` routes.

#### 2. Project Access Token (on-demand)

**When Issued**: `POST /api/auth/token { project }`

**Token Details**:
- Algorithm: HS256
- Payload:
  ```json
  {
    "sub": "userId",
    "telegramId": "telegram_id",
    "username": "optional",
    "firstName": "user_name",
    "photoUrl": "optional_photo_url",
    "role": "role_name_in_project",
    "project": "creative_center|traffic_center|retention_center",
    "permissions": ["creative:agents:view", "creative:agents:create"],
    "type": "access",
    "iat": 1708473600,
    "exp": 1708477200,
    "iss": "auth-center"
  }
  ```
- Access Token Expiry: 1 hour
- Refresh Token Expiry: 7 days
- Issuer: `auth-center`

**Usage**: Stateless token for cross-project authentication. Projects verify via `/api/auth/verify`.

### JWT Secret Management

- **Environment Variable**: `JWT_SECRET` (required in production)
- **Fallback**: `dev-jwt-secret-change-in-production` (development only)
- **Encoding**: TextEncoder to 256-bit key for HS256

### Session Reconstruction Query

When user makes API request:

```typescript
// 1. Verify session JWT from cookie
const { payload } = await jwtVerify(token, JWT_SECRET);
const userId = payload.sub;

// 2. Query user with nested includes (eliminates N+1 queries)
const dbUser = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    projectRoles: {
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    }
  }
});

// 3. Build SessionUser context
const allPermissions = new Set<string>();
const roles: Record<string, string> = {};

for (const pr of dbUser.projectRoles) {
  roles[pr.project] = pr.role.name;
  for (const rp of pr.role.permissions) {
    allPermissions.add(rp.permission.key);
  }
}

// 4. Return hydrated session
return {
  user: {
    id: dbUser.id,
    roles,  // { creative_center: "Manager", traffic_center: "Viewer" }
    permissions: Array.from(allPermissions),
    telegramId: dbUser.telegramId,
    ...
  }
};
```

**Result**: Single user object with all project-scoped roles and aggregated permissions (no further DB queries needed in handlers).

---

## Cascade Rules & Data Integrity

### Cascade Delete Behavior

| Model | Delete Behavior |
|-------|-----------------|
| User | Cascades to Account, Session, UserProjectRole; SetNull on AuditLog |
| Role | Cascades to RolePermission, UserProjectRole |
| Permission | Cascades to RolePermission |
| Invitation | Standalone (no cascades) |

**Rationale**:
- User deletion removes all related auth records (clean removal)
- Audit trail preserved via SetNull (can see "User deleted by admin" actions)
- Role/Permission deletion ensures no orphaned join records
- Invitation data preserved for history

---

## Seed Data & Initialization

### Seed Script Location
`prisma/seed.ts` — Executed via `npm run prisma:seed` or `prisma db seed`

### Seed Process

**Step 1: Create 34 Permissions**
```typescript
const PERMISSION_DEFINITIONS = {
  creative_center: [10 perms],
  traffic_center: [8 perms],
  retention_center: [8 perms],
  global: [8 perms],
};

// Upsert each permission by key
for (const [project, perms] of Object.entries(PERMISSION_DEFINITIONS)) {
  for (const perm of perms) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name, description, project },
      create: { key, name, description, project }
    });
  }
}
```

**Step 2: Create 4 System Roles**
```typescript
const ROLE_DEFINITIONS = [
  {
    name: "Super Admin",
    description: "Full access to all projects and settings",
    isSystem: true,
    permissions: "all"  // All 34 permissions
  },
  {
    name: "Project Admin",
    description: "Full access within assigned project",
    isSystem: true,
    permissions: "project_all"  // 30 permissions (excludes global:roles:manage, global:settings:manage)
  },
  {
    name: "Manager",
    description: "Can create, edit, and view resources",
    isSystem: true,
    permissions: "project_manage"  // ~18 permissions (view+create+edit+import)
  },
  {
    name: "Viewer",
    description: "Read-only access",
    isSystem: true,
    permissions: "project_view"  // ~9 permissions (view-only)
  }
];

// Upsert each role
for (const roleDef of ROLE_DEFINITIONS) {
  const role = await prisma.role.upsert({
    where: { name: roleDef.name },
    update: { description, isSystem },
    create: { name, description, isSystem }
  });

  // Assign permissions based on role type
  const rolePermIds = collectPermissionIds(roleDef.permissions);
  for (const permId of rolePermIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
      update: {},
      create: { roleId: role.id, permissionId: permId }
    });
  }
}
```

**Step 3: Link Roles to Permissions**
- Uses composite keys to avoid duplicates
- Upsert prevents errors on re-runs
- Permission filtering ensures correct scope assignment

### Seed Output
```
Created 34 permissions across 4 project scopes
Role "Super Admin" → 34 permissions assigned
Role "Project Admin" → 30 permissions assigned
Role "Manager" → 18 permissions assigned
Role "Viewer" → 9 permissions assigned
Seeding complete.
```

---

## Unique Constraints Summary

| Model | Constraint | Enforced By | Purpose |
|-------|-----------|-----------|---------|
| User | telegramId | @unique | Telegram ID uniqueness |
| Account | (provider, providerAccountId) | @@unique | Provider account uniqueness |
| Session | sessionToken | @unique | Session token uniqueness |
| Role | name | @unique | Role name uniqueness |
| Permission | key | @unique | Permission key uniqueness |
| UserProjectRole | (userId, project) | @@unique | One role per user per project |
| Invitation | token | @unique | Invitation token uniqueness |
| BotChat | username | @unique | Telegram username uniqueness |

---

## Indexes for Query Performance

| Model | Index Columns | Use Case |
|-------|---|---|
| Permission | project | Find all permissions in a scope |
| AuditLog | userId | Get user's audit trail |
| AuditLog | action | Filter events by action type |
| AuditLog | createdAt | Get recent events |
| UserProjectRole | userId | Get user's project assignments |
| UserProjectRole | project | Get all users in a project |
| Invitation | telegramUsername | Find invitations by username |
| Invitation | token | Validate/accept invitations |
| Invitation | status | Find pending invitations |
| LoginCode | username | Look up active OTP codes |
| LoginCode | expiresAt | Cleanup expired codes |

---

## API Endpoints & Query Patterns

### Authentication

- **POST /api/auth/token** — Issue project-scoped JWT tokens
  - Requires: Session JWT (httpOnly cookie)
  - Input: `{ project }`
  - Output: `{ accessToken, refreshToken, expiresAt }`
  - Query: Get user's role in project from session context

- **POST /api/auth/verify** — Verify JWT tokens (cross-project)
  - Input: Token in Authorization header or body
  - Output: `{ valid, user, project, permissions }`
  - Query: jose.jwtVerify (stateless)

- **GET /api/auth/me** — Get current session user
  - Query: User with nested projectRoles/role/permissions includes

### Role & Permission Management

- **GET /api/roles** — List all roles
  - Requires: `global:roles:view`
  - Query: Roles with counts of assignments

- **POST /api/roles** — Create custom role
  - Requires: `global:roles:manage`
  - Validation: Name uniqueness

- **GET /api/permissions** — List all permissions (grouped by project)
  - Requires: `global:roles:view`
  - Returns: Hardcoded PERMISSION_CATALOG

- **GET /api/permissions/matrix** — RBAC matrix for admin UI
  - Query: All roles with permissions

### Permission Checking

```typescript
// Wildcard matching on "project:resource:action" format
function hasPermission(userPerm: string, required: string): boolean {
  const userParts = userPerm.split(":");
  const reqParts = required.split(":");

  return (
    matchesWildcard(userParts[0], reqParts[0]) &&
    matchesWildcard(userParts[1], reqParts[1]) &&
    matchesWildcard(userParts[2], reqParts[2])
  );
}

// Used in withPermission() middleware wrapper
export function withPermission(permission: string, handler) {
  return withAuth(async (req) => {
    const allowed = await hasPermission(req.userId, permission);
    if (!allowed) return forbidden(`Missing permission: ${permission}`);
    return handler(req);
  });
}
```

---

## Cross-Project Authentication Flow

### Token Issuance & Verification

```
User logged into Auth Center (session JWT in httpOnly cookie)
    ↓
User navigates to Creative Center (ag1.q37fh758g.click)
    ↓
Creative Center calls: POST /api/auth/token { project: "creative_center" }
(cross-origin, credentials: include, sends auth-session cookie)
    ↓
Auth Center verifies session → gets user + role + permissions for creative_center
    ↓
Auth Center issues: { accessToken (1h), refreshToken (7d), expiresAt }
    ↓
Creative Center stores tokens (localStorage/sessionStorage)
    ↓
Creative Center calls its own APIs with: Authorization: Bearer <accessToken>
    ↓
Creative Center (optionally) verifies token via: POST /api/auth/verify
    ↓
Auth Center returns: { valid, user, project, permissions }
    ↓
Creative Center grants access based on project permissions
```

### CORS Configuration

- Token issuance/verification endpoints are CORS-enabled
- Credentials included in cross-origin requests
- Supports Bearer token verification for edge services

---

## Development & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
export JWT_SECRET="dev-secret"
export DATABASE_URL="file:./prisma/dev.db"

# Initialize database
npx prisma db push

# Seed data
npm run prisma:seed

# Run development server
npm run dev
```

### Seed Data Re-initialization

```bash
# Reset database and re-seed
npx prisma migrate reset

# Or just re-seed existing database
npx prisma db seed
```

### Production Deployment

```bash
# Build Next.js app
npm run build

# Deploy with deploy.sh (handles rsync + service restart)
./deploy.sh

# Verify services
systemctl is-active auth-center.service
```

---

## Performance & Scalability

### Query Optimization

1. **Nested Includes**: Fetch entire permission tree in single query
2. **Index Strategy**: Indexes on foreign keys + common filters
3. **Permission Caching**: Session user already has permissions (no additional queries)
4. **Wildcard Matching**: Done in-memory after permission fetch (fast for small sets)

### Database Size Estimates

| Table | Typical Count | Notes |
|-------|---|---|
| Permission | 34 | Static |
| Role | 6-10 | 4 system + custom |
| User | 100-1000 | Grows over time |
| UserProjectRole | 400-4000 | ~4x users (4 projects per user) |
| RolePermission | 60-100 | ~15 perms per role avg |
| AuditLog | 10K-100K | Grows unbounded (weekly cleanup recommended) |
| Session | 10-100 | Active sessions only |
| Invitation | 100-1000 | Historical + pending |

### Scaling Considerations

- SQLite suitable for <100K users, moderate audit log retention
- For larger deployments: consider PostgreSQL
- Audit log cleanup: Implement scheduled task to delete logs >90 days
- Session cleanup: Implement automatic cleanup of expired sessions

---

## Security Considerations

### JWT Security

- **HS256**: Symmetric key (JWT_SECRET must be kept secret)
- **httpOnly Cookies**: Session JWT never accessible to JavaScript
- **Secure Flag**: Cookies only sent over HTTPS in production
- **SameSite**: Lax policy prevents CSRF attacks

### RBAC Security

- **Permission Checking**: Wildcard matching ensures no permission escalation
- **Role Protection**: System roles (isSystem=true) cannot be deleted/modified
- **Cascade Safety**: Deleting user doesn't leave orphaned references
- **Audit Trail**: All permission checks logged (with setNull preservation)

### Data Validation

- Telegram Login Widget HMAC verification (not in this service, done at login)
- Role name uniqueness prevents duplicate role creation
- Permission key format enforced (project:resource:action)
- Invitation token validation before role assignment

---

## Current Database Status

- **Schema**: Complete and normalized
- **Seed Data**: All 34 permissions + 4 roles initialized
- **Migrations**: Schema-driven (no formal migration files for SQLite)
- **Deployment**: Live on 38.180.64.111
- **Backup Strategy**: Recommend daily backups of `/opt/auth-center/prisma/dev.db`

---

## References

- Prisma Docs: https://www.prisma.io/docs
- BetterSqlite3: https://github.com/WiseLibs/better-sqlite3
- Jose JWT: https://github.com/panva/jose
- Next.js Auth: https://nextjs.org/docs/app/building-your-application/authentication
