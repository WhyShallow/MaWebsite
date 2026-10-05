# WhyShallow

Hey, I’m WhyShallow, a developer and creator who likes making things for Minecraft and the web. I’m especially interested in Java, client mods, server plugins, and small tools that make everyday things a little better. I learn by building: try an idea, see where it goes, then make the next one.

This site is my home for projects, experiments, and videos. A few things I’ve made:

- [Pawn-io](https://pawn-io.pages.dev/), a Minecraft utility mod with a clean black-and-white theme.
- [Tasbeeh Counter](https://www.curseforge.com/minecraft/mc-mods/tasbeeh-counter), an in-game counter for Minecraft.

## Find me

- [Website](https://whyshallow.is-a.dev/)
- [GitHub](https://github.com/WhyShallow)
- [YouTube](https://www.youtube.com/@WhyShallow)

## Private video library

The unlisted `/#secret` page uploads videos to a private Cloudflare R2 bucket through the existing Worker. The page itself is not a security boundary: the Worker requires an admin token for every list, upload, playback, and delete request. Keep the token private; it is held only in page memory and is cleared when the library is locked or the page is left.

To enable it, create the R2 bucket and configure a strong token from the repository root:

```sh
npx wrangler r2 bucket create whyshallow-private-videos
openssl rand -hex 32
npx wrangler secret put VIDEO_ADMIN_TOKEN
npx wrangler deploy
```

Save the generated token somewhere private and enter it at `https://whyshallow.is-a.dev/#secret`. Individual uploads are limited to 90 MiB to leave room for multipart form data under Cloudflare Workers' 100 MB request-body limit. The R2 bucket has no public access binding or public URL.