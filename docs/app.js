(function(){
const app=document.getElementById('app');
const TYPES=[['HOLE IN ONE','Hole-in-one'],['ALBATROS','Albatros'],['EAGLE','Eagle'],['BIRDIE','Birdie'],['PAR','Par'],['BOGEY','Bogey'],['DOUBLE BOGEY','Double bogey'],['TRIPLE BOGEY','Triple bogey'],['OTHER','Other'],['PICKED UP','Škrtnutá']];
const TEE={YELLOW:'žlutá',BLUE:'modrá',WHITE:'bílá',RED:'červená',BLACK:'černá',ORANGE:'oranžová',GREEN:'zelená'};
const cls=t=>t?t.replace(/ /g,'-'):'';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=v=>v==null||v===''?'–':String(v).replace('.',',');
const cache={};
async function getJSON(u){if(!cache[u]){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' '+r.status);cache[u]=await r.json();}return cache[u];}
const tUrl=id=>'data/imports/'+id+'.json';
function parseDate(d){const m=/(\d+)\.\s*(\d+)\.\s*(\d{4})/.exec(d||'');return m?new Date(+m[3],+m[2]-1,+m[1]):new Date(0);}

async function home(){
  const idx=await getJSON('data/imports/index.json');
  const list=[...idx.tournaments].sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  app.innerHTML='<h1>Turnaje</h1><p class="muted">'+list.length+' naimportovaných turnajů</p><div class="cards">'+
   list.map(t=>'<a class="card" href="#/t/'+t.tournamentId+'"><div class="t">'+esc(t.name)+'</div><div class="m">'+esc(t.date)+' · '+esc(t.venue)+'</div><div class="m">'+esc(t.format)+' · '+t.players+' hráčů</div>'+(t.winner?'<div class="w">🏆 '+esc(t.winner)+' – '+t.winnerScore+' b.</div>':'')+'</a>').join('')+'</div>';
}

function holeCell(h){
  if(!h) return '<td></td>';
  const txt=h.pickedUp?'—':(h.strokes??'');
  return '<td><span class="h '+cls(h.type)+'" title="'+esc(h.type||'')+'">'+txt+'</span></td>';
}
function legend(){return '<div class="legend">'+TYPES.map(([k,l])=>'<span><span class="h '+cls(k)+'">&nbsp;</span> '+l+'</span>').join('')+'</div>';}

async function tournament(id){
  const d=await getJSON(tUrl(id));const t=d.tournament;
  const ps=[...d.players].sort((a,b)=>(a.rank??999)-(b.rank??999));
  const counts={};ps.forEach(p=>p.holes.forEach(h=>{counts[h.type]=(counts[h.type]||0)+1}));
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const best=ps.slice().sort((a,b)=>(b.officialScore??0)-(a.officialScore??0))[0];
  const hcpDrop=ps.filter(p=>p.hcpBefore!=null&&p.hcpAfter!=null).sort((a,b)=>(a.hcpAfter-a.hcpBefore)-(b.hcpAfter-b.hcpBefore))[0];
  let worst=null;ps.forEach(p=>p.holes.forEach(h=>{if(h.relativeToPar!=null&&(!worst||h.relativeToPar>worst.h.relativeToPar))worst={p,h};}));
  const birdies=ps.reduce((a,p)=>a+p.holes.filter(h=>h.relativeToPar!=null&&h.relativeToPar<0).length,0);
  app.innerHTML='<div class="crumbs"><a href="#/">Turnaje</a> › '+esc(t.name)+'</div>'+
   '<h1>'+esc(t.name)+'</h1><div class="meta"><span class="pill">📅 '+esc(t.date)+'</span><span class="pill">📍 '+esc(t.venue)+'</span><span class="pill">'+esc(t.format)+(t.withHcp==='Ano'?' s HCP':'')+'</span><span class="pill">'+ps.length+' hráčů</span><a class="pill" href="'+esc(d.source)+'" target="_blank" rel="noopener">Výsledky na ČGF ↗</a></div>'+
   '<div class="kpis">'+
     '<div class="kpi"><div class="v">'+(best?best.officialScore:'–')+'</div><div class="l">Vítěz: '+esc(best?best.name:'')+'</div></div>'+
     (hcpDrop?'<div class="kpi"><div class="v">'+fmt((hcpDrop.hcpAfter-hcpDrop.hcpBefore).toFixed(1))+'</div><div class="l">Největší snížení HCP: '+esc(hcpDrop.name)+'</div></div>':'')+
     '<div class="kpi"><div class="v">'+birdies+'</div><div class="l">Birdie a lepší</div></div>'+
     (worst?'<div class="kpi"><div class="v">+'+worst.h.relativeToPar+'</div><div class="l">Nejvíc nad par: <a href="#/t/'+id+'/p/'+worst.p.golferId+'">'+esc(worst.p.name)+'</a>, jamka '+worst.h.hole+'</div></div>':'')+
   '</div>'+
   '<h2>Výsledková listina</h2><div class="scroll"><table><thead><tr><th class="n">#</th><th>Hráč</th><th class="hide-s">Klub</th><th class="n">HCP před</th><th class="n">HCP po</th><th class="n hide-s">Hrací HCP</th><th class="n hide-s">Odpaliště</th><th class="n">Body</th></tr></thead><tbody>'+
   ps.map(p=>'<tr class="click" data-g="'+p.golferId+'"><td class="n">'+esc(p.rankLabel||p.rank)+'</td><td><a href="#/t/'+id+'/p/'+p.golferId+'">'+esc(p.name)+'</a></td><td class="hide-s" title="'+esc(p.club)+'">'+esc(p.clubCode||p.club)+'</td><td class="n">'+fmt(p.hcpBefore)+'</td><td class="n">'+fmt(p.hcpAfter)+'</td><td class="n hide-s">'+fmt(p.playingHcp)+'</td><td class="n hide-s">'+esc(TEE[p.round?.tee]||p.round?.tee||'')+'</td><td class="n big">'+fmt(p.officialScore??p.stbTotal)+'</td></tr>').join('')+
   '</tbody></table></div>'+
   '<h2>Jamky všech hráčů</h2>'+legend()+
   '<div class="scroll"><table class="sc"><thead><tr><th>Hráč</th>'+Array.from({length:18},(_,i)=>'<th>'+(i+1)+'</th>').join('')+'<th class="sum">B</th></tr>'+
   '<tr><th class="muted">Par</th>'+Array.from({length:18},(_,i)=>'<th class="muted">'+(ps[0]?.holes[i]?.par??'')+'</th>').join('')+'<th></th></tr></thead><tbody>'+
   ps.map(p=>'<tr class="click" data-g="'+p.golferId+'"><td>'+esc(p.name)+'</td>'+Array.from({length:18},(_,i)=>holeCell(p.holes[i])).join('')+'<td class="sum">'+fmt(p.stbTotal)+'</td></tr>').join('')+
   '</tbody></table></div>'+
   '<h2>Rozložení výsledků na jamkách</h2><div class="bars">'+
   TYPES.filter(([k])=>counts[k]).map(([k,l])=>'<span>'+l+'</span><div class="bar '+cls(k)+'" style="width:'+(100*counts[k]/total).toFixed(1)+'%"></div><span>'+counts[k]+'</span>').join('')+'</div>';
  app.querySelectorAll('tr.click').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.tagName!=='A')location.hash='#/t/'+id+'/p/'+tr.dataset.g;}));
}

