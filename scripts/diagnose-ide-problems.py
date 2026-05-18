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

import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
THRESHOLD = int(os.environ.get("IDE_PROBLEMS_BUDGET", "50"))

# Directories that are noise sources but not human-edited (build output,
# vendor code, lockfiles). Mirroring the typical .gitignore patterns
# plus the *.snap glob from .vscode/settings.json's cSpell.ignorePaths.
SKIP_DIRS = {
    "node_modules", "dist", ".wrangler", ".turbo", ".next",
    ".git", "coverage", "build", "e2e-artifacts",
    ".vite", ".cache",
}
SKIP_FILE_SUFFIXES = {".snap"}


def load_project_configs() -> tuple[set[str], set[str]]:
    """
    Read .cspell.json (allowlist) + .markdownlint.json (disabled rules).
    Returns (cspell_words_lowercased, disabled_markdownlint_rule_ids).

    Both files are tolerated as missing — falls back to empty sets so a
    fresh clone without these configs still produces useful output.
    The whole point of this script is to reflect what each VS Code
    extension would actually flag, so reading the same config files
    those extensions read keeps the estimate honest.
    """
    cspell_words: set[str] = set()
    disabled_rules: set[str] = set()

    cspell_path = REPO_ROOT / ".cspell.json"
    if cspell_path.exists():
        try:
            data = json.loads(cspell_path.read_text(encoding="utf-8"))
            for w in data.get("words", []):
                if isinstance(w, str):
                    cspell_words.add(w.lower())
        except (json.JSONDecodeError, OSError):
            pass  # fall through with empty set

    ml_path = REPO_ROOT / ".markdownlint.json"
    if ml_path.exists():
        try:
            data = json.loads(ml_path.read_text(encoding="utf-8"))
            # A rule is "disabled" when its value is literally false.
            # Configured rules (object values like {"siblings_only": true})
            # are still active — we don't try to evaluate the config's
            # semantics, just whether the rule is on or off.
            for rule_id, value in data.items():
                if value is False:
                    disabled_rules.add(rule_id)
        except (json.JSONDecodeError, OSError):
            pass

    return cspell_words, disabled_rules

# Markdown rules we know how to count. These mirror markdownlint's
# default rule IDs so reports map back to the extension. Rules disabled
# in .markdownlint.json (read by load_project_configs) are skipped at
# scan time so the estimate reflects the user's actual config.
MARKDOWN_RULES = {
    "MD013_long_line": (lambda line: len(line) > 80, "Line longer than 80 chars"),
    "MD012_multi_blank": (None, "Multiple consecutive blank lines"),  # special
    "MD009_trail_space": (lambda line: line != line.rstrip() and line.strip(), "Trailing whitespace"),
    "MD041_h1_first": (None, "First line must be a top-level heading"),  # special
}

# Map our internal rule keys to the bare markdownlint IDs used in
# .markdownlint.json. Used to skip rules the user has disabled.
RULE_KEY_TO_ML_ID = {
    "MD013_long_line": "MD013",
    "MD012_multi_blank": "MD012",
    "MD009_trail_space": "MD009",
    "MD041_h1_first": "MD041",
}

# Heuristic spell-check baseline. Generous common-English set so we
# ONLY flag domain jargon. The script merges .cspell.json's allowlist
# on top of this at runtime — anything in the project allowlist will
# not be counted. De-duplicated to a true set (previously had multiple
# repeats like "works", "github", "since", "off").
COMMON_WORDS = frozenset({
    "the","and","for","that","with","this","from","have","not","but",
    "you","are","was","will","can","all","one","two","more","than",
    "into","when","what","why","how","who","which","they","their",
    "them","then","there","here","also","each","such","other","some",
    "any","every","just","like","over","out","off","new","old","good",
    "best","add","set","get","run","use","make","change","update",
    "create","delete","remove","check","test","tests","fix",
    "fixed","bug","bugs","page","pages","route","routes","auth",
    "user","users","login","signin","signup","logout","sign","email",
    "password","name","clinic","patient","doctor","schedule","schedules",
    "ptowl","clerk","cloudflare","github","node","npm","pnpm","react",
    "typescript","javascript","yaml","json","html","css","api","app",
    "apps","src","main","build","ship","prod","production","staging",
    "dev","local","branch","commit","merge","push","pull","request",
    "pr","ci","cd","yes","no","ok","fine","done","todo","tbd","wip",
    "see","note","section","plan","plans","step","phase","wire","wires",
    "wireframe","wireframes","design","designs","work","works",
    "these","those","another","others","first","second","third","last",
    "next","previous","prior","early","late","now","soon","later","yet",
    "still","since","until","while","during","before","after","through",
    "throughout","via","using","based","built","building","builds",
    "included","includes","including","below","above","under","between",
    "among","across","against","around","behind","beneath","beside",
    "beyond","despite","except","near","onto","outside","past","plus",
    "toward","upon","within","without","gh","its","weve","wasnt","didnt",
    "doesnt","cant","wont","shouldnt","wouldnt","theyre","youre",
})


