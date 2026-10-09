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
