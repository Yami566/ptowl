#!/usr/bin/env python3
"""
scripts/diagnose-ide-problems.py

Walks the repo and reports what's likely generating VS Code "Problems"
panel noise when the workspace's own `pnpm typecheck` + `pnpm lint`
report zero errors. The 765-problems-but-zero-CI-errors mismatch
points at extension-side warnings the repo has no config for.

The Chernobyl-defense-in-depth idea: this script tells you exactly
what each extension is flagging so you can decide once (allowlist
the right words, disable the irrelevant rules) and stop seeing
noise that desensitizes you to real warnings later.

Run:  python scripts/diagnose-ide-problems.py
Exit: 0 if total problems estimate is under THRESHOLD (default 50),
      1 otherwise (CI can use this to fail loud when a docs PR adds
      noise that exceeds an acceptable budget).
"""

from __future__ import annotations

import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
THRESHOLD = int(os.environ.get("IDE_PROBLEMS_BUDGET", "50"))

# Directories that are noise sources but not human-edited (build output,
# vendor code, lockfiles). Mirroring the typical .gitignore patterns
# plus a few VS Code extensions still scan by default.
SKIP_DIRS = {
    "node_modules", "dist", ".wrangler", ".turbo", ".next",
    ".git", "coverage", "build", "e2e-artifacts",
    ".vite", ".cache",
}

# Markdown rules to count. These are the ones markdownlint flags by
# default; mirroring its rule numbering so reports map back to the
# extension's IDs.
MARKDOWN_RULES = {
    "MD013_long_line": (lambda line: len(line) > 80, "Line longer than 80 chars"),
    "MD012_multi_blank": (None, "Multiple consecutive blank lines"),  # special
    "MD009_trail_space": (lambda line: line != line.rstrip() and line.strip(), "Trailing whitespace"),
    "MD041_h1_first": (None, "First line must be a top-level heading"),  # special
}

# Heuristic spell-check: words ≥4 letters, lowercase, not in a small
# common-English baseline. Approximates Code Spell Checker's default
# behaviour for project-specific jargon without depending on Aspell.
COMMON_WORDS = {
    # Generous common-words baseline so we ONLY flag domain jargon.
    # This is approximate — the goal isn't a perfect speller, it's to
    # show roughly which words an unconfigured Code Spell Checker
    # would flag so we can build the project allowlist.
    "the","and","for","that","with","this","from","have","not","but",
    "you","are","was","will","can","all","one","two","more","than",
    "into","when","what","why","how","who","which","they","their",
    "them","then","there","here","also","each","such","other","some",
    "any","every","just","like","over","out","off","new","old","good",
    "best","add","set","get","run","use","make","change","update",
    "create","delete","remove","check","test","tests","run","fix",
    "fixed","bug","bugs","page","pages","route","routes","auth",
    "user","users","login","signin","signup","logout","sign","email",
    "password","name","clinic","patient","doctor","schedule","schedules",
    "ptowl","clerk","cloudflare","github","node","npm","pnpm","react",
    "typescript","javascript","yaml","json","html","css","api","app",
    "apps","src","main","build","ship","prod","production","staging",
    "dev","local","branch","commit","merge","push","pull","request",
    "pr","ci","cd","yes","no","ok","fine","done","todo","tbd","wip",
    "see","note","section","plan","plans","step","phase","wire","wires",
    "wireframe","wireframes","design","designs","work","works","works",
    "what","how","why","when","where","who","which","this","that",
    "these","those","each","every","another","other","others","first",
    "second","third","last","next","previous","prior","early","late",
    "now","then","soon","later","yet","still","since","until","while",
    "during","before","after","through","throughout","via","using",
    "based","built","building","builds","included","includes","including",
    "below","above","under","over","between","among","across","against",
    "around","behind","beneath","beside","beyond","despite","except",
    "near","off","onto","outside","past","plus","since","toward","upon",
    "within","without","github","gh","its","weve","wasnt","didnt",
    "doesnt","cant","wont","shouldnt","wouldnt","theyre","youre","its",
}


def iter_files(root: Path, extensions: set[str]) -> list[Path]:
    out: list[Path] = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix in extensions:
            out.append(path)
    return out


def scan_markdown(files: list[Path]) -> tuple[int, dict[str, int], dict[str, list[str]]]:
    """Return (total, by_rule, by_file_examples)."""
    by_rule: Counter[str] = Counter()
    by_file: dict[str, list[str]] = defaultdict(list)
    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        lines = text.splitlines()
        rel = str(path.relative_to(REPO_ROOT))
        # MD041 — must start with H1
        if lines and not lines[0].startswith("# "):
            by_rule["MD041_h1_first"] += 1
            by_file[rel].append("MD041 (no top-level heading on line 1)")
        # MD012 — consecutive blanks
        consecutive = 0
        for line in lines:
            if not line.strip():
                consecutive += 1
                if consecutive == 2:
                    by_rule["MD012_multi_blank"] += 1
                    by_file[rel].append("MD012 (consecutive blank lines)")
            else:
                consecutive = 0
        # Per-line rules
        for i, line in enumerate(lines, 1):
            for rule_id, (predicate, _desc) in MARKDOWN_RULES.items():
                if predicate is None:
                    continue
                if predicate(line):
                    by_rule[rule_id] += 1
                    if len(by_file[rel]) < 3:
                        by_file[rel].append(f"{rule_id} at line {i}")
    return sum(by_rule.values()), dict(by_rule), dict(by_file)


def scan_spelling(files: list[Path]) -> tuple[int, list[tuple[str, int]]]:
    """Return (total estimated flagged words, top-25 most-frequent jargon words)."""
    word_re = re.compile(r"[A-Za-z]{4,}")
    counts: Counter[str] = Counter()
    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for token in word_re.findall(text):
            lower = token.lower()
            if lower in COMMON_WORDS:
                continue
            counts[lower] += 1
    # Code Spell Checker reports one warning per UNIQUE occurrence per
    # file by default. So total problems ≈ sum of all flagged words
    # across all files (approximated here by total occurrences).
    return sum(counts.values()), counts.most_common(25)


def main() -> int:
    md_files = iter_files(REPO_ROOT, {".md", ".mdx"})
    print(f"Scanning {len(md_files)} markdown files for style + spelling…\n")

    md_total, md_by_rule, md_examples = scan_markdown(md_files)
    print(f"=== markdownlint-style warnings (total {md_total}) ===")
    for rule, count in sorted(md_by_rule.items(), key=lambda x: -x[1]):
        print(f"  {rule:<28} {count}")
    if md_total:
        worst = sorted(md_examples.items(), key=lambda x: -len(x[1]))[:5]
        print("\n  worst offenders:")
        for fname, _ in worst:
            print(f"    {fname}")

    sp_total, sp_top = scan_spelling(md_files)
    print(f"\n=== spell-check estimated warnings (total ~{sp_total}) ===")
    print("  top 25 jargon words (add to .cspell.json to silence):")
    for word, count in sp_top:
        print(f"    {word:<30} {count}")

    grand_total = md_total + sp_total
    print(f"\n=== grand total estimated IDE problems: {grand_total} ===")
    if grand_total > THRESHOLD:
        print(
            f"OVER BUDGET ({THRESHOLD}). Suggested fixes:\n"
            "  - Add .cspell.json with project allowlist (silences most spelling)\n"
            "  - Add .markdownlint.json relaxing MD013 in docs (long URLs / tables)\n"
            "  - Add .vscode/settings.json to scope extensions to docs only\n"
        )
        return 1
    print(f"UNDER BUDGET ({THRESHOLD}). No action needed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
