// Access JWTs are verified at the origin; client-supplied identity headers alone are never trusted.
const keyCache = new Map();
export const statuses = ['new', 'contacted', 'site_visit', 'quote_sent', 'won', 'lost'];
export const json = (body, status = 200) => Response.json(body, {status, headers:{
  'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'X-Robots-Tag':'noindex, nofollow', 'Vary':'Cookie, Cf-Access-Jwt-Assertion'
}});
const decode = part => Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
export async function verifyAdmin(request, env) {
  const team = env.ACCESS_TEAM_DOMAIN;
  if (!team || !/^[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/.test(team) || !env.ACCESS_AUD)
    return {error:json({error:'Admin sign-in has not been configured.', code:'setup_required'},503)};
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16384) return {error:json({error:'Sign in through Cloudflare Access to continue.',code:'sign_in'},401)};
  try {
    const parts = token.split('.'); if (parts.length !== 3) throw Error();
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const now = Math.floor(Date.now()/1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit ||
      claims.iss !== `https://${team}` || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD) ||
      !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 30 ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) ||
      claims.type !== 'app' || typeof claims.email !== 'string' || !claims.email.includes('@')) throw Error();
    let cached = keyCache.get(team);
    if (!cached || cached.expires < Date.now()) {
      const response = await fetch(`https://${team}/cdn-cgi/access/certs`,{signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw Error();
      const jwks = await response.json();
      if (!Array.isArray(jwks.keys)) throw Error();
      cached = {keys:jwks.keys, expires:Date.now()+300000}; keyCache.set(team,cached);
    }
    const jwk = cached.keys.find(key => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) throw Error();
    const key = await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))) throw Error();
    return {email:claims.email};
  } catch { return {error:json({error:'Your admin session could not be verified. Sign in again.',code:'sign_in'},401)}; }
}
export function filters(url) {
  const query = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.get('status') || '';
  const source = url.searchParams.get('source') || '';
  const follow = url.searchParams.get('follow') || '';
  if (query.length > 120 || source.length > 200 || (status && !statuses.includes(status)) || (follow && follow !== 'due')) throw Error('Invalid filters.');
  const clauses = [], values = [];
  if (query) {clauses.push("(name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\')");
    const term = '%'+query.replace(/[\\%_]/g,'\\$&')+'%'; values.push(term,term,term,term);}
  if (status) {clauses.push('status = ?');values.push(status);}
  if (source) {clauses.push("COALESCE(NULLIF(json_extract(attribution, '$.utm_source'), ''), source) = ?");values.push(source);}
  if (follow) clauses.push("follow_up_date <= date('now', '+5 hours', '+30 minutes') AND follow_up_date IS NOT NULL AND status NOT IN ('won','lost')");
  return {where:clauses.length ? ' WHERE '+clauses.join(' AND ') : '', values};
}
