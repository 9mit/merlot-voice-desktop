import { DeepgramClient } from "@deepgram/sdk";
import type { Handler, HandlerEvent } from "@netlify/functions";

// Simple in-memory rate limiter (per Netlify function instance)
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

const handler: Handler = async (event: HandlerEvent) => {
  // Only allow GET and POST
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limiting by IP
  const clientIp = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || event.headers["client-ip"] || "unknown";
  if (isRateLimited(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: "Too many requests. Please wait." }) };
  }

  // Origin check — restrict to your own Netlify domain in production
  const siteUrl = process.env.URL; // Netlify auto-sets this to your site URL
  const origin = event.headers.origin || event.headers.referer || "";
  if (siteUrl && origin && !origin.includes("localhost") && !origin.startsWith(siteUrl)) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  const projectId = process.env.DEEPGRAM_PROJECT_ID;

  if (!apiKey || !projectId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration incomplete" }),
    };
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
      return { statusCode: 500, body: JSON.stringify({ error: "Token generation failed" }) };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache",
        "Access-Control-Allow-Origin": siteUrl || "*",
      },
      body: JSON.stringify({ token: result.key }),
    };
  } catch (err) {
    console.error("Token error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) };
  }
};

export { handler };
