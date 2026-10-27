#!/usr/bin/env node
/**
 * Gate — CI workflow hygiene (D-8.4 item 4).
 *
 * Until this file existed, `spec/governance/part-8-quality-delivery-acceptance.md` rule D-8.4 item 4
 * attributed the enforcement of three invariants to `scripts/check-workflows.mjs` — and no such file
 * was in the repository. The rule text was corrected to say so (UR-20261027-103 / DOC-007, carried as
 * `REC-035` and `OI-12`); this file is the enforcement it described, so the claim can be true again.
 *
 * The three invariants, each a hard failure:
 *
 *   1. **Every action is SHA-pinned.** `uses: owner/repo@<40 hex>` and nothing else — a tag or branch is
 *      mutable, so `@v4` is a supply-chain dependency on whatever the tag points at today. A trailing
 *      `# vX.Y.Z` comment is encouraged (it is how a human reads the pin) but not required.
 *   2. **No secret on a command line.** `${{ secrets.* }}` inside a `run:` block is interpolated into
 *      the shell command, where it is visible to `set -x`, to `ps`, and to any process that logs argv.
 *      Secrets belong in `env:` and are read as `$NAME`.
 *   3. **No kubeconfig outside the temp-file/trap pattern.** A kubeconfig written into the workspace
 *      (or into `$HOME`) survives the step and can be archived or read by a later step. The sanctioned
 *      shape is `mktemp` + `trap 'rm -f "$KUBECONFIG"' EXIT`.
 *
 * Usage: node scripts/check-workflows.mjs [--dir .github/workflows]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dirArg = process.argv.indexOf('--dir');
const WORKFLOW_DIR = dirArg > -1 ? process.argv[dirArg + 1] : '.github/workflows';

const SHA_PIN = /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/;
const LOCAL_ACTION = /^\.\//;
const SECRET_REF = /\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}/;
// A WRITE, not a use: `> path`, `>> path`, or `KUBECONFIG=path` as an assignment. A later step's
// `--kubeconfig path` reads the file the first step wrote, which is the sanctioned multi-step shape.
const KUBECONFIG_WRITE =
  /(?:KUBECONFIG=\s*["']?([^\s"';]*kubeconfig[^\s"';]*)|>>?\s*["']?([^\s"';]*kubeconfig[^\s"';]*|\.kube\/config))/i;

/** Split a workflow into its steps, keeping each step's own lines so `run:` blocks can be inspected. */
function steps(lines) {
  const out = [];
  let current = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*-\s+name:/.test(line) || /^\s*-\s+uses:/.test(line) || /^\s*-\s+run:/.test(line)) {
      if (current) out.push(current);
      current = { startLine: i + 1, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) out.push(current);
  return out;
}

/** The `run:` body of a step, as one string (handles both `run: |` blocks and single-line `run:`). */
function runBody(step) {
  const body = [];
  let collecting = false;
  let runIndent = 0;
  for (const line of step.lines) {
    const match = /^(\s*)run:\s*(.*)$/.exec(line);
    if (match) {
      collecting = true;
      runIndent = match[1].length;
      if (match[2] !== '' && match[2] !== '|' && match[2] !== '>') body.push(match[2]);
      continue;
    }
    if (!collecting) continue;
    if (line.trim() === '') {
      body.push('');
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (indent <= runIndent) {
      collecting = false;
      continue;
    }
    body.push(line);
  }
  return body.join('\n');
}

function main() {
  let files;
  try {
    files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
  } catch {
    console.error(`FAIL: workflow directory not found: ${WORKFLOW_DIR}`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error(`FAIL: no workflow files under ${WORKFLOW_DIR}`);
    process.exit(1);
  }

  const problems = [];
  let pinned = 0;

  for (const file of files) {
    const path = join(WORKFLOW_DIR, file);
    const lines = readFileSync(path, 'utf8').split('\n');

    // 1. SHA pinning, checked line by line so the failure names the line.
    for (let i = 0; i < lines.length; i += 1) {
      // A trailing "# v7.0.1" comment is the human-readable pin and is allowed; the value is the SHA.
      const match = /^\s*(?:-\s+)?uses:\s*(\S+)(?:\s+#.*)?$/.exec(lines[i]);
      if (!match) continue;
      const target = match[1];
      if (LOCAL_ACTION.test(target)) continue;
      if (SHA_PIN.test(target)) {
        pinned += 1;
        continue;
      }
      problems.push(
        `${path}:${i + 1} — action is not SHA-pinned: "${target}". Pin to a 40-hex commit SHA ` +
          `(a tag is mutable; keep the version as a trailing comment).`,
      );
    }

    // 2 and 3. Secrets on a command line, and kubeconfigs outside the temp-file/trap pattern.
    for (const step of steps(lines)) {
      const body = runBody(step);
      if (body === '') continue;
      const label = `${path}:${step.startLine}`;
      if (SECRET_REF.test(body)) {
        problems.push(
          `${label} — a secret is interpolated into a run: block. Put it in env: and read $NAME, so it ` +
            `never appears in the command line.`,
        );
      }
      const kube = KUBECONFIG_WRITE.exec(body);
      if (kube && !/\btrap\b/.test(body) && !/mktemp/.test(body)) {
        const target = kube[1] ?? kube[2] ?? 'kubeconfig';
        problems.push(
          `${label} — a kubeconfig is written without the temp-file/trap pattern ("${target}"). ` +
            `Use mktemp plus trap 'rm -f "$KUBECONFIG"' EXIT so it cannot outlive the step.`,
        );
      }
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`FAIL: ${problem}`);
    process.exit(1);
  }
  console.log(
    `OK: workflow-hygiene (${files.length} workflow(s); ${pinned} action reference(s), all SHA-pinned; ` +
      `no secret on a command line; no kubeconfig outside the temp-file/trap pattern)`,
  );
}

main();
