// Gate: every contract is valid JSON with an $id, AND any port default a contract
// declares must agree with the canonical port registry in status/facts.json.
// (config.schema.json previously defaulted HEALTH_PORT to 3000 against facts' 8081.)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
let bad = 0;
for (const f of readdirSync('contracts')) {
  if (f.endsWith('.json')) {
    try { const j = JSON.parse(readFileSync('contracts/' + f, 'utf8')); if (!j.$id) { console.error('FAIL: no $id ' + f); bad++; } }
    catch (e) { console.error('FAIL: bad json ' + f); bad++; }
  }
}
if (existsSync('contracts/config.schema.json') && existsSync('status/facts.json')) {
  const cfg = JSON.parse(readFileSync('contracts/config.schema.json', 'utf8'));
  const facts = JSON.parse(readFileSync('status/facts.json', 'utf8'));
  const props = cfg.$defs && cfg.$defs.bootstrap && cfg.$defs.bootstrap.properties;
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v && 'default' in v && facts.ports && k in facts.ports && v.default !== facts.ports[k]) {
      console.error(`FAIL: config default ${k}=${v.default} contradicts facts.ports.${k}=${facts.ports[k]}`); bad++;
    }
  }
}
if (bad) process.exit(1);
console.log('OK: contracts valid; port defaults reconcile with facts.json');
