/**
 * Seed the first-party deployer identity so the module deploy flow authorises a first-party push.
 *
 * UR-20261021-095 — `/internal/deploy` refuses a developer that is not `approved` and whose licence is
 * not `approved` (and whose licence tier must cover the module tier). The first-party modules all
 * declare `devId: dev_first_party`, so that identity must exist before `push-modules` runs. This is
 * idempotent: it upserts the developer as approved and the licence as approved at the broadest tier
 * class (`admin`, which covers core and standard).
 *
 * Plain JS (no TS/tsx) so it runs in the production runtime image. Best-effort: a failure here is
 * logged and swallowed by the caller — a bot with no modules is worse than a bot that starts.
 */
import pg from 'pg';

const DEV_ID = 'dev_first_party';
const USERNAME = 'Quixotic Mnemonics';
const LICENSE_ID = 'lic_first_party';

export async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('seed-first-party-deployer: DATABASE_URL is not set; skipping');
    return;
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      `insert into developers ("devId", username, "approvalStatus", "approvedBy", "approvedAt")
       values ($1, $2, 'approved', 'bootstrap', now())
       on conflict ("devId") do update
         set "approvalStatus" = 'approved', "approvedBy" = 'bootstrap', "approvedAt" = now(),
             "updatedAt" = now()`,
      [DEV_ID, USERNAME],
    );
    await client.query(
      `insert into licenses ("licenseId", "subjectDevId", "tierClass", state, "approvedBy", "approvedAt")
       values ($1, $2, 'admin', 'approved', 'bootstrap', now())
       on conflict ("licenseId") do update
         set state = 'approved', "approvedBy" = 'bootstrap', "approvedAt" = now(),
             "updatedAt" = now()`,
      [LICENSE_ID, DEV_ID],
    );
    console.log(
      `seed-first-party-deployer: ${DEV_ID} approved; licence ${LICENSE_ID} approved (admin)`,
    );
  } finally {
    await client.end();
  }
}
