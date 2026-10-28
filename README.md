# Leaf Infra

Multi-page villa and large-home construction website with a Cloudflare Pages lead capture backend. This repository is the redesign of the original WordPress site at https://leafinfra.com. The `build/lead-generation` branch is connected to the user’s Cloudflare testing project. Production domain cutover remains deferred.

## Local build and checks

Requires Node 22+; no npm dependencies.

```sh
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

The static preview supports page navigation, construction-stage controls, project filters, service selection and form validation. `/api/config` and `/api/leads` require Cloudflare Pages Functions. The preview never fabricates a successful submission. Project images are optimized local WebP assets. `dist/` contains only public website assets; `functions/` must remain at the repository root for Pages Functions discovery.

## Implemented

- Ten marketing pages plus privacy: Home, Villas, Large homes, Services, Commercial, Institutional, Structural, Projects, About and Contact.
- Architectural cream/green/copper design, interactive five-stage SVG house construction sequence, pause/replay, scroll reveals and reduced-motion support.
- Dedicated villa and large-home content, project filtering, keyboard navigation and service-prefilled contact enquiries.
- Existing school and apartment projects are labelled accurately; the villa illustration is explicitly a concept. No completed villa projects or fixed pricing are invented.
- Original site's published phone numbers, email, address, project claims, and two short testimonial excerpts.
- Call and WhatsApp links; actual WhatsApp ownership of the published primary number must be confirmed by the client.
- Two forms with explicit contact consent, honeypot, Turnstile, server validation, bounded request size and per-IP-hash rate limit (5 attempts/10 minutes).
- D1 lead storage before confirmation, UUID retry deduplication, campaign source fields, consent version and notification status.
- Optional Resend email and approved-template Meta WhatsApp alerts; notification failure never discards a saved enquiry.
- Privacy notice, structured business data, canonical URL, sitemap, legacy page redirects, security headers.
- Privacy-friendly browser conversion events; **no live analytics or advertising tags are installed**.

## Later: Cloudflare Pages configuration

Do not connect this branch to a production auto-deployment or change DNS during review. First use a separate preview environment with a separate test database and test notification destinations.

When authorized to deploy: framework preset None, build command `npm run build`, output directory `dist`. Use the repository root as the project root so `functions/` is detected. GitHub Pages cannot run this backend.

1. Create a Cloudflare D1 database. Bind it to Pages Functions as `LEADS_DB` (separate preview/production bindings).
2. Run `migrations/0001_leads.sql` against the correct database using the D1 console or Wrangler. The migration is repeatable.
3. Create a Turnstile widget allowing the exact preview and eventual production hostnames. Set its public key as `TURNSTILE_SITE_KEY` and secret as `TURNSTILE_SECRET_KEY`.
4. Set `LEAD_RATE_SALT` to a long random secret. It salts short-lived IP hashes; never commit it.
5. For email, set `LEAD_EMAIL`, `RESEND_API_KEY`, and `LEAD_FROM_EMAIL`. Use a verified Resend sender domain. The business destination published on the original site is `infraleaf@gmail.com`; confirm it with the client.
6. Optional WhatsApp alerts: set `WHATSAPP_NUMBER`, `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_TEMPLATE_NAME`, and optionally `WA_TEMPLATE_LANGUAGE` (default `en`). The approved template must contain one body text variable to receive the enquiry summary. Confirm Meta's template approval, recipient opt-in and account setup before enabling. The public WhatsApp click link works separately from this API.
7. Redeploy after environment/binding changes. No secrets belong in `index.html`, public assets or GitHub.

If storage/security configuration is absent, submissions return 503 with a direct-contact fallback. The site confirms receipt only after a successful database insert, regardless of optional notification configuration. `/api/config` exposes only the public Turnstile key.

## Lead operations

Cloudflare D1's authenticated dashboard is the initial private lead inbox; there is no public admin or lead-list endpoint. Grant client staff appropriate Cloudflare access during setup. For the latest enquiries:

```sql
SELECT id, created_at, name, phone, email, project_type, location, status, notification_status
FROM leads ORDER BY created_at DESC LIMIT 100;
```

Allowed workflow conventions: `new`, `contacted`, `qualified`, `quoted`, `won`, `lost`. Update the `status` column after following up. Check the inbox each working day; failed notifications are recorded as `failed`, `partial` or `not_configured`. No automatic notification retry worker is included: follow up from the saved enquiry and correct provider configuration. Repeating the website submission with the same UUID does not resend alerts. Use dashboard exports for client reporting, keep exports private, and establish an owner and retention schedule before launch. Rate-limit hashes expire after 24 hours and are cleaned on subsequent submissions.

## Conversion measurement

`assets/site.js` emits document events named `leafinfra:conversion`, with detail `{name, form}`:

- `generate_lead`: emitted only when the API confirms database receipt.
- `call_click`: a visitor clicks a marked phone link (not proof of a completed call).
- `whatsapp_click`: opens WhatsApp (not proof of a sent conversation).

To integrate a consent-aware analytics adapter later, listen for these events and forward only the event name/form, never the visitor's enquiry fields. UTM values are saved with the enquiry. Create a client-owned GA4/Search Console setup and verify real conversions after deployment; do not interpret button clicks as qualified leads.

## Content and launch checklist

- Client approves contact destinations, WhatsApp number, project statistics, testimonial reuse and privacy wording/retention.
- The three project photographs are supplied through the client’s Drive folder; confirm rights and project identification before production publication. The logo is currently loaded from the original WordPress uploads: copy approved branding locally before retiring WordPress hosting.
- Inventory old WordPress URLs before cutover. Redirects currently cover `/about`, `/services`, `/contact`, `/projects`, `/villas`, `/large-homes` and their trailing-slash forms; expand for any other indexed pages. Retain original uploads or migrate every referenced asset.
- Preserve all existing email MX/TXT records when changing web DNS. Take a WordPress/database backup and record a rollback plan.
- Test both forms on the preview and production origins using real Turnstile, D1 and provider credentials: stored row, success state, email receipt, optional WhatsApp receipt, spam rejection, retries and mobile interaction.
- Run mobile/desktop checks and verify security headers, redirect behavior, sitemap, canonical URL, HTTPS and Search Console ownership after deployment.
- Configure Google Business Profile and targeted service/location content with client access and real service coverage. Paid campaigns and budgets require a separate client decision. A website alone cannot guarantee lead volume.

## Verification boundaries

`npm test` runs mocked server integration tests including validation, origin checks, body bounds, persistence, notification failure, duplicate retries and abuse limits. SQL migration is also compatible with SQLite for local schema checks. Tests do not prove Cloudflare binding configuration, real Turnstile or provider delivery; those require the later environment setup. No production account or DNS changes are made by this build.

## Page authoring

`python3 scripts/generate-pages.py` rebuilds the ten marketing HTML pages, sitemap and structured-data CSP hash from the shared page definitions. The generated HTML is committed so Cloudflare only needs Node for `npm run build`. Edit shared page content in that generator, styles in `assets/design.css`, construction/reveal behavior in `assets/motion.js`, and forms in `assets/site.js`. Privacy remains independently authored. After regeneration, run `python3 scripts/check-site.py` and `npm test`, then `npm run build`.

The architecture SVG is a conceptual illustration. Animation runs once, can be paused or replayed, stops when the tab is hidden, and defaults to a complete still house under reduced motion. Stage buttons remain usable without automatic motion.
