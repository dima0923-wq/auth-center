"""
Auth Center SDK for Python/FastAPI.

Provides local JWT verification (RS256 via JWKS), permission checking,
and FastAPI dependencies. No server-side verify calls — tokens are
validated locally using the public key fetched from Auth Center's JWKS endpoint.

Usage:
    from auth_center_sdk import AuthCenterSDK

    sdk = AuthCenterSDK(
        jwks_url="https://ag4.q37fh758g.click/api/auth/.well-known/jwks.json",
        project_id="creative_center",
    )

    @app.get("/api/protected")
    async def protected(user: dict = sdk.require_auth()):
        return {"user": user["email"]}

    @app.get("/api/admin")
    async def admin(user: dict = sdk.require_permission("memory:admin")):
        return {"admin": True}
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, jwk, JWTError
from jose.utils import base64url_decode


_security = HTTPBearer(auto_error=False)


@dataclass
class _JWKSCache:
    """Cached JWKS keys with TTL."""
    keys: list[dict[str, Any]] = field(default_factory=list)
    fetched_at: float = 0.0
    ttl: float = 300.0  # 5 minutes

    @property
    def is_expired(self) -> bool:
        return time.time() - self.fetched_at > self.ttl


class AuthCenterSDK:
    """
    Auth Center SDK for FastAPI applications.

    Fetches JWKS from Auth Center, caches public keys, verifies JWT tokens
    locally using RS256, and provides FastAPI dependencies for auth and
    permission checking.
    """

    def __init__(
        self,
        jwks_url: str,
        project_id: str,
        cache_ttl: float = 300.0,
        issuer: str = "auth-center",
    ):
        self.jwks_url = jwks_url
        self.project_id = project_id
        self.issuer = issuer
        self._cache = _JWKSCache(ttl=cache_ttl)

    async def _fetch_jwks(self) -> list[dict[str, Any]]:
        """Fetch JWKS from Auth Center endpoint."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(self.jwks_url)
            resp.raise_for_status()
            data = resp.json()
            return data.get("keys", [])

    async def get_signing_keys(self) -> list[dict[str, Any]]:
        """Get signing keys from cache or fetch if expired."""
        if not self._cache.is_expired and self._cache.keys:
            return self._cache.keys

        keys = await self._fetch_jwks()
        self._cache.keys = keys
        self._cache.fetched_at = time.time()
        return keys

    def _find_key(self, keys: list[dict[str, Any]], kid: str | None) -> dict[str, Any] | None:
        """Find the matching key by kid, or return the first signing key."""
        if kid:
            for key in keys:
                if key.get("kid") == kid:
                    return key
        # Fallback: first key with use=sig or first key
        for key in keys:
            if key.get("use") == "sig":
                return key
        return keys[0] if keys else None

    async def verify_token(self, token: str) -> dict[str, Any]:
        """
        Verify a JWT token using JWKS public key.

        Returns the decoded token payload containing:
        - sub: user UUID
        - email: user email
        - name: display name
        - picture: avatar URL
        - roles: dict of project_id -> role name
        - permissions: dict of project_id -> list of permission strings
        - super_admin: bool (if applicable)
        - iat, exp, iss, aud

        Raises HTTPException(401) on invalid/expired token.
        """
        # Decode header to get kid
        try:
            unverified_header = jwt.get_unverified_header(token)
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token format")

        kid = unverified_header.get("kid")

        # Get signing keys
        try:
            keys = await self.get_signing_keys()
        except Exception:
            raise HTTPException(status_code=401, detail="Unable to fetch signing keys")

        signing_key = self._find_key(keys, kid)
        if not signing_key:
            # Key not found — maybe keys rotated; force refresh once
            self._cache.fetched_at = 0.0
            try:
                keys = await self.get_signing_keys()
            except Exception:
                raise HTTPException(status_code=401, detail="Unable to fetch signing keys")
            signing_key = self._find_key(keys, kid)
            if not signing_key:
                raise HTTPException(status_code=401, detail="No matching signing key found")

        # Build RSA public key from JWK
        try:
            rsa_key = jwk.construct(signing_key)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid signing key")

        # Verify and decode
        try:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                issuer=self.issuer,
                options={
                    "verify_aud": False,  # audience checked per-project if needed
                    "verify_exp": True,
                    "verify_iss": True,
                },
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except JWTError as e:
            raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")

        return payload

    def _extract_token(self, request: Request, credentials: HTTPAuthorizationCredentials | None = None) -> str | None:
        """Extract JWT from Authorization header, cookie, or query param."""
        # 1. Authorization: Bearer header
        if credentials:
            return credentials.credentials

        # 2. Cookie (cross-domain SSO cookie)
        token = request.cookies.get("ac_access")
        if token:
            return token

        # 3. Query param (for WebSocket connections)
        token = request.query_params.get("token")
        if token:
            return token

        return None

    def require_auth(self):
        """
        FastAPI dependency that validates JWT and returns the decoded user payload.

        Returns a dict with: sub, email, name, picture, roles, permissions, etc.
        Raises HTTPException(401) if token is missing or invalid.

        Usage:
            @app.get("/api/me")
            async def me(user: dict = sdk.require_auth()):
                return {"email": user["email"]}
        """
        sdk = self

        async def _dependency(
            request: Request,
            credentials: HTTPAuthorizationCredentials | None = Depends(_security),
        ) -> dict[str, Any]:
            token = sdk._extract_token(request, credentials)
            if not token:
                raise HTTPException(status_code=401, detail="Missing authentication token")
            return await sdk.verify_token(token)

        return Depends(_dependency)

    def require_permission(self, permission: str):
        """
        FastAPI dependency that validates JWT and checks for a specific permission
        on this SDK's project_id.

        Raises HTTPException(401) if token is missing/invalid.
        Raises HTTPException(403) if user lacks the required permission.

        Usage:
            @app.get("/api/agents")
            async def list_agents(user: dict = sdk.require_permission("agents:read")):
                return {"agents": [...]}
        """
        sdk = self

        async def _dependency(
            request: Request,
            credentials: HTTPAuthorizationCredentials | None = Depends(_security),
        ) -> dict[str, Any]:
            token = sdk._extract_token(request, credentials)
            if not token:
                raise HTTPException(status_code=401, detail="Missing authentication token")

            user = await sdk.verify_token(token)

            # Super admins bypass permission checks
            if user.get("super_admin"):
                return user

            # Check project-scoped permissions
            project_perms = user.get("permissions", {}).get(sdk.project_id, [])
            if permission not in project_perms:
                raise HTTPException(
                    status_code=403,
                    detail=f"Missing permission: {permission}",
                )

            return user

        return Depends(_dependency)

    async def verify_websocket_token(self, token: str) -> dict[str, Any] | None:
        """
        Verify a JWT for WebSocket connections. Returns payload or None.
        Does NOT raise exceptions — caller should close the WebSocket on failure.

        Usage:
            @app.websocket("/ws")
            async def ws(websocket: WebSocket):
                token = websocket.query_params.get("token")
                user = await sdk.verify_websocket_token(token)
                if not user:
                    await websocket.close(code=4001)
                    return
                await websocket.accept()
        """
        if not token:
            return None
        try:
            return await self.verify_token(token)
        except HTTPException:
            return None

    def has_permission(self, user: dict[str, Any], permission: str) -> bool:
        """Check if a user payload has a specific permission for this project."""
        if user.get("super_admin"):
            return True
        project_perms = user.get("permissions", {}).get(self.project_id, [])
        return permission in project_perms

    def has_role(self, user: dict[str, Any], role: str) -> bool:
        """Check if a user has a specific role for this project."""
        if user.get("super_admin"):
            return True
        user_role = user.get("roles", {}).get(self.project_id)
        return user_role == role

    def get_user_role(self, user: dict[str, Any]) -> str | None:
        """Get the user's role for this project, or None if no access."""
        return user.get("roles", {}).get(self.project_id)

    def get_user_permissions(self, user: dict[str, Any]) -> list[str]:
        """Get all permissions for this project."""
        return user.get("permissions", {}).get(self.project_id, [])
