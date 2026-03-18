// CONFIDENTIAL — TRADE SECRET
// Sports alias mappings for PII protection. 676 two-letter combos (AA-ZZ)
// mapped to famous sports player names. Updated annually after NFL Draft (April).
// Data lives in ../data/player-aliases.json — this module provides typed access.

import aliasData from '../data/player-aliases.json';

export const SPORTS_ALIASES: Record<string, string[]> = aliasData;
