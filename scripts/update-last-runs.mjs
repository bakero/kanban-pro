import fs from "node:fs";
import path from "node:path";

const key = process.env.LAST_RUN_KEY || "regression_master";
const repoRoot = process.cwd();
const jsonPath = path.join(repoRoot, "docs-site", "src", "content", "docs", "qa", "last-runs.json");

const runUrl = process.env.LAST_RUN_URL
  || (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "");

if (!fs.existsSync(jsonPath)) {
  throw new Error(`Missing ${jsonPath}`);
}

const raw = fs.readFileSync(jsonPath, "utf8");
const data = raw.trim() ? JSON.parse(raw) : {};

const next = {
  ...data,
  [key]: runUrl || data[key] || "",
};

fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2) + "\n");
console.log(`Updated ${key} => ${next[key]}`);
