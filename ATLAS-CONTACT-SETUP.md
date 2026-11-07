# Tent Boy contact form — Atlas setup

The branch adds `/contact/` and `/thank-you/`, Contact links and a sitemap entry. It depends on the open image-editor and video/sitemap PRs. The website has not been merged or deployed.

**Connected November 7, 2026:** Atlas device login was approved using the owner's GitHub-linked account. The free account already had one project, **My First Project**, containing an OR Media Group form. To stay within the free one-project/two-form limit, a separate **Tent Boy Contact** form was created in that project. The existing OR Media Group form, endpoint and settings were not changed.

- Public Tent Boy endpoint: **https://atlasforms.app/f/g9jLOEKZLF**
- Project: `73fdd5a3-b5c7-4594-afca-4059bfe04452`
- Dedicated form: `4753d539-d3ee-4ed1-aea1-e07d2d2bef17`
- Allowed production origin: **tentboy.orportraits.com**
- Success redirect: **https://tentboy.orportraits.com/thank-you/**
- Provider mode: **Sandbox**, pending schema review/Go Live at the approved rollout.
- Spam protection: supported honeypot; optional AI filtering remains off.

## 1. Endpoint configuration

The public URL is stored in **`content/contact-config.json`** and read by `scripts/build.mjs`. No private API key or account token is stored in the project, browser bundle or GitHub. The login credential remained in process memory. No new account or paid plan was created.

The existing **`ATLAS_FORM_ENDPOINT`** repository variable remains an optional override. If set, it takes priority over the committed URL; leave it unset/blank to use the dedicated Tent Boy endpoint above. To change it later, use Settings → Secrets and variables → Actions → Variables. Endpoint/configuration changes take effect on the next **approved** build. Nothing dispatches a deployment automatically merely because the Atlas form was created.

