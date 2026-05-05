const db = require('../db/database');
const { rawResultKey } = require('../services/dedupeService');
function buildQuery(job, keywords) {
  const terms = [...keywords, job.person_name].filter(Boolean).map(v => `"${String(v).replace(/"/g, '')}"`);
  return terms.join(' OR ');
}
async function search(job, source, keywords) {
  const base = source.base_url || 'https://www.courtlistener.com/api/rest/v4/';
  const url = new URL('search/', base);
  url.searchParams.set('q', buildQuery(job, keywords));
  url.searchParams.set('type', job.case_type || 'o');
  url.searchParams.set('order_by', 'dateFiled desc');
  url.searchParams.set('filed_after', job.date_start || '1990-01-01');
  if (job.date_end) url.searchParams.set('filed_before', job.date_end);
  if (job.court) url.searchParams.set('court', job.court);
  const headers = { Accept: 'application/json', 'User-Agent': 'The Record Room AI legal-records scanner (admin initiated; review queue only)' };
  if (process.env.COURTLISTENER_TOKEN) headers.Authorization = `Token ${process.env.COURTLISTENER_TOKEN}`;
  const response = await fetch(url, { headers });
  db.insert('request_log', { source_id: source.id, connector: 'courtlistener', url: url.toString(), method: 'GET', status_code: response.status, notes: 'API search; results are review-queue only.' });
  if (!response.ok) throw new Error(`CourtListener API returned ${response.status}`);
  const json = await response.json();
  const items = (json.results || []).slice(0, job.max_results || 25);
  return items.map(item => {
    const text = [item.caseName, item.caseNameFull, item.snippet, item.syllabus, item.plain_text].filter(Boolean).join('\n');
    const matched = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
    const record = {
      scanner_job_id: job.id,
      source_id: source.id,
      source_name: source.name,
      state: job.state,
      county: job.county,
      court: item.court || job.court,
      jurisdiction: item.court_id || source.jurisdiction,
      case_name: item.caseName || item.caseNameFull,
      case_number: item.docketNumber,
      case_type: job.case_type,
      docket_entry_title: item.docket_entry_title,
      docket_entry_text: item.snippet || item.syllabus,
      filing_date: item.dateFiled,
      document_title: item.caseName || item.caseNameFull,
      document_type: item.type || 'opinion/search result',
      document_url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : item.download_url,
      source_url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : url.toString(),
      source_record_id: item.id || item.cluster_id || item.docket_id,
      matched_keywords: JSON.stringify(matched),
      judge_public: item.judges,
      attorneys_public: item.attorney,
      confidence_score: Math.min(1, 0.25 + matched.length * 0.1 + (job.person_name && text.toLowerCase().includes(String(job.person_name).toLowerCase()) ? 0.2 : 0) + 0.2),
      review_status: 'new result',
      notes: 'Imported from CourtListener/RECAP API; not public until admin approval.'
    };
    record.duplicate_key = rawResultKey(record);
    return record;
  });
}
module.exports = { name: 'CourtListener / RECAP', search };
