#!/usr/bin/env python3
"""
scripts/audit-phi.py

Defends PTOwl's "no PHI stored" invariant (plan §35) by scanning the
codebase for identifiers that suggest Protected Health Information is
being introduced. The whole product promise depends on PTOwl NOT being
in HIPAA scope — a single `diagnosis_code` column in D1 would change
that posture entirely. This script catches such introductions at PR
time, before they ship.

Scope:
  - apps/api/src/**/*.ts        (Hono API + business logic)
  - apps/web/src/**/*.{ts,tsx}  (React UI + types)
  - apps/api/migrations/**/*.sql (D1 schema, the truth about what
                                  fields actually exist)
  - packages/shared/src/**/*.ts (cross-tier types)

For each file, line-comments (//) and block comments (/* */) are
stripped before scanning to reduce false positives from
documentation that legitimately discusses what we don't store.

Three identifier classes:
  - BANNED    — block merge; these are PHI under HIPAA's narrow
                definition (diagnosis, ssn, ICD codes, etc.)
  - WARN      — print but don't fail; PII not strictly PHI (DOB,
                birth date) — per plan §35 these are OK in narrow
                circumstances (pediatric flow) but worth surfacing
                for human review
  - ALLOWLIST — skip even if matched; identifiers we KNOW are OK
                (email, display_name, phone, etc.)

Exit codes:
  0  — no BANNED identifiers found (WARNs are non-fatal)
  1  — at least one BANNED identifier found in production code
  2  — environment / setup error

Off-the-shelf classification:
  - Python stdlib only (pathlib, re, sys)
  - No pip install, no new runtime dependency
"""

from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Directories and file types to scan. Limited to production source —
# we intentionally don't scan tests (test fixtures often use scary-
# sounding names that aren't real schema) or scripts (scripts can
# legitimately reference these terms in comments or admin tooling).
SCAN_TARGETS = [
    ("apps/api/src", {".ts"}),
    ("apps/web/src", {".ts", ".tsx"}),
    ("apps/api/migrations", {".sql"}),
    ("packages/shared/src", {".ts"}),
]

SKIP_DIRS = {"node_modules", "dist", "build", ".wrangler", "__tests__", "test", "tests"}

# Skip co-located test files (the *.test.ts pattern). Test fixtures
# legitimately contain scary-looking PHI/PII strings to verify the
# validators that BLOCK them. We don't want to flag the defense.
SKIP_FILE_PATTERNS = re.compile(r"\.(test|spec)\.(ts|tsx|js|jsx)$")

# EXEMPT_PATHS: production files that LEGITIMATELY reference these
# terms because their job is to defend against the term, OR because
# they describe what PTOwl doesn't store. Each entry must be justified
# with the reason — anyone adding to this list owes the team an
# explanation in code review.
EXEMPT_PATHS: dict[str, str] = {
    # PII validator: detects + redacts SSN/MRN patterns so they don't
    # leak into logs. The validator NEEDS to know the patterns.
    "packages/shared/src/validators/pii.ts":
        "PII validator — detects + redacts the patterns it names",

    # Legal copy: describes what PTOwl deliberately doesn't store.
    # The word "diagnoses" here is in a sentence like "we don't store
    # diagnoses, schedules only," which is the OPPOSITE of a PHI intro.
    "apps/web/src/pages/PrivacyPolicyPage.tsx":
        "Legal copy — describes what PTOwl does NOT store",
    "apps/web/src/pages/SecurityPage.tsx":
        "Legal copy — describes what PTOwl does NOT store",
    "apps/web/src/pages/TermsOfServicePage.tsx":
        "Legal copy — describes what PTOwl does NOT store",
}

# Identifier classes. Matched as word-boundary regex against the
# comment-stripped source. Compiled once at module load.
#
# BANNED terms are HIPAA-defined PHI per plan §35 reading of
# 45 CFR 164.514(b)(2): individually identifiable health information
# tied to a specific patient's medical condition or care.
BANNED_TERMS = {
    "ssn", "social_security_number",
    "diagnosis", "diagnoses", "diagnosis_code",
    "medical_record_number", "mrn", "medical_record",
    "icd10", "icd_10", "icd9", "icd_9",
    "cpt", "cpt_code", "procedure_code",
    "prescription", "prescriptions", "medication", "medications",
    "treatment_code", "treatment_notes", "clinical_notes",
    "symptom", "symptoms",
    "lab_result", "lab_results", "test_result",
    "insurance_id", "insurance_number", "policy_number",
}

# WARN terms are PII (Personally Identifiable Information) but per
# plan §35 they're not strictly PHI in PTOwl's narrow context
# (e.g., DOB is required for pediatric flow but is not health data).
# Surfaced for human review on every PR but do not block merge.
WARN_TERMS = {
    "dob", "date_of_birth", "birth_date", "birthdate",
    "address", "home_address", "street_address",
    "race", "ethnicity",
}

# ALLOWLIST: identifiers known-OK that we DO store and that contain
# a substring that might otherwise trigger a false match. Match is
# checked AFTER tokenization so "patient_id" wouldn't trigger on "id"
# unless we naively substring-matched; this list exists for completeness.
ALLOWLIST_TERMS = {
    "email", "display_name", "name", "phone", "phone_number",
    "clinic_name", "clinic_phone", "timezone",
    "patient_alias", "alias", "status",
    "firebase_uid", "clerk_uid", "clerk_id", "user_id",
    "id", "uuid", "created_at", "updated_at", "deleted_at",
}


