/**
 * Auth Center SDK — shared authentication middleware for other projects.
 * Will be implemented by sdk-dev agent.
 *
 * Usage (in other projects):
 *   import { verifyToken, requireAuth } from '@auth-center/sdk';
 */

export function verifyToken(_token: string): Promise<unknown> {
  throw new Error("Not implemented — sdk-dev will implement this.");
}

export function requireAuth() {
  throw new Error("Not implemented — sdk-dev will implement this.");
}
