const cmds = [
  ["bun", "run", "--filter", "shared", "dev"],
  ["bun", "run", "--filter", "server", "dev"],
  ["bun", "run", "--filter", "client", "dev"],
];

console.log("\n  Starting dev servers...\n");

const spawned = cmds.map((cmd) =>
  Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
  })
);

// Wait briefly for servers to start
await Bun.sleep(2000);

console.log(`
  ✓ shared   → watching for changes
  ✓ server   → http://localhost:3000
  ✓ client   → http://localhost:5173
`);

// Open client in default browser
Bun.spawn(["open", "http://localhost:5173"]);

// Keep alive until Ctrl+C
process.on("SIGINT", () => {
  for (const p of spawned) p.kill();
  process.exit();
});

await Promise.all(spawned.map((p) => p.exited));
