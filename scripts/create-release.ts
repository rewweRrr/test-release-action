#!/usr/bin/env tsx

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as semver from "semver";

type ReleaseInfo = {
    branch: string;
    version: string;
    release_name: string;
    changelog: string;
    tag: string;
};

function run(cmd: string) {
    return execSync(cmd, { encoding: "utf8" }).trim();
}

function safeRun(cmd: string) {
    try {
        return run(cmd);
    } catch {
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
    const inputBump = (process.env.INPUT_BUMP || "patch") as semver.ReleaseType;

    const pkg = readPackageJson();
    const currentVersion: string = pkg.version || "0.0.0";

    const bumped = semver.inc(currentVersion, inputBump);
    if (!bumped) throw new Error("Failed to bump version");
    const newVersion = bumped;

    const branchName = "dev";
    const releaseName = `Release/v.${newVersion}`;
    const tagName = `v${newVersion}`;

    const lastTag = gitLastTag();
    const commitsRaw = gitCommitsSince(lastTag);
    const changelogSection = generateChangelogSection(newVersion, commitsRaw);

    // update files
    pkg.version = newVersion;
    writePackageJson(pkg);
    prependChangelog(changelogSection);

    // commit changes
    run(`git config user.name "github-actions[bot]"`);
    run(`git config user.email "github-actions[bot]@users.noreply.github.com"`);
    run(`git add package.json CHANGELOG.md`);
    run(`git commit -m "chore(release): v${newVersion}"`);

    // create git tag
    run(`git tag ${tagName}`);

    const info: ReleaseInfo = {
        branch: branchName,
        version: newVersion,
        release_name: releaseName,
        changelog: changelogSection,
        tag: tagName,
    };

    fs.writeFileSync("release-info.json", JSON.stringify(info, null, 2), "utf8");
    console.log(`Generated release-info.json:\n${JSON.stringify(info, null, 2)}\n`);
}

main();
