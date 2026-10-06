import { execSync } from 'node:child_process';

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function main(): void {
  section('1. Unit test suite');
  execSync('pnpm run test:unit', { stdio: 'inherit' });

  section('2. Migration syntax check');
  execSync('npx tsx scripts/check-generated-syntax.ts', { stdio: 'inherit' });

  console.log('\nLocal checks passed.');
}

main();
