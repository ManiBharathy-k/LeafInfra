export function onRequestGet({ env }) {
  return Response.json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' }, {
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
