const db = require('../db/database');
const reviewQueue = require('./reviewQueueService');
const sourceReliability = require('./sourceReliabilityService');
function ensureNoPre1990(filingDate) {
  if (filingDate && filingDate < '1990-01-01') throw new Error('Records before 1990 are not accepted.');
}
function createResearchLead(data) {
  ensureNoPre1990(data.filing_date);
  const sourceType = data.source_type || 'commercial legal research platform';
  const status = data.status || sourceReliability.defaultReviewStatus(data.source_name, data.verification_source);
  const id = db.insert('research_leads', { ...data, source_type: sourceType, acquisition_method: data.acquisition_method || 'Manual Entry', status });
  reviewQueue.enqueue('research_lead', id, 'Manual/commercial/platform lead requires review and official-source verification when possible.', 'normal', status);
  return id;
}
function leadToRawResult(id) {
  const lead = db.get('SELECT * FROM research_leads WHERE id = @id', { id });
  if (!lead) throw new Error('Research lead not found');
  const source = db.get('SELECT * FROM sources WHERE lower(name) = lower(@name)', { name: lead.source_name }) || {};
  const rawId = db.insertRawResult({
    source_id: source.id,
    source_name: lead.source_name,
    state: lead.state,
    county: lead.county,
    court: lead.court,
    case_name: lead.case_name,
    case_number: lead.case_number,
    docket_entry_text: lead.docket_entry_text,
    filing_date: lead.filing_date,
    document_title: lead.document_title,
    source_url: lead.source_url,
    judge_public: lead.judge,
    gal_public: lead.guardian_ad_litem,
    attorneys_public: lead.attorneys,
    prosecutor_public: lead.prosecutor,
    evaluator_public: lead.evaluator,
    review_status: lead.status || 'needs official source verification',
    notes: `Converted from research lead ${id}. ${lead.notes || ''}`
  });
  reviewQueue.enqueue('raw_result', rawId, 'Converted from research lead; review required.', 'normal', 'needs official source verification', 'admin only');
  return rawId;
}
module.exports = { createResearchLead, leadToRawResult, ensureNoPre1990 };
