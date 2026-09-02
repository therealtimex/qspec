#!/usr/bin/env node
// Kept for the 1.0.0 command name. Same as `qspec lint`.
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const r = spawnSync(process.execPath, [join(__dirname, "qspec.js"), "lint", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status ?? 1);
