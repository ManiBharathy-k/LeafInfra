import { geometry, project } from './villa-geometry.mjs';
const root=document.querySelector('[data-villa-studio]');
if(root){
 const canvas=root.querySelector('canvas'), fallback=root.querySelector('.model-fallback'), ctx=canvas.getContext('2d');
 let yaw=-.65,pitch=.47,zoom=1,mode='finished',level='exterior',view='model',dragging=false,lastX=0,lastY=0,ready=false;
 const status=root.querySelector('.studio-status');
 function tint(hex,factor){const n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,(n>>8)&255,n&255].map(c=>Math.round(c*factor)).join(',')})`;}
 function draw(){
  if(!ctx||view!=='model')return;
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#eff5fc';ctx.fillRect(0,0,w,h);
  const scale=Math.min(w/19,h/15)*zoom,cx=w/2,cy=h*.71;
  ctx.strokeStyle='#d7e4f2';ctx.lineWidth=.6;
  for(let i=-12;i<=12;i++){
   const a=project([i,-.4,-12],yaw,pitch,scale,cx,cy),b=project([i,-.4,12],yaw,pitch,scale,cx,cy);
   const c=project([-12,-.4,i],yaw,pitch,scale,cx,cy),d=project([12,-.4,i],yaw,pitch,scale,cx,cy);
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();
  }
  const faces=geometry(mode,level).map(face=>({...face,vertices:face.points.map(p=>project(p,yaw,pitch,scale,cx,cy))}));
  faces.forEach(face=>face.depth=face.vertices.reduce((s,p)=>s+p.depth,0)/4);faces.sort((a,b)=>a.depth-b.depth);
  faces.forEach(face=>{ctx.beginPath();face.vertices.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=tint(face.color,face.shade);ctx.fill();ctx.strokeStyle='#243b532b';ctx.lineWidth=.55;ctx.stroke();});
  if(!ready){ready=true;fallback.hidden=true;canvas.hidden=false;}
 }
 function update(){
  root.querySelectorAll('[data-model-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modelMode===mode)));
  root.querySelectorAll('[data-model-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modelLevel===level)));
  root.querySelectorAll('[data-studio-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studioView===view)));
  root.querySelector('.model-display').hidden=view!=='model';root.querySelector('.blueprint-display').hidden=view!=='plan';
  root.querySelector('.model-options').hidden=view!=='model';root.querySelector('.plan-options').hidden=view!=='plan';
  status.textContent=view==='model'?`${mode==='finished'?'Finished exterior':'Structural frame'} · ${level==='exterior'?'All floors':level==='ground'?'Ground-floor cutaway':'First-floor cutaway'}`:'Concept floor plan · Not to scale';
  draw();
 }
 canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-lastX)*.009;pitch=Math.max(.15,Math.min(.95,pitch+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY;draw();});
 const release=()=>dragging=false;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch=Math.min(.95,pitch+.08);if(e.key==='ArrowDown')pitch=Math.max(.15,pitch-.08);if(e.key==='+')zoom=Math.min(1.5,zoom+.1);if(e.key==='-')zoom=Math.max(.65,zoom-.1);draw();});
 root.querySelectorAll('[data-model-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.modelMode;update();}));
 root.querySelectorAll('[data-model-level]').forEach(b=>b.addEventListener('click',()=>{level=b.dataset.modelLevel;update();}));
 root.querySelectorAll('[data-studio-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.studioView;update();}));
 root.querySelectorAll('[data-rotate]').forEach(b=>b.addEventListener('click',()=>{yaw+=Number(b.dataset.rotate);draw();}));
 root.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{zoom=Math.max(.65,Math.min(1.5,zoom+Number(b.dataset.zoom)));draw();}));
 root.querySelector('[data-reset-model]').addEventListener('click',()=>{yaw=-.65;pitch=.47;zoom=1;mode='finished';level='exterior';update();});
 root.querySelectorAll('[data-plan-floor]').forEach(b=>b.addEventListener('click',()=>{
  root.querySelectorAll('[data-plan-floor]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));
  root.querySelectorAll('[data-floor-plan]').forEach(plan=>plan.hidden=plan.dataset.floorPlan!==b.dataset.planFloor);
 }));
 if(ctx){canvas.hidden=false;new ResizeObserver(draw).observe(canvas);update();}
 else{status.textContent='Interactive canvas unavailable. Explore the concept floor plans or view the illustration.';root.querySelector('[data-studio-view="plan"]').click();}
}
