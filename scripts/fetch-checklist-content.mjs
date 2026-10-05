// scripts/fetch-checklist-content.mjs
//
// Downloads the private checklist content (tasks, guides and references of
// the real hotel) at build time. The public repository only ships example
// content in <app>/content/checklist; when the private copy exists in
// <app>/content-private/checklist (gitignored), the app reads it instead.
//
// Usage (from frontend/ or backend/): node ../scripts/fetch-checklist-content.mjs <frontend|backend>
//
// Env:
//   CHECKLIST_CONTENT_REPO   owner/name of the private repo (e.g. bpstack/four-points-content)
//   CHECKLIST_CONTENT_TOKEN  read-only token for that repo
//   CHECKLIST_CONTENT_REF    branch, tag or commit (default: main)
//
// Without REPO and TOKEN it does nothing and the example content is used.
// With them, any failure stops the build: deploying the example content to
// production by accident is worse than a failed build.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (target !== "frontend" && target !== "backend") {
  console.error("usage: node fetch-checklist-content.mjs <frontend|backend>");
  process.exit(2);
}

const repo = process.env.CHECKLIST_CONTENT_REPO;
const token = process.env.CHECKLIST_CONTENT_TOKEN;
const ref = process.env.CHECKLIST_CONTENT_REF || "main";

if (!repo || !token) {
  console.log(
    "[checklist] CHECKLIST_CONTENT_REPO/TOKEN not set: using the example content",
  );
  process.exit(0);
}
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error("[checklist] CHECKLIST_CONTENT_REPO must be owner/name");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, target, "content-private", "checklist");

const res = await fetch(
  `https://api.github.com/repos/${repo}/tarball/${encodeURIComponent(ref)}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
);
if (!res.ok) {
  console.error(
    `[checklist] could not download ${repo}@${ref}: HTTP ${res.status}`,
  );
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "checklist-"));
try {
  writeFileSync(
    join(tmp, "content.tar.gz"),
    Buffer.from(await res.arrayBuffer()),
  );
  // Relative paths and cwd: tar on Windows misreads "C:" as a remote host
  execFileSync("tar", ["-xzf", "content.tar.gz"], { cwd: tmp });
  const top = readdirSync(tmp, { withFileTypes: true }).find((d) =>
    d.isDirectory(),
  );
  const src = top && join(tmp, top.name, "checklist");
  if (!src || !existsSync(join(src, "tasks"))) {
    throw new Error("the archive has no checklist/tasks folder");
  }

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  // The backend only validates step ids, so it only needs the tasks
  if (target === "frontend") cpSync(src, dest, { recursive: true });
  else cpSync(join(src, "tasks"), join(dest, "tasks"), { recursive: true });

  const count = readdirSync(join(dest, "tasks")).length;
  console.log(
    `[checklist] private content from ${repo}@${ref} (${count} task files) in ${target}/content-private/checklist`,
  );
} catch (err) {
  console.error(`[checklist] ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
