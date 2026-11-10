# Blog SEO settings

Open the secure dashboard, choose Blog, edit or create a post, then expand **SEO Settings** below the post body.

- Empty SEO title and description fields show live suggestions and use those defaults in published HTML. Typing a custom value overrides the fallback. Saving, editing the body, and publishing do not replace custom values. The explicit “Use suggested SEO title and description” button asks before replacing custom text.
- New post slugs follow the title until manually changed. Existing slugs remain unchanged. Published URL changes require confirmation.
- Select a sharing image from existing uploads or upload one with the normal optimized image workflow. Leave the selection on “Use article featured image” to follow the cover.
- Counters and previews provide guidance only. The focus keyword is an editorial note, not a meta keywords tag.
- Article HTML includes title, description, canonical URL, Open Graph, Twitter card, dates and BlogPosting JSON-LD. SEO edits update server-owned publication modification dates. Drafts are excluded from the sitemap and public output.

## Redirects and hosting

The repository's checked-in workflow publishes the public website through GitHub Pages. The secure dashboard is a separate Cloudflare Worker. No deployment target is changed by this feature.

Publishing a changed slug retains previous slugs by stable post ID. A build creates Cloudflare Pages-compatible `_redirects` rules using HTTP 301. On GitHub Pages, which cannot return per-route HTTP 301s, an HTML refresh and canonical link preserve navigation at old URLs. Old routes are omitted from the sitemap. Alias conflicts block publishing. Unpublishing removes the article and its redirect pages.

## Deployment and validation

Run `npm test` and `npm run build`. The main-branch workflow deploys public HTML. Deploy the existing dashboard separately with Wrangler after building, so that shared modules and preview assets are copied into `dashboard/public`. Keep the existing Worker configuration, secrets and authentication.

Automated tests cover defaults, overrides, escaping, HTML metadata, timestamps, slug history, sitemap visibility, image output, redirect artifacts and legacy rendering. No source content migration is required.
