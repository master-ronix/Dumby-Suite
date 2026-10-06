# Dumby Main Application

`apps/main` is the TypeScript build target for the Dumby unified modular bot system.
It contains the bot runtime, control-plane entry points, migrations, tests, Docker
assets, and deployment manifests.

## Quickstart

```bash
pnpm install
pnpm --filter @workspace/dumby typecheck
pnpm --filter @workspace/dumby lint
pnpm --filter @workspace/dumby test:unit
```

For local infrastructure, copy `.env.example` to `.env`, keep
`DISCORD_ADAPTER=mock` unless you have a real bot token, then run:

```bash
docker compose up
```

The application exposes health checks on `HEALTH_PORT` and API/control-plane routes
on the configured service ports.
