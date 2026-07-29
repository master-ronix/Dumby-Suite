```
workspace/
├── apps/
│   └── main/
│           ├── .github/
│           │   ├── workflows/
│           │   └── ISSUE_TEMPLATE/
│           ├── .husky/
│           ├── .vscode/
│           │   └── snippets/
│           ├── .changeset/
│           ├── docker/
│           ├── deploy/
│           │   ├── k8s/
│           │   │   ├── base/
│           │   │   └── overlays/
│           │   │       ├── staging/
│           │   │       └── production/
│           │   └── terraform/
│           │       ├── environments/
│           │       │   ├── staging/
│           │       │   └── production/
│           │       └── modules/
│           │           ├── database/
│           │           ├── cache/
│           │           └── kubernetes/
│           ├── docs/
│           │   ├── architecture/
│           │   ├── compliance/
│           │   ├── privacy/
│           │   ├── runbooks/
│           │   ├── security/
│           │   ├── api/
│           │   └── adr/
│           ├── scripts/
│           ├── src/
│           │   ├── bootstrap/
│           │   ├── cache/
│           │   ├── config/
│           │   ├── db/
│           │   │   ├── migrations/
│           │   │   │   ├── core/
│           │   │   │   └── backfill/
│           │   │   └── repositories/
│           │   ├── di/
│           │   ├── discord/
│           │   ├── errors/
│           │   ├── events/
│           │   ├── http/
│           │   │   ├── routes/
│           │   │   └── middleware/
│           │   ├── logging/
│           │   ├── metrics/
│           │   ├── modules/
│           │   │   ├── _template/
│           │   │   │   ├── commands/
│           │   │   │   ├── events/
│           │   │   │   ├── services/
│           │   │   │   ├── repositories/
│           │   │   │   ├── jobs/
│           │   │   │   ├── tasks/
│           │   │   │   ├── config/
│           │   │   │   ├── migrations/
│           │   │   │   ├── locales/
│           │   │   │   └── __tests__/
│           │   │   │       └── fixtures/
│           │   │   └── {module-name}/
│           │   │       ├── commands/
│           │   │       ├── events/
│           │   │       ├── services/
│           │   │       ├── repositories/
│           │   │       ├── jobs/
│           │   │       ├── tasks/
│           │   │       ├── config/
│           │   │       ├── migrations/
│           │   │       ├── locales/
│           │   │       └── __tests__/
│           │   │           └── fixtures/
│           │   ├── permissions/
│           │   ├── queue/
│           │   ├── ratelimit/
│           │   ├── resilience/
│           │   ├── shutdown/
│           │   ├── application/
│           │   ├── commands/
│           │   ├── middleware/
│           │   │   └── built-in/
│           │   ├── i18n/
│           │   ├── tracing/
│           │   ├── shared/
│           │   │   ├── types/
│           │   │   ├── utils/
│           │   │   ├── constants/
│           │   │   └── testing/
│           │   │       ├── fixtures/
│           │   │       └── helpers/
│           │   ├── entry/
│           │   └── monetization/
│           │       ├── adapters/
│           │       ├── models/
│           │       └── services/
│           └── tests/
│               ├── integration/
│               │   ├── http/
│               │   └── modules/
│               ├── unit/
│               │   └── modules/
│               ├── smoke/
│               ├── e2e/
│               ├── load/
│               └── chaos/
├── assets/
│   ├── images/
│   ├── audio/
│   ├── fonts/
│   └── branding/
├── design/
│   ├── brand/
│   ├── mockups/
│   └── ui-kit/
├── docs/
│   ├── reference/
│   ├── changelog/
│   └── rfcs/
├── specs/
│   ├── modules/
│   ├── api/
│   └── rfcs/
├── tools/
│   └── release_manager/
│       ├── scripts/
│       ├── config/
│       └── templates/
└── website/
    ├── public/
    └── src/
        ├── app/
        ├── dashboard/
        ├── portal/
        ├── components/
        ├── lib/
        └── styles/
```
