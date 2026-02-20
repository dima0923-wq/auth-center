/**
 * Cross-project redirect utilities.
 *
 * When another project (ag1, ag2, ag3) redirects to Auth Center for login,
 * it passes ?redirect_url=<url>.  After successful login we redirect back
 * with the project token appended.
 */

const ALLOWED_REDIRECT_HOSTS = [
  "ag1.q37fh758g.click",
  "ag2.q37fh758g.click",
  "ag3.q37fh758g.click",
  "ag4.q37fh758g.click",
  "localhost",
];

/**
 * Validate that a redirect_url is on the allowlist.
 * Returns the validated URL or null if invalid.
 */
export function validateRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    if (!ALLOWED_REDIRECT_HOSTS.includes(host)) {
      return null;
    }

    // Only allow https (or http for localhost)
    if (host === "localhost") {
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
    } else {
      if (parsed.protocol !== "https:") {
        return null;
      }
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Determine the project key from a redirect URL's hostname.
 */
export function projectFromRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    if (host === "ag1.q37fh758g.click" || host === "localhost") {
      return "creative_center";
    }
    if (host === "ag2.q37fh758g.click") {
      return "retention_center";
    }
    if (host === "ag3.q37fh758g.click") {
      return "traffic_center";
    }
    return null;
  } catch {
    return null;
  }
}

/** Cookie name for the cross-domain access token */
export const CROSS_DOMAIN_COOKIE = "ac_access";

/** The shared cookie domain (all ag*.q37fh758g.click subdomains) */
export const COOKIE_DOMAIN = ".q37fh758g.click";