async function player(id,gid){
  const d=await getJSON(tUrl(id));const p=d.players.find(x=>String(x.golferId)===String(gid));
  if(!p){app.innerHTML='<p>Hráč nenalezen. <a href="#/t/'+id+'">Zpět</a></p>';return;}
  const r=p.round||{};const H=p.holes;
  const seg=(a,b)=>H.slice(a,b);
  const sum=(arr,k)=>arr.reduce((s,h)=>s+(h[k]||0),0);
  const row=(label,fn,o,i,tot)=>'<tr><td>'+label+'</td>'+seg(0,9).map(fn).join('')+'<td class="sum">'+o+'</td>'+seg(9,18).map(fn).join('')+'<td class="sum">'+i+'</td><td class="sum">'+tot+'</td></tr>';
  const st=a=>a.some(h=>h.pickedUp)?'–':sum(a,'strokes');
  app.innerHTML='<div class="crumbs"><a href="#/">Turnaje</a> › <a href="#/t/'+id+'">'+esc(d.tournament.name)+'</a> › '+esc(p.name)+'</div>'+
   '<h1>'+esc(p.name)+'</h1><div class="meta"><span class="pill">'+esc(p.club)+'</span><span class="pill">Pořadí: '+esc(p.rankLabel||p.rank)+'.</span><span class="pill">'+fmt(p.officialScore)+' bodů</span><a class="pill" href="'+esc(p.source)+'" target="_blank" rel="noopener">Skórkarta na ČGF ↗</a></div>'+
   '<div class="kpis"><div class="kpi"><div class="v">'+fmt(p.hcpBefore)+' → '+fmt(p.hcpAfter)+'</div><div class="l">HCP před / po</div></div>'+
   '<div class="kpi"><div class="v">'+fmt(p.playingHcp)+'</div><div class="l">Hrací HCP</div></div>'+
   '<div class="kpi"><div class="v">'+esc(TEE[r.tee]||r.tee||'–')+'</div><div class="l">Odpaliště (CR '+fmt(r.cr)+' / SR '+fmt(r.sr)+')</div></div>'+
   '<div class="kpi"><div class="v">'+esc(r.course||'–')+'</div><div class="l">Hřiště · par '+fmt(r.par)+' · PCC '+fmt(r.pcc)+'</div></div></div>'+
   '<h2>Skórkarta</h2>'+legend()+
   '<div class="scroll"><table class="sc"><thead><tr><th>Jamka</th>'+Array.from({length:9},(_,i)=>'<th>'+(i+1)+'</th>').join('')+'<th class="sum">Out</th>'+Array.from({length:9},(_,i)=>'<th>'+(i+10)+'</th>').join('')+'<th class="sum">In</th><th class="sum">Celkem</th></tr></thead><tbody>'+
   row('Par',h=>'<td>'+fmt(h.par)+'</td>',sum(seg(0,9),'par'),sum(seg(9,18),'par'),sum(H,'par'))+
   row('HCP rány',h=>'<td class="muted">'+fmt(h.hcpStrokes)+'</td>',sum(seg(0,9),'hcpStrokes'),sum(seg(9,18),'hcpStrokes'),sum(H,'hcpStrokes'))+
   row('Rány',holeCell,st(seg(0,9)),st(seg(9,18)),st(H))+
   row('Body STB',h=>'<td><b>'+fmt(h.stb)+'</b></td>',sum(seg(0,9),'stb'),sum(seg(9,18),'stb'),sum(H,'stb'))+
   '</tbody></table></div>';
}

async function route(){
  const h=location.hash.replace(/^#\/?/,'').split('/');
  try{
    if(h[0]==='t'&&h[1]&&h[2]==='p') await player(h[1],h[3]);
    else if(h[0]==='t'&&h[1]) await tournament(h[1]);
    else await home();
    window.scrollTo(0,0);
  }catch(e){app.innerHTML='<p>Data se nepodařilo načíst. ('+esc(e.message)+')</p>';}
}
getJSON('data/imports/index.json').then(i=>{document.getElementById('gen').textContent='aktualizováno '+new Date(i.generatedAt).toLocaleString('cs-CZ');}).catch(()=>{});
window.addEventListener('hashchange',route);route();
})();
