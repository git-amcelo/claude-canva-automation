# buckstreaming Instagram Carousel Draft Automation — Playbook

Working notes for the Claude + Canva MCP pipeline that generates Instagram carousel post drafts for review (never auto-published — user always posts manually in the Instagram app). Full background/rationale: `/Users/chetansmac/.claude/plans/can-you-install-the-shimmying-dawn.md`.

## Golden rule

**Never call `edit-design` on an existing design.** Always `copy-design` first, then edit the copy. The buckstreaming Canva account has unrelated personal/business designs in it — none of those are ever touched.

## Master templates — all 5 built

| # | Family | Variant | Canva design ID | View link |jjj
|---|---|---|---|---|
| 1 | Brand color-block | — | `DAHJsvRhN4I` ("BUCK Advertisement for CREATORS", pre-existing, untouched) | https://www.canva.com/d/_HsVm0PYtdX9670 |
| 2 | Twitter-style fake-tweet card | Neutral (blue) | `DAHQ7ZeUNmk` | https://www.canva.com/d/5Hy0Z2ePFS9AVVS |
| 3 | Twitter-style fake-tweet card | Branded (buckstreaming orange) | `DAHQ5AS9LfA` | https://www.canva.com/d/ulDb3JM5hkSTNXH |
| 4 | Photo + text-bubble | Neutral (gray placeholder bg, white bubble) | `DAHQ7XMgWIs` | https://www.canva.com/d/j-ukghPTIWg4KJJ |
| 5 | Photo + text-bubble | Branded (gray placeholder bg, orange bubble) | `DAHQ7XBpaBM` | https://www.canva.com/d/p-mGH1mpTd0kRC7 |

Templates 2–5 live in the Canva folder **"buckstreaming — Insta Carousel Templates"** (`FAHQ5MPBRhk`). Template 1 was left in place (never moved) per the copy-before-edit rule.

Two rejected drafts are still loose in the account (no delete tool in the Canva MCP — trash manually if desired), both titled `REJECTED DRAFT (not used) — ...` so they're unambiguous.

### Template 1 — Brand color-block (`DAHJsvRhN4I`)

5 pages, fixed structure (Hook → Problem → Fix → Features → CTA). Background color rotates per page; eyebrow tag "BUCKSTREAMING.COM" appears on every page in the brand orange-red.

| Page | Background | Content |
|---|---|---|
| 1 | Black | Eyebrow line, "BUCK" wordmark, big red headline (hook question), white CTA line, small eyebrow-color URL, arrow graphic |
| 2 | Olive/yellow-green (`~#C9C93B`-ish) | Eyebrow, red headline "HAVE YOU TRIED ALREADY? and well...", 3x "PROBLEM N" (red) + bold black sub-head + red body text |
| 3 | Black | Eyebrow, red headline "THE FIX?? BUCK.", 3x "FIX N" (red) + white sub-head + red body text |
| 4 | Cream (`~#FAF3E3`-ish) | Eyebrow, black centered headline "THE FEATURES", numbered list (bold black title + black body per item) |
| 5 | Orange-red (brand color) | White "BUCK" wordmark, white headline/CTA lines, small white eyebrow URL |

Caption pattern observed on the live post: short/casual (e.g. "New branding is complete! Check the site out :)"), with the link posted as the **first comment**, not in the caption (Instagram captions aren't clickable).

Export target: match Instagram portrait carousel ratio (reference images ~4:5, i.e. 1080×1350).

### Templates 2–3 — Twitter-style fake-tweet card (`DAHQ7ZeUNmk` / `DAHQ5AS9LfA`)

**Important correction:** the user's actual reference (https://www.instagram.com/p/DZKuXinlEUT/'s sibling ask) meant a literal fake-tweet screenshot mockup, not a plain-text card. AI `generate-design` reliably misfired on this (once produced a "marketing ad about templates" with garbled text, twice failed outright on tightly-constrained prompts) — built by hand instead via `insert_shape`/`add_text`/`format_text`, which gave precise, reliable control.

