const { rawResultKey } = require('../services/dedupeService');
async function search(job, source, keywords) {
  const max = Math.min(Number(job.max_results || 3), 5);
  return Array.from({ length: max }, (_, index) => {
    const n = index + 1;
    const record = {
      scanner_job_id: job.id,
      source_id: source.id,
      source_name: 'Mock Connector',
      source_type: 'public legal database',
      source_category: 'Open/API legal databases',
      state: job.state || 'Test State',
      county: job.county || 'Test County',
      court: job.court || 'Test Court',
      jurisdiction: 'Test jurisdiction',
      case_name: `Mock Test Case ${n}`,
      case_number: `MOCK-${job.id}-${n}`,
      case_type: job.case_type || 'test',
      role: job.role,
      keyword_group: job.keyword_group,
      docket_entry_title: `Mock docket entry title ${n}`,
      docket_entry_text: `TEST DATA ONLY. Mock docket text containing ${(keywords || []).slice(0, 3).join(', ')}.`,
      filing_date: job.date_start || '2024-01-01',
      event_date: job.date_start || '2024-01-01',
      document_title: `Mock document title ${n}`,
      document_type: 'mock scanner result',
      document_url: 'http://localhost:3000/admin/raw-results',
      source_url: 'http://localhost:3000/admin/scanner',
      source_record_id: `mock-${job.id}-${n}`,
      matched_keywords: JSON.stringify((keywords || []).slice(0, 5)),
      parties_public: 'Mock Plaintiff; Mock Defendant',
      attorneys_public: 'Mock Attorney',
      judge_public: 'Mock Judge',
      gal_public: 'Mock GAL',
      prosecutor_public: 'Mock Prosecutor',
      evaluator_public: 'Mock Evaluator',
      confidence_score: 0.75,
      review_status: 'new result',
      visibility: 'admin only',
      source_label: 'unknown source',
      reliability_tags: JSON.stringify(['needs admin review','do not publish']),
      notes: 'TEST DATA ONLY - safe mock connector result. Not public.'
    };
    record.duplicate_key = rawResultKey(record);
    return record;
  });
}
module.exports = { name: 'Mock Connector', search };
