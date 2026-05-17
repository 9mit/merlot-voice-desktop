import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DeepgramClient } from "@deepgram/sdk";

// Simple in-memory rate limiter (per Vercel serverless function instance)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS_PER_MINUTE;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting by IP
  const xForwardedFor = req.headers["x-forwarded-for"];
  const clientIp = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor)?.split(",")[0]?.trim()
    || (req.headers["x-real-ip"] as string)
    || "unknown";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many requests. Please wait." });
  }

  // Origin check — restrict to same-site requests or localhost
  const origin = (req.headers.origin as string) || (req.headers.referer as string) || "";
  const host = req.headers.host || "";

  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("tauri://localhost");
  const isSameSite = host && origin.includes(host);

  if (!isLocal && !isSameSite) {
    console.warn(`[Auth] Blocked request from unauthorized origin: ${origin} (Host: ${host})`);
    return res.status(403).json({ error: "Forbidden" });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  const projectId = process.env.DEEPGRAM_PROJECT_ID;

  if (!apiKey || !projectId) {
    return res.status(500).json({ error: "Server configuration incomplete" });
  }

  try {
    const deepgram = new DeepgramClient({ apiKey });

    // Create a temporary project key that expires in 60 seconds.
    const result = await deepgram.manage.v1.projects.keys.create(projectId, {
      comment: "Temp frontend key",
      scopes: ["usage:write"],
      time_to_live_in_seconds: 60,
    });

    if (!result || !result.key) {
      console.error("Deepgram token error: No key returned");
      return res.status(500).json({ error: "Token generation failed" });
    }

    res.setHeader("Cache-Control", "no-store, no-cache");
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    return res.status(200).json({ token: result.key });
  } catch (err) {
    console.error("Token error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
