const db = require('../db/database');
const reviewQueue = require('./reviewQueueService');
function createClaim(data) {
  const id = db.insert('claims', { profile_id: data.profile_id, claim_text: data.claim_text, claim_category: data.claim_category, claim_status: data.claim_status || 'needs admin review', reliability_label: data.reliability_label || 'needs admin review', source_basis: data.source_basis, date_of_event: data.date_of_event, public_visibility: data.public_visibility || 'pending', admin_notes: data.admin_notes });
  if (data.document_id || data.raw_result_id || data.source_id) db.insert('claim_sources', { claim_id: id, document_id: data.document_id, raw_result_id: data.raw_result_id, source_id: data.source_id, quote_or_excerpt: data.quote_or_excerpt, source_url: data.source_url, page_reference: data.page_reference, line_reference: data.line_reference, source_label: data.source_label });
  reviewQueue.enqueue('claim', id, 'Claim created; source-bound review required.', 'normal', 'needs manual verification');
  return id;
}
module.exports = { createClaim };
