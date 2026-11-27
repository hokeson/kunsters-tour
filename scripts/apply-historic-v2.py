from pathlib import Path
import json

p = Path('docs/app.js')
s = p.read_text(encoding='utf-8')

start = "  const ps=[...d.players].sort((a,b)=>(b.stbTotal??-Infinity)-(a.stbTotal??-Infinity)||(a.hcpBefore??Infinity)-(b.hcpBefore??Infinity)||(a.rank??999)-(b.rank??999));\n  const members=ps.filter(M.is);\n"
end = "  const scorecards=members.filter(p=>Array.isArray(p.holes)&&p.holes.length>0);"
if start not in s or end not in s:
    raise SystemExit('Historic v2: calculation anchors not found')
a, b = s.index(start), s.index(end, s.index(start))
calc = """  const ps=[...d.players].sort((a,b)=>(a.rank??999)-(b.rank??999)||(b.stbTotal??-Infinity)-(a.stbTotal??-Infinity));
  const members=ps.filter(M.is);
  const guestsData=await getJSON('data/guests.json').catch(()=>({guests:[]}));
  const guestIds=new Set((guestsData.guests||[]).flatMap(g=>[g.golferId,...(g.historicalGolferIds||[])]).filter(Boolean).map(String));
  const guestNumbers=new Set((guestsData.guests||[]).flatMap(g=>g.cgfNumbers||[]).map(regKey));
  const isGuest=p=>guestIds.has(String(p.golferId))||guestNumbers.has(regKey(p.memberNumber));
  let seasonTournament=null,seasonRule=null;
  for(let year=2017;year<=2026&&!seasonTournament;year++){try{const x=await SEAS(year);const st=(x.tournaments||[]).find(q=>String(q.cgfId)===String(id));if(st){seasonTournament=st;seasonRule=RULES.find(r=>r.year===year);}}catch(e){}}
  const tieLowerHcp=seasonRule&&seasonRule.year>=2024;
  const kunstersOrder=members.slice().sort((a,b)=>(b.stbTotal??-Infinity)-(a.stbTotal??-Infinity)||(tieLowerHcp?1:-1)*((a.hcpBefore??Infinity)-(b.hcpBefore??Infinity))||(a.rank??999)-(b.rank??999));
  const placeScale=String(seasonRule?.place||'').split('/').map(Number).filter(Number.isFinite);
  const holeStats=p=>{let par=0,birdie=0,eagle=0,albatros=0,hio=0;for(const h of p.holes||[]){if(h.type==='HOLE IN ONE')hio++;else if(h.relativeToPar===-3)albatros++;else if(h.relativeToPar===-2)eagle++;else if(h.relativeToPar===-1)birdie++;else if(h.relativeToPar===0)par++;}return {par,birdie,eagle,albatros,hio};};
  const calculatedByGolfer=new Map(kunstersOrder.map((p,i)=>{const h=holeStats(p);const stb=Number(p.stbTotal);const low=stb<=9?-20:stb<=14?-10:stb<=19?-5:0;const raw=(placeScale[i]||0)+h.par*(seasonRule?.par||0)+h.birdie*(seasonRule?.birdie||0)+h.eagle*(seasonRule?.eagle||0)+h.albatros*(seasonRule?.alb||0)+h.hio*(seasonRule?.hio||0)+(seasonRule&&seasonRule.year>=2020?low:0);const coef=Number(seasonTournament?.coef||1);return [String(p.golferId),{rank:i+1,points:raw*coef,raw,coef,...h}];}));
  const hasEagle=[...calculatedByGolfer.values()].some(x=>x.eagle>0);
  const hasAlbatros=[...calculatedByGolfer.values()].some(x=>x.albatros>0);
  const hasHio=[...calculatedByGolfer.values()].some(x=>x.hio>0);
"""
s = s[:a] + calc + s[b:]

start2 = "   '<h2>Výsledková listina · seřazeno podle netto STB</h2>"
end2 = "   '</tbody></table></div>'+\n   '<h2>Jamky hráčů KUNSTERS</h2>'"
if start2 not in s or end2 not in s:
    raise SystemExit('Historic v2: results table anchors not found')
