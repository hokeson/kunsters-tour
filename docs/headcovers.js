(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const regKey=v=>String(v??'').replace(/^0+/,'');
const getJSON=async u=>{const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' '+r.status);return r.json();};

// Putovní headcovery byly zavedeny v sezoně 2023.
// Pořadí konkrétního turnaje vychází ze Stablefordu; headcover tedy neřeší sezonní Kunsters body.
// Tie-break je sezonní. 2023: Kunratice -> horší HCP. 2024+: nižší HCP.
const TIE={
  2023:{label:'při shodě STB: Kunratice, potom horší HCP',hcp:'higher',kunratice:true},
  2024:{label:'při shodě STB: nižší HCP',hcp:'lower'},
  2025:{label:'při shodě STB: nižší HCP',hcp:'lower'},
  2026:{label:'při shodě STB: nižší HCP',hcp:'lower'}
};

const memberNameKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.,]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
async function members(){
  const m=await getJSON('data/members.json').catch(()=>({members:[]}));
  const ms=Array.isArray(m.members)?m.members:[];
  const byReg=new Map(),byName=new Map();
  ms.forEach(x=>{(x.cgfNumbers||[]).forEach(n=>byReg.set(regKey(n),x));byName.set(memberNameKey(x.name),x);});
  return {resolve:p=>byReg.get(regKey(p.reg??p.memberNumber))||byName.get(memberNameKey(p.player??p.name))||null};
}
function hcpOf(r){const v=Number(r.hcp);return Number.isFinite(v)?v:null;}
function inKunratice(m){return Boolean(m&&(m.kunratice===true||/kunratice/i.test(String(m.residence||m.city||m.address||''))));}
function tieSort(a,b,year,M,forPig){
  const rule=TIE[year]||TIE[2026];
  if(rule.kunratice){const ak=inKunratice(M.resolve(a)),bk=inKunratice(M.resolve(b));if(ak!==bk)return ak?-1:1;}
  const ah=hcpOf(a),bh=hcpOf(b);if(ah==null||bh==null)return 0;
  let d=rule.hcp==='higher'?bh-ah:ah-bh;
  // prasatko je posledni misto, ale pri shodnem STB se pouzije historicke pravidlo pro poradi turnaje.
  return d;
}
function pick(rows,year,M,mode){
  const valid=rows.filter(r=>Number.isFinite(Number(r.stb)));
  if(!valid.length)return null;
  const target=mode==='tiger'?Math.max(...valid.map(r=>+r.stb)):Math.min(...valid.map(r=>+r.stb));
  const tied=valid.filter(r=>+r.stb===target);
  tied.sort((a,b)=>tieSort(a,b,year,M,mode==='pig'));
  const winner=tied[0];
  const unresolved=tied.length>1&&tieSort(tied[0],tied[1],year,M,mode==='pig')===0;
  return {player:winner.player,stb:target,hcp:hcpOf(winner),unresolved,tied:tied.map(x=>x.player)};
}
async function build(){
  const [a,M]=await Promise.all([getJSON('data/almanac.json'),members()]);
  const tournaments=(a.tournaments||[]).filter(t=>t.year>=2023).slice().sort((x,y)=>y.year-x.year||y.no-x.no);
  const events=tournaments.map(t=>{
    const rows=(a.results||[]).filter(r=>r.year===t.year&&r.no===t.no);
    return {...t,tiger:pick(rows,t.year,M,'tiger'),pig:pick(rows,t.year,M,'pig')};
  });
  return {events,TIE};
}
function aggregate(events,key){
  const m=new Map();events.forEach(e=>{const x=e[key];if(!x||x.unresolved)return;const k=x.player;m.set(k,(m.get(k)||0)+1);});
  return [...m].map(([player,count])=>({player,count})).sort((a,b)=>b.count-a.count||a.player.localeCompare(b.player,'cs'));
}
function person(n){return '<a href="#/hrac/'+slug(n)+'">'+esc(n)+'</a>';}
function holder(x,kind){
  if(!x)return '<span class="hc-missing">–</span>';
  if(x.unresolved)return '<span class="hc-unresolved" title="'+esc(x.tied.join(', '))+'">k ověření</span>';
  return '<div class="hc-holder"><strong>'+person(x.player)+'</strong><span>'+x.stb+' STB'+(x.hcp!=null?' · HCP '+String(x.hcp).replace('.',','):'')+'</span></div>';
}
function ranking(title,rows,emoji){return '<section class="hc-rank"><h2>'+emoji+' '+title+'</h2>'+(rows.length?'<ol>'+rows.map(x=>'<li><span>'+person(x.player)+'</span><b>'+x.count+'×</b></li>').join('')+'</ol>':'<p class="muted">Zatím bez potvrzených držitelů.</p>')+'</section>';}
function render(data){
  const {events}=data;
  return '<div class="hc-page">'+
    '<div class="hc-hero"><div><div class="hc-kicker">KUNSTERS TRADICE · OD 2023</div><h1>Putovní headcovery</h1><p>Po každém turnaji putuje <b>tygřík</b> k vítězi a <b>prasátko</b> k hráči s nejnižším Stablefordem. Při shodě rozhoduje pravidlo platné v dané sezóně.</p></div><div class="hc-icons" aria-hidden="true"><span>🐯</span><span>🐷</span></div></div>'+
    '<div class="hc-summary">'+ranking('Nejvíce tygříků',aggregate(events,'tiger'),'🐯')+ranking('Nejvíce prasátek',aggregate(events,'pig'),'🐷')+'</div>'+
    '<h2>Historie po turnajích</h2><div class="hc-scroll"><table class="hc-table"><thead><tr><th>Sezóna</th><th>Turnaj</th><th>🐯 Tygřík</th><th>🐷 Prasátko</th></tr></thead><tbody>'+
    events.map(e=>'<tr><td><a href="#/sezona/'+e.year+'">'+e.year+'</a></td><td><a href="#/turnaj/'+e.year+'/'+e.no+'">'+esc(e.name)+'</a></td><td>'+holder(e.tiger,'tiger')+'</td><td>'+holder(e.pig,'pig')+'</td></tr>').join('')+
    '</tbody></table></div><div class="hc-note"><b>Historická pravidla:</b> 2023 při shodě nejprve Kunratice, potom horší HCP. Od 2024 rozhoduje nižší HCP. Záznam „k ověření“ znamená, že dostupná historická data nestačí k bezpečnému rozhodnutí tie-breaku.</div></div>';
}
window.KunstersHeadcovers={build,render,async page(){return render(await build());}};
})();
