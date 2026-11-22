import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const arg = (name, fallback=null) => { const i=process.argv.indexOf(`--${name}`); return i>=0 ? process.argv[i+1] : fallback; };
const tournamentId = Number(arg('tournament'));
const categoryId = Number(arg('category'));
const dryRun = process.argv.includes('--dry-run');
if (!tournamentId || !categoryId) throw new Error('Use --tournament ID --category ID');

// Normalizace popisku řádku: bez skrytých znaků (např. měkké dělení ve „Stable­ford“), malá písmena, bez diakritiky, sjednocené mezery (vč. nezlomitelných)
const norm = s => (s||'').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s\u00a0]+/g,' ').trim().toLowerCase();
// Pomlčka / prázdná buňka = škrtnutá (zvednutá) jamka
const isPickup = v => v==null || /^[\s\-\u2010-\u2015\u2212]*$/.test(v);
const num = v => { if (isPickup(v)) return null; const n=Number(String(v).replace(',','.').trim()); return Number.isFinite(n) ? n : null; };

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ locale:'cs-CZ' });
const base='https://www.cgf.cz/cz/turnaje/turnaje-vyhledavani/turnaj';
await page.goto(`${base}/vysledkova-listina-kategorie?id=${tournamentId}&categoryId=${categoryId}`, {waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);

const links = await page.locator('a[href*="vysledkova-listina-hrace"]').evaluateAll(as => as.map(a => ({name:(a.textContent||'').trim(), href:a.getAttribute('href')})));
const uniq=[...new Map(links.map(x=>[x.href,x])).values()];
const out=[];
const warnings=[];
for (const link of uniq) {
  const u=new URL(link.href, 'https://www.cgf.cz');
  const golferId=Number(u.searchParams.get('golferId'));
  if(!golferId) continue;
  await page.goto(u.href,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(900);
  // Všechny řádky tabulky (thead, tbody i tfoot), buňky th i td – popisek je vždy v 1. buňce
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
    else if(S===1) type='HOLE IN ONE'; else if(rel===-3) type='ALBATROS'; else if(rel===-2) type='EAGLE'; else if(rel===-1) type='BIRDIE'; else if(rel===0) type='PAR';
    return {hole:i+1,par:P,strokes:S,hcpStrokes:H,stb:ST,pickedUp,relativeToPar:rel,type};
  });
  const stbTotal = holes.every(h=>h.stb==null) ? null : holes.reduce((a,h)=>a+(h.stb||0),0);
  out.push({tournamentId,categoryId,golferId,name:link.name,source:u.href,stbTotal,holes});
}
await browser.close();
const payload={generatedAt:new Date().toISOString(),tournamentId,categoryId,players:out};
if(warnings.length) payload.warnings=warnings;
if(dryRun) console.log(JSON.stringify(payload,null,2)); else { await fs.mkdir('data/imports',{recursive:true}); await fs.writeFile(`data/imports/${tournamentId}.json`,JSON.stringify(payload,null,2)); }
if(warnings.length) console.warn('VAROVÁNÍ:', JSON.stringify(warnings,null,2));
