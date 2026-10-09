# Leaf Infra — Civil Construction Execution

Responsive, single-page lead-generation website for Leaf Infra (formerly SS Constructions).

## Run locally
Open `index.html` in a browser, or serve this directory with any static HTTP server.

## Deploy
This is a static site and can be deployed on GitHub Pages, Cloudflare Pages, Netlify, or any static hosting provider. For GitHub Pages, select the `main` branch and `/(root)` as the publishing source.

## Before launch — required configuration
1. In `index.html`, set `BUSINESS_PHONE`, `BUSINESS_EMAIL`, and `WHATSAPP_NUMBER` in the script to verified business contact details.
2. Replace phone links currently using the obvious placeholder `+910000000000`.
3. Connect the lead forms to a secure form endpoint/CRM (or keep the prepared email workflow after configuring the business email). The static demo does not store or transmit submissions by itself.
4. Replace testimonial placeholders with authentic client-approved quotes and confirm permission to name clients.
5. Verify project scopes, locations, dates, built-up areas, credentials and performance metrics. Project images are illustrative stock imagery, not verified site photographs.
6. Add the correct office address, registration/licensing information, privacy policy and consent language as applicable.

## Features
- Mobile-first responsive layout, sticky mobile Call / Get Quote bar
- Project-category filtering and expandable project details
- Hero quick enquiry form and detailed consultation form with native validation
- Lazy-loaded project imagery and reduced-motion support
- WhatsApp floating CTA, activated after adding the verified number
- Accessible labels, focus styles and form status messages


## Lead enquiry delivery (Cloudflare Pages)

The website forms POST to `/api/leads`, implemented in `functions/api/leads.js`. The endpoint validates and limits submitted fields, then sends notifications through whichever channels are configured. The form does **not** store enquiries in a database.

To enable both delivery channels, open the **Cloudflare Pages project for `leafinfra.pages.dev` only** → **Settings → Variables and Secrets** and add these as **Production** environment variables/secrets:

| Variable | Purpose |
| --- | --- |
| `LEAD_EMAIL` | Business inbox that receives new enquiries |
| `RESEND_API_KEY` | Secret API key from Resend for email delivery |
| `LEAD_FROM_EMAIL` | Optional verified sender, e.g. `Leaf Infra <leads@your-verified-domain>` |
| `WHATSAPP_NUMBER` | Destination number to notify, international format; digits only |
| `WA_PHONE_NUMBER_ID` | WhatsApp Cloud API phone-number ID used to send notifications |
| `WA_ACCESS_TOKEN` | Secret Meta WhatsApp Cloud API access token |

After setting variables, trigger a new deployment. Configure the Resend sender using a verified domain for reliable production email. WhatsApp Cloud API setup must be completed in Meta, and outbound-message policy/template requirements may apply. Never place API keys or access tokens in `index.html` or commit them to GitHub.

The contact details and API credentials have not been supplied or configured by this repository change, so delivery will return a clear setup message until Cloudflare environment variables are added. This project is separate from `leafinfra.com`; do not change the production WordPress site.
