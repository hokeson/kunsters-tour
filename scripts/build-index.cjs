// Sestavi prehled turnaju pro web: <dir>/index.json
const fs=require('fs');const path=require('path');
const dir=process.argv[2]||'data/imports';
const files=fs.readdirSync(dir).filter(f=>/^\d+\.json$/.test(f));
const tournaments=files.map(f=>{const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
  const w=[...d.players].sort((a,b)=>(a.rank??999)-(b.rank??999))[0];
  return {tournamentId:d.tournamentId,categoryId:d.categoryId,name:d.tournament?.name,date:d.tournament?.date,venue:d.tournament?.venue,format:d.tournament?.format,players:d.players.length,winner:w?.name,winnerScore:w?.officialScore??w?.stbTotal};});
fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({generatedAt:new Date().toISOString(),tournaments},null,1));
console.log('index.json:',tournaments.length,'turnaju');
