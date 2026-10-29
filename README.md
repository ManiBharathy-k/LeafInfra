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
- Logo-blue, white and charcoal design; rotatable 3D villa, structural/floor cutaways, conceptual blueprint views and reduced-motion-aware reveals.
- Dedicated villa and large-home content, project filtering, keyboard navigation and service-prefilled contact enquiries.
- Existing school and apartment projects are labelled accurately; the villa illustration is explicitly a concept. No completed villa projects or fixed pricing are invented.
- Original site's published phone numbers, email, address, project claims, and two short testimonial excerpts.
- Call and WhatsApp links; actual WhatsApp ownership of the published primary number must be confirmed by the client.
- A project enquiry form with explicit contact consent, honeypot, Turnstile, server validation, bounded request size and per-IP-hash rate limit (5 attempts/10 minutes).
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

The architecture SVG is a still conceptual fallback. The current interactive villa studio renders on demand in Canvas and does not autoplay. Keyboard and button controls complement drag rotation.

Cloudflare Pages automatically redirects `.html` pages to extensionless URLs. Internal links, canonical metadata and the sitemap use those clean URLs. `_redirects` only normalizes legacy trailing slashes; never redirect a clean URL back to `.html`. `scripts/check-site.py` checks for cycles including Cloudflare’s automatic HTML canonicalization.

## Residential visual update

Real Pexels photographs now illustrate residential inspiration, separate from real client portfolio photographs. The former generated images have been removed from the deployed assets. The homepage uses an image-led hero and accessible concept tabs; Villas alone contains the construction animation; Large Homes uses interactive detail markers. Optional land status, budget, start timeline and concept preferences are appended to the validated enquiry message and saved/delivered through the existing backend. They are not pricing quotes. `scripts/visual_content.py` owns the page-specific visual sections and is imported by the page generator. Photographer credits, source pages and the reuse licence are in `docs/residential-visuals.md` and the public `/photo-credits` page.

The villa studio is on `/villas#villa-studio`, with prominent jump links from Home and Villas. The previous `/villas#construction-process` anchor still reaches the studio section. The model is controlled by the visitor. Images are served by the Pexels CDN, allowed by the site CSP; this adds a third-party image request.

## Blue identity and interactive villa studio

The current visual identity follows the logo with blue, white and charcoal. `/villas#villa-studio` contains a locally rendered 3D concept villa and two schematic blueprint views, replacing the old staged house animation. Home includes a prominent studio link and a static blueprint preview.

- `assets/villa-geometry.mjs`: original mesh construction and orthographic camera projection; unit-tested structural/finished variants and floor cutaways.
- `assets/villa-studio.js`: event-driven Canvas 2D renderer for 3D polygons. Drag or use arrow keys/rotate controls; zoom/reset; switch finished/structure and exterior/floor cutaways. No WebGL, external rendering library, continuous animation or model downloads. Rendering resolution is capped for phones.
- `scripts/studio_content.py`: original conceptual SVG floor layouts and studio markup. No construction dimensions. These are not approved plans or documented client projects.
- A still SVG is shown until the model renders. Blueprint switching works independently of Canvas support. If JavaScript is unavailable the still illustration and concept disclosure remain visible.

The service CTA carries `Contemporary villa` into the project brief. This is style preference, not a promise that this concept can be built on a particular plot. New backend tests remain in the existing suite; `tests/villa-geometry.test.js` adds camera/mesh checks. Browser QA covers view switching, floor cutaways, blueprint switching and mobile width.

## Private lead manager

The `/admin` workspace includes paginated lead search, status/source/follow-up filters, global lead counts, lead details, status updates, team notes, follow-up dates (India calendar dates), click-to-call/WhatsApp/email, and CSV export of the current page (up to 50 records). CSV cells neutralise spreadsheet formula injection. Updates use optimistic revisions so concurrent edits return a conflict instead of overwriting a teammate's changes. There is no public lead API, password embedded in JavaScript, or destructive delete action.

The admin dashboard only reads and writes real database records. The public admin HTML is only an interface shell; every live data request requires a cryptographically verified Cloudflare Access application JWT.

### Activate on the Cloudflare preview

1. Apply `migrations/0001_leads.sql` if not already applied. Then apply `migrations/0002_admin.sql` **once** in the D1 database bound as `LEADS_DB`. If migration tracking is managed with Wrangler, use its normal D1 migrations workflow instead. The second migration adds notes, follow-up dates, update attribution and edit revisions without changing existing enquiries.
2. Enable the Pages project's preview Access policy under **Workers & Pages → leafinfra → Settings → General → Access policy**. Open **Manage** to edit the generated application in Cloudflare One. During testing you may keep the entire preview protected. To keep marketing pages public, scope the application's public hostnames/paths to BOTH `build-lead-generation.leafinfra.pages.dev/admin*` and `build-lead-generation.leafinfra.pages.dev/api/admin*` (and any immutable preview hosts you intend to use). Keep both paths in the SAME application so they share an audience. Access wildcard preview host entries may be used when supported by the generated Pages application; do not grant a broad Bypass policy. API origin verification protects other preview aliases even if they lack an Access rule.
3. Add an **Allow** policy for the exact admin email addresses. Use Cloudflare Access one-time PIN or your existing identity provider. Do not use an Everyone allow policy. Only authorised users should belong to this Access application.
4. Copy the application's **Application Audience (AUD) tag**. In Pages **Preview** environment variables set `ACCESS_AUD` to that value and `ACCESS_TEAM_DOMAIN` to your team hostname such as `your-team.cloudflareaccess.com` (hostname only, no `https://` or trailing slash). These are identifiers, not private signing keys. The backend retrieves the team's public signing keys over HTTPS and validates signature, issuer, audience, expiry and user identity on every request. Until both settings exist, the data API returns 503 without reading D1.
5. Redeploy the preview, visit `/admin`, sign in, and verify a test enquiry can be opened, updated, refreshed and exported. The live website form also still needs its existing Turnstile keys and rate-limit salt. Do not paste secrets into chat.
6. Before launch, add the final domain's `/admin*` AND `/api/admin*` paths to the Access application, apply the migrations to the production D1 binding, and set the same Access identifiers in the Production environment. Test authorised and unauthorised requests on the final hostname. Never rely solely on hiding the admin link or on the Access email header.

Local checks: `npm test`, `npm run build`, `python scripts/check-site.py`. Admin integration tests use real in-memory SQLite with both migrations, generate RSA-signed JWTs, exercise the submission → inbox → follow-up path, and check unauthenticated requests, forged/expired/wrong-audience sessions, CSRF, search escaping, edit conflicts, validation and CSV safety. These checks do not verify your remote Cloudflare account configuration.
