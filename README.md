# buckstreaming — Carousel Draft Generator

A tool that drafts Instagram carousel posts (images + caption) for buckstreaming, in the brand's existing template styles. **It never posts anything to Instagram automatically** — it generates draft images and text for the team to review, download, and post manually in the Instagram app.

## Which LLM drafts the copy

Set by `LLM_PROVIDER` in `.env.local` — a switch between two backends:

| | `ollama` (default) | `anthropic` |
|---|---|---|
| Cost | Free | Billed per use on your Anthropic account |
| Where it works | **Local dev only** — Ollama on `localhost` isn't reachable from Vercel | Anywhere, including Vercel |
| Reliability | Good, occasionally needs a retry (handled automatically) | Best |
| Setup | Install [Ollama](https://ollama.com), `ollama pull qwen2.5-coder:7b` (or another tool-calling-capable model — llama3.1 and mistral-nemo also work), run `ollama serve` | Get a key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |

Currently set to `ollama` for free local development. **Switch to `anthropic` before deploying to Vercel** — this is the one setting that will silently break copy generation in production if forgotten, since Vercel's servers can't reach your laptop's Ollama instance.

The `colorBlock` template's copy is drafted as 6 small sequential calls (one per section) rather than one big call when using Ollama — smaller local models weren't reliably able to sustain the full 5-section structured output in one shot, but handle each section fine individually. Anthropic still does it in one call. See `lib/llm/ollamaProvider.ts` if this ever needs revisiting.

## Deploying to Vercel (production)

1. Push this folder to a GitHub repo (or GitLab/Bitbucket), then [import it into Vercel](https://vercel.com/new) — Vercel auto-detects Next.js, no config needed.
2. In the Vercel project's **Settings → Environment Variables**, add:
   - `LLM_PROVIDER` = `anthropic` (Ollama won't work on Vercel — see above)
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). This is billed to whoever's account owns the key, based on usage — a real ongoing cost, not a one-time fee.
3. **Turn on Deployment Protection** (Settings → Deployment Protection — requires a Vercel Pro plan). This tool calls a paid API on every "Draft copy" click; without protection, the URL is publicly usable by anyone who finds it, including running up your Anthropic bill. This is the one step that's easy to forget and matters most.
4. Redeploy (or it'll deploy automatically on push once the repo is connected).

**Platform constraints already handled in the code**, in case anything here ever needs revisiting:
- Photos are resized client-side to ≤1600px/JPEG before upload (`lib/clientImage.ts`) — Vercel serverless functions have a hard ~4.5MB request body limit, and this keeps uploads well under it regardless of the original photo size.
- `sharp` (used for photo cropping) is marked `serverExternalPackages` in `next.config.mjs` so it bundles correctly as a serverless function rather than getting inlined by the bundler.
- The copy-generation and render API routes set `maxDuration = 60` (`app/api/generate-copy/route.ts`, `app/api/render/route.ts`) since Vercel's Hobby-plan default is only 10s and the Anthropic call can occasionally run longer, especially for the 5-slide color-block template.
- All three API routes run on the Node.js runtime (not Edge) — required for `fs` font loading and `sharp`.

## Running it locally (for development)

1. Install [Node.js](https://nodejs.org) 20+.
2. Copy `.env.local.example` to `.env.local`. Default (`LLM_PROVIDER=ollama`) needs [Ollama](https://ollama.com) installed with a tool-calling model pulled (`ollama pull qwen2.5-coder:7b`) and `ollama serve` running — or switch to `LLM_PROVIDER=anthropic` and paste in an API key instead.
3. Double-click **`start.command`** (macOS) — first run installs dependencies, then opens `http://localhost:3000` automatically. Leave the Terminal window open; closing it stops the app. If macOS blocks the double-click the first time: right-click → Open → confirm.
   - Or manually: `npm install && npm run dev`.

## Using it

1. **Pick a template** — Brand color-block (fixed 5-slide pitch), Twitter-style card, or Photo + text-bubble. The latter two have a Neutral/Branded toggle and a slide-count option.
2. **Describe the post** — a sentence or two about what it's about. For the photo template, upload a photo (JPEG/PNG/WebP — not HEIC; if it's an iPhone photo, share/export it as JPEG first).
3. **Review the drafted copy** — everything Claude writes is editable before you render images, so fix anything off before spending a render.
4. **Preview the slides** — each slide can be regenerated individually if you edit its text and want a fresh image without re-rendering everything else.
5. **Download & post manually** — download all slides as a zip, copy the caption and the first-comment text (the link goes in the first comment, not the caption, since Instagram captions can't have clickable links), and post it yourself in the Instagram app.

## Notes for whoever maintains this

- The template looks were originally prototyped in a design tool (see `PLAYBOOK.md` for that history) and are now defined entirely in code (`lib/templates/`). The app has no external design-tool dependency — everything renders locally.
- Rendering uses Next.js's built-in `ImageResponse` (Satori), not a headless browser — no Chromium download required.
- To change brand colors/fonts, edit `lib/templates/shared/constants.ts` and the font files in `assets/fonts/`.
- `npm audit` currently reports 3 "high" advisories in Next.js's own internally-bundled `sharp`/`postcss` (its built-in image-optimizer, which this app doesn't use — we call our own top-level `sharp` directly in `lib/imageUtils.ts`). `npm audit fix --force` would downgrade Next to 14.2.35 without actually resolving the underlying advisory, so it's intentionally left as-is. Re-check `npm audit` occasionally in case upstream ships a real fix.
- On macOS local dev only, you may see an `objc[...]: Class GNotificationCenterDelegate is implemented in both ...` warning at server startup — this is a harmless duplicate-native-library notice from having both our own `sharp` and Next's internal one on disk. It's specific to macOS's Objective-C runtime and cannot occur on Vercel's Linux servers; verified stable under repeated load locally regardless.
