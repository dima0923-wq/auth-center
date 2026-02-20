"""
Auth Center SDK for Python/FastAPI.
Provides token verification, permission checking, and FastAPI dependencies.

Usage:
    from auth_center import require_auth, require_permission

    @app.get("/api/protected")
    async def protected_route(user: AuthUser = Depends(require_auth)):
        return {"user": user.username}

    @app.get("/api/admin")
    async def admin_route(user: AuthUser = Depends(require_permission("memory:admin"))):
        return {"admin": True}
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, Callable

import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

AUTH_CENTER_URL = os.getenv("AUTH_CENTER_URL", "https://auth.q37fh758g.click")
CACHE_TTL = int(os.getenv("AUTH_CACHE_TTL", "300"))  # seconds

_security = HTTPBearer(auto_error=False)

# In-memory token cache
_token_cache: dict[str, tuple[AuthUser, float]] = {}


@dataclass
class Role:
    id: str
    name: str
    permissions: list[str]


@dataclass
class ProjectAccess:
    project_id: str
    roles: list[Role]
    permissions: list[str]


@dataclass
class AuthUser:
    id: str
    telegram_id: int
    first_name: str
    username: str | None = None
    last_name: str | None = None
    photo_url: str | None = None
    email: str | None = None
    global_roles: list[Role] = field(default_factory=list)
    global_permissions: list[str] = field(default_factory=list)
    projects: list[ProjectAccess] = field(default_factory=list)

    def has_permission(self, permission: str, project_id: str | None = None) -> bool:
        """Check if user has a specific permission."""
        resource = permission.split(":")[0] if ":" in permission else permission

        # Check global permissions
        if (
            permission in self.global_permissions
            or "*" in self.global_permissions
            or f"{resource}:*" in self.global_permissions
        ):
            return True

        # Check project-scoped permissions
        projects_to_check = self.projects
        if project_id:
            projects_to_check = [p for p in self.projects if p.project_id == project_id]

        for project in projects_to_check:
            if (
                permission in project.permissions
                or "*" in project.permissions
                or f"{resource}:*" in project.permissions
            ):
                return True

        return False

    def require_permission(self, permission: str, project_id: str | None = None) -> None:
        """Assert that user has a permission. Raises HTTPException(403) if not."""
        if not self.has_permission(permission, project_id):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions: requires {permission}",
            )


def _parse_user(data: dict[str, Any]) -> AuthUser:
    """Parse Auth Center verify response into AuthUser."""
    user_data = data.get("user", data)

    global_roles = [
        Role(id=r["id"], name=r["name"], permissions=r.get("permissions", []))
        for r in user_data.get("globalRoles", [])
    ]

    projects = [
        ProjectAccess(
            project_id=p["projectId"],
            roles=[
                Role(id=r["id"], name=r["name"], permissions=r.get("permissions", []))
                for r in p.get("roles", [])
            ],
            permissions=p.get("permissions", []),
        )
        for p in user_data.get("projects", [])
    ]

    return AuthUser(
        id=user_data["id"],
        telegram_id=user_data.get("telegramId", 0),
        first_name=user_data.get("firstName", ""),
        username=user_data.get("username"),
        last_name=user_data.get("lastName"),
        photo_url=user_data.get("photoUrl"),
        email=user_data.get("email"),
        global_roles=global_roles,
        global_permissions=user_data.get("globalPermissions", []),
        projects=projects,
    )


async def verify_token(token: str, auth_center_url: str | None = None) -> AuthUser | None:
    """Verify a JWT token against Auth Center. Returns AuthUser or None."""
    # Check cache
    cached = _token_cache.get(token)
    if cached and cached[1] > time.time():
        return cached[0]

    base_url = auth_center_url or AUTH_CENTER_URL

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{base_url}/api/auth/verify",
                json={"token": token},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code != 200:
            _token_cache.pop(token, None)
            return None

        data = resp.json()
        if not data.get("valid") or not data.get("user"):
            _token_cache.pop(token, None)
            return None

        user = _parse_user(data)
        _token_cache[token] = (user, time.time() + CACHE_TTL)
        return user

    except Exception:
        return None


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
) -> AuthUser:
    """FastAPI dependency: require a valid auth token. Injects AuthUser."""
    token: str | None = None

    if credentials:
        token = credentials.credentials

    # Fallback: check cookie
    if not token:
        token = request.cookies.get("auth-token")

    # Fallback: check query param (for WebSocket)
    if not token:
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


def require_permission(permission: str, project_id: str | None = None) -> Callable:
    """
    FastAPI dependency factory: require a specific permission.

    Usage:
        @app.get("/api/admin")
        async def admin(user: AuthUser = Depends(require_permission("memory:admin"))):
            ...
    """

    async def dependency(user: AuthUser = Depends(require_auth)) -> AuthUser:
        user.require_permission(permission, project_id)
        return user

    return dependency


def clear_token_cache() -> None:
    """Clear the in-memory token cache."""
    _token_cache.clear()


def invalidate_token(token: str) -> None:
    """Remove a specific token from cache."""
    _token_cache.pop(token, None)
