import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');

if (!existsSync(join(root, 'server/.env')) || !existsSync(join(root, 'server/src/honomono.db'))) {
  console.error('\n  Missing required files. Run "bun run setup" first.\n');
  process.exit(1);
}

const cmds = [
  ['bun', 'run', '--filter', 'server', 'dev'],
  ['bun', 'run', '--filter', 'client', 'dev'],
];

console.log('\n  Starting dev servers...\n');

const spawned = cmds.map((cmd) =>
  Bun.spawn(cmd, {
    stdout: 'inherit',
    stderr: 'inherit',
  }),
);

async function waitForUrl(url: string, intervalMs = 250, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(500) });
      return true;
    } catch {
      await Bun.sleep(intervalMs);
    }
  }
  return false;
}

const ready = await waitForUrl('http://localhost:5173');

console.log(`
  ✓ server   → http://localhost:3000
  ✓ client   → http://localhost:5173
`);

if (ready) Bun.spawn(['open', 'http://localhost:5173']);

process.on('SIGINT', () => {
  for (const p of spawned) p.kill();
  process.exit();
});

await Promise.all(spawned.map((p) => p.exited));
