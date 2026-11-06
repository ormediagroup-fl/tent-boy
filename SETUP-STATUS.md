# Tent Boy setup status

- GitHub repository created and source uploaded: https://github.com/ormediagroup-fl/tent-boy
- Source commit: `760587c072a3eba1d52b2496fe58086471f0ac6a`.
- Public repository approved by owner. Publishing remains disabled; workflow requires repository variable `PUBLISH_ENABLED=true` after separate launch approval. Pages has not been enabled.
- Cloudflare account verified: account ID `6a13f1797f08e09ec5c4a5d04a4c547b`.
- Free D1 database `tent-boy-admin` created, ID `cc49f879-fcc2-450b-b56b-542dec7ac34a`.
- `sessions` and `oauth` tables created successfully through D1 console.
- Account Workers subdomain observed: `orportraits.workers.dev`.
- Planned dashboard origin: `https://tent-boy-admin.orportraits.workers.dev`. Worker not deployed.
- Login OAuth App form prepared in Edge: name Tent Boy Admin Login, homepage dashboard origin, exact callback `/callback`, wildcard/device-flow off, token expiry default on. Registration not submitted.
- GitHub App creation blocked at GitHub Confirm access / sudo-mode reauthentication. User must complete verification in Edge before continuing.
- Next: prepare/approve GitHub App Contents read/write with install limited to tent-boy, register identity OAuth App, securely configure secrets and nonsecret IDs, then request dashboard deployment approval. No secrets have been created or committed.
- DNS and Squarespace remain unchanged. No paid plan selected.

Public IDs and the planned origin are recorded in `dashboard/wrangler.toml`. Never record client secrets, private keys, login codes or session cookies here.
