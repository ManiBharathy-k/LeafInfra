import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const script=readFileSync(new URL('../assets/site.js',import.meta.url),'utf8');
function harness(response) {
  let submitHandler,redirect=null;const storage=new Map(),events=[];
  const classes={add(){},remove(){},toggle(){return false;}};
  const button={disabled:false,textContent:'Send enquiry',before(){}};
  const status={textContent:'',classList:classes};
  const form={dataset:{widgetId:'test-widget',form:'contact'},reportValidity:()=>true,setAttribute(){},removeAttribute(){},reset(){},
    querySelector:selector=>selector==='button[type="submit"]'?button:selector==='.form-status'?status:null,
    addEventListener(name,handler){if(name==='submit')submitHandler=handler;}};
  const nav={classList:classes,querySelectorAll:()=>[]};
  const document={querySelectorAll:selector=>selector==='.lead-form'?[form]:[],getElementById:id=>id==='navlinks'?nav:{setAttribute(){},addEventListener(){}},
    addEventListener(){},dispatchEvent:event=>events.push(event),createElement:()=>({style:{}}),head:{append(){}}};
  const context={document,crypto:webcrypto,URLSearchParams,location:{search:'',assign:url=>redirect=url},performance,
    FormData:class{get(key){return {name:'Test Client',phone:'9345523646',projectType:'Villa',location:'Chennai',consent:'on'}[key]||'';}},
    sessionStorage:{setItem:(key,value)=>storage.set(key,value)},CustomEvent:class{constructor(name,options){this.name=name;this.detail=options.detail;}},
    window:{turnstile:{getResponse:()=> 'test-token',reset(){}}},AbortSignal,matchMedia:()=>({matches:true}),setTimeout:callback=>{callback();},
    fetch:async url=>url==='/api/config'?Response.json({turnstileSiteKey:''}):response()};
  vm.runInNewContext(script,context);
  return {submit:()=>submitHandler({preventDefault(){}}),status,button,storage,events,get redirect(){return redirect;}};
}
test('successful enquiry stores only a reference and redirects to thank-you after server confirmation',async()=>{
  const reference='0d256540-22eb-43ae-a111-ea8be5421111';const h=harness(()=>Response.json({ok:true,reference}));await h.submit();
  assert.equal(h.redirect,'/thank-you');const receipt=JSON.parse(h.storage.get('leafinfra:last-enquiry'));
  assert.equal(receipt.reference,reference);assert.deepEqual(Object.keys(receipt).sort(),['reference','savedAt']);assert.ok(h.events.some(e=>e.detail.name==='generate_lead'));
});
test('failed enquiry stays on the form, preserves retry controls and never stores a success receipt',async()=>{
  const h=harness(()=>Response.json({error:'Database temporarily unavailable.'},{status:503}));await h.submit();
  assert.equal(h.redirect,null);assert.equal(h.storage.size,0);assert.equal(h.button.disabled,false);assert.equal(h.button.textContent,'Send enquiry');assert.match(h.status.textContent,/Database temporarily unavailable/);
});
