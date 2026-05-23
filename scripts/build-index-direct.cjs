const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const npmCli = path.join(
  process.env.ProgramFiles || "C:\\Program Files",
  "nodejs",
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js"
);

const result = spawnSync(process.execPath, [npmCli, "run", "build:index"], {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);