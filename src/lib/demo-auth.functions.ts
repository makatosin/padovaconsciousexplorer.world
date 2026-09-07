import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function matches(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

const COOKIE_NAME = "pce_demo";
const MAX_AGE = 60 * 60 * 8; // 8h

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload, "utf8").digest());
}

function makeToken(secret: string): string {
  const payload = `${Date.now() + MAX_AGE * 1000}`; // expiry ms
  return `${payload}.${sign(payload, secret)}`;
}

function verifyToken(token: string | undefined, secret: string): boolean {
  if (!token || typeof token !== "string") return false;
  const idx = token.indexOf(".");
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

function readCookie(name: string): string | undefined {
  const header = getRequestHeader("cookie");
  if (!header) return undefined;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

export const verifyDemoPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.DEMO_PASSWORD;
    const secret = process.env.DEMO_SESSION_SECRET;
    if (!expected || !secret) return { ok: false as const, demoToken: null };
    if (typeof data?.password !== "string" || data.password.length === 0) {
      return { ok: false as const, demoToken: null };
    }
    const ok = matches(data.password, expected);
    if (ok) {
      const token = makeToken(secret);
      setResponseHeader(
        "set-cookie",
        `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=None`,
      );
      return { ok: true as const, demoToken: token };
    }
    return { ok: false as const, demoToken: null };
  });

export const checkDemoSession = createServerFn({ method: "POST" })
  .inputValidator((data?: { demoToken?: string }) => ({
    demoToken: typeof data?.demoToken === "string" ? data.demoToken : undefined,
  }))
  .handler(async ({ data }) => {
    const secret = process.env.DEMO_SESSION_SECRET;
    if (!secret) return { ok: false };
    const cookieToken = readCookie(COOKIE_NAME);
    return { ok: verifyToken(cookieToken, secret) || verifyToken(data.demoToken, secret) };
  });

export const clearDemoSession = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader(
    "set-cookie",
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`,
  );
  return { ok: true as const };
});