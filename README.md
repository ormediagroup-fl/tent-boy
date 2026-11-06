# Tent Boy

Standalone GitHub Pages website with a secure Git-backed content dashboard. Public hosting remains separate from Squarespace. Nothing is deployed yet.

See **[ADMIN-SETUP.md](ADMIN-SETUP.md)** for account setup, authentication, deployment, DNS, costs, recovery and daily use. Those instructions replace the earlier buildless / branch-publishing instructions.

## Local work

Use Node.js 22 or later, then run from this directory:

```sh
npm install --ignore-scripts
npm test
npm run build
npm run preview
```

Visit http://127.0.0.1:4173. The local preview serves the generated `dist` folder. After changes, rebuild and refresh. Its `/admin` page is intentionally setup-pending until ADMIN_ORIGIN is configured; it never offers a fake production login.

## Project map

| Path | Purpose |
| --- | --- |
| `content/site.json` | Structured categories, products, homepage, guide, social links and editable disclosure. Normally edited by dashboard forms. |
| `content/schema.js` | Shared server/build validation and published catalog rules. |
| `app.js`, `index.html`, `styles.css` | Public page renderer, shell and charcoal/white/muted-gold theme. |
| `assets/` | Existing real photos and uploaded images. |
| `dashboard/public/admin/` | Phone-friendly editing forms and draft preview controls. |
| `dashboard/src/worker.js` | Real GitHub OAuth / App authentication, private sessions and Git draft/publish operations. |
| `dashboard/schema.sql`, `dashboard/wrangler.toml` | D1 schema and server configuration placeholders. No secrets. |
| `scripts/build.mjs` | Validation, WebP image optimization, public-only artifact and dashboard preview preparation. |
| `.github/workflows/pages.yml` | Automatic validation, build and GitHub Pages deployment after publication to main. |
| `tests/` | Automated tests and a loopback-only memory fixture for browser QA. Never deployed to Pages or the Worker. |

The original `gear.js` and one-time migration script remain as a record of the supplied product URLs; they are not used or published. The CMS data file is the sole current source of truth. The guide has no invented Payhip link or price and remains hidden. Existing photo assets are real user-provided setup photos, not product illustrations.

## Current activation limit

The local source and tests are ready for account configuration. Real login and remote publishing require a new GitHub repository, a Cloudflare account, an identity OAuth App, a repository-scoped GitHub App, and server secrets. No live service or DNS changes were made.

The temporary browser QA fixture uses only memory and is explicitly not authentication verification. It has no route or switch in the production Worker. Production APIs fail closed without a valid allowed-user session.
