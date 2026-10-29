import {labels,indiaToday,leadsCsv} from './admin-utils.mjs';
const $ = id => document.getElementById(id);
let page=1, rows=[], total=0, current=null, baseline='', listController, detailController;
const today=indiaToday();
function node(tag,text,cls) {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function date(value) {if(!value)return '—';return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(value.length===10 ? value+'T12:00:00+05:30' : value));}
function filterValues(){return new URLSearchParams(new FormData($('filters')));}
function due(l){return l.follow_up_date && l.follow_up_date<=today && !['won','lost'].includes(l.status);}
async function api(path,options={}) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Object.assign(Error('Sign in through Cloudflare Access, then reload this page.'),{code:'sign_in'});
  const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Request failed.'),{code:data.code,status:response.status});return data;
}
async function load() {
  listController?.abort();const controller=listController=new AbortController();
  $('notice').textContent='Loading enquiries…';$('notice').className='notice';$('refresh').disabled=true;
  try {
    const query=filterValues();query.set('page',page);
    const result=await api('/api/admin/leads?'+query,{signal:controller.signal});
    if(controller.signal.aborted)return;
    rows=result.leads;total=result.total;
    $('gate').hidden=true;$('workspace').hidden=false;$('account').textContent=result.adminEmail;
    const counts=Object.fromEntries(result.summary.map(row=>[row.status,row.count]));
    $('totalStat').textContent=result.summary.reduce((n,row)=>n+row.count,0);
    $('newStat').textContent=counts.new||0;$('dueStat').textContent=result.due;$('wonStat').textContent=counts.won||0;
    const closed=(counts.won||0)+(counts.lost||0);$('winRate').textContent=(closed ? Math.round((counts.won||0)/closed*100) : 0)+'% of closed enquiries';
    const selected=$('sourceFilter').value;$('sourceFilter').replaceChildren(new Option('All sources',''),...result.sources.map(source=>new Option(source,source)));
    $('sourceFilter').value=selected;
    renderRows();$('notice').textContent='';
  } catch(error) {
    if(error.name==='AbortError')return;
    $('notice').textContent=error.message;$('notice').className='notice error';
    $('workspace').hidden=true;$('gate').hidden=false;
    $('gateTitle').textContent=error.code==='setup_required' ? 'Connect your private workspace' : error.code==='sign_in' ? 'Sign in to your workspace' : 'Workspace temporarily unavailable';
    $('gateText').textContent=error.message;
  } finally {if(!controller.signal.aborted)$('refresh').disabled=false;}
}
function renderRows() {
  $('leadsBody').replaceChildren();$('filteredCount').textContent=total;
  rows.forEach(l=>{
    const tr=node('tr'),client=node('td'),open=node('button',l.name,'lead-open');open.type='button';open.addEventListener('click',()=>openLead(l.id));
    client.append(open,node('small',l.project_type));tr.append(client,node('td',l.location),node('td',l.lead_source));
    const status=node('td');status.append(node('span',labels[l.status]||l.status,'badge '+(labels[l.status]?l.status:'')));tr.append(status);
    tr.append(node('td',date(l.follow_up_date),due(l)?'due':''),node('td',date(l.created_at)));$('leadsBody').append(tr);
  });
  $('empty').hidden=rows.length>0;
  $('emptyText').textContent=[...filterValues().values()].some(Boolean) ? 'Try a different search or reset your filters.' : 'New website enquiries will appear here once the form is active.';
  $('pageInfo').textContent=total ? `${(page-1)*50+1}–${Math.min(page*50,total)} of ${total} enquiries` : '0 enquiries';
  $('prev').disabled=page===1;$('next').disabled=page*50>=total;$('export').disabled=!rows.length;
}
function snapshot(){return JSON.stringify({status:$('editStatus').value,notes:$('editNotes').value,followUpDate:$('editFollow').value||null});}
function canDiscard(){return !current || snapshot()===baseline || confirm('Discard your unsaved changes?');}
async function openLead(id) {
  detailController?.abort();const controller=detailController=new AbortController();
  $('notice').textContent='Opening enquiry…';
  try {
    const lead=(await api('/api/admin/leads/'+encodeURIComponent(id),{signal:controller.signal})).lead;
    if(controller.signal.aborted)return;
    current=lead;fillDetail(lead);if(!$('detail').open)$('detail').showModal();$('notice').textContent='';
  } catch(error){if(error.name!=='AbortError'){$('notice').textContent=error.message;$('notice').className='notice error';}}
}
function fillDetail(l) {
  $('detailTitle').textContent=l.name;$('detailMeta').textContent=`Received ${date(l.created_at)} · Ref ${l.id.slice(-8)}`;
  $('contactActions').replaceChildren();
    const rawDigits=l.phone.replace(/\D/g,'');const digits=rawDigits.length===10?'91'+rawDigits:rawDigits;
    const contacts=[['Call client','tel:+'+digits],...(digits.length===10 ? [['WhatsApp','https://wa.me/91'+digits]] : [['WhatsApp','https://wa.me/'+digits]])];
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email))contacts.push(['Email client','mailto:'+encodeURIComponent(l.email)]);
    contacts.forEach(([label,href])=>{const a=node('a',label);a.href=href;if(href.startsWith('https')){a.target='_blank';a.rel='noopener noreferrer';}$('contactActions').append(a);});
  let attribution={};try{attribution=JSON.parse(l.attribution||'{}');}catch{}
  $('leadDetails').replaceChildren();
  const fields=[['Project',l.project_type],['Location',l.location],['Area',l.area],['Phone',l.phone],['Email',l.email],['Source',attribution.utm_source||l.source],['Campaign',attribution.utm_campaign],['Consent version',l.consent_version],['Notification',l.notification_status]];
  fields.forEach(([key,value])=>{if(value)$('leadDetails').append(node('dt',key),node('dd',value));});
  $('leadMessage').textContent=l.message||'No additional project details.';
  $('editStatus').value=l.status;$('editNotes').value=l.notes||'';$('editFollow').value=l.follow_up_date||'';
  $('lastUpdated').textContent=l.updated_at ? `Last updated ${date(l.updated_at)} by ${l.updated_by}` : 'No team updates yet.';
  $('saveNotice').textContent='';$('save').disabled=false;baseline=snapshot();
}
$('editLead').addEventListener('submit',async event=>{
  event.preventDefault();if(!current)return;$('save').disabled=true;$('reloadLead').disabled=true;$('saveNotice').textContent='Saving…';
  const values=JSON.parse(snapshot());
  try {
    const result=await api('/api/admin/leads/'+encodeURIComponent(current.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,revision:current.revision})});
    Object.assign(current,{status:values.status,notes:values.notes.trim(),follow_up_date:values.followUpDate,revision:result.revision,updated_at:new Date().toISOString(),updated_by:$('account').textContent});
    fillDetail(current);$('saveNotice').textContent='Changes saved.';await load();
  } catch(error){$('saveNotice').textContent=error.message;}
  finally{$('save').disabled=false;$('reloadLead').disabled=false;}
});
$('reloadLead').addEventListener('click',()=>{if(canDiscard())openLead(current.id);});
$('closeDetail').addEventListener('click',()=>{if(!$('save').disabled && canDiscard()){$('detail').close();current=null;}});
$('detail').addEventListener('cancel',event=>{if($('save').disabled || !canDiscard())event.preventDefault();else current=null;});
window.addEventListener('beforeunload',event=>{if(current && snapshot()!==baseline){event.preventDefault();event.returnValue='';}});
$('filters').addEventListener('submit',event=>{event.preventDefault();page=1;load();});
$('clear').addEventListener('click',()=>{$('filters').reset();page=1;load();});
$('prev').addEventListener('click',()=>{page--;load();});$('next').addEventListener('click',()=>{page++;load();});
$('refresh').addEventListener('click',()=>load());
$('export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([leadsCsv(rows)],{type:'text/csv;charset=utf-8'}));
  const a=node('a');a.href=url;a.download=`leafinfra-leads-page-${page}-${today}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
load();
