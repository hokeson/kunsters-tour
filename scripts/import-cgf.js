import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const arg = (name, fallback=null) => { const i=process.argv.indexOf(`--${name}`); return i>=0 ? process.argv[i+1] : fallback; };
const tournamentId = Number(arg('tournament'));
const categoryId = Number(arg('category'));
const dryRun = process.argv.includes('--dry-run');
if (!tournamentId || !categoryId) throw new Error('Use --tournament ID --category ID');

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ locale:'cs-CZ' });
const base='https://www.cgf.cz/cz/turnaje/turnaje-vyhledavani/turnaj';
await page.goto(`${base}/vysledkova-listina-kategorie?id=${tournamentId}&categoryId=${categoryId}`, {waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);

const links = await page.locator('a[href*="vysledkova-listina-hrace"]').evaluateAll(as => as.map(a => ({name:(a.textContent||'').trim(), href:a.getAttribute('href')})));
const uniq=[...new Map(links.map(x=>[x.href,x])).values()];
const out=[];
for (const link of uniq) {
  const u=new URL(link.href, 'https://www.cgf.cz');
  const golferId=Number(u.searchParams.get('golferId'));
  if(!golferId) continue;
  await page.goto(u.href,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(900);
  const rows=await page.locator('table.scoreDetail tbody tr').evaluateAll(trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => (td.textContent||'').trim())));
  if(!rows.length) continue;
  const metric=new Map(rows.map(r=>[r[0],r]));
  const positions=[...Array(9)].map((_,i)=>i+1).concat([...Array(9)].map((_,i)=>i+11));
  const getRow = (...names) => { for(const n of names){ if(metric.has(n)) return metric.get(n); } return null; };
  const par=getRow('Par','PAR'); const score=getRow('Skóre','Score'); const stb=getRow('Stableford netto','Stableford');
  const holes=positions.map((p,i)=>{ const P=par?Number(par[p]):null; const raw=score?score[p]:null; const S=raw && !raw.includes('-') ? Number(raw) : null; const ST=stb && stb[p] && !stb[p].includes('-') ? Number(stb[p]) : null; const rel=(S!=null&&P!=null)?S-P:null; let type=null; if(S===1) type='HOLE IN ONE'; else if(rel===-3) type='ALBATROS'; else if(rel===-2) type='EAGLE'; else if(rel===-1) type='BIRDIE'; else if(rel===0) type='PAR'; return {hole:i+1,par:P,strokes:S,stb:ST,relativeToPar:rel,type}; });
  out.push({tournamentId,categoryId,golferId,name:link.name,source:u.href,holes});
}
await browser.close();
const payload={generatedAt:new Date().toISOString(),tournamentId,categoryId,players:out};
if(dryRun) console.log(JSON.stringify(payload,null,2)); else { await fs.mkdir('data/imports',{recursive:true}); await fs.writeFile(`data/imports/${tournamentId}.json`,JSON.stringify(payload,null,2)); }
