const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const clean = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function notify(env, lead) {
  const message = [
    ['Reference', lead.id], ['Name', lead.name], ['Phone', lead.phone], ['Email', lead.email],
    ['Project type', lead.projectType], ['Location', lead.location], ['Approx. area', lead.area],
    ['Project details', lead.message], ['Received at', lead.createdAt]
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join('\n');
  const jobs = [];
  if (env.RESEND_API_KEY && env.LEAD_EMAIL && env.LEAD_FROM_EMAIL) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': lead.id },
      body: JSON.stringify({ from: env.LEAD_FROM_EMAIL, to: [env.LEAD_EMAIL],
        subject: `Leaf Infra enquiry — ${lead.projectType}`, text: message, reply_to: lead.email || undefined })
    }).then(response => { if (!response.ok) throw Error('Email rejected'); return 'email'; }));
  }
  // Business-initiated WhatsApp messages must use an approved Meta template.
  if (env.WA_ACCESS_TOKEN && env.WA_PHONE_NUMBER_ID && env.WHATSAPP_NUMBER && env.WA_TEMPLATE_NAME) {
    jobs.push(fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(env.WA_PHONE_NUMBER_ID)}/messages`, {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: env.WHATSAPP_NUMBER.replace(/\D/g, ''), type: 'template',
        template: { name: env.WA_TEMPLATE_NAME, language: { code: env.WA_TEMPLATE_LANGUAGE || 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }] } })
    }).then(response => { if (!response.ok) throw Error('WhatsApp rejected'); return 'whatsapp'; }));
  }
  const results = await Promise.allSettled(jobs);
  const delivered = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  await env.LEADS_DB.prepare('UPDATE leads SET notification_status = ? WHERE id = ?')
    .bind(!jobs.length ? 'not_configured' : delivered.length === jobs.length ? 'sent' : delivered.length ? 'partial' : 'failed', lead.id).run();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Request origin was not accepted.' }, 403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'Submit JSON form details.' }, 415);
  // Bound the stream before parsing, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Please submit form details.' }, 400);
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); return json({ error: 'Your enquiry is too long.' }, 413); }
    chunks.push(value);
  }
  let body;
  try { const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: 'Please submit valid form details.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Please submit valid form details.' }, 400);
  if (clean(body.website)) return json({ error: 'Your enquiry could not be accepted. Please call us.' }, 400);
  const lead = {
    id: clean(body.submissionId, 36), createdAt: new Date().toISOString(),
    name: clean(body.name, 120), phone: clean(body.phone, 40), email: clean(body.email, 200),
    projectType: clean(body.projectType, 120), location: clean(body.location, 160), area: clean(body.area, 100),
    message: clean(body.message, 3000), source: clean(body.source, 40) || 'website'
  };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead.id)) return json({ error: 'Refresh the page and try again.' }, 400);
  if (!lead.name || !lead.projectType || !lead.location || !/^[+0-9() .-]{8,25}$/.test(lead.phone) || lead.phone.replace(/\D/g, '').length < 8)
    return json({ error: 'Complete your name, valid phone, project type and location.' }, 400);
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (body.consent !== true) return json({ error: 'Please agree to being contacted about your enquiry.' }, 400);
  if (!env.LEADS_DB || !env.TURNSTILE_SECRET_KEY || !env.LEAD_RATE_SALT)
    return json({ error: 'Online enquiries are not active yet. Please call +91 93455 23646 or use WhatsApp.' }, 503);
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.LEAD_RATE_SALT + ip));
    const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const now = Math.floor(Date.now() / 1000);
    const limit = await env.LEADS_DB.prepare(`INSERT INTO submission_limits (fingerprint, window_start, count) VALUES (?, ?, 1)
      ON CONFLICT(fingerprint) DO UPDATE SET count = CASE WHEN window_start < ? THEN 1 ELSE count + 1 END,
      window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END RETURNING count`)
      .bind(fingerprint, now, now - 600, now - 600).first();
    if (!limit || limit.count > 5) return json({ error: 'Too many attempts. Please wait 10 minutes or call us.' }, 429);
    await env.LEADS_DB.prepare('DELETE FROM submission_limits WHERE window_start < ?').bind(now - 86400).run();
    const challenge = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: clean(body.turnstileToken, 2048), remoteip: ip })
    });
    const verification = await challenge.json();
    if (!verification.success || verification.hostname !== new URL(request.url).hostname || verification.action !== 'lead')
      return json({ error: 'Complete the security check and try again.' }, 400);
    const attribution = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) attribution[key] = clean(body.attribution?.[key], 200);
    const inserted = await env.LEADS_DB.prepare(`INSERT OR IGNORE INTO leads
      (id, created_at, name, phone, email, project_type, location, area, message, source, attribution, consent_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(lead.id, lead.createdAt, lead.name, lead.phone, lead.email, lead.projectType, lead.location, lead.area, lead.message,
        lead.source, JSON.stringify(attribution), '2026-10-28').run();
    if (inserted.meta?.changes) {
      const delivery = notify(env, lead).catch(() => console.error('Lead notification update failed', lead.id));
      if (context.waitUntil) context.waitUntil(delivery); else await delivery;
    }
    return json({ ok: true, reference: lead.id });
  } catch {
    return json({ error: 'We could not confirm your enquiry. Please retry or call +91 93455 23646.' }, 503);
  }
}
export const onRequestGet = () => json({ error: 'Use POST to submit an enquiry.' }, 405);
