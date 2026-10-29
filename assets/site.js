function submissionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const PHONE = '+919345523646';
const forms = [...document.querySelectorAll('.lead-form')];
const attribution = Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].map(key => [key, new URLSearchParams(location.search).get(key) || '']));
// Events contain no enquiry fields. A consent-aware analytics adapter can listen later.
function track(name, form) {
  document.dispatchEvent(new CustomEvent('leafinfra:conversion', { detail: { name, form: form || undefined } }));
}
document.getElementById('year').textContent = new Date().getFullYear();
const toggle = document.getElementById('menuToggle'), nav = document.getElementById('navlinks');
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? '✕' : '☰'; });
function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = '☰'; }
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
document.querySelectorAll('.filter').forEach(button => {
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.project').forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
  });
});
const serviceOptions = { 'Residential construction':'Residential construction', 'Commercial construction':'Commercial construction', 'Institutional infrastructure':'Institutional infrastructure', 'Structural and RCC works':'Structural / RCC works', 'Turnkey project execution':'Turnkey project', 'Civil infrastructure works':'Civil infrastructure' };
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { document.getElementById('d-type').value = serviceOptions[link.dataset.service]; }));
document.querySelectorAll('[data-conversion]').forEach(link => link.addEventListener('click', () => track(link.dataset.conversion)));

forms.forEach((form, index) => {
  form.dataset.submissionId = submissionId();
  const fields = document.createElement('div'); fields.style.display = 'contents';
  fields.innerHTML = `<label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label class="consent"><input type="checkbox" name="consent" required><span>I agree to Leaf Infra contacting me about this project. Read the <a href="/privacy">privacy notice</a>.</span></label><div class="security-check" id="security-${index}"></div>`;
  const submit = form.querySelector('button[type="submit"]');
  const anchor = form.querySelector('.submit-wrap') || submit;
  anchor.before(fields);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (form.dataset.sending === 'true' || !form.reportValidity()) return;
    const status = form.querySelector('.form-status');
    function show(text) { status.textContent = text; status.classList.add('show'); }
    if (!form.dataset.widgetId) { show('Online enquiries are being prepared. Please call ' + PHONE + ' or use the WhatsApp link below.'); return; }
    const token = window.turnstile?.getResponse(form.dataset.widgetId);
    if (!token) { show('Please complete the security check.'); return; }
    const data = new FormData(form);
    const payload = Object.fromEntries(['name','phone','email','projectType','location','area','message','website'].map(key => [key, data.get(key) || '']));
    const brief = [['Land status','landStatus'],['Budget range','budget'],['Target start','timeline'],['Visual preference','concept']].map(([label,key]) => data.get(key) ? label + ': ' + data.get(key) : '').filter(Boolean).join('\n');
    payload.message = [payload.message, brief ? 'Project planning preferences\n' + brief : ''].filter(Boolean).join('\n\n');
    Object.assign(payload, { consent: data.get('consent') === 'on', source: form.dataset.form, attribution, submissionId: form.dataset.submissionId, turnstileToken: token });
    form.dataset.sending = 'true'; submit.disabled = true; form.setAttribute('aria-busy', 'true');
    const label = submit.textContent; submit.textContent = 'Sending enquiry…';
    let progress; const startedAt = performance.now();
    try { progress = (await import('/assets/submission.mjs')).constructionProgress(); } catch { /* Inline status remains available if the visual cannot load. */ }
    show('Saving your enquiry securely…');
    try {
      const response = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal:AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw Error(result.error || 'We could not confirm your enquiry. Please retry or call us.');
      show('Thank you. Your enquiry has been saved. Our team will contact you about your project. Reference: ' + result.reference);
      track('generate_lead', form.dataset.form);
      try { sessionStorage.setItem('leafinfra:last-enquiry', JSON.stringify({reference:result.reference, savedAt:Date.now()})); } catch { /* Saving the lead does not depend on browser storage. */ }
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - (performance.now() - startedAt))));
      progress?.complete(); form.reset(); form.dataset.submissionId = submissionId();
      await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400));
      location.assign('/thank-you');
    } catch (error) { show(error.name === 'TimeoutError' ? 'The connection timed out. Retry to confirm the same enquiry, or call us.' : error.message === 'Failed to fetch' ? 'Connection unavailable. Retry or call ' + PHONE : error.message); }
    finally { progress?.close(); window.turnstile?.reset(form.dataset.widgetId); form.dataset.sending = 'false'; form.removeAttribute('aria-busy'); submit.disabled = false; submit.textContent = label; }
  });
});
async function setupSecurity() {
  try {
    const response = await fetch('/api/config'); if (!response.ok) return;
    const { turnstileSiteKey } = await response.json(); if (!turnstileSiteKey) return;
    window.leafSecurityReady = () => forms.forEach((form, index) => {
      const id = window.turnstile.render('#security-' + index, { sitekey:turnstileSiteKey, action:'lead', size:'flexible' });
      form.dataset.widgetId = String(id);
    });
    const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=leafSecurityReady&render=explicit'; script.async = true; document.head.append(script);
  } catch { /* Direct contact links remain available when setup is incomplete. */ }
}
setupSecurity();
