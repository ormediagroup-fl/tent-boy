# Blog videos, product-photo fallback and sitemap dates

This feature branch depends on [image editor PR #1](https://github.com/ormediagroup-fl/tent-boy/pull/1). It preserves image captions, widths, alignments, original upload paths, optimization and draft/preview behavior. No catalog content, prices, links, branding or analytics settings are changed. Nothing has been merged or deployed.

## Using videos

In Blog → Edit post, place the cursor and choose **Add Video**. Paste an HTTPS YouTube watch, Shorts or youtu.be URL, select landscape (16:9) or portrait (9:16), optionally enter a caption, and choose **Apply video**. The video inserts at the cursor, splitting surrounding text when necessary. Use **Edit video** to replace the URL, change the shape/caption, or remove it. Empty captions disappear. Removal supports the existing Undo/Redo buttons. Keyboard users can Tab to a video, press Enter to edit, and Escape to return.

Save draft → Reload preserves the structured block:

```json
{"type":"video","url":"https://youtu.be/VIDEO_ID","aspectRatio":"16:9","caption":"Optional plain text"}
```

`VIDEO_ID` above is a documentation placeholder, not a publishable URL. Actual YouTube IDs must contain exactly eleven permitted characters. Only the approved URL hosts/routes, two ratios and plain-text captions up to 2,000 characters are accepted. No iframe HTML, arbitrary CSS or autoplay setting can be entered. Rendering constructs its own `https://www.youtube-nocookie.com/embed/ID` URL, drops source query parameters, enables fullscreen, lazy-loads the iframe, and supplies a referrer policy needed by YouTube players. The admin CSP adds only that iframe origin. No external player script is added.

The preview and public post share the renderer and video layout rules. Landscape fills the content column; portrait is centered and capped at 420px, shrinking to fit phones. Posts without videos continue working. Videos load third-party YouTube content; privacy-enhanced embeds do not mean zero third-party network traffic. The viewer must press Play. YouTube may restrict embedding of individual videos; replace those with an embeddable video.

## Amazon: safe unavailable mode, not an active API integration

API eligibility is **unconfirmed**. The owner answered “Not sure”; there are no authorized Creators API credentials or confirmed ASIN mappings for this task. Accordingly this branch makes **no Amazon API requests**, adds no paid service, installs no Amazon SDK, and does not pretend that automatic retrieval works. Manual uploads remain first priority. Missing or failed photos show a neutral “Product photo coming soon” panel. Product names, supplied affiliate URLs, descriptions and the required Associates disclosure remain unchanged.

Research checked November 7, 2026:

- [Register for Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api): the primary owner needs final Associates acceptance and qualifying referred sales, then Tools → Creators API → Create Application. Credentials include ID, Secret and Version. An affiliate link alone does not prove API eligibility.
- [Creators API documentation](https://affiliate-program.amazon.com/creatorsapi/docs/): current official catalog API; check its PA-API migration/deprecation guidance before implementing a new integration.
- [Associates Program policies](https://affiliate-program.amazon.com/help/operating/policies): Amazon image content must not be downloaded or cached. Image URL references may be stored for at most 24 hours. Review the full current license, linking, attribution and refresh requirements when enabling retrieval.

### What is needed before automatic Amazon photos can be enabled

1. Check Associates Central → Tools → Creators API. Confirm eligibility, marketplace and partner tag without sharing secrets in chat.
2. Create API credentials only if eligible. Enter them directly into Cloudflare Worker **Secrets**, never into site JSON, browser JavaScript, GitHub source, build artifacts or screenshots. There is no Amazon secret binding or active API route in this PR.
3. Identify the real ASIN for each product. Existing `link.amazon` short-link suffixes are opaque and must not be guessed to be ASINs. Preserve every existing affiliate URL.
4. A later authorized integration should request only official image resources server-side, retain image URL references for less than 24 hours, refresh before expiry and suppress stale references on errors. Do not proxy, download, WebP-optimize or commit Amazon's images. Continue optimizing user-owned uploads normally.
5. Serve authorized image metadata dynamically from the Worker, rather than baking expiring Amazon URLs into long-lived GitHub Pages builds. Limit access to published products, approved marketplaces and API-returned image hosts; never accept arbitrary fetch URLs. Keep secrets and access tokens server-side, rate-limit/cache metadata within policy, and preserve paid affiliate linking and any required attribution.
6. Apply the order **uploaded image → fresh authorized API image → placeholder**. Add controlled tests for token acquisition, authorized GetItems responses, expired URL refresh, API failure, manual overrides, and credential redaction before enabling it. Actual retrieval has not been tested here because access is unavailable.

No new paid hosting/storage service is required for the delivered changes. Any future API integration must respect account quotas and the existing free Cloudflare plan; it is not enabled by this PR.

## Sitemap and publication dates

The existing `scripts/build.mjs` still owns generation. It emits the homepage, blog index and published post canonical URLs. Draft and unpublished posts are excluded. `robots.txt` still points to `https://tentboy.orportraits.com/sitemap.xml`.

The publish endpoint compares the saved draft with current main, stamps server-owned ISO timestamps, commits them to the draft, then fast-forwards main using the existing GitHub App installation token. It returns the final revision so the next dashboard save continues normally. An ancestry conflict fails without force-pushing main. No timestamps are created by merely saving a draft.

- Post `publishedAt`: first recorded publication; retained when hidden and republished.
- Post `modifiedAt`: publication, republication, material article changes (including video/image settings), or shared social-footer changes. Submitted timestamps are ignored in favor of the server's previous records and current publication time.
- `publication.homeModifiedAt`: changes to visible homepage/catalog/guide/social/disclosure content.
- `publication.blogModifiedAt`: visible index-summary, listing, publication status or social-footer changes. Body-only edits update the article, not an unchanged index.

For legacy content without these records, full Git history provides the last persisted content-commit time for material changes. It is a historical modification date, not a claim about the exact first live deployment time. Explicit server publication dates take precedence when later; newer material Git edits also advance lastmod. History recovery changes build output only and never rewrites source image paths or site JSON. If history is unavailable, unknown lastmod is omitted rather than fabricated from the build clock. Unchanged rebuilds produce identical sitemap dates. The user-editable display date remains separate.

The Pages workflow already runs tests/build/deployment on **push to main**, including GitHub App ref updates. [GitHub documents that installation tokens can trigger workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow); the `GITHUB_TOKEN` suppression rule does not apply to this publisher. This PR adds `fetch-depth: 0` for legacy dates and retains the `PUBLISH_ENABLED` guard. Draft saves only update `tentboy-cms-draft` and do not trigger Pages. Publishing, updating or unpublishing commits to main and rebuilds the sitemap. Recent existing main push builds were verified successful, including [run 42222241579](https://github.com/ormediagroup-fl/tent-boy/actions/runs/42222241579). No production publication was performed to test this branch.

[Google's guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) calls for accurate dates reflecting significant changes. The sitemap remains compatible with Search Console; nothing submits it to Google automatically.

## Review and eventual rollout — approval required

The PR targets the image-editor feature branch so its diff contains only this task. Review/merge the image-editor work first, then retarget this PR to main and review the combined result. Do not merge it back into the image branch or deploy without the owner's approval.

After approval, both public Pages code **and** the admin Worker/static assets must be updated:

1. Run `npm install --ignore-scripts --no-audit --no-fund`, `npm test`, and `npm run build` in the approved checkout. Build first: it copies shared validators/renderers and preview assets into `dashboard/public`.
2. Deploy the admin Worker from that approved checkout with the existing `dashboard/wrangler.toml` configuration and existing authenticated owner session, e.g. `npx wrangler deploy --config dashboard/wrangler.toml`. No new secrets, database migration, DNS, OAuth permission or billing change is needed for YouTube/sitemap support.
3. Merge the approved PR to main with `PUBLISH_ENABLED=true` and the existing `ADMIN_ORIGIN` repository variable. Its main push invokes the existing Pages workflow. No workflow dispatch is necessary.
4. On the live dashboard, verify a saved post containing both image metadata and videos previews correctly, publish an approved post, and check the Actions run and sitemap. This is intentionally left for the approved deployment; all current publishing tests are isolated fixtures/mocks.

## Validation

`node --test tests/*.test.mjs`: 38 passing tests, including the existing image-editor, upload, security, Payhip and analytics checks. Tests cover URL and metadata validation, escaping, serializer persistence, public rendering, server-side save/publish with videos and images, all requested sitemap state transitions, full-history legacy recovery and identical rebuild output. Git-history integration creates a disposable temporary repository; no production credentials or remotes are used.

Browser QA used `tests/image-editor-server.cjs`, a loopback-only, in-memory fixture. Verified cursor insertion splits a paragraph correctly; editing/replacement; both aspect ratios; caption removal; save/reload; preview; invalid URL rejection; removal/Undo; Enter/Escape focus behavior; and unchanged existing image captions/layouts. YouTube's official embedded-player demonstration played in portrait/mobile and landscape/wide previews (video time advanced and player state was playing). Phone preview was 338px content width; landscape rendered 338×190 and portrait 338×600 without overflow. Editor controls fit a 375px viewport. This is responsive browser testing, not a physical iPhone test. Actual Amazon retrieval and live deployment were not performed.