a, b = s.index(start2), s.index(end2, s.index(start2))
block = """   '<h2>Výsledková listina ČGF</h2><p class=\"muted small\">Primární pořadí podle výsledků ČGF. KUNSTERS pořadí a body jsou druhotný výpočet pouze pro členy tour'+(seasonRule?' podle pravidel '+seasonRule.year:'; sezónní pravidla zatím nebyla spárována')+'.</p><div class=\"scroll\"><table><thead><tr><th class=\"n\">ČGF #</th><th>Hráč</th><th class=\"hide-s\">Klub</th><th class=\"n\">HCP před</th><th class=\"n\">HCP po</th><th class=\"n hide-s\">Hrací HCP</th><th class=\"n hide-s\">Odpaliště</th><th class=\"n\">Netto STB</th><th class=\"n\">KUNSTERS #</th>'+(hasEagle?'<th class=\"n\">Eagle</th>':'')+(hasAlbatros?'<th class=\"n\">Albatros</th>':'')+(hasHio?'<th class=\"n\">HIO</th>':'')+'<th class=\"n\">Kunsters body</th></tr></thead><tbody>'+\n   ps.map(p=>{const c=calculatedByGolfer.get(String(p.golferId));const level=M.is(p)?'member':(isGuest(p)?'guest':'external');return '<tr class=\"click player-'+level+'\" data-g=\"'+p.golferId+'\"><td class=\"n\">'+esc(p.rankLabel||p.rank)+'</td><td>'+nameLink(p)+(level==='guest'?' <span class=\"pill mini\">host</span>':'')+'</td><td class=\"hide-s\" title=\"'+esc(p.club)+'\">'+esc(p.clubCode||p.club)+'</td><td class=\"n\">'+fmt(p.hcpBefore)+'</td><td class=\"n\">'+fmt(p.hcpAfter)+'</td><td class=\"n hide-s\">'+fmt(p.playingHcp)+'</td><td class=\"n hide-s\">'+esc(TEE[p.round?.tee]||p.round?.tee||'')+'</td><td class=\"n big\">'+fmt(p.stbTotal)+'</td><td class=\"n\">'+(c?c.rank+'.':'–')+'</td>'+(hasEagle?'<td class=\"n\">'+fmt(c?.eagle||0)+'</td>':'')+(hasAlbatros?'<td class=\"n\">'+fmt(c?.albatros||0)+'</td>':'')+(hasHio?'<td class=\"n\">'+fmt(c?.hio||0)+'</td>':'')+'<td class=\"n big\">'+(c&&seasonRule?fmt(c.points):'–')+'</td></tr>';}).join('')+\n"""
s = s[:a] + block + s[b:]
p.write_text(s, encoding='utf-8')

css = Path('docs/style.css')
c = css.read_text(encoding='utf-8')
marker = '/* Historic statistics v2 responsive foundation */'
if marker not in c:
    c += """

/* Historic statistics v2 responsive foundation */
main{width:min(1460px,calc(100% - 48px));max-width:none;box-sizing:border-box}
.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.two>div{min-width:0}
.two .scroll{max-width:100%;overflow-x:auto}
td,th{overflow-wrap:anywhere}
.player-external{opacity:.48}
.player-external:hover{opacity:.8}
.player-guest{opacity:.78;background:rgba(255,255,255,.22)}
.player-member{font-weight:600}
.pill.mini{padding:1px 6px;font-size:.72em;vertical-align:middle}
@media(max-width:1050px){.two{grid-template-columns:1fr}main{width:min(100% - 24px,900px)}}
@media(max-width:650px){main{width:calc(100% - 12px);padding-left:14px;padding-right:14px}}
"""
    css.write_text(c, encoding='utf-8')

index = Path('docs/index.html')
h = index.read_text(encoding='utf-8')
h = h.replace('style.css?v=18','style.css?v=19').replace('app.js?v=19','app.js?v=20')
index.write_text(h, encoding='utf-8')
