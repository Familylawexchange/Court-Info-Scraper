const SENSITIVE_PATTERNS = [
  { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { name: 'financial account', pattern: /\b(?:account|acct)\s*#?:?\s*\d{6,}\b/gi },
  { name: 'minor child marker', pattern: /\bminor child|juvenile|date of birth|dob\b/gi },
  { name: 'address marker', pattern: /\b\d{2,5}\s+[A-Za-z0-9 .'-]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct)\b/g }
];
function scanText(text) { return SENSITIVE_PATTERNS.filter(p => p.pattern.test(text || '')).map(p => p.name); }
function publicEligibleDocument(doc) { return doc.review_status === 'approved public' && doc.visibility === 'public approved' && !['needs redaction','confidential/blocked','sealed/do not publish'].includes(doc.redaction_status); }
module.exports = { scanText, publicEligibleDocument };
