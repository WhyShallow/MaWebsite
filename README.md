# WhyShallow Website

A static portfolio site hosted on GitHub Pages. The suggestions form sends submissions to a Cloudflare Worker, which forwards them to a Discord channel using a private Discord webhook.

## Set up the suggestions form

1. Install [Node.js](https://nodejs.org/) and authenticate Wrangler with your Cloudflare account:

   ```sh
   npx wrangler login
   ```

2. In the Discord channel where suggestions should appear, create a webhook and copy its URL. Keep the URL private.
3. From the repository root, save the webhook URL and the comma-separated Discord user IDs to ping as Worker secrets:

   ```sh
   npx wrangler secret put DISCORD_WEBHOOK_URL
   npx wrangler secret put DISCORD_PING_USER_IDS
   ```

   For `DISCORD_PING_USER_IDS`, enter numeric IDs separated by commas (not `<@...>` mentions). The Worker only allows pings to those configured IDs.
4. Deploy the relay, including its per-IP rate limiter:

   ```sh
   npx wrangler deploy
   ```

5. Copy the deployed Worker URL shown by Wrangler. In `script.js`, set `profile.suggestionApiUrl` to that URL (the current deployment is already configured in this file).
6. Commit and push the website changes so GitHub Pages publishes the updated form.

The Worker only accepts requests from the origin configured as `ALLOWED_ORIGIN` in `wrangler.jsonc`; update it if the site’s canonical domain changes. The Discord webhook URL stays in Cloudflare and must never be added to `script.js` or other public files.

The form accepts suggestions up to 1800 characters and an optional name up to 80 characters. Each IP can send up to 3 suggestions per rolling 10-minute window. IP addresses are hashed before being used as Durable Object rate-limit keys. Cloudflare Durable Objects keep the per-IP counters consistent across simultaneous requests.
