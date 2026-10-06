---
id: DOC-OVERVIEW-0008
title: 8. THE DEVELOPER MODEL
kind: documentation
status: derived
version: 5.0.0
authority_scope: [8-the-developer-model]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 8. THE DEVELOPER MODEL

### 8.1 Controlled Ecosystem

Dumby is not an open marketplace where anyone can publish a module. Module development is restricted to confirmed developers who meet one of two criteria:

1. **Hired developers** — developers employed by Dumby's development company. They build first-party modules as part of the Dumby team, with full access to the framework's internals, its development pipeline, and its review process.

2. **Licensed developers** — independent developers or organisations who have obtained a license to develop modules for the Dumby platform. They build third-party modules under the Dumby module contract, subject to the same review pipeline, security gates, and quality standards as first-party modules.

### 8.2 Why Not Open Development

The decision to restrict module development is a direct consequence of Dumby's philosophy. A controlled developer ecosystem is what makes the quality guarantee possible:

- **Quality bar.** Every module in the Dumby catalog meets the same engineering standard — typed contracts, validated manifests, reviewed code, sandboxed execution, resource quotas. An open marketplace where anyone can publish without review cannot maintain this bar.
- **Security.** A module running inside Dumby has access to shared infrastructure — the database, the cache, the event bus, the permission engine. An unreviewed module could exfiltrate data, escalate privileges, or consume unbounded resources. The review pipeline — manifest validation, security review, sandboxed execution, dependency audit, resource quota testing — exists because modules are not isolated app-store apps running in a sandbox; they are code running inside a shared process.
- **Accountability.** When a guild operator installs a Dumby module, they know who built it, who reviewed it, and who is responsible. A licensed developer is bound by their licensing agreement to maintain their module, respond to security reports, and fix critical bugs. An anonymous contributor has no such obligation.
- **Commercial model.** Dumby's development company invests in the framework, the infrastructure, the review pipeline, and the support organisation. The licensing model funds this investment. An open, free marketplace does not sustain a commercial product.

### 8.3 The Developer Experience

For developers who are confirmed and licensed, the Dumby development experience is designed to be the best in the Discord bot ecosystem:

- **Write features, not infrastructure.** The developer provides business logic. The framework provides everything else — the Discord connection, the database, the cache, the event bus, the permission engine, the job queue, the HTTP server, the logging, the metrics, the tracing, the configuration system, the hot-reload mechanism, the testing framework, and the deployment pipeline.
- **Typed contracts.** Every module declares a manifest validated against a strict Zod schema. Every cross-module interaction happens through typed DI tokens. Every event subscription has a documented payload shape. The TypeScript compiler catches integration bugs at authoring time, before a test runs.
- **Progressive disclosure.** A developer's first module touches one file, one interface. A stateful, job-scheduling, cache-backed module has the whole framework available. The simple case is simple; the complex case is supported. Nothing is forced on the developer until they need it.
- **Swastik deployment pipeline.** Modules are uploaded, validated, sandboxed, staged, and promoted through an automated pipeline. The developer supplies the module package; everything else — manifest extraction, identity validation, license check, security review, staging, promotion, and hot-swap signalling — happens without further input.
- **Private modules.** A developer can build a module for their own guild without publishing it to the marketplace. A private module passes every validation and promotion step exactly as a public module does — it simply never appears in the browsable catalog until the developer chooses to publish it.

### 8.4 The Licensing Path

A medium server administrator who builds a private module for their own community has a clear path to commercialisation:

1. **Build privately.** The module is developed against the Dumby contract, validated, and deployed to the developer's own guild. It is not visible to other communities.
2. **Apply for a license.** The developer applies to Dumby's development company for a module development license. The application includes the module, its manifest, and its intended use case.
3. **Review and approval.** The module passes through the five-gate review pipeline: manifest validation, automated security scan, manual security review, resource quota sandboxed execution, and cryptographic signing.
4. **Publication.** Once approved and signed, the module is published to the Dumby marketplace catalog. It becomes available for installation by any guild.
5. **Commercial terms.** The licensing agreement between the developer and Dumby's company defines the commercial terms — revenue share, support obligations, maintenance requirements, and the developer's ongoing responsibilities.

The path from "I needed this one custom thing" to "I am selling this feature to other communities" does not require rebuilding the module as a standalone bot, finding hosting, building a payment system, or establishing a support organisation. It requires passing the review pipeline and signing a license. Everything else — hosting, scaling, deployment, billing infrastructure — is provided by Dumby.

---

---
