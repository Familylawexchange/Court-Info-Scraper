const crypto = require('node:crypto');
function normalize(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function hashText(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function rawResultKey(record) {
  if (record.source_record_id) return `source:${record.source_record_id}`;
  if (record.document_url) return `docurl:${normalize(record.document_url)}`;
  if (record.source_url) return `sourceurl:${normalize(record.source_url)}`;
  if (record.case_number && record.docket_entry_title && (record.filing_date || record.event_date)) return `docket:${normalize(record.case_number)}:${normalize(record.docket_entry_title)}:${record.filing_date || record.event_date}`;
  return `case:${normalize(record.case_name)}:${normalize(record.court)}:${record.filing_date || ''}`;
}
function documentHash(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
module.exports = { normalize, hashText, rawResultKey, documentHash };
