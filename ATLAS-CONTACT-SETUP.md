# Tent Boy contact form — Atlas setup

The branch adds `/contact/` and `/thank-you/`, Contact links in the homepage/blog navigation and footers, and a contact sitemap entry. It depends on the open image-editor and video/sitemap PRs. Nothing is merged or deployed, and no live message has been sent.

**Status:** The owner needs to create a dedicated Tent Boy form. No existing Atlas endpoint was found in the repository/configuration. The production build deliberately has no endpoint and disables the form with a “coming soon” message. No OR Media Group form is reused. Local QA uses Atlas's documented example URL with a fetch double; no requests go to that example.

## 1. Create the dedicated form

1. Sign in at [Atlas Forms](https://atlasforms.app/) and create a project/form named **Tent Boy Contact**. See the [official quickstart](https://atlasforms.app/docs/quickstart).
2. Copy its **public form endpoint**, the URL shown as `https://atlasforms.app/f/` followed by your form ID. This is the only value needed by the website. Do not send or enter a private API key in site code, GitHub variables, HTML or chat.
3. Provide that public URL to connect the draft, or set it in this repository under **Settings → Secrets and variables → Actions → Variables → New repository variable**. Name: **`ATLAS_FORM_ENDPOINT`**. Value: the dedicated Tent Boy public endpoint. The build reads it; no HTML/JSON editing is needed. Do not use Atlas's example form ID or a management API URL.
4. Changing the variable alone does not rebuild the site. Include it in the next **approved** Pages build, or use Actions → Build and publish Tent Boy → Run workflow after deployment is approved. Until then, the live site remains unchanged.

No new Cloudflare Worker, database, credential, storage binding, DNS setting or paid infrastructure is required. Existing GitHub Pages hosting remains in place. No private Atlas API authentication is required for its public form endpoint.

## 2. Configure Atlas

- Under **Form Settings → Security → Allowed Origins**, add only **`tentboy.orportraits.com`** for production. Keep Sandbox mode for testing first; register the testing machine's IP in the Localhost Testing settings if using localhost. When ready, configure the live form for the production origin.
- Review **Schema Validation** for these field names: `name` (text), `email` (email), `subject` (text), `message` (long text). Include representative short and long messages when reviewing learned field types. Use Atlas's schema settings to enforce the expected fields/types before going live. The browser also requires all four fields, a valid email, one of the four supported subjects, and length limits of 120/254/6,000 for name/email/message. Those browser checks do not replace provider-side validation.
- The form sends Atlas's supported **`_gotcha` honeypot**. Keep its spam protection enabled and check quarantine for false positives. No CAPTCHA widget or key is needed for this implementation. See [Atlas security](https://atlasforms.app/docs/security) and [schema validation](https://atlasforms.app/docs/schema-validation).
- Set **Form Settings → General / Delivery Settings → Success Redirect** to **`https://tentboy.orportraits.com/thank-you/`** for Atlas's standard HTML workflow. This site's JavaScript flow uses the [documented JSON submission response](https://atlasforms.app/docs/integrations/javascript) and redirects locally only after HTTP success plus `success: true` and a nonempty `submission_id`. It ignores response-supplied URLs. Do not configure a redirect that replaces JSON responses with HTML; unexpected redirects or responses are treated as unconfirmed delivery. [Atlas HTML redirect documentation](https://atlasforms.app/docs/integrations/html).
- Confirm where you will monitor messages in Atlas. Notification availability depends on the plan; it is separate from successful form submission.

## Free-plan limits

As checked November 7, 2026, Atlas's [pricing page](https://atlasforms.app/pricing) lists Starter as free with 50 monthly submissions, two forms in one project, seven-day retention, webhook notifications, and **no email notifications**. This implementation does not upgrade or purchase anything. Check/export messages in the Atlas dashboard before they expire. Exceeding quota can reject new messages; the page shows an error and retains the visitor's text. Do not assume messages automatically arrive in your email inbox. Review the current plan details when creating the form.

## How the site behaves

- `contact-view.js` builds both pages using the existing Tent Boy logo, fonts, charcoal/paper/gold palette, buttons, social profiles and Associates disclosure. It does not replace existing gear or guide content.
- The build passes `ATLAS_FORM_ENDPOINT` into the rendered form. Blank configuration disables all fields and Send; invalid endpoint configuration fails the build. The endpoint must be an HTTPS URL on exactly `atlasforms.app` with a public `/f/ID` path, without credentials, query strings, fragments or nonstandard ports.
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

## Required live acceptance check — not yet performed

After the endpoint is configured and deployment is approved, submit one clearly labeled test message from the allowed domain. Confirm the saved submission in the **Tent Boy** Atlas form, the thank-you redirect, the expected fields and the chosen message-monitoring method. Also verify a rejected request retains its fields. Only then describe live delivery as working. The local simulated tests are not proof of Atlas account configuration, CORS, schema, quota, inbox delivery or live submissions.

Review/merge the earlier image and video/sitemap PRs first, then retarget this dependent contact PR to main for review. Do not merge the contact work into the other feature branches. Public Pages builds run only after an approved main push/manual run with the existing `PUBLISH_ENABLED` setting. No admin Worker deployment is needed for this feature.