def strip_comments(source: str, ext: str) -> str:
    """Remove // line comments and /* */ block comments for TS/JS/SQL.
    SQL uses -- for line comments instead. Crude but effective for
    false-positive reduction; the goal isn't perfect parsing, it's
    avoiding `// don't store diagnosis here` triggering the auditor."""
    if ext == ".sql":
        # SQL line comments
        source = re.sub(r"--.*?$", "", source, flags=re.MULTILINE)
        # SQL block comments
        source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    else:
        # JS/TS line + block comments
        source = re.sub(r"//.*?$", "", source, flags=re.MULTILINE)
        source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    return source


def iter_target_files() -> list[tuple[Path, str]]:
    """Walk every (path, extension) tuple in scope, applying SKIP_DIRS
    and SKIP_FILE_PATTERNS (test files) and EXEMPT_PATHS."""
    out: list[tuple[Path, str]] = []
    for rel_dir, exts in SCAN_TARGETS:
        base = REPO_ROOT / rel_dir
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if not path.is_file() or path.suffix not in exts:
                continue
            if SKIP_FILE_PATTERNS.search(path.name):
                continue
            # Normalize path for EXEMPT_PATHS lookup — Windows uses \
            # in str(path), but EXEMPT_PATHS keys use forward slashes
            # so the same allowlist works cross-platform.
            rel = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
            if rel in EXEMPT_PATHS:
                continue
            out.append((path, path.suffix))
    return out


def scan_for_terms(
    source: str,
    terms: set[str],
) -> dict[str, list[int]]:
    """Return {term: [line_numbers]} for any matches. Word-boundary
    regex so 'mrn' doesn't match 'modern' and 'diagnosis' doesn't
    match 'diagnosistest' etc."""
    if not terms:
        return {}
    # Build a single alternation pattern for efficiency. Escape each
    # term in case any contain regex metacharacters (none today, but
    # defensive).
    pattern = re.compile(
        r"\b(" + "|".join(re.escape(t) for t in terms) + r")\b",
        re.IGNORECASE,
    )
    hits: dict[str, list[int]] = defaultdict(list)
    for line_no, line in enumerate(source.splitlines(), start=1):
        for m in pattern.finditer(line):
            term = m.group(1).lower()
            if term in ALLOWLIST_TERMS:
                continue
            hits[term].append(line_no)
    return dict(hits)


def main() -> int:
    files = iter_target_files()
    if not files:
        print(f"FATAL: no source files found under {[t[0] for t in SCAN_TARGETS]}", file=sys.stderr)
        return 2

    print(f"audit-phi.py  scanning {len(files)} files for PHI-suggestive identifiers")
    print(f"  banned   ({len(BANNED_TERMS)} terms — block merge if found)")
    print(f"  warn     ({len(WARN_TERMS)} terms — print but allow)")
    print(f"  allowlist({len(ALLOWLIST_TERMS)} terms — never flagged)")
    if EXEMPT_PATHS:
        print(f"  exempt   ({len(EXEMPT_PATHS)} files — see EXEMPT_PATHS in script for rationale):")
        for rel, reason in sorted(EXEMPT_PATHS.items()):
            print(f"    - {rel}  ({reason})")
    print(f"  (skip)   .test.* + .spec.* files (test fixtures legitimately use scary terms)")

    banned_hits: dict[str, dict[str, list[int]]] = {}  # file -> term -> lines
    warn_hits: dict[str, dict[str, list[int]]] = {}

    for path, ext in files:
        try:
            raw = path.read_text(encoding="utf-8", errors="ignore")
        except OSError as e:
            print(f"  (warn: cannot read {path.relative_to(REPO_ROOT)}: {e})", file=sys.stderr)
            continue
        stripped = strip_comments(raw, ext)
        rel = str(path.relative_to(REPO_ROOT))

        bhits = scan_for_terms(stripped, BANNED_TERMS)
        if bhits:
            banned_hits[rel] = bhits
        whits = scan_for_terms(stripped, WARN_TERMS)
        if whits:
            warn_hits[rel] = whits

    print()
    if warn_hits:
        print("=== WARN: PII identifiers (plan §35 — OK in narrow scope, human review) ===")
        for rel, terms in sorted(warn_hits.items()):
            print(f"  {rel}")
            for term, lines in sorted(terms.items()):
                line_str = ", ".join(str(n) for n in lines[:5])
                more = f" ... +{len(lines) - 5} more" if len(lines) > 5 else ""
                print(f"    {term}: line {line_str}{more}")
    else:
        print("=== WARN: no PII identifiers found")

    print()
    if banned_hits:
        print("=== FAIL: BANNED identifiers (PHI per plan §35 — blocks merge) ===")
        for rel, terms in sorted(banned_hits.items()):
            print(f"  {rel}")
            for term, lines in sorted(terms.items()):
                line_str = ", ".join(str(n) for n in lines[:5])
                more = f" ... +{len(lines) - 5} more" if len(lines) > 5 else ""
                print(f"    {term}: line {line_str}{more}")
        print()
        print("ACTION: PTOwl's 'no PHI stored' invariant (plan §35) prohibits")
        print("storing these fields. If you genuinely need one, the invariant")
        print("itself needs to change first — this requires a HIPAA compliance")
        print("review, a BAA with Cloudflare, and updates to VISION.md +")
        print("AUTH-LIFECYCLE.md. Do not silently allow.")
        return 1

    print("=== PASS: no BANNED PHI identifiers in production source ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
