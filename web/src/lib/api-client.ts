"use client";

import type { PrivateProfile, PublicProfile } from "@/lib/server/users";

/** Browser side of /api: attaches the Privy access token and the CSRF header, and turns errors into exceptions. */

export type { PrivateProfile, PublicProfile };

export type Features = { auth: boolean; db: boolean; accounts: boolean; rateLimit: boolean };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)stamp_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export async function api<T>(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (method !== "GET") {
    headers["content-type"] = "application/json";
    headers["x-csrf-token"] = csrfToken();
  }
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}
