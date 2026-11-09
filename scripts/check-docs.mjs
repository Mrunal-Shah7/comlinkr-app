#!/usr/bin/env node
// Checks that the docs agree with git and with themselves. See "Checks on the docs" in CLAUDE.md.
//
//   node scripts/check-docs.mjs                  report; exit 1 on errors
//   node scripts/check-docs.mjs --hook           as above, but exit 2 (blocks a Claude Code tool call)
//   node scripts/check-docs.mjs --session-start  print where the work stopped, then the findings; exit 0
//
// Errors: a triage row still "built" on a merged branch; a merged task whose build note has no PR number;
// a build note missing from the docs/README.md list; a relative link to a missing file; an "In progress"
// branch that is already merged. Warnings: handover.md too long; an "In progress" branch that does not exist.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const sessionStart = args.has('--session-start');
const hook = args.has('--hook');

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const docs = join(root, 'docs');
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const rel = (p) => relative(root, p).replace(/\\/g, '/');

const errors = [];
const warnings = [];

if (sessionStart) {
  // Best effort: a fresh origin/main makes the merged-branch checks right. Never fail the session on it.
  try {
    execSync('git fetch -q origin', { cwd: root, stdio: 'ignore', timeout: 15000 });
  } catch {}
}

// Branches whose work is in main. A branch just cut from main (same commit, nothing of its own) is not merged.
const mainSha = git('rev-parse origin/main');
const mergedBranches = new Set(
  [
    git('branch --merged origin/main --format=%(objectname)%20%(refname:short)'),
    git('branch -r --merged origin/main --format=%(objectname)%20%(refname:short)'),
  ]
    .join('\n')
    .split('\n')
    .map((l) => l.trim().split(' '))
    .filter(([sha]) => sha && sha !== mainSha)
    .map(([, b]) => b.replace(/^origin\//, ''))
    .filter((b) => b && b !== 'main' && b !== 'HEAD' && b !== 'origin'),
);
const allBranches = new Set(
  [git('branch --format=%(refname:short)'), git('branch -r --format=%(refname:short)')]
    .join('\n')
    .split('\n')
    .map((b) => b.trim().replace(/^origin\//, ''))
    .filter(Boolean),
);
const branchRe = /`((?:feature|fix|hotfix|chore)\/[\w.\-/]+)`/g;
const branchesIn = (text) => [...text.matchAll(branchRe)].map((m) => m[1]);

// 1. Triage states against git, and merged tasks against their build notes.
const triage = read(join(docs, 'triage.md'));
for (const line of triage.split('\n')) {
  if (!line.startsWith('| TR-')) continue;
  const cells = line.split('|').map((c) => c.trim());
  const id = cells[1];
  const goesTo = cells[10] ?? '';
  const state = cells[11] ?? '';
  if (/^(built|building|done)/i.test(state)) {
    const merged = branchesIn(state).filter((b) => mergedBranches.has(b));
    if (merged.length) {
      errors.push(`triage.md ${id}: state is "${state.slice(0, 60)}" but ${merged.join(', ')} is merged into main. Set it to "merged (PR n)".`);
    }
  }
  const pr = state.match(/^merged \(PR (\d+)\)/i);
  if (pr) {
    for (const [, note] of goesTo.matchAll(/\((build\/[^)]+\.md)\)/g)) {
      const path = join(docs, note);
      if (!existsSync(path)) continue; // reported by the link check
      const text = read(path);
      if (!new RegExp(`(pull request|PR)\\s*#?${pr[1]}\\b`, 'i').test(text)) {
        errors.push(`docs/${note}: ${id} is merged as PR ${pr[1]}, but the build note does not name it.`);
      }
    }
  }
}

// 2. Every build note is in the docs/README.md list.
const readme = read(join(docs, 'README.md'));
for (const f of readdirSync(join(docs, 'build'))) {
  if (!f.endsWith('.md') || f === 'README.md') continue;
  if (!readme.includes(`build/${f}`)) errors.push(`docs/build/${f} is not listed under "Build notes" in docs/README.md.`);
}

// 3. Relative links point at files that exist.
const mdFiles = [join(root, 'CLAUDE.md'), join(root, 'README.md')];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== 'design') walk(p); // design/ holds generated prototypes
    } else if (f.endsWith('.md')) mdFiles.push(p);
  }
};
walk(docs);
for (const file of mdFiles) {
  if (!existsSync(file)) continue;
  let fenced = false;
  read(file)
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*```/.test(line)) fenced = !fenced;
      if (fenced) return;
      const noCode = line.replace(/`[^`]*`/g, '');
      for (const [, target] of noCode.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const path = decodeURIComponent(target.split('#')[0]);
        if (!path) continue;
        if (!existsSync(resolve(dirname(file), path))) errors.push(`${rel(file)}:${i + 1}: link to missing ${target}`);
      }
    });
}

// 4. Handover: "In progress" matches git, and the file stays short.
const handoverPath = join(docs, 'handover.md');
const handover = read(handoverPath);
const sections = handover.split(/\n(?=## )/);
const inProgress = sections.find((s) => s.startsWith('## In progress')) ?? '';
for (const b of branchesIn(inProgress)) {
  if (mergedBranches.has(b)) errors.push(`handover.md "In progress": ${b} is merged into main. Remove its line.`);
  else if (!allBranches.has(b)) warnings.push(`handover.md "In progress": branch ${b} does not exist locally or on origin.`);
}
const entries = sections.filter((s) => /^## \d{4}-\d{2}-\d{2}/.test(s));
const lines = handover.split('\n').length;
if (entries.length > 6 || lines > 200) {
  warnings.push(`handover.md has ${entries.length} entries and ${lines} lines. Keep the latest five; move older ones to docs/handover-archive.md.`);
}

// Output.
const out = [];
if (sessionStart) {
  out.push('Where the work stopped (docs/handover.md):', '', inProgress.trim() || '## In progress\n\n(none)');
  if (entries[0]) out.push('', entries[0].trim());
  out.push('');
}
if (errors.length || warnings.length) {
  out.push(`check-docs: ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const e of errors) out.push(`  error: ${e}`);
  for (const w of warnings) out.push(`  warning: ${w}`);
} else {
  out.push('check-docs: docs agree with git.');
}
const text = out.join('\n');

if (sessionStart) {
  console.log(text);
  process.exit(0);
}
if (errors.length) {
  console.error(text);
  process.exit(hook ? 2 : 1);
}
console.log(text);
