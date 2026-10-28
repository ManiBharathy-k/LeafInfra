const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reveals = [...document.querySelectorAll('.reveal')];
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold:0.08 });
  document.documentElement.classList.add('js-motion');
  reveals.forEach(el => observer.observe(el));
}
const panel = document.querySelector('.build-panel');
if (panel) {
  const parts = [...panel.querySelectorAll('[data-build-part]')];
  const buttons = [...panel.querySelectorAll('[data-build-stage]')];
  const play = panel.querySelector('#playBuild');
  const label = panel.querySelector('#build-stage-label');
  const names = ['01 — Groundwork','02 — Ground-floor structure','03 — Upper floor','04 — Roof & envelope','05 — Finishing & landscape'];
  let timer, playing = false, stage = 4;
  function show(next) {
    stage = next;
    parts.forEach((part, i) => part.classList.toggle('not-built', i > next));
    buttons.forEach((button,i) => button.setAttribute('aria-pressed', String(i === next)));
    label.textContent = names[next];
  }
  function stop() { clearTimeout(timer); playing=false; play.textContent='Replay ↺'; play.setAttribute('aria-label','Replay construction animation'); }
  function advance() {
    if (!playing) return;
    if (stage >= 4) { stop(); return; }
    show(stage + 1); timer=setTimeout(advance,1600);
  }
  function start() {
    stop(); playing=true; show(0); play.textContent='Pause Ⅱ'; play.setAttribute('aria-label','Pause construction animation');
    timer=setTimeout(advance,1600);
  }
  buttons.forEach((button,i) => button.addEventListener('click',() => { stop(); show(i); }));
  play.addEventListener('click',()=> playing ? stop() : start());
  reducedMotion.addEventListener('change',()=> { if (reducedMotion.matches) { stop(); show(4); } });
  document.addEventListener('visibilitychange',()=> { if (document.hidden) stop(); });
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const buildObserver = new IntersectionObserver(entries=> {
      if(entries.some(entry=>entry.isIntersecting)) { start();buildObserver.disconnect(); }
    },{threshold:0.25});
    buildObserver.observe(panel);
  }
}
const projectType = new URLSearchParams(location.search).get('type');
const category = document.getElementById('d-type');
if (category && projectType && [...category.options].some(option=>option.value===projectType)) category.value=projectType;

// The visual inspiration gallery uses tabs, without automatic slide rotation.
const conceptTabs = [...document.querySelectorAll('[data-concept-tab]')];
function selectConcept(index) {
 conceptTabs.forEach((tab,i)=> { tab.setAttribute('aria-selected',String(i===index)); tab.tabIndex=i===index?0:-1; document.getElementById('concept-panel-'+i).hidden=i!==index; });
}
conceptTabs.forEach((tab,index)=> {
 tab.addEventListener('click',()=>selectConcept(index));
 tab.addEventListener('keydown',event=> {
  let next=index;
  if(event.key==='ArrowRight')next=(index+1)%conceptTabs.length;
  else if(event.key==='ArrowLeft')next=(index-1+conceptTabs.length)%conceptTabs.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=conceptTabs.length-1;
  else return;
  event.preventDefault();selectConcept(next);conceptTabs[next].focus();
 });
});
const detailCopy={
 entrance:['01 / Arrival','An entrance with a purpose.','Discuss how people arrive, where vehicles stop, and how the entrance connects to family living spaces. Double-height areas also affect structure, finishes and service coordination.'],
 terraces:['02 / Outdoor living','More than an extra floor.','Shaded terraces can extend family living outdoors. Discuss privacy, access, drainage, waterproofing and maintenance as part of the design and construction scope.'],
 facade:['03 / Material palette','A considered material story.','Stone, plaster and timber-toned elements create different visual effects and maintenance needs. Agree the actual products, finish details and installation scope before work begins.']
};
document.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{
 const [number,title,description]=detailCopy[button.dataset.detail];
 document.getElementById('detail-number').textContent=number;document.getElementById('detail-title').textContent=title;document.getElementById('detail-description').textContent=description;
 document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
const preference = document.getElementById('d-preference');
const concept = new URLSearchParams(location.search).get('concept');
if(preference && concept && [...preference.options].some(option=>option.value===concept))preference.value=concept;
