import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/leads.js';
const base = { submissionId:'0d256540-22eb-43ae-a111-ea8be5421111', name:'Test Client', phone:'9345523646', projectType:'Residential construction', location:'Chennai', consent:true, turnstileToken:'test' };
function context(payload = base, overrides = {}) {
  return { request:new Request('https://leafinfra.com/api/leads', { method:'POST', headers:{Origin:'https://leafinfra.com','Content-Type':'application/json'}, body:JSON.stringify(payload) }), env:{}, ...overrides };
}
function db({ changes = 1, rate = 1, fail = false } = {}) {
  const writes = [];
  return { writes, prepare(sql) { return { bind(...values) { return {
    async first() { return { count:rate }; },
    async run() { if (fail) throw Error('Database unavailable'); writes.push({sql,values}); return { meta:{changes} }; }
  }; } }; } };
}
const validEnv = LEADS_DB => ({ LEADS_DB, TURNSTILE_SECRET_KEY:'test', LEAD_RATE_SALT:'test' });
test('rejects cross-origin and missing origin', async () => {
  for (const origin of ['https://attacker.example', '']) {
    const c = context(); c.request.headers.set('Origin', origin); assert.equal((await onRequestPost(c)).status,403);
  }
});
test('validates required values, consent, phone, JSON shape and honeypot', async () => {
  for (const payload of [null, [], {...base,name:''}, {...base,phone:'--------'}, {...base,consent:false}, {...base,website:'spam'}, {...base,email:'bad'}, {...base,location:''}])
    assert.equal((await onRequestPost(context(payload))).status,400);
});
test('unconfigured endpoint never reports success', async () => assert.equal((await onRequestPost(context())).status,503));
test('bounds body size', async () => assert.equal((await onRequestPost(context({...base,message:'x'.repeat(17000)}))).status,413));
test('saves enquiry and consent without storing raw IP, then confirms', async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => Response.json({success:true,hostname:'leafinfra.com',action:'lead'});
  try {
    const database = db(); const tasks = [];
    const response = await onRequestPost(context({...base,attribution:{utm_source:'google'}}, {env:validEnv(database),waitUntil:p => tasks.push(p)}));
    assert.equal(response.status,200); assert.equal((await response.json()).reference,base.submissionId); await Promise.all(tasks);
    const insert = database.writes.find(w => w.sql.includes('INSERT OR IGNORE INTO leads'));
    assert.ok(insert); assert.ok(insert.values.includes('2026-10-28')); assert.ok(insert.values.some(v => typeof v === 'string' && v.includes('google')));
    assert.ok(database.writes.some(w => w.values.includes('not_configured')));
  } finally { globalThis.fetch = original; }
});
test('challenge hostname/action must match', async () => {
  const original = globalThis.fetch;
  try { for (const result of [{success:false},{success:true,hostname:'wrong',action:'lead'},{success:true,hostname:'leafinfra.com',action:'login'}]) {
    globalThis.fetch = async () => Response.json(result); const database = db();
    assert.equal((await onRequestPost(context(base,{env:validEnv(database)}))).status,400);
    assert.ok(!database.writes.some(w => w.sql.includes('INSERT OR IGNORE')));
  } } finally { globalThis.fetch = original; }
});
test('rate limit enforced before challenge and storage', async () => assert.equal((await onRequestPost(context(base,{env:validEnv(db({rate:6}))}))).status,429));
test('database failure never confirms receipt', async () => assert.equal((await onRequestPost(context(base,{env:validEnv(db({fail:true}))}))).status,503));
test('duplicate submission does not resend notifications', async () => {
  const original = globalThis.fetch; let count = 0;
  globalThis.fetch = async () => { count++; return Response.json({success:true,hostname:'leafinfra.com',action:'lead'}); };
  try { const database = db({changes:0}); const tasks = [];
    assert.equal((await onRequestPost(context(base,{env:validEnv(database),waitUntil:p => tasks.push(p)}))).status,200);
    assert.equal(tasks.length,0); assert.equal(count,1);
  } finally { globalThis.fetch = original; }
});
test('notification failure preserves the saved lead and records failure', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes('siteverify') ? Response.json({success:true,hostname:'leafinfra.com',action:'lead'}) : new Response('',{status:500});
  try { const database = db(); const tasks = [];
    const env = {...validEnv(database),RESEND_API_KEY:'test',LEAD_EMAIL:'test@example.com',LEAD_FROM_EMAIL:'verified@example.com'};
    assert.equal((await onRequestPost(context(base,{env,waitUntil:p => tasks.push(p)}))).status,200); await Promise.all(tasks);
    assert.ok(database.writes.some(w => w.sql.startsWith('UPDATE leads') && w.values[0] === 'failed'));
  } finally { globalThis.fetch = original; }
});
