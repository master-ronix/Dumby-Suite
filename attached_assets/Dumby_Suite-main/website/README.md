# website/

Reserved workspace directory for the Dumby frontend — dashboard, portal, and public-facing web content.

**Status: Reserved — explicitly out of scope per `directive.md` §0.3.**

This includes: the MDIS frontend renderer, any web dashboard, and the operator portal.
The MDIS *backend contract* (the four auto-exposed REST endpoints and `dashboardSchema` type system)
lives in `apps/main/` as a Tier-3 scaffold. The frontend itself is never built here.

See `docs/master-prompt.md` §1.3 for the full non-goals statement.
