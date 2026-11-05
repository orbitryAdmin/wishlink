import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "wishlist_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getAuthConfig() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!username || !password || !secret || secret.length < 32) {
    return null;
  }

  return { username, password, secret };
}

export function isAdminConfigured() {
  return getAuthConfig() !== null;
}

function signExpiry(
  expiry: string,
  config: { username: string; password: string; secret: string },
) {
  return createHmac("sha256", config.secret)
    .update(JSON.stringify(["wishlist-studio-admin", expiry, config.username, config.password]))
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftHash, rightHash);
}

export async function isAdminAuthenticated() {
  const config = getAuthConfig();
  if (!config) return false;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [expiry, signature, ...extra] = token.split(".");
  if (
    extra.length > 0 ||
    !/^\d{10}$/.test(expiry) ||
    typeof signature !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return false;
  }

  const expiresAt = Number(expiry);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + SESSION_MAX_AGE) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(signExpiry(expiry, config)),
  );
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/login");
  }
}

export async function loginAdmin(username: string, password: string) {
  const config = getAuthConfig();
  if (!config) {
    return { error: "Admin login is not configured on the server." };
  }

  if (username.length > 256 || password.length > 256) {
    return { error: "Invalid username or password." };
  }

  const usernameMatches = safeEqual(username, config.username);
  const passwordMatches = safeEqual(password, config.password);
  if (!usernameMatches || !passwordMatches) {
    return { error: "Invalid username or password." };
  }

  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE);
  const value = `${expiry}.${signExpiry(expiry, config)}`;

  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return { success: true };
}

export async function clearAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
