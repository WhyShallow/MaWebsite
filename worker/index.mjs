const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_SUGGESTION_LENGTH = 1800;
const MAX_NAME_LENGTH = 80;
const MAX_BOOK_TITLE_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 1000;

function jsonResponse(status, message, corsHeaders = {}) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...jsonHeaders, ...corsHeaders }
  });
}

function getWebhookUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isDiscordHost = url.hostname === "discord.com" || url.hostname === "discordapp.com";
    return url.protocol === "https:" && isDiscordHost && url.pathname.startsWith("/api/webhooks/")
      ? url
      : null;
  } catch {
    return null;
  }
}

function getPingUserIds(value) {
  if (!value) return null;
  const ids = [...new Set(value.split(",").map((id) => id.trim()))];
  return ids.length > 0 && ids.every((id) => /^\d{17,20}$/.test(id)) ? ids : null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse(403, "Origin not allowed.");
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, "Method not allowed.", corsHeaders);
    }

    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return jsonResponse(415, "Content-Type must be application/json.", corsHeaders);
    }

    const ipAddress = request.headers.get("CF-Connecting-IP");
    if (!ipAddress) {
      console.error("Cloudflare did not provide a client IP address.");
      return jsonResponse(503, "Suggestion delivery is temporarily unavailable.", corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, "Request body must be valid JSON.", corsHeaders);
    }

    const type = payload?.type ?? "suggestion";
    if (type !== "suggestion" && type !== "book-order") {
      return jsonResponse(400, "Request type is not supported.", corsHeaders);
    }

    let embed;
    if (type === "book-order") {
      const bookTitle = typeof payload.bookTitle === "string" ? payload.bookTitle.trim() : "";
      const address = typeof payload.address === "string" ? payload.address.trim() : "";
      if (!bookTitle || bookTitle.length > MAX_BOOK_TITLE_LENGTH) {
        return jsonResponse(400, `Book title must be between 1 and ${MAX_BOOK_TITLE_LENGTH} characters.`, corsHeaders);
      }
      if (!address || address.length > MAX_ADDRESS_LENGTH) {
        return jsonResponse(400, `Address must be between 1 and ${MAX_ADDRESS_LENGTH} characters.`, corsHeaders);
      }
      embed = {
        title: `New Address For book ${bookTitle}`,
        color: 0x18342a,
        fields: [{ name: "Address", value: address, inline: false }],
        timestamp: new Date().toISOString()
      };
    } else {
      const suggestion = typeof payload?.suggestion === "string" ? payload.suggestion.trim() : "";
      if (payload?.name !== undefined && typeof payload.name !== "string") {
        return jsonResponse(400, "Name must be text.", corsHeaders);
      }
      const name = typeof payload?.name === "string" ? payload.name.trim() : "";
      if (!suggestion || suggestion.length > MAX_SUGGESTION_LENGTH) {
        return jsonResponse(400, `Suggestion must be between 1 and ${MAX_SUGGESTION_LENGTH} characters.`, corsHeaders);
      }
      if (name.length > MAX_NAME_LENGTH) {
        return jsonResponse(400, `Name must be no longer than ${MAX_NAME_LENGTH} characters.`, corsHeaders);
      }
      embed = {
        title: "New website suggestion",
        color: 0x18342a,
        fields: [
          { name: "Suggestion", value: suggestion, inline: false },
          { name: "Name", value: name || "Anonymous", inline: false }
        ],
        timestamp: new Date().toISOString()
      };
    }

    let ipHash;
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ipAddress));
      ipHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    } catch (error) {
      console.error("Could not prepare the IP rate-limit key.", error);
      return jsonResponse(503, "Suggestion delivery is temporarily unavailable.", corsHeaders);
    }

    let rateLimitResponse;
    try {
      const limiterId = env.RATE_LIMITER.idFromName(ipHash);
      const limiter = env.RATE_LIMITER.get(limiterId);
      rateLimitResponse = await limiter.fetch("https://rate-limit/check", { method: "POST" });
    } catch (error) {
      console.error("IP rate limiter request failed.", error);
      return jsonResponse(503, "Suggestion delivery is temporarily unavailable.", corsHeaders);
    }

    if (rateLimitResponse.status === 429) {
      return jsonResponse(429, "Too many suggestions. Please try again later.", {
        ...corsHeaders,
        "Retry-After": rateLimitResponse.headers.get("Retry-After") || "600"
      });
    }
    if (!rateLimitResponse.ok) {
      console.error(`IP rate limiter returned status ${rateLimitResponse.status}.`);
      return jsonResponse(503, "Suggestion delivery is temporarily unavailable.", corsHeaders);
    }

    const webhookUrl = getWebhookUrl(env.DISCORD_WEBHOOK_URL);
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL is missing or is not a valid Discord webhook URL.");
      return jsonResponse(500, "Suggestion delivery is not configured.", corsHeaders);
    }

    const pingUserIds = getPingUserIds(env.DISCORD_PING_USER_IDS);
    if (!pingUserIds) {
      console.error("DISCORD_PING_USER_IDS is missing or contains invalid Discord user IDs.");
      return jsonResponse(500, "Suggestion delivery is not configured.", corsHeaders);
    }

    let discordResponse;
    try {
      discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: pingUserIds.map((id) => `<@${id}>`).join(" "),
          embeds: [embed],
          allowed_mentions: { parse: [], users: pingUserIds }
        })
      });
    } catch (error) {
      console.error("Discord webhook request failed.", error);
      return jsonResponse(502, "Could not deliver suggestion to Discord.", corsHeaders);
    }

    if (!discordResponse.ok) {
      console.error(`Discord webhook returned status ${discordResponse.status}.`);
      return jsonResponse(502, "Could not deliver suggestion to Discord.", corsHeaders);
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  }
};

export class IpRateLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch() {
    const now = Date.now();
    const result = await this.state.storage.transaction(async (transaction) => {
      const saved = await transaction.get("timestamps");
      const timestamps = Array.isArray(saved)
        ? saved.filter((timestamp) => Number.isFinite(timestamp) && timestamp > now - RATE_WINDOW_MS)
        : [];

      if (timestamps.length >= RATE_LIMIT) {
        return { limited: true, retryAfter: Math.max(1, Math.ceil((timestamps[0] + RATE_WINDOW_MS - now) / 1000)) };
      }

      timestamps.push(now);
      await transaction.put("timestamps", timestamps);
      return { limited: false };
    });

    if (result.limited) {
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter) }
      });
    }

    return new Response(null, { status: 204 });
  }
}