No new Cloudflare Worker, database, storage binding, DNS setting or paid infrastructure is required. Only one form is needed for the current site; no newsletter or other unrequested form was created. [Atlas's official agent setup](https://atlasforms.app/llms/agent-setup.txt) and [API reference](https://atlasforms.app/llms/api.txt) describe the device login and public submission workflow.

## 2. Configure Atlas

- The form already has **`tentboy.orportraits.com`** under Allowed Origins. Keep that restriction for production. Keep Sandbox mode for testing first; register the testing machine's IP in the Localhost Testing settings if using localhost. When ready, configure the live form for the production origin.
- Review **Schema Validation** for these field names: `name` (text), `email` (email), `subject` (text), `message` (long text). Include representative short and long messages when reviewing learned field types. Use Atlas's schema settings to enforce the expected fields/types before going live. The browser also requires all four fields, a valid email, one of the four supported subjects, and length limits of 120/254/6,000 for name/email/message. Those browser checks do not replace provider-side validation.
- The form sends Atlas's supported **`_gotcha` honeypot**. Keep its spam protection enabled and check quarantine for false positives. No CAPTCHA widget or key is needed for this implementation. See [Atlas security](https://atlasforms.app/docs/security) and [schema validation](https://atlasforms.app/docs/schema-validation).
- Success Redirect is already set to **`https://tentboy.orportraits.com/thank-you/`** for Atlas's standard HTML workflow. This site's JavaScript flow uses the [documented JSON submission response](https://atlasforms.app/docs/integrations/javascript) and redirects locally only after HTTP success plus `success: true` and a nonempty `submission_id`. It ignores response-supplied URLs. Do not configure a redirect that replaces JSON responses with HTML; unexpected redirects or responses are treated as unconfirmed delivery. [Atlas HTML redirect documentation](https://atlasforms.app/docs/integrations/html).
- Confirm where you will monitor messages in Atlas. Notification availability depends on the plan; it is separate from successful form submission.

## Free-plan limits

As checked November 7, 2026, Atlas's [pricing page](https://atlasforms.app/pricing) lists Starter as free with 50 monthly submissions, two forms in one project, seven-day retention, webhook notifications, and **no email notifications**. This implementation does not upgrade or purchase anything. Check/export messages in the Atlas dashboard before they expire. Exceeding quota can reject new messages; the page shows an error and retains the visitor's text. Do not assume messages automatically arrive in your email inbox. Review the current plan details when creating the form.

## How the site behaves

- `contact-view.js` builds both pages using the existing Tent Boy logo, fonts, charcoal/paper/gold palette, buttons, social profiles and Associates disclosure. It does not replace existing gear or guide content.
- The build passes the optional `ATLAS_FORM_ENDPOINT` override or committed public endpoint into the rendered form. Blank configuration disables all fields and Send; invalid endpoint configuration fails the build. The endpoint must be an HTTPS URL on exactly `atlasforms.app` with a public `/f/ID` path, without credentials, query strings, fragments or nonstandard ports.
- `contact-form.js` submits only the four fields and honeypot as JSON. No cookies, API key, local storage, analytics form-content event or visitor information in URL parameters is added. `contact.js` initializes the browser UI.
- Accessible inline errors, an announced error summary and focus management help keyboard/screen-reader users. Phone inputs use 16px text and controls at least 48px high. All fields stay intact on errors, timeout or unconfirmed delivery. No automatic retry occurs. The Send button prevents duplicate in-flight requests.
- After confirmed success, the only destination is the fixed local `/thank-you/` path. The thank-you page is `noindex,follow` and excluded from the sitemap; `/contact/` is included. Unknown contact lastmod is omitted rather than using build time. Existing persisted blog dates and published/draft filtering remain intact.
- JavaScript is required for the accessible in-place submission/error flow. With scripts unavailable, the form remains disabled and explains that requirement. This prevents a native POST from navigating away and losing the visitor's text on failure.
- Contact links inside the authenticated dashboard homepage preview open the public contact page in a new tab. They do not attempt to submit from the admin Worker origin or its restricted iframe.

## Validation and local preview

Run `npm test` (48 tests) and `npm run build` from the repository root. Existing image/video editor, sitemap, upload/security, Payhip and analytics tests remain enabled.

For browser checks, build first and run `node tests/contact-preview-server.cjs`, then open **`http://127.0.0.1:4176/contact/`**. This is loopback-only and has no account credentials or production writes. The default page is unconfigured and disabled. Add **`?mock=1`** to exercise a simulated form:

- Message `simulate failure` returns a local 500 response.
- Message `simulate malformed success` returns an unconfirmed response.
- Other messages return local simulated success and redirect to the local thank-you page.

Those responses are browser fetch doubles; nothing is transmitted to Atlas. Stop the server to end QA. Tests cover validation, missing/invalid configuration, JSON payload/honeypot, credential omission, server/network/timeout errors, duplicate submissions, positive-response-only redirect, preserved text, navigation/footer links, build output and sitemap inclusion.

Browser QA verified required/email errors, focus, error recovery without lost fields, malformed-success rejection and successful redirects using local simulated responses. Contact and thank-you layouts were checked at phone, tablet and desktop widths, including no horizontal overflow, non-overlapping logo/navigation and working home/blog/footer links. These are responsive browser checks, not a physical iPhone test.

## Real provider checks completed

One clearly labeled setup test was sent from a localhost origin using the exact `sendContact` module used by the site. Atlas returned a successful submission confirmation, and the authenticated forms list showed **one saved submission** in Tent Boy Contact. The old OR Media Group form still showed zero and retained its original domain/redirect. The test used a reserved `.invalid` email address; no reply is expected. Account usage was 1/50 submissions with no quota/storage warnings.

CORS preflight allowed both the localhost test origin and `https://tentboy.orportraits.com`. An unrelated origin received no CORS allowance, and its POST was rejected with HTTP 403. This was a direct provider integration test, not a browser test on the live website. Automated tests and the existing loopback fixture continue to use fetch doubles, not the real provider.

You can view messages at [Atlas Dashboard](https://atlasforms.app/dashboard), under My First Project → Tent Boy Contact. Agent access can be revoked at Settings → API → Connected agents.

## Required production acceptance check — not yet performed

After deployment is approved, review the learned field schema and switch the Tent Boy form to Go Live in Atlas, then submit one clearly labeled test message from the deployed allowed domain. Confirm the saved submission in the **Tent Boy** Atlas form, the thank-you redirect, the expected fields and the chosen message-monitoring method. Also verify a rejected request retains its fields. Only then describe the deployed website’s form as working. The local simulated tests are not proof of Atlas account configuration, CORS, schema, quota, inbox delivery or live submissions.

Review/merge the earlier image and video/sitemap PRs first, then retarget this dependent contact PR to main for review. Do not merge the contact work into the other feature branches. Public Pages builds run only after an approved main push/manual run with the existing `PUBLISH_ENABLED` setting. No admin Worker deployment is needed for this feature.
