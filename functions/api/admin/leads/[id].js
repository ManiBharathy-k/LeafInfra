import {json, statuses} from '../../../../server/admin.js';
const validId = id => /^[0-9a-f-]{36}$/i.test(id);
export async function onRequestGet({env,params}) {
  if (!validId(params.id)) return json({error:'Lead not found.'},404);
  const lead = await env.LEADS_DB.prepare('SELECT * FROM leads WHERE id = ?').bind(params.id).first();
  return lead ? json({lead}) : json({error:'Lead not found.'},404);
}
export async function onRequestPatch({request,env,params,data}) {
  if (!validId(params.id)) return json({error:'Lead not found.'},404);
  const reader = request.body?.getReader(); if (!reader) return json({error:'Missing update.'},400);
  let size = 0; const chunks = [];
  while (true) {const {value,done} = await reader.read(); if (done) break; size += value.byteLength;
    if (size > 24000) {await reader.cancel();return json({error:'Notes are too long.'},413);} chunks.push(value);}
  let body;
  try {const bytes = new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    body=JSON.parse(new TextDecoder().decode(bytes));} catch {return json({error:'Invalid update.'},400);}
  if (!body || !statuses.includes(body.status) || typeof body.notes !== 'string' || body.notes.length > 5000 ||
    !Number.isSafeInteger(body.revision) || body.revision < 0 ||
    (body.followUpDate !== null && (typeof body.followUpDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.followUpDate) ||
      !Number.isFinite(Date.parse(body.followUpDate)) || new Date(body.followUpDate).toISOString().slice(0,10) !== body.followUpDate)))
    return json({error:'Choose a valid status and date. Notes must be under 5,000 characters.'},400);
  const result = await env.LEADS_DB.prepare(`UPDATE leads SET status = ?, notes = ?, follow_up_date = ?, updated_at = ?, updated_by = ?, revision = revision + 1
    WHERE id = ? AND revision = ?`).bind(body.status,body.notes.trim(),body.followUpDate,new Date().toISOString(),data.adminEmail,params.id,body.revision).run();
  if (!result.meta?.changes) {
    const existing = await env.LEADS_DB.prepare('SELECT id FROM leads WHERE id = ?').bind(params.id).first();
    return json({error:existing ? 'Someone updated this lead. Reload it before saving your changes.' : 'Lead not found.'},existing ? 409 : 404);
  }
  return json({ok:true,revision:body.revision+1});
}
