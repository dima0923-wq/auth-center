# Auth Center — Database Schema

## Overview

SQLite database via Prisma 7 with better-sqlite3 adapter. Schema at `prisma/schema.prisma`.

## Models

### User
Core user record. Status: ACTIVE / DISABLED / PENDING.
- Linked to OAuth accounts, sessions, project roles, audit logs, and invitations.
- No direct role field — roles are assigned per-project via `UserProjectRole`.

### Account
OAuth provider accounts (Google SSO). NextAuth compatible schema.
- Compound unique on `[provider, providerAccountId]`.

### Session
Active user sessions. NextAuth compatible.

### VerificationToken
Email verification tokens. NextAuth compatible.

### Role
Named roles with permissions. `isSystem=true` for built-in roles that cannot be deleted.
- Default system roles: Super Admin, Project Admin, Manager, Viewer.

### Permission
Granular permissions scoped to a project. Key format: `{project}:{resource}:{action}`.
- Projects: creative_center, traffic_center, retention_center, global.
- Example keys: `creative:agents:create`, `global:users:edit`.

### RolePermission
Junction table: Role <-> Permission (many-to-many).
- Composite PK on `[roleId, permissionId]`.

### UserProjectRole
Assigns a user a role within a specific project scope.
- Unique constraint on `[userId, project]` — one role per project per user.

### AuditLog
Immutable log of user actions. Fields: action, resource, details (JSON), IP.
- Indexed on userId, action, createdAt for efficient querying.

### Invitation
Pending user invitations. Status: PENDING / ACCEPTED / EXPIRED / REVOKED.
- Unique token for invitation links. Scoped to a project + role.

## Default Roles & Permission Counts

| Role | Permissions | Scope |
|------|------------|-------|
| Super Admin | 34 (all) | All projects + global |
| Project Admin | 32 | All except global:roles:manage, global:settings |
| Manager | 17 | View + create + edit (no delete, no admin) |
| Viewer | 12 | View-only across all scopes |

## Seed Data

Run `npx prisma db seed` to populate default roles and permissions.
Seed file: `prisma/seed.ts`.
