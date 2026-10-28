import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest as middleware} from '../functions/api/admin/_middleware.js';
import {onRequestGet as list} from '../functions/api/admin/leads.js';
import {onRequestGet as detail,onRequestPatch as update} from '../functions/api/admin/leads/[id].js';
import {verifyAdmin} from '../server/admin.js';
import {leadsCsv} from '../assets/admin-utils.mjs';
const id='0d256540-22eb-43ae-a111-ea8be5421111';
function database(){
  const sqlite=new DatabaseSync(':memory:');
  for(const path of ['0001_leads.sql','0002_admin.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+path,import.meta.url),'utf8'));
  const db={prepare(sql){return {bind(...values){return {async all(){return {results:sqlite.prepare(sql).all(...values)};},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return {meta:sqlite.prepare(sql).run(...values)};}};},async all(){return {results:sqlite.prepare(sql).all()};}};},async batch(statements){return Promise.all(statements.map(s=>s.all()));}};
  sqlite.prepare(`INSERT INTO leads(id,created_at,name,phone,email,project_type,location,area,message,source,attribution,consent_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,new Date().toISOString(),'Example Client','9345523646','test@example.invalid','Villa','Chennai','4000','A courtyard villa','website','{"utm_source":"google"}','2026-10-28');
  return {db,sqlite};
}
const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key'};
const team='leafinfra-admin-test.cloudflareaccess.com';const config={ACCESS_TEAM_DOMAIN:team,ACCESS_AUD:'test-audience'};
async function token(overrides={},header={}){
  const now=Math.floor(Date.now()/1000);const claims={iss:'https://'+team,aud:['test-audience'],email:'admin@example.invalid',exp:now+600,iat:now,type:'app',...overrides};
  const text=b64({alg:'RS256',kid:'test-key',...header})+'.'+b64(claims);
  return text+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(text))).toString('base64url');
}
async function context(db,{method='GET',path='/api/admin/leads',body,assertion,origin='https://leafinfra.example'}={}){
  const request=new Request('https://leafinfra.example'+path,{method,headers:{'Cf-Access-Jwt-Assertion':assertion||await token(),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {request,env:{...config,LEADS_DB:db},data:{},params:{id}};
}
async function route(c,handler){c.next=()=>handler(c);return middleware(c);}
test('admin auth fails closed before database access when missing, forged, expired or wrong audience',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
  try{
    assert.equal((await verifyAdmin(new Request('https://site.example'),{})).error.status,503);
    assert.equal((await verifyAdmin(new Request('https://site.example'),config)).error.status,401);
    for(const assertion of ['forged',await token({exp:1}),await token({aud:['other']}),await token({iss:'https://attacker.example'}),await token({}, {alg:'none'}),await token({email:undefined}),await token({nbf:9999999999}),await token({type:'service'})]){
      const c=await context(null,{assertion});let called=false;c.next=()=>{called=true;throw Error();};assert.equal((await middleware(c)).status,401);assert.equal(called,false);
    }
    const valid=await token();const parts=valid.split('.');parts[1]=b64({iss:'https://'+team,aud:['test-audience'],email:'attacker@example.invalid',exp:9999999999,iat:1,type:'app'});
    assert.equal((await verifyAdmin(new Request('https://site.example',{headers:{'Cf-Access-Jwt-Assertion':parts.join('.')}}),config)).error.status,401);
  }finally{globalThis.fetch=original;}
});
test('authenticated admin can list, filter, open and update a real SQLite lead, with conflict and CSRF protection',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});const {db,sqlite}=database();
  try{
    let response=await route(await context(db),list);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
    let result=await response.json();assert.equal(result.total,1);assert.equal(result.leads[0].lead_source,'google');assert.equal(result.adminEmail,'admin@example.invalid');
    result=await (await route(await context(db,{path:'/api/admin/leads?q=Chennai&source=google&status=new'}),list)).json();assert.equal(result.total,1);
    for(const q of ['%','_','" OR 1=1 --']){result=await (await route(await context(db,{path:'/api/admin/leads?q='+encodeURIComponent(q)}),list)).json();assert.equal(result.total,0);}
    response=await route(await context(db,{path:'/api/admin/leads?page=0'}),list);assert.equal(response.status,400);
    response=await route(await context(db,{path:'/api/admin/leads/'+id}),detail);assert.equal((await response.json()).lead.message,'A courtyard villa');
    const body={status:'contacted',notes:'Discuss courtyard design',followUpDate:'2026-10-29',revision:0};
    response=await route(await context(db,{method:'PATCH',body,origin:'https://attacker.example'}),update);assert.equal(response.status,403);
    response=await route(await context(db,{method:'PATCH',body}),update);assert.equal(response.status,200);
    const saved=sqlite.prepare('SELECT * FROM leads WHERE id=?').get(id);assert.equal(saved.status,'contacted');assert.equal(saved.notes,body.notes);assert.equal(saved.follow_up_date,body.followUpDate);assert.equal(saved.updated_by,'admin@example.invalid');assert.equal(saved.revision,1);
    response=await route(await context(db,{method:'PATCH',body}),update);assert.equal(response.status,409);
    for(const changes of [{status:'invalid'},{followUpDate:'2026-02-31'},{notes:'x'.repeat(5001)},{revision:-1}]){
      response=await route(await context(db,{method:'PATCH',body:{...body,revision:1,...changes}}),update);assert.equal(response.status,400);
    }
    response=await route(await context(db,{method:'PATCH',body:{...body,revision:1,notes:'',followUpDate:null}}),update);assert.equal(response.status,200);assert.equal(sqlite.prepare('SELECT follow_up_date FROM leads').get().follow_up_date,null);
    response=await route(await context(db,{path:'/api/admin/leads?status=contacted'}),list);assert.equal((await response.json()).total,1);
    const c=await context(db);c.params.id='00000000-0000-4000-8000-000000000000';response=await route(c,detail);assert.equal(response.status,404);
  }finally{globalThis.fetch=original;sqlite.close();}
});
test('CSV escapes quotes and neutralises spreadsheet formulas in untrusted lead fields',()=>{
  const csv=leadsCsv([{name:'=HYPERLINK("evil")',phone:'+919345523646',email:' \t@command',location:'Chennai, India',status:'new'}]);
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));assert.ok(csv.includes('"\'+919345523646"'));assert.ok(csv.includes('"\' \t@command"'));assert.ok(csv.includes('"Chennai, India"'));
});

test('website enquiry is persisted, visible in the admin inbox and available for follow-up',async()=>{
  const {onRequestPost}=await import('../functions/api/leads.js');
  const {db,sqlite}=database();sqlite.exec('DELETE FROM leads');
  const original=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('siteverify') ? Response.json({success:true,hostname:'leafinfra.example',action:'lead'}) : Response.json({keys:[jwk]});
  try{
    const tasks=[];const c=await context(db,{method:'POST',path:'/api/leads',body:{submissionId:id,name:'New Villa Client',phone:'9345523646',projectType:'Villa construction',location:'Chennai',consent:true,turnstileToken:'test',attribution:{utm_source:'instagram'}}});
    c.env.TURNSTILE_SECRET_KEY='test';c.env.LEAD_RATE_SALT='test';c.waitUntil=p=>tasks.push(p);
    const saved=await onRequestPost(c);assert.equal(saved.status,200);await Promise.all(tasks);
    const inbox=await (await route(await context(db),list)).json();assert.equal(inbox.total,1);assert.equal(inbox.leads[0].name,'New Villa Client');assert.equal(inbox.leads[0].lead_source,'instagram');assert.equal(inbox.leads[0].revision,0);
    const response=await route(await context(db,{method:'PATCH',body:{status:'site_visit',notes:'Arrange a visit',followUpDate:'2026-11-01',revision:0}}),update);assert.equal(response.status,200);
    const opened=await (await route(await context(db),detail)).json();assert.equal(opened.lead.notes,'Arrange a visit');assert.equal(opened.lead.notification_status,'not_configured');
  }finally{globalThis.fetch=original;sqlite.close();}
});
