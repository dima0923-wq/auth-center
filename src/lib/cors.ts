import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://ag1.q37fh758g.click", // Creative Center
  "https://ag2.q37fh758g.click", // Retention Center
  "https://ag3.q37fh758g.click", // Traffic Center
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function corsResponse(
  body: unknown,
  origin: string | null,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: getCorsHeaders(origin),
  });
}

export function corsOptionsResponse(origin: string | null): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
