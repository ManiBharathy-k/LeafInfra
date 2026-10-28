import {verifyAdmin, json} from '../../../server/admin.js';
export async function onRequest(context) {
  const auth = await verifyAdmin(context.request,context.env);
  if (auth.error) return auth.error;
  if (!context.env.LEADS_DB) return json({error:'The lead database is not connected.'},503);
  if (!['GET','PATCH'].includes(context.request.method)) return json({error:'Method not allowed.'},405);
  if (context.request.method !== 'GET') {
    if (context.request.headers.get('Origin') !== new URL(context.request.url).origin) return json({error:'Request origin was not accepted.'},403);
    if (!context.request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Submit JSON details.'},415);
  }
  context.data.adminEmail = auth.email;
  try { return await context.next(); }
  catch { return json({error:'Lead data is unavailable. Check the D1 binding and apply the admin migration.'},503); }
}
