import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const arg = (name, fallback=null) => { const i=process.argv.indexOf(`--${name}`); return i>=0 ? process.argv[i+1] : fallback; };
const tournamentId = Number(arg('tournament'));
const categoryId = Number(arg('category'));
const dryRun = process.argv.includes('--dry-run');
if (!tournamentId || !categoryId) throw new Error('Use --tournament ID --category ID');

// Normalizace popisku: bez skrytých znaků (např. měkké dělení ve „Stable­ford“), malá písmena, bez diakritiky, sjednocené mezery
const norm = s => (s||'').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s\u00a0]+/g,' ').trim().toLowerCase();
const clean = s => (s||'').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'').replace(/[\s\u00a0]+/g,' ').trim();
// Pomlčka / prázdná buňka = škrtnutá (zvednutá) jamka
const isPickup = v => v==null || /^[\s\-\u2010-\u2015\u2212]*$/.test(v);
const num = v => { if (isPickup(v)) return null; const n=Number(String(v).replace(',','.').trim()); return Number.isFinite(n) ? n : null; };
// "36 / 36" -> [36, 36]
const pair = v => { if(!v) return [null,null]; const p=String(v).split('/').map(x=>num(x)); return [p[0]??null, p[1]??null]; };
// Hodnota za popiskem v textu stránky (popisek a hodnota jsou samostatné řádky / buňky)
const field = (tokens, ...labels) => {
  for (const label of labels) {
    const L = norm(label).replace(/:$/,'');
    const i = tokens.findIndex(t => norm(t).replace(/:$/,'') === L);
    if (i >= 0 && i+1 < tokens.length) return clean(tokens[i+1]);
  }
  return null;
};

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ locale:'cs-CZ' });
const base='https://www.cgf.cz/cz/turnaje/turnaje-vyhledavani/turnaj';
const listUrl=`${base}/vysledkova-listina-kategorie?id=${tournamentId}&categoryId=${categoryId}`;
await page.goto(listUrl, {waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);
const warnings=[];

// --- Turnaj: název, místo a datum, kategorie, hrací systém ---
const listTokens = await page.evaluate(() => document.body.innerText.split(/[\n\t]+/).map(s=>s.trim()).filter(Boolean));
const tournamentName = clean(await page.locator('h1').first().textContent().catch(()=>null)) || null;
const venueLine = listTokens.find(t => /\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(t) && t.includes(',')) || null;
const tournament = {
  name: tournamentName,
  venue: venueLine ? clean(venueLine.split(',')[0]) : null,
  date: (venueLine?.match(/\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/)||[null])[0]?.replace(/\s+/g,' ') ?? null,
  category: field(listTokens,'Název'),
  format: field(listTokens,'Hrací systém'),
  withHcp: field(listTokens,'Hra s HCP'),
  hcpAdjusted: field(listTokens,'S úpravou HCP'),
};

// --- Výsledková listina: pořadí, klub, členské číslo, HCP, skóre, HCP po ---
const listRows = await page.evaluate(() => {
  const out=[];
  for (const table of document.querySelectorAll('table')) {
    if (!table.querySelector('a[href*="vysledkova-listina-hrace"]')) continue;
    const headRow = table.querySelector('thead tr') || table.querySelector('tr');
    const headers = headRow ? [...headRow.querySelectorAll('th,td')].map(c=>(c.textContent||'').trim()) : [];
    for (const tr of table.querySelectorAll('tr')) {
      const a = tr.querySelector('a[href*="vysledkova-listina-hrace"]'); if (!a) continue;
      const cells = [...tr.querySelectorAll('td,th')];
      out.push({ href:a.getAttribute('href'), headers,
        nameIdx: cells.findIndex(c => c.contains(a)),
        cells: cells.map(c => (c.textContent||'').trim()) });
    }
  }
  return out;
});
const listInfo = new Map();
for (const r of listRows) {
  const golferId = Number(new URL(r.href,'https://www.cgf.cz').searchParams.get('golferId'));
  const H = r.headers.map(norm);
  const byHeader = H.length === r.cells.length;
  const col = (header, offset) => {
    if (byHeader) { const i = H.indexOf(header); if (i>=0) return clean(r.cells[i]); }
    const i = r.nameIdx + offset; return (i>=0 && i<r.cells.length) ? clean(r.cells[i]) : null;
  };
  const rankLabel = col('poradi', -1);
  const [roundScore] = pair(col('kolo 1', 4));
  listInfo.set(golferId, {
    rank: /^\d+$/.test(rankLabel||'') ? Number(rankLabel) : null,
    rankLabel: rankLabel || null,                      // např. "DQ", "NS", "MR" u hráčů bez pořadí
    clubCode: col('klub', 1),
    memberNumber: col('clenske cislo', 2),
    hcpBefore: num(col('hcp', 3)),
    officialScore: num(col('skore', 5)) ?? roundScore,
    hcpAfter: num(col('hcp po', 6)),
  });
}
if (!listInfo.size) warnings.push({problem:'výsledková listina: tabulka hráčů nenalezena'});

const links = await page.locator('a[href*="vysledkova-listina-hrace"]').evaluateAll(as => as.map(a => ({name:(a.textContent||'').trim(), href:a.getAttribute('href')})));
const uniq=[...new Map(links.map(x=>[x.href,x])).values()];
const out=[];
for (const link of uniq) {
  const u=new URL(link.href, 'https://www.cgf.cz');
  const golferId=Number(u.searchParams.get('golferId'));
  if(!golferId) continue;
  await page.goto(u.href,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(900);

  // --- Hlavička karty hráče ---
  const t = await page.evaluate(() => document.body.innerText.split(/[\n\t]+/).map(s=>s.trim()).filter(Boolean));
  const [parCourse, cr, sr, pcc] = (field(t,'PAR / CR / SR / PCC')||'').split('/').map(x=>num(x));
  const [playingHcp, tournamentHcp] = pair(field(t,'Hrací HCP - plný / turnajový'));
  const L = listInfo.get(golferId) || {};
  const player = {
    rank: L.rank ?? null,
    rankLabel: L.rankLabel ?? null,
    memberNumber: field(t,'Členské číslo') ?? L.memberNumber ?? null,
    club: field(t,'Klub'),
    clubCode: L.clubCode ?? null,
    hcpBefore: num(field(t,'HCP před')) ?? L.hcpBefore ?? null,
    hcpAfter: num(field(t,'HCP po')) ?? L.hcpAfter ?? null,
    playingHcp, tournamentHcp,
    officialScore: L.officialScore ?? null,
  };
  const round = {
    round: num(field(t,'Kolo')),
    date: field(t,'Datum'),
    course: field(t,'Předepsané kolo'),
    gameType: field(t,'Typ hry'),
    tee: field(t,'Odpaliště'),
    par: parCourse ?? null, cr: cr ?? null, sr: sr ?? null, pcc: pcc ?? null,
  };
  if (!L.rankLabel) warnings.push({golferId,name:link.name,problem:'hráč nenalezen ve výsledkové listině'});
  for (const [k,v] of Object.entries({club:player.club, hcpBefore:player.hcpBefore, playingHcp, tee:round.tee}))
    if (v==null) warnings.push({golferId,name:link.name,problem:`údaj „${k}“ nenalezen na kartě hráče`});

  // --- Karta skóre po jamkách ---
  const rows=await page.locator('table.scoreDetail tr').evaluateAll(trs => trs.map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => (td.textContent||'').trim())));
  if(!rows.length) { warnings.push({golferId,name:link.name,problem:'karta skóre nenalezena'}); continue; }
  const metric=new Map(rows.filter(r=>r.length).map(r=>[norm(r[0]),r]));
  const getRow = (...prefixes) => { for(const p of prefixes){ for(const [k,v] of metric){ if(k.startsWith(p)) return v; } } return null; };
  const positions=[...Array(9)].map((_,i)=>i+1).concat([...Array(9)].map((_,i)=>i+11));
  const par=getRow('par');
  const score=getRow('skore','score');
  const hcp=getRow('hcp ran','hcp strokes');
  const stb=getRow('stableford');
  if(!stb) warnings.push({golferId,name:link.name,problem:'řádek Stableford nenalezen',rowsFound:[...metric.keys()]});
  if(!hcp) warnings.push({golferId,name:link.name,problem:'řádek HCP rány nenalezen',rowsFound:[...metric.keys()]});
  const holes=positions.map((p,i)=>{
    const P=par?num(par[p]):null;
    const raw=score?score[p]:null;
    const pickedUp = score ? isPickup(raw) : false;
    const S=pickedUp?null:num(raw);
    let ST=stb?num(stb[p]):null;
    if(pickedUp && ST==null) ST=0;           // škrtnutá jamka = 0 bodů
    const H=hcp?num(hcp[p]):null;
    const rel=(S!=null&&P!=null)?S-P:null;
    let type=null;
    if(pickedUp) type='PICKED UP';
    else if(S===1) type='HOLE IN ONE'; else if(rel===-3) type='ALBATROS'; else if(rel===-2) type='EAGLE'; else if(rel===-1) type='BIRDIE'; else if(rel===0) type='PAR'; else if(rel===1) type='BOGEY'; else if(rel===2) type='DOUBLE BOGEY'; else if(rel===3) type='TRIPLE BOGEY'; else if(rel!==null&&rel!==undefined&&!Number.isNaN(rel)) type='OTHER';
    return {hole:i+1,par:P,strokes:S,hcpStrokes:H,stb:ST,pickedUp,relativeToPar:rel,type};
  });
  const stbTotal = holes.every(h=>h.stb==null) ? null : holes.reduce((a,h)=>a+(h.stb||0),0);
  if (player.officialScore!=null && stbTotal!=null && player.officialScore!==stbTotal)
    warnings.push({golferId,name:link.name,problem:`součet bodů z jamek (${stbTotal}) nesedí s oficiálním skóre (${player.officialScore})`});
  out.push({tournamentId,categoryId,golferId,name:link.name,source:u.href,...player,round,stbTotal,holes});
}
await browser.close();
const payload={generatedAt:new Date().toISOString(),tournamentId,categoryId,tournament,source:listUrl,players:out};
if(warnings.length) payload.warnings=warnings;
if(dryRun) console.log(JSON.stringify(payload,null,2)); else { await fs.mkdir('data/imports',{recursive:true}); await fs.writeFile(`data/imports/${tournamentId}.json`,JSON.stringify(payload,null,2)); }
if(warnings.length) console.warn('VAROVÁNÍ:', JSON.stringify(warnings,null,2));
