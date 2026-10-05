import { readFileSync } from 'node:fs';
const c=JSON.parse(readFileSync('status/capabilities.json','utf8'));
let bad=0;
for(const cap of c.capabilities){ if(!['implemented','partial','specified','dead','deferred'].includes(cap.status)){console.error('FAIL: bad status '+cap.id);bad++;} }
if(bad) process.exit(1); console.log(`OK: ${c.capabilities.length} capabilities, statuses valid`);
