const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_SUGGESTION_LENGTH = 1800;
const MAX_NAME_LENGTH = 80;
const MAX_PRIVATE_VIDEO_SIZE = 90 * 1024 * 1024;

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

function privateVideoResponse(status, message, corsHeaders) {
  return jsonResponse(status, message, corsHeaders);
}

async function handlePrivateVideos(request, env, corsHeaders, url) {
  if (!env.VIDEO_BUCKET || !env.VIDEO_ADMIN_TOKEN) {
    return privateVideoResponse(503, "Private video storage is not configured yet.", corsHeaders);
  }

  if (request.headers.get("Authorization") !== `Bearer ${env.VIDEO_ADMIN_TOKEN}`) {
    return privateVideoResponse(401, "Admin token was not accepted.", corsHeaders);
  }

  const videoMatch = url.pathname.match(/^\/videos\/([0-9a-f-]{36})$/i);

  try {
    if (url.pathname === "/videos" && request.method === "GET") {
      const objects = [];
      let cursor;
      do {
        const page = await env.VIDEO_BUCKET.list({
          prefix: "videos/",
          include: ["customMetadata", "httpMetadata"],
          limit: 1000,
          cursor
        });
        objects.push(...page.objects);
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);

      const videos = objects.map((object) => ({
        id: object.key.slice("videos/".length),
        name: object.customMetadata?.fileName || "Untitled video",
        size: object.size,
        uploadedAt: object.customMetadata?.uploadedAt || object.uploaded?.toISOString?.() || null,
        type: object.httpMetadata?.contentType || "application/octet-stream"
      }));
      return new Response(JSON.stringify({ videos }), { headers: { ...jsonHeaders, ...corsHeaders } });
    }

    if (url.pathname === "/videos" && request.method === "POST") {
      if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data")) {
        return privateVideoResponse(415, "Upload must use multipart form data.", corsHeaders);
      }
      const contentLength = Number(request.headers.get("Content-Length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_PRIVATE_VIDEO_SIZE + 1024 * 1024) {
        return privateVideoResponse(413, "Video uploads are limited to 90 MiB.", corsHeaders);
      }

      let form;
      try {
        form = await request.formData();
      } catch {
        return privateVideoResponse(400, "Could not read the uploaded video.", corsHeaders);
      }
      const file = form.get("video");
      if (!file || typeof file === "string" || typeof file.stream !== "function" || !file.size) {
        return privateVideoResponse(400, "Choose a video file to upload.", corsHeaders);
      }
      if (file.size > MAX_PRIVATE_VIDEO_SIZE) {
        return privateVideoResponse(413, "Video uploads are limited to 90 MiB.", corsHeaders);
      }
      if (!file.type.toLowerCase().startsWith("video/")) {
        return privateVideoResponse(415, "The selected file must be a video.", corsHeaders);
      }

      const id = crypto.randomUUID();
      const uploadedAt = new Date().toISOString();
      await env.VIDEO_BUCKET.put(`videos/${id}`, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { fileName: file.name.slice(0, 255), uploadedAt }
      });
      return new Response(JSON.stringify({ id, name: file.name, size: file.size, uploadedAt }), {
        status: 201,
        headers: { ...jsonHeaders, ...corsHeaders }
      });
    }

    if (videoMatch && request.method === "GET") {
      const object = await env.VIDEO_BUCKET.get(`videos/${videoMatch[1]}`);
      if (!object) return privateVideoResponse(404, "Video not found.", corsHeaders);
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
      headers.set("Content-Length", String(object.size));
      headers.set("Cache-Control", "private, no-store");
      return new Response(object.body, { headers });
    }

    if (videoMatch && request.method === "DELETE") {
      await env.VIDEO_BUCKET.delete(`videos/${videoMatch[1]}`);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return privateVideoResponse(404, "Private video not found.", corsHeaders);
  } catch (error) {
    console.error("Private video storage request failed.", error);
    return privateVideoResponse(500, "Private video storage request failed.", corsHeaders);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse(403, "Origin not allowed.");
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname === "/videos" || url.pathname.startsWith("/videos/")) {
      return handlePrivateVideos(request, env, corsHeaders, url);
    }

    if (url.pathname !== "/") {
      return jsonResponse(404, "Not found.", corsHeaders);
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
          embeds: [{
            title: "New website suggestion",
            color: 0x18342a,
            fields: [
              { name: "Suggestion", value: suggestion, inline: false },
              { name: "Name", value: name || "Anonymous", inline: false }
            ],
            timestamp: new Date().toISOString()
          }],
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
