import {onRequestGet as getLead, onRequestPatch as patchLead} from './leads/[id].js';
import {json, filters} from '../../../server/admin.js';
export async function onRequestGet(context) {
  const {request,env,data} = context;
  const url = new URL(request.url);
  if (url.searchParams.has('id')) return getLead({...context, params:{id:url.searchParams.get('id')}});
  let filter;
  try {filter = filters(url);} catch {return json({error:'Invalid search filters.'},400);}
  const page = Number(url.searchParams.get('page') || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) return json({error:'Invalid page.'},400);
  const result = await env.LEADS_DB.batch([
    env.LEADS_DB.prepare(`SELECT id, created_at, name, phone, email, project_type, location, status, follow_up_date, revision,
      COALESCE(NULLIF(json_extract(attribution, '$.utm_source'), ''), source) AS lead_source
      FROM leads${filter.where} ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ?`).bind(...filter.values,(page-1)*50),
    env.LEADS_DB.prepare(`SELECT COUNT(*) AS total FROM leads${filter.where}`).bind(...filter.values),
    env.LEADS_DB.prepare('SELECT status, COUNT(*) AS count FROM leads GROUP BY status'),
    env.LEADS_DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE follow_up_date <= date('now', '+5 hours', '+30 minutes') AND status NOT IN ('won','lost')"),
    env.LEADS_DB.prepare("SELECT DISTINCT COALESCE(NULLIF(json_extract(attribution, '$.utm_source'), ''), source) AS source FROM leads ORDER BY source")
  ]);
  return json({leads:result[0].results,total:result[1].results[0].total,summary:result[2].results,due:result[3].results[0].count,
    sources:result[4].results.map(row=>row.source),page,pageSize:50,adminEmail:data.adminEmail});
}

export async function onRequestPatch(context) {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return json({error:'Choose an enquiry to update.'},400);
  return patchLead({...context, params:{id}});
}
