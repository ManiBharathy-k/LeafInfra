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
  if (!reducedMotion.matches) start();
}
const projectType = new URLSearchParams(location.search).get('type');
const category = document.getElementById('d-type');
if (category && projectType && [...category.options].some(option=>option.value===projectType)) category.value=projectType;