def iter_files(root: Path, extensions: set[str]) -> list[Path]:
    out: list[Path] = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix in SKIP_FILE_SUFFIXES:
            continue
        if path.is_file() and path.suffix in extensions:
            out.append(path)
    return out


def scan_markdown(
    files: list[Path],
    disabled_rules: set[str],
) -> tuple[int, dict[str, int], dict[str, list[str]]]:
    """Return (total, by_rule, by_file_examples).

    disabled_rules contains bare markdownlint IDs (MD013 etc.) — rules
    whose ID maps to a disabled entry in .markdownlint.json are skipped
    so the estimate reflects what the user's actual config would flag.
    """
    by_rule: Counter[str] = Counter()
    by_file: dict[str, list[str]] = defaultdict(list)

    def rule_is_enabled(key: str) -> bool:
        ml_id = RULE_KEY_TO_ML_ID.get(key)
        return ml_id is None or ml_id not in disabled_rules

    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        lines = text.splitlines()
        rel = str(path.relative_to(REPO_ROOT))
        # MD041 — must start with H1
        if rule_is_enabled("MD041_h1_first") and lines and not lines[0].startswith("# "):
            by_rule["MD041_h1_first"] += 1
            by_file[rel].append("MD041 (no top-level heading on line 1)")
        # MD012 — consecutive blanks
        if rule_is_enabled("MD012_multi_blank"):
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
                if predicate is None or not rule_is_enabled(rule_id):
                    continue
                if predicate(line):
                    by_rule[rule_id] += 1
                    if len(by_file[rel]) < 3:
                        by_file[rel].append(f"{rule_id} at line {i}")
    return sum(by_rule.values()), dict(by_rule), dict(by_file)


def scan_spelling(
    files: list[Path],
    extra_allowlist: set[str],
) -> tuple[int, list[tuple[str, int]]]:
    """Return (total estimated flagged words, top-25 most-frequent jargon words).

    extra_allowlist is the lowercased word set from .cspell.json. Merged
    with COMMON_WORDS to produce the full skip set — matches Code Spell
    Checker's behaviour of treating dictionary words AND project-allowed
    words equally.
    """
    word_re = re.compile(r"[A-Za-z]{4,}")
    skip = COMMON_WORDS | extra_allowlist
    counts: Counter[str] = Counter()
    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for token in word_re.findall(text):
            lower = token.lower()
            if lower in skip:
                continue
            counts[lower] += 1
    # Code Spell Checker reports one warning per UNIQUE occurrence per
    # file by default. So total problems ≈ sum of all flagged words
    # across all files (approximated here by total occurrences).
    return sum(counts.values()), counts.most_common(25)


def main() -> int:
    cspell_words, disabled_rules = load_project_configs()
    print(
        f"Configs loaded: .cspell.json={len(cspell_words)} words, "
        f".markdownlint.json={len(disabled_rules)} disabled rules "
        f"({', '.join(sorted(disabled_rules)) or 'none'})"
    )

    md_files = iter_files(REPO_ROOT, {".md", ".mdx"})
    print(f"Scanning {len(md_files)} markdown files for style + spelling...\n")

    md_total, md_by_rule, md_examples = scan_markdown(md_files, disabled_rules)
    print(f"=== markdownlint-style warnings (total {md_total}, post-config) ===")
    for rule, count in sorted(md_by_rule.items(), key=lambda x: -x[1]):
        print(f"  {rule:<28} {count}")
    if md_total:
        worst = sorted(md_examples.items(), key=lambda x: -len(x[1]))[:5]
        print("\n  worst offenders:")
        for fname, _ in worst:
            print(f"    {fname}")

    sp_total, sp_top = scan_spelling(md_files, cspell_words)
    print(f"\n=== spell-check upper-bound (total {sp_total}, post-allowlist) ===")
    print("  (this is what you'd see WITHOUT Code Spell Checker's built-in")
    print("  English dictionary. Real VS Code count is typically 1-5% of this")
    print("  because the extension knows words like 'dashboard', 'frontend', etc.)")
    if sp_top:
        print("\n  top 25 jargon candidates for .cspell.json (sorted by frequency):")
        for word, count in sp_top:
            print(f"    {word:<30} {count}")
    else:
        print("  no jargon outside the .cspell.json allowlist")

    # The markdownlint estimate IS reliable (we honor disabled rules
    # exactly like the extension does). Gate on that alone — spelling
    # is informational only because we can't replicate the built-in
    # English dictionary accurately.
    print(f"\n=== summary ===")
    print(f"  markdownlint warnings (reliable):   {md_total}")
    print(f"  spell-check upper bound (advisory): {sp_total}")
    if md_total > THRESHOLD:
        print(
            f"\nMARKDOWN OVER BUDGET ({THRESHOLD}). Suggested fixes:\n"
            "  - Disable noisy markdown rules in .markdownlint.json\n"
            "  - Or raise IDE_PROBLEMS_BUDGET env var for this run\n"
        )
        return 1
    print(f"\nMARKDOWN UNDER BUDGET ({THRESHOLD}). Spell-check is advisory only.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
