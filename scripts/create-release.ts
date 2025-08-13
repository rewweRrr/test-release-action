#!/usr/bin/env ts-node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as semver from "semver";

type ReleaseInfo = {
  branch: string;
  version: string;
  changelog: string;
  tag?: string;
};

function run(cmd: string) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function safeRun(cmd: string) {
  try {
    return run(cmd);
  } catch (e) {
    return "";
  }
}

function isoDateToday() {
  return new Date().toISOString().split("T")[0];
}

function gitLastTag(): string | null {
  try {
    return run("git describe --tags --abbrev=0");
  } catch {
    return null;
  }
}

function gitCommitsSince(tag: string | null) {
  if (tag) {
    return safeRun(`git log ${tag}..HEAD --pretty=format:"%h %s (%an)"`);
  } else {
    // take all commits
    return safeRun(`git log --pretty=format:"%h %s (%an)"`);
  }
}

function readPackageJson(): any {
  const p = path.resolve(process.cwd(), "package.json");
  if (!fs.existsSync(p)) throw new Error("package.json not found");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writePackageJson(obj: any) {
  const p = path.resolve(process.cwd(), "package.json");
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function prependChangelog(newSection: string) {
  const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
  let existing = "";
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, "utf8");
  }
  const content = `${newSection}\n\n${existing}`;
  fs.writeFileSync(changelogPath, content, "utf8");
}

function generateChangelogSection(version: string, commitsRaw: string) {
  const date = isoDateToday();
  let body = "";
  if (!commitsRaw) {
    body = "- (no commits found)";
  } else {
    const lines = commitsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join("\n");
    body = lines;
  }
  return `## v${version} — ${date}\n\n${body}`;
}

function main() {
  const inputVersion = process.env.INPUT_VERSION || "";
  const inputBump = (process.env.INPUT_BUMP || "patch") as semver.ReleaseType;
  const fromBranch = process.env.FROM_BRANCH || "dev";

  // read current version
  const pkg = readPackageJson();
  const currentVersion: string = pkg.version || "0.0.0";

  let newVersion = inputVersion && inputVersion.trim() !== "" ? inputVersion.trim() : "";

  if (!newVersion) {
    // bump semver
    const bumped = semver.inc(currentVersion, inputBump);
    if (!bumped) throw new Error("Failed to bump version");
    newVersion = bumped;
  }

  // generate branch name
  const branchName = `release/v${newVersion}`;

  // get commits since last tag
  const lastTag = gitLastTag();
  const commitsRaw = gitCommitsSince(lastTag);

  // generate changelog section
  const changelogSection = generateChangelogSection(newVersion, commitsRaw);

  // update package.json
  pkg.version = newVersion;
  writePackageJson(pkg);

  // update CHANGELOG.md by prepending
  prependChangelog(changelogSection);

  // prepare release-info.json for the workflow
  const info: ReleaseInfo = {
    branch: branchName,
    version: newVersion,
    changelog: changelogSection,
    tag: `v${newVersion}`,
  };

  fs.writeFileSync("release-info.json", JSON.stringify(info, null, 2), "utf8");

  console.log(`\nGenerated release-info.json:\n${JSON.stringify(info, null, 2)}\n`);

  // exit without pushing/committing — create-pull-request action will commit workspace state
}

main();