Structure (single page, 1080×1350), all elements on top of a diagonal two-tone background (two overlapping rects — flat colors only, the Canva MCP shape ops don't support true gradients):
- Base rect (0,0 → full page) + a large rotated (25°) rect hanging off the bottom-right corner, for the diagonal two-tone look.
  - Neutral: base `#6EC6F1`, diagonal `#1B75C4` (blue, close to the reference).
  - Branded: base `#F2825A`, diagonal `#E2461E` (buckstreaming orange — **approximated from the master template's visual tone, not an exact brand-kit hex**; ask the user for the precise hex if pixel-perfect brand matching matters).
- White rounded card (corner_rounding 40) centered on the diagonal, containing:
  - Avatar: a plain circle shape (square + `corner_rounding = width/2` = perfect circle trick) as a placeholder — no real photo.
  - Bold name text + small circular "verified badge" shape next to it (kept Twitter-blue `#1DA1F2` in both variants — the user asked only for the *background* to change, not the badge/avatar).
  - Gray handle/timestamp text below.
  - Body text below that.
  - A row of 5 icon+count text elements near the card bottom, built from **emoji glyphs** (💬🔁❤️🔖↗ + counts) since the Canva MCP has no icon-search/library tool — this is a pragmatic approximation, not pixel-perfect Twitter iconography. Flag to the user if true vector icons are wanted later (would need real SVG paths per icon, hand-drawn).

### Templates 4–5 — Photo + text-bubble (`DAHQ7XMgWIs` / `DAHQ7XBpaBM`)

Single page, 1080×1350. Background is a **flat gray placeholder** (`#9AA5B1`) standing in for a real photo — with a small italic label at the bottom ("[ PHOTO PLACEHOLDER — swap this background for a real photo ]") so it's never mistaken for finished art. One white (neutral) or buckstreaming-orange `#E2461E` (branded) rounded-rectangle text bubble near the top third, bold centered callout text (black on neutral, white on branded) — matches the reference's "big bold text bubble over a candid photo" look. Multiple slides in a real carousel would reuse this same bubble treatment with different photos/callout text per slide.

**To swap in a real photo per post:** see "Photo handling" below — replace the gray rect's fill via `update_fill` with the uploaded asset.

## Operational gotcha: commit often

One `edit-design` call timed out mid-transaction (~7 min, no response) during template building, and the transaction turned out to be gone — `read-design` on it returned "transaction not found," and *all uncommitted edits in that transaction were lost*, reverting the design to its last committed state. Lesson: **commit (`finalize: "commit"`) after every meaningful milestone**, not just at the very end of a multi-step build — a handful of small commits is cheap; losing 5+ operations of work to one bad connection is not.

## Photo handling (for templates 4–5)

The Canva MCP has no direct local-file-upload tool — only `upload-asset-from-url`, which requires a **publicly accessible** URL (the tool itself warns against publishing private files to get one). So: **user uploads their photo into their own Canva account's Uploads panel first**, then tells Claude which one to use (by name/description); Claude finds it via `get-assets` and inserts it with `update_fill`/`insert_fill`. No public URL, no privacy tradeoff.

## Per-post flow

1. User gives topic + which template (or Claude suggests one) + any photo (already in Canva Uploads, for templates 4–5).
2. Claude drafts slide copy + caption + first-comment link text as plain text — user sanity-checks before touching Canva.
3. `copy-design` the relevant master → edit the copy via `read-design(open_transaction: true)` + `edit-design` (replace_text / update_fill per slide) → `export-design` (PNG, one per page, 1080×1350).
4. Claude shows exported images inline in chat + caption + first-comment text.
5. User requests fixes → Claude re-opens the same copy's transaction and edits just the affected page, re-exports only that page.
6. User saves images, posts manually in Instagram, pastes caption, adds link as first comment.
