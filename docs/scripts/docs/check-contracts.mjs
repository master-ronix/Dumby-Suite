import { readFileSync, readdirSync } from 'node:fs';
let bad=0;
for (const f of readdirSync('contracts')) {
  if (f.endsWith('.json')) { try { const j=JSON.parse(readFileSync('contracts/'+f,'utf8')); if(!j.$id){console.error('FAIL: no $id '+f);bad++;} } catch(e){ console.error('FAIL: bad json '+f); bad++; } }
}
if(bad) process.exit(1); console.log('OK: contracts valid');
