// Appendix C #17 — the Husky commit-msg hook calls `commitlint`, so the config must exist
// (previously the hook was dead wiring). Conventional Commits, matching the documented workflow.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'revert'],
    ],
    'subject-case': [0],
  },
};
