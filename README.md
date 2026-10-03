# WhyShallow Website

A static portfolio site hosted on GitHub Pages. The suggestions form sends submissions to a Cloudflare Worker, which forwards them to a Discord channel using a private Discord webhook.

## Set up the suggestions form

1. Install [Node.js](https://nodejs.org/) and authenticate Wrangler with your Cloudflare account:

   ```sh
   npx wrangler login
   ```

2. In the Discord channel where suggestions should appear, create a webhook and copy its URL. Keep the URL private.
3. From the repository root, save the webhook as a Worker secret and deploy the relay:

   ```sh
   npx wrangler secret put DISCORD_WEBHOOK_URL
   npx wrangler deploy
   ```

4. Copy the deployed Worker URL shown by Wrangler. In `script.js`, set `profile.suggestionApiUrl` to that URL (the current deployment is already configured in this file).
5. Commit and push the `script.js` change so GitHub Pages publishes the form configuration.

The Worker only accepts requests from the origin configured as `ALLOWED_ORIGIN` in `wrangler.jsonc`; update it if the site’s canonical domain changes. The Discord webhook URL stays in Cloudflare and must never be added to `script.js` or other public files.

The form accepts suggestions up to 1800 characters. Consider configuring a Cloudflare rate-limiting rule for the Worker endpoint to reduce automated spam.
