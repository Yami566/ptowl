// HIPPO Engine — PII Detection Patterns
// Scans text inputs for accidental PII entry

export interface PIIMatch {
  type: string;
  pattern: string;
  match: string;
  index: number;
}

const PII_PATTERNS: Array<{ type: string; pattern: RegExp; description: string }> = [
  {
    type: 'ssn',
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    description: 'Social Security Number',
  },
  {
    type: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    description: 'Phone Number',
  },
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    description: 'Email Address',
  },
  {
    type: 'dob',
    pattern: /\b(?:0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    description: 'Date of Birth',
  },
  {
    type: 'mrn',
    pattern: /\b(?:MRN|mrn|Medical Record)[:\s#]*\d{5,}\b/g,
    description: 'Medical Record Number',
  },
  {
    type: 'insurance',
    pattern: /\b(?:policy|insurance|member)[:\s#]*[A-Z0-9]{6,}\b/gi,
    description: 'Insurance/Policy Number',
  },
];

export function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];

  for (const { type, pattern, description } of PII_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        pattern: description,
        match: match[0],
        index: match.index,
      });
    }
  }

  return matches;
}

export function hasPII(text: string): boolean {
  return detectPII(text).length > 0;
}
