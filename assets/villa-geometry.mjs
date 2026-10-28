// Original concept geometry; units are illustrative, not building dimensions.
export function box(x,y,z,w,h,d,color,group='shell') {
 const v=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]];
 return [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]].map((ids,i)=>({points:ids.map(n=>v[n]),color,shade:[.83,.95,.7,1,.98,.65][i],group}));
}
export function project(point,yaw,pitch,scale,cx,cy) {
 const [x,y,z]=point, a=x*Math.cos(yaw)-z*Math.sin(yaw), b=x*Math.sin(yaw)+z*Math.cos(yaw);
 return {x:cx+a*scale,y:cy+(-y*Math.cos(pitch)+b*Math.sin(pitch))*scale,depth:b*Math.cos(pitch)+y*Math.sin(pitch)};
}
export function geometry(mode='finished',level='exterior') {
 const mesh=[]; const add=(...args)=>mesh.push(...box(...args));
 add(-7,-.35,-5.5,14,.3,11,'#e8edf3','site');
 add(-4.8,0,-3.8,9.6,.3,7.6,'#cbd5e1','foundation');
 const floors=level==='ground'?[0]:level==='first'?[1]:[0,1];
 for(const f of floors) {
  const y=.3+f*3.25;
  add(-4.3,y,-3.2,8.6,.22,6.4,'#f4f7fa','slab');
  for(const x of [-4,0,4])for(const z of [-3,3])add(x,y,z,.26,3,.26,'#b6c4d4','frame');
  for(const z of [-3,3])add(-4,y+2.8,z,8.3,.3,.3,'#a9bacd','frame');
  for(const x of [-4,4])add(x,y+2.8,-3,.3,.3,6.3,'#b4c2d1','frame');
  if(mode==='structure')continue;
  add(-4,y+.22,-3,8,.8,.18,'#f3eee3');
  add(-4,y+2.25,-3,8,.55,.18,'#f3eee3');
  add(-4,y+.22,-3,.18,2.7,6,'#ece5d7');
  add(3.85,y+.22,-3,.18,2.7,6,'#e4dccb');
  add(-4,y+.22,2.9,2.3,2.7,.18,'#f3eee3');
  add(.5,y+.22,2.9,3.5,.7,.18,'#f3eee3');
  add(.5,y+2.25,2.9,3.5,.65,.18,'#f3eee3');
  // Transparent-looking glazing uses opaque muted blue panels for clear mobile rendering.
  add(-3.6,y+1.03,-3.03,7.2,1.2,.05,'#7295ae','glazing');
  add(.6,y+.95,3,3.2,1.25,.05,'#577f9a','glazing');
  add(-1.45,y+.23,3,1.65,2.55,.07,'#9c7656','door');
  if(level!=='exterior'){
   add(-.1,y+.22,-2.7,.12,1.1,5.3,'#cbd5e1','partition');
   add(-3.8,y+.22,-.25,3.6,1.1,.12,'#cbd5e1','partition');
  }
  if(f===1){
   add(-4.3,y+.22,3.05,8.6,.18,1.15,'#d7e1eb','balcony');
   add(-4.25,y+.4,4.1,8.5,.8,.06,'#7a9bb3','balcony');
   for(let x=2.4;x<3.7;x+=.22)add(x,y+.35,3.1,.09,2.5,.18,'#a78056','screen');
  }
 }
 if(level==='exterior') {
  add(-4.5,6.65,-3.4,9,.25,7.9,mode==='structure'?'#afc0d4':'#ebdfc9','roof');
  if(mode==='finished'){
   add(-4.3,6.9,-3.2,8.6,.4,.14,'#f7f3ea','parapet');
   add(-4.3,6.9,-3.2,.14,.4,6.8,'#f7f3ea','parapet');
  }
 }
 add(-6,.02,4.3,12,.05,.8,'#d2dfce','garden');
 add(-6,.05,-4.5,.65,1.1,9,'#91aa83','garden');
 add(5.2,.05,-4.5,.65,.65,9,'#9db58a','garden');
 add(-1.6,.05,4.1,3.2,.14,1.15,'#e3ddd1','entry');
 return mesh;
}
