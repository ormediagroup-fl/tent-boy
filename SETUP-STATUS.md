# Tent Boy setup status

- GitHub repository created and source uploaded: https://github.com/ormediagroup-fl/tent-boy
- Source commit: `760587c072a3eba1d52b2496fe58086471f0ac6a`.
- Public repository approved by owner. Publishing remains disabled; workflow requires repository variable `PUBLISH_ENABLED=true` after separate launch approval. Pages has not been enabled.
- Cloudflare account verified: account ID `6a13f1797f08e09ec5c4a5d04a4c547b`.
- Free D1 database `tent-boy-admin` created, ID `cc49f879-fcc2-450b-b56b-542dec7ac34a`.
- `sessions` and `oauth` tables created successfully through D1 console.
- Account Workers subdomain observed: `orportraits.workers.dev`.
- Planned dashboard origin: `https://tent-boy-admin.orportraits.workers.dev`. Worker not deployed.
- GitHub verification completed. Owner approved creating both apps, granting Contents read/write only to tent-boy, and storing resulting credentials in Cloudflare.
- Login OAuth App registered: Tent Boy Admin Login, application `3996700`, public client ID `Ov23liO6D4QORrUyFwpw`, exact callback `/callback`, wildcard/device-flow off. Client secret has not been generated yet.
- Content GitHub App registered: Tent Boy Content Writer OR Media, App ID `5636223`, slug `tent-boy-content-writer-or-media`. Only Contents read/write and mandatory Metadata read, webhooks disabled, install limited to this account.
- Installation completed: `179109895`, **Only select repositories**, exactly `ormediagroup-fl/tent-boy`. No other repositories selected.
- One private key was generated (key record `5207295`), but Edge blocked the automatic download with ERR_BLOCKED_BY_CLIENT. No matching PEM was found in the local Downloads folder. Do not attempt to bypass the block. User needs to generate/download a new key manually in the open key-pairs tab and save it securely; retire the inaccessible first key after the new one is confirmed usable.
- Next: collect signing key securely without printing/pasting into chat, convert PKCS#1 to PKCS#8 in memory if needed, generate login client secret only when ready to store it, configure Worker secrets and deployment IDs. A Worker has not been created or deployed, so neither secret is stored in Cloudflare yet. Ask for admin-only deployment approval separately; public website publishing and DNS remain unapproved.
- DNS and Squarespace remain unchanged. No paid plan selected.

Public IDs and the planned origin are recorded in `dashboard/wrangler.toml`. Never record client secrets, private keys, login codes or session cookies here.

