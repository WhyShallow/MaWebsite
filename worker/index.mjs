const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

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

    const webhookUrl = getWebhookUrl(env.DISCORD_WEBHOOK_URL);
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL is missing or is not a valid Discord webhook URL.");
      return jsonResponse(500, "Suggestion delivery is not configured.", corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, "Request body must be valid JSON.", corsHeaders);
    }

    const suggestion = typeof payload?.suggestion === "string" ? payload.suggestion.trim() : "";
    if (!suggestion || suggestion.length > 1800) {
      return jsonResponse(400, "Suggestion must be between 1 and 1800 characters.", corsHeaders);
    }

    let discordResponse;
    try {
      discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**New website suggestion**\n${suggestion}`,
          allowed_mentions: { parse: [] }
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
