(function(){
const app=document.getElementById('app');
const TYPES=[['HOLE IN ONE','Hole-in-one'],['ALBATROS','Albatros'],['EAGLE','Eagle'],['BIRDIE','Birdie'],['PAR','Par'],['BOGEY','Bogey'],['DOUBLE BOGEY','Double bogey'],['TRIPLE BOGEY','Triple bogey'],['OTHER','Other'],['PICKED UP','Škrtnutá']];
const TEE={YELLOW:'žlutá',BLUE:'modrá',WHITE:'bílá',RED:'červená',BLACK:'černá',ORANGE:'oranžová',GREEN:'zelená'};
const cls=t=>t?t.replace(/ /g,'-'):'';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=v=>v==null||v===''?'–':(typeof v==='number'&&!Number.isInteger(v)?v.toFixed(2).replace(/0$/,''):String(v)).replace('.',',');
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const cache={};
async function getJSON(u){if(!cache[u]){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' '+r.status);cache[u]=await r.json();}return cache[u];}
const tUrl=id=>'data/imports/'+id+'.json';
const ALM=()=>getJSON('data/almanac.json');
const IDX=()=>getJSON('data/imports/index.json').catch(()=>({tournaments:[]}));
function parseDate(d){const m=/(\d+)\.\s*(\d+)\.\s*(\d{4})/.exec(d||'');return m?new Date(+m[3],+m[2]-1,+m[1]):new Date(0);}
const pLink=n=>n?String(n).split(/,\s*/).map(x=>'<a href="#/hrac/'+slug(x)+'">'+esc(x)+'</a>').join(', '):'–';
const kpi=(v,l)=>'<div class="kpi"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>';
const crumbs=(...a)=>'<div class="crumbs">'+a.join(' › ')+'</div>';

// Sortable table: cols=[{k,label,n(umeric),f(ormat)(row)}]
let tblSeq=0;
function table(cols,rows,opt={}){
  const id='tb'+(++tblSeq);
  setTimeout(()=>{const el=document.getElementById(id);if(!el)return;
    el.querySelectorAll('th[data-i]').forEach(th=>th.addEventListener('click',()=>{
      const c=cols[+th.dataset.i];const dir=th.dataset.dir==='desc'?'asc':'desc';
      const sorted=rows.slice().sort((a,b)=>{const x=a[c.k],y=b[c.k];if(x==null)return 1;if(y==null)return -1;const r=c.n?(x-y):String(x).localeCompare(String(y),'cs');return dir==='asc'?r:-r;});
      el.outerHTML=table(cols,sorted,Object.assign({},opt,{sortedBy:+th.dataset.i,dir}));
    }));},0);
  return '<div class="scroll"><table id="'+id+'"><thead><tr>'+cols.map((c,i)=>'<th data-i="'+i+'" class="'+(c.n?'n ':'')+(c.hs?'hide-s ':'')+'sortable" title="Seřadit">'+c.label+(opt.sortedBy===i?(opt.dir==='asc'?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>'+
   rows.map(r=>'<tr>'+cols.map(c=>'<td class="'+(c.n?'n ':'')+(c.hs?'hide-s':'')+'">'+(c.f?c.f(r):esc(fmt(r[c.k])))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}

/* ---------- ALMANACH ---------- */
async function home(){
  const [a,idx]=await Promise.all([ALM(),IDX()]);
  const ov=Object.fromEntries(a.overview.map(o=>[o.label,o.value]));
  const list=[...idx.tournaments].sort((x,y)=>parseDate(y.date)-parseDate(x.date));
  app.innerHTML='<h1>'+esc(a.title)+'</h1><p class="muted">Desetiletý almanach Kunsters Cupu</p>'+
   '<div class="kpis">'+a.overview.map(o=>kpi(esc(fmt(o.value)),esc(o.label))).join('')+'</div>'+
   '<div class="two"><div><h2>Mistři sezón</h2>'+table([{k:'year',label:'Rok',f:r=>'<a href="#/sezona/'+r.year+'">'+r.year+'</a>'},{k:'player',label:'Mistr',f:r=>pLink(r.player)}],a.champions.slice().reverse())+'</div>'+
   '<div><h2>Historická TOP 10</h2>'+table([{k:'player',label:'Hráč',f:r=>pLink(r.player)},{k:'titles',label:'Tituly',n:1},{k:'wins',label:'Vítězství',n:1},{k:'podiums',label:'Pódia',n:1},{k:'tournaments',label:'Turnaje',n:1}],a.top10)+'</div></div>'+
   '<h2>Rekordy</h2><div class="kpis">'+a.records.map(r=>kpi(esc(fmt(r.value))+' <small>'+esc(r.unit)+'</small>',esc(r.record)+': '+pLink(r.holder))).join('')+'</div><p><a href="#/rekordy">Všechny rekordy →</a></p>'+
   (list.length?'<h2>Turnaje se skórkartami z ČGF</h2><div class="cards">'+list.map(t=>'<a class="card" href="#/t/'+t.tournamentId+'"><div class="t">'+esc(t.name)+'</div><div class="m">'+esc(t.date)+' · '+esc(t.venue)+'</div><div class="m">'+esc(t.format)+' · '+t.players+' hráčů</div>'+(t.winner?'<div class="w">🏆 '+esc(t.winner)+' – '+t.winnerScore+' b.</div>':'')+'</a>').join('')+'</div>':'');
}

/* ---------- SEZÓNY ---------- */
async function seasons(){
  const a=await ALM();
  const years=[...new Set(a.standings.map(s=>s.year))].sort((x,y)=>y-x);
  const champ=Object.fromEntries(a.champions.map(c=>[c.year,c.player]));
  const src=Object.fromEntries((a.seasonSources||[]).map(c=>[c.year,c.summary]));
  app.innerHTML='<h1>Sezóny</h1><div class="cards">'+years.map(y=>'<a class="card" href="#/sezona/'+y+'"><div class="t">'+y+'</div><div class="w">🏆 '+esc(champ[y]||'')+'</div><div class="m">'+esc(src[y]||'')+'</div></a>').join('')+'</div>';
}
async function season(y){
  y=+y;const a=await ALM();
  const st=a.standings.filter(s=>s.year===y).sort((p,q)=>p.rank-q.rank);
  const ts=a.tournaments.filter(t=>t.year===y).sort((p,q)=>p.no-q.no);
  const py=Object.fromEntries(a.playerYears.filter(p=>p.year===y).map(p=>[p.player,p]));
  const rows=st.map(s=>Object.assign({},py[s.player]||{},s));
  app.innerHTML=crumbs('<a href="#/sezony">Sezóny</a>',String(y))+'<h1>Sezóna '+y+'</h1>'+
   '<h2>Konečné pořadí</h2>'+table([{k:'rank',label:'#',n:1},{k:'player',label:'Hráč',f:r=>pLink(r.player)},{k:'hcp',label:'HCP',n:1},{k:'tournaments',label:'Turnaje',n:1},{k:'wins',label:'Vítězství',n:1},{k:'podiums',label:'Pódia',n:1},{k:'avgStb',label:'Průměr STB',n:1,hs:1},{k:'bestStb',label:'Nejlepší STB',n:1,hs:1}],rows)+
   '<h2>Turnaje sezóny</h2>'+table([{k:'no',label:'#',n:1},{k:'name',label:'Turnaj',f:r=>'<a href="#/turnaj/'+r.year+'/'+r.no+'">'+esc(r.name)+'</a>'},{k:'participants',label:'Hráčů',n:1},{k:'winner',label:'Vítěz',f:r=>pLink(r.winner)},{k:'bestStb',label:'Nejlepší STB',n:1},{k:'avgStb',label:'Průměr STB',n:1,hs:1},{k:'bestStrokes',label:'Nejméně ran',n:1,hs:1}],ts);
}

/* ---------- TURNAJE (historie) ---------- */
async function tournamentsAll(){
  const a=await ALM();
  const ts=a.tournaments.slice().sort((p,q)=>q.year-p.year||q.no-p.no);
  app.innerHTML='<h1>Všechny turnaje</h1><p class="muted">'+ts.length+' turnajů 2017–2026. Kliknutím na záhlaví sloupce seřadíte.</p>'+
   table([{k:'year',label:'Rok',n:1,f:r=>'<a href="#/sezona/'+r.year+'">'+r.year+'</a>'},{k:'no',label:'#',n:1},{k:'name',label:'Turnaj',f:r=>'<a href="#/turnaj/'+r.year+'/'+r.no+'">'+esc(r.name)+'</a>'},{k:'participants',label:'Hráčů',n:1},{k:'winner',label:'Vítěz',f:r=>pLink(r.winner)},{k:'bestStb',label:'Nejlepší STB',n:1},{k:'avgStb',label:'Průměr STB',n:1,hs:1},{k:'bestStrokes',label:'Nejméně ran',n:1,hs:1}],ts);
}
async function tournamentHist(y,no){
  y=+y;no=+no;const a=await ALM();
  const t=a.tournaments.find(x=>x.year===y&&x.no===no)||{name:'Turnaj'};
  const rs=a.results.filter(r=>r.year===y&&r.no===no).sort((p,q)=>(p.rank??99)-(q.rank??99)||(q.stb??0)-(p.stb??0));
  const idx=await IDX();const td=parseDate(t.name);
  const cg=idx.tournaments.find(x=>+parseDate(x.date)===+td&&+td>0);
  app.innerHTML=crumbs('<a href="#/turnaje">Turnaje</a>','<a href="#/sezona/'+y+'">'+y+'</a>',esc(t.name))+'<h1>'+esc(t.name)+'</h1>'+
   '<div class="meta"><span class="pill">Sezóna '+y+', turnaj č. '+no+'</span><span class="pill">'+rs.length+' hráčů</span>'+(cg?'<a class="pill" href="#/t/'+cg.tournamentId+'">Skórkarty z ČGF →</a>':'')+'</div>'+
   '<div class="kpis">'+kpi(pLink(t.winner),'Vítěz')+kpi(fmt(t.bestStb),'Nejlepší STB')+kpi(fmt(t.avgStb),'Průměr STB')+kpi(fmt(t.bestStrokes),'Nejméně ran')+'</div>'+
   '<h2>Výsledky</h2>'+table([{k:'rank',label:'#',n:1},{k:'player',label:'Hráč',f:r=>pLink(r.player)},{k:'hcp',label:'HCP',n:1},{k:'strokes',label:'Rány',n:1},{k:'stb',label:'STB',n:1},{k:'pars',label:'Par',n:1,hs:1},{k:'birdies',label:'Birdie',n:1,hs:1},{k:'points',label:'Body',n:1}],rs);
}

/* ---------- HRÁČI ---------- */
async function players(){
  const a=await ALM();
  app.innerHTML='<h1>Hráči</h1><p class="muted">'+a.players.length+' evidovaných hráčů. Kliknutím na záhlaví sloupce seřadíte.</p>'+
   table([{k:'player',label:'Hráč',f:r=>pLink(r.player)},{k:'seasons',label:'Sezóny',n:1},{k:'tournaments',label:'Turnaje',n:1},{k:'titles',label:'Tituly',n:1},{k:'wins',label:'Vítězství',n:1},{k:'podiums',label:'Pódia',n:1},{k:'avgStb',label:'Průměr STB',n:1},{k:'bestStb',label:'Nejlepší STB',n:1},{k:'avgStrokes',label:'Průměr ran',n:1,hs:1},{k:'bestStrokes',label:'Nejméně ran',n:1,hs:1},{k:'pars',label:'Par',n:1,hs:1},{k:'birdies',label:'Birdie',n:1,hs:1}],a.players);
}
async function playerProfile(s){
  const [a,idx]=await Promise.all([ALM(),IDX()]);
  const p=a.players.find(x=>slug(x.player)===s);
  if(!p){app.innerHTML='<p>Hráč nenalezen. <a href="#/hraci">Seznam hráčů</a></p>';return;}
  const yrs=a.playerYears.filter(x=>x.player===p.player).sort((x,y)=>x.year-y.year);
  const fin=Object.fromEntries(a.standings.filter(x=>x.player===p.player).map(x=>[x.year,x]));
  yrs.forEach(y=>{y.finalRank=fin[y.year]?.rank;y.hcp=fin[y.year]?.hcp;});
  const res=a.results.filter(x=>x.player===p.player).sort((x,y)=>y.year-x.year||y.no-x.no);
  const titles=a.champions.filter(c=>c.player===p.player).map(c=>c.year);
  // ČGF scorecards for this player (by registration number or name)
  const cgf=[];
  for(const t of idx.tournaments){try{const d=await getJSON(tUrl(t.tournamentId));const pl=d.players.find(x=>String(x.memberNumber)===String(p.reg)||slug(x.name)===s);if(pl)cgf.push({d,pl});}catch(e){}}
  const maxStb=Math.max(...yrs.map(y=>y.avgStb||0),1);
  app.innerHTML=crumbs('<a href="#/hraci">Hráči</a>',esc(p.player))+'<h1>'+esc(p.player)+'</h1>'+
   '<div class="meta"><span class="pill">Sezóny '+p.firstYear+'–'+p.lastYear+'</span>'+(titles.length?'<span class="pill">🏆 Mistr '+titles.join(', ')+'</span>':'')+'</div>'+
   '<div class="kpis">'+kpi(p.tournaments,'Turnajů')+kpi(p.wins,'Vítězství')+kpi(p.podiums,'Pódií')+kpi(p.titles,'Titulů')+kpi(fmt(p.avgStb),'Průměr STB')+kpi(p.bestStb,'Nejlepší STB')+kpi(fmt(p.bestStrokes),'Nejméně ran')+kpi(p.pars+' / '+p.birdies,'Par / Birdie')+'</div>'+
   (cgf.length?'<h2>Skórkarty z ČGF</h2><div class="cards">'+cgf.map(({d,pl})=>'<a class="card" href="#/t/'+d.tournamentId+'/p/'+pl.golferId+'"><div class="t">'+esc(d.tournament.name)+'</div><div class="m">'+esc(d.tournament.date)+' · '+pl.rank+'. místo · '+pl.officialScore+' b.</div><div class="m">HCP '+fmt(pl.hcpBefore)+' → '+fmt(pl.hcpAfter)+'</div></a>').join('')+'</div>':'')+
   '<h2>Vývoj po sezónách</h2><div class="bars">'+yrs.map(y=>'<span>'+y.year+'</span><div class="bar" style="background:var(--g);width:'+(100*(y.avgStb||0)/maxStb).toFixed(1)+'%"></div><span>'+fmt(y.avgStb)+'</span>').join('')+'</div><p class="muted small">Průměr STB bodů v sezóně</p>'+
   table([{k:'year',label:'Rok',n:1,f:r=>'<a href="#/sezona/'+r.year+'">'+r.year+'</a>'},{k:'finalRank',label:'Konečné pořadí',n:1},{k:'hcp',label:'HCP',n:1,hs:1},{k:'tournaments',label:'Turnaje',n:1},{k:'wins',label:'Vítězství',n:1},{k:'podiums',label:'Pódia',n:1},{k:'avgStb',label:'Průměr STB',n:1},{k:'bestStb',label:'Nejlepší STB',n:1},{k:'avgStrokes',label:'Průměr ran',n:1,hs:1},{k:'pars',label:'Par',n:1,hs:1},{k:'birdies',label:'Birdie',n:1,hs:1}],yrs)+
   '<h2>Všechny výsledky ('+res.length+')</h2>'+
   table([{k:'year',label:'Rok',n:1},{k:'tournament',label:'Turnaj',f:r=>'<a href="#/turnaj/'+r.year+'/'+r.no+'">'+esc(r.tournament)+'</a>'},{k:'rank',label:'Pořadí',n:1},{k:'hcp',label:'HCP',n:1,hs:1},{k:'strokes',label:'Rány',n:1},{k:'stb',label:'STB',n:1},{k:'pars',label:'Par',n:1,hs:1},{k:'birdies',label:'Birdie',n:1,hs:1}],res);
}

/* ---------- REKORDY ---------- */
async function records(){
  const [a,idx]=await Promise.all([ALM(),IDX()]);
  const res=a.results;
  const top=(arr,k,n,asc)=>arr.filter(r=>r[k]!=null&&(k!=='strokes'||r[k]>50)).sort((x,y)=>asc?x[k]-y[k]:y[k]-x[k]).slice(0,n);
  const resCols=k=>[{k:'player',label:'Hráč',f:r=>pLink(r.player)},{k,label:k==='stb'?'STB':'Rány',n:1},{k:'tournament',label:'Turnaj',f:r=>'<a href="#/turnaj/'+r.year+'/'+r.no+'">'+esc(r.tournament)+'</a>'},{k:'year',label:'Rok',n:1}];
  // hole records from ČGF scorecards
  const holes=[];
  for(const t of idx.tournaments){try{const d=await getJSON(tUrl(t.tournamentId));d.players.forEach(p=>p.holes.forEach(h=>holes.push({p,h,d})));}catch(e){}}
  const worst=holes.filter(x=>x.h.relativeToPar!=null).sort((x,y)=>y.h.relativeToPar-x.h.relativeToPar).slice(0,5);
  const best=holes.filter(x=>x.h.relativeToPar!=null&&x.h.relativeToPar<0).sort((x,y)=>x.h.relativeToPar-y.h.relativeToPar).slice(0,5);
  const hcpDrop=[];for(const t of idx.tournaments){try{const d=await getJSON(tUrl(t.tournamentId));d.players.forEach(p=>{if(p.hcpBefore!=null&&p.hcpAfter!=null)hcpDrop.push({p,d,v:p.hcpAfter-p.hcpBefore});});}catch(e){}}
  hcpDrop.sort((x,y)=>x.v-y.v);
  const holeRow=x=>'<tr><td>'+esc(x.p.name)+'</td><td class="n">'+(x.h.relativeToPar>0?'+':'')+x.h.relativeToPar+'</td><td class="n">'+x.h.hole+' (par '+x.h.par+', '+(x.h.strokes??'–')+' ran)</td><td>'+esc(x.d.tournament.name)+'</td><td><a href="#/t/'+x.d.tournamentId+'/p/'+x.p.golferId+'">skórkarta</a> · <a href="'+esc(x.p.source)+'" target="_blank" rel="noopener">ČGF ↗</a></td></tr>';
  const holeTable=arr=>'<div class="scroll"><table><thead><tr><th>Hráč</th><th class="n">Vůči par</th><th class="n">Jamka</th><th>Turnaj</th><th>Odkaz</th></tr></thead><tbody>'+arr.map(holeRow).join('')+'</tbody></table></div>';
  app.innerHTML='<h1>Rekordy</h1><h2>Rekordy almanachu 2017–2026</h2>'+
   table([{k:'record',label:'Rekord'},{k:'holder',label:'Držitel',f:r=>pLink(r.holder)},{k:'value',label:'Hodnota',n:1},{k:'unit',label:''}],a.records)+
   '<div class="two"><div><h2>Nejvíc STB v jednom turnaji</h2>'+table(resCols('stb'),top(res,'stb',10))+'</div>'+
   '<div><h2>Nejméně ran v jednom turnaji</h2>'+table(resCols('strokes'),top(res,'strokes',10,true))+'</div></div>'+
   (holes.length?'<h2>Rekordy jamek (ze skórkaret ČGF)</h2><p class="muted small">Počítá se ze všech turnajů naimportovaných z ČGF, s odkazem na konkrétní skórkartu.</p>'+
   (best.length?'<h3>Nejlepší jamky</h3>'+holeTable(best):'')+'<h3>Nejvíc ran nad par na jedné jamce</h3>'+holeTable(worst)+
   (hcpDrop.length?'<h3>Největší snížení HCP v turnaji</h3><div class="scroll"><table><thead><tr><th>Hráč</th><th class="n">Změna</th><th class="n">HCP</th><th>Turnaj</th><th>Odkaz</th></tr></thead><tbody>'+hcpDrop.slice(0,5).map(x=>'<tr><td>'+esc(x.p.name)+'</td><td class="n">'+fmt(+x.v.toFixed(1))+'</td><td class="n">'+fmt(x.p.hcpBefore)+' → '+fmt(x.p.hcpAfter)+'</td><td>'+esc(x.d.tournament.name)+'</td><td><a href="#/t/'+x.d.tournamentId+'/p/'+x.p.golferId+'">skórkarta</a></td></tr>').join('')+'</tbody></table></div>':''):'');
}

async function methodology(){
  const a=await ALM();
  app.innerHTML='<h1>Metodika almanachu</h1><p class="muted">Zdroj: '+esc(a.source)+'</p>'+
   table([{k:'area',label:'Oblast'},{k:'method',label:'Postup',f:r=>'<span class="wrap">'+esc(r.method)+'</span>'},{k:'note',label:'Poznámka',f:r=>'<span class="wrap">'+esc(r.note)+'</span>'}],a.methodology)+
   '<h2>Zdrojová data podle sezón</h2>'+table([{k:'year',label:'Rok',n:1},{k:'summary',label:'Načteno'}],a.seasonSources||[]);
}

/* ---------- ČGF turnaj a skórkarta ---------- */
function holeCell(h){
  if(!h) return '<td></td>';
  const txt=h.pickedUp?'—':(h.strokes??'');
  return '<td><span class="h '+cls(h.type)+'" title="'+esc(h.type||'')+'">'+txt+'</span></td>';
}
function legend(){return '<div class="legend">'+TYPES.map(([k,l])=>'<span><span class="h '+cls(k)+'">&nbsp;</span> '+l+'</span>').join('')+'</div>';}
const nameLink=(p)=>'<a href="#/t/'+p.tournamentId+'/p/'+p.golferId+'">'+esc(p.name)+'</a>';

async function tournament(id){
  const d=await getJSON(tUrl(id));const t=d.tournament;
  const ps=[...d.players].sort((a,b)=>(a.rank??999)-(b.rank??999));
  const counts={};ps.forEach(p=>p.holes.forEach(h=>{counts[h.type]=(counts[h.type]||0)+1}));
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const best=ps.slice().sort((a,b)=>(b.officialScore??0)-(a.officialScore??0))[0];
  const hcpDrop=ps.filter(p=>p.hcpBefore!=null&&p.hcpAfter!=null).sort((a,b)=>(a.hcpAfter-a.hcpBefore)-(b.hcpAfter-b.hcpBefore))[0];
  let worst=null;ps.forEach(p=>p.holes.forEach(h=>{if(h.relativeToPar!=null&&(!worst||h.relativeToPar>worst.h.relativeToPar))worst={p,h};}));
  const birdies=ps.reduce((a,p)=>a+p.holes.filter(h=>h.relativeToPar!=null&&h.relativeToPar<0).length,0);
  app.innerHTML=crumbs('<a href="#/">Almanach</a>',esc(t.name))+
   '<h1>'+esc(t.name)+'</h1><div class="meta"><span class="pill">📅 '+esc(t.date)+'</span><span class="pill">📍 '+esc(t.venue)+'</span><span class="pill">'+esc(t.format)+(t.withHcp==='Ano'?' s HCP':'')+'</span><span class="pill">'+ps.length+' hráčů</span><a class="pill" href="'+esc(d.source)+'" target="_blank" rel="noopener">Výsledky na ČGF ↗</a></div>'+
   '<div class="kpis">'+
     kpi(best?best.officialScore:'–','Vítěz: '+(best?nameLink(best):''))+
     (hcpDrop?kpi(fmt(+(hcpDrop.hcpAfter-hcpDrop.hcpBefore).toFixed(1)),'Největší snížení HCP: '+nameLink(hcpDrop)):'')+
     kpi(birdies,'Birdie a lepší')+
     (worst?kpi('+'+worst.h.relativeToPar,'Nejvíc nad par: '+nameLink(worst.p)+', jamka '+worst.h.hole):'')+
   '</div>'+
   '<h2>Výsledková listina</h2><div class="scroll"><table><thead><tr><th class="n">#</th><th>Hráč</th><th class="hide-s">Klub</th><th class="n">HCP před</th><th class="n">HCP po</th><th class="n hide-s">Hrací HCP</th><th class="n hide-s">Odpaliště</th><th class="n">Body</th></tr></thead><tbody>'+
   ps.map(p=>'<tr class="click" data-g="'+p.golferId+'"><td class="n">'+esc(p.rankLabel||p.rank)+'</td><td>'+nameLink(p)+'</td><td class="hide-s" title="'+esc(p.club)+'">'+esc(p.clubCode||p.club)+'</td><td class="n">'+fmt(p.hcpBefore)+'</td><td class="n">'+fmt(p.hcpAfter)+'</td><td class="n hide-s">'+fmt(p.playingHcp)+'</td><td class="n hide-s">'+esc(TEE[p.round?.tee]||p.round?.tee||'')+'</td><td class="n big">'+fmt(p.officialScore??p.stbTotal)+'</td></tr>').join('')+
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
  const [d,a]=await Promise.all([getJSON(tUrl(id)),ALM().catch(()=>null)]);const p=d.players.find(x=>String(x.golferId)===String(gid));
  if(!p){app.innerHTML='<p>Hráč nenalezen. <a href="#/t/'+id+'">Zpět</a></p>';return;}
  const ap=a&&a.players.find(x=>String(x.reg)===String(p.memberNumber));
  const r=p.round||{};const H=p.holes;
  const seg=(a,b)=>H.slice(a,b);
  const sum=(arr,k)=>arr.reduce((s,h)=>s+(h[k]||0),0);
  const row=(label,fn,o,i,tot)=>'<tr><td>'+label+'</td>'+seg(0,9).map(fn).join('')+'<td class="sum">'+o+'</td>'+seg(9,18).map(fn).join('')+'<td class="sum">'+i+'</td><td class="sum">'+tot+'</td></tr>';
  const st=a=>a.some(h=>h.pickedUp)?'–':sum(a,'strokes');
  app.innerHTML=crumbs('<a href="#/">Almanach</a>','<a href="#/t/'+id+'">'+esc(d.tournament.name)+'</a>',esc(p.name))+
   '<h1>'+esc(p.name)+'</h1><div class="meta"><span class="pill">'+esc(p.club)+'</span><span class="pill">Pořadí: '+esc(p.rankLabel||p.rank)+'.</span><span class="pill">'+fmt(p.officialScore)+' bodů</span><a class="pill" href="'+esc(p.source)+'" target="_blank" rel="noopener">Skórkarta na ČGF ↗</a>'+(ap?'<a class="pill" href="#/hrac/'+slug(ap.player)+'">Profil v almanachu →</a>':'')+'</div>'+
   '<div class="kpis">'+kpi(fmt(p.hcpBefore)+' → '+fmt(p.hcpAfter),'HCP před / po')+kpi(fmt(p.playingHcp),'Hrací HCP')+kpi(esc(TEE[r.tee]||r.tee||'–'),'Odpaliště (CR '+fmt(r.cr)+' / SR '+fmt(r.sr)+')')+kpi(esc(r.course||'–'),'Hřiště · par '+fmt(r.par)+' · PCC '+fmt(r.pcc))+'</div>'+
   '<h2>Skórkarta</h2>'+legend()+
   '<div class="scroll"><table class="sc"><thead><tr><th>Jamka</th>'+Array.from({length:9},(_,i)=>'<th>'+(i+1)+'</th>').join('')+'<th class="sum">Out</th>'+Array.from({length:9},(_,i)=>'<th>'+(i+10)+'</th>').join('')+'<th class="sum">In</th><th class="sum">Celkem</th></tr></thead><tbody>'+
   row('Par',h=>'<td>'+fmt(h.par)+'</td>',sum(seg(0,9),'par'),sum(seg(9,18),'par'),sum(H,'par'))+
   row('HCP rány',h=>'<td class="muted">'+fmt(h.hcpStrokes)+'</td>',sum(seg(0,9),'hcpStrokes'),sum(seg(9,18),'hcpStrokes'),sum(H,'hcpStrokes'))+
   row('Rány',holeCell,st(seg(0,9)),st(seg(9,18)),st(H))+
   row('Body STB',h=>'<td><b>'+fmt(h.stb)+'</b></td>',sum(seg(0,9),'stb'),sum(seg(9,18),'stb'),sum(H,'stb'))+
   '</tbody></table></div>';
}

/* ---------- ROUTER ---------- */
const NAV=[['','Almanach'],['sezony','Sezóny'],['turnaje','Turnaje'],['hraci','Hráči'],['rekordy','Rekordy'],['metodika','Metodika']];
function nav(cur){const n=document.getElementById('nav');if(n)n.innerHTML=NAV.map(([k,l])=>'<a href="#/'+k+'"'+(cur===k?' class="on"':'')+'>'+l+'</a>').join('');}
async function route(){
  const h=location.hash.replace(/^#\/?/,'').split('/');
  const sec={t:'',sezona:'sezony',turnaj:'turnaje',hrac:'hraci'}[h[0]]??h[0];nav(sec);
  try{
    if(h[0]==='t'&&h[1]&&h[2]==='p') await player(h[1],h[3]);
    else if(h[0]==='t'&&h[1]) await tournament(h[1]);
    else if(h[0]==='sezony') await seasons();
    else if(h[0]==='sezona') await season(h[1]);
    else if(h[0]==='turnaje') await tournamentsAll();
    else if(h[0]==='turnaj') await tournamentHist(h[1],h[2]);
    else if(h[0]==='hraci') await players();
    else if(h[0]==='hrac') await playerProfile(h[1]);
    else if(h[0]==='rekordy') await records();
    else if(h[0]==='metodika') await methodology();
    else await home();
    window.scrollTo(0,0);
  }catch(e){app.innerHTML='<p>Data se nepodařilo načíst. ('+esc(e.message)+')</p>';}
}
IDX().then(i=>{if(i.generatedAt)document.getElementById('gen').textContent='aktualizováno '+new Date(i.generatedAt).toLocaleString('cs-CZ');});
window.addEventListener('hashchange',route);route();
})();
