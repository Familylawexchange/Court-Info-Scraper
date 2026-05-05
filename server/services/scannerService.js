const db = require('../db/database');
const reviewQueue = require('./reviewQueueService');
const { KEYWORD_GROUPS } = require('../config');
const recordRoomClient = require('./recordRoomClient');
const connectors = {
  'Mock Connector': require('../connectors/mock'),
  'CourtListener': require('../connectors/courtlistener'),
  'CourtListener Search API': require('../connectors/courtlistener'),
  'CourtListener / RECAP': require('../connectors/courtlistener'),
  'Georgia Appellate Opinions': require('../connectors/georgia'),
  'Florida Appellate Opinions': require('../connectors/florida'),
  'California Appellate Opinions': require('../connectors/california'),
  'Ohio Appellate Opinions': require('../connectors/ohio'),
  'South Carolina Appellate Opinions': require('../connectors/southCarolina'),
  'Texas Appellate Opinions': require('../connectors/texas')
};
function enforceDateFloor(dateStart) {
  if (!dateStart) return '1990-01-01';
  if (dateStart < '1990-01-01') throw new Error('Scanner jobs cannot include data before 1990-01-01.');
  return dateStart;
}
function keywordList(job) {
  const group = KEYWORD_GROUPS[job.keyword_group] || [];
  const custom = String(job.custom_keywords || '').split(',').map(v => v.trim()).filter(Boolean);
  return [...new Set([...group, ...custom])];
}
function jobPayload(input, source) {
  return {
    created_by: input.created_by || 'admin', source_id: Number(input.source_id), source_category: input.source_category || source.source_category,
    state: input.state || source.state, county: input.county || source.county, court: input.court || source.court,
    keyword_group: input.keyword_group, custom_keywords: input.custom_keywords || '', person_name: input.person_name || '', role: input.role || '',
    case_type: input.case_type || '', date_start: enforceDateFloor(input.date_start), date_end: input.date_end || '', max_results: Number(input.max_results || 25),
    result_handling: input.result_handling || 'save locally only', include_official_only: input.include_official_only ? 1 : 0,
    include_manual_sources: input.include_manual_sources ? 1 : 0, include_commercial_leads: input.include_commercial_leads ? 1 : 0,
    exclude_login_captcha: input.exclude_login_captcha === false || input.exclude_login_captcha === 'false' ? 0 : 1, status: 'running'
  };
}
function manualMessage(source) {
  return 'This source is manual/import/API-required and cannot be automatically crawled. Search this source manually, download/export permitted records, then upload or paste the result into Research Leads.';
}
async function runScannerJob(input) {
  const source = db.get('SELECT * FROM sources WHERE id = @source_id', { source_id: input.source_id });
  if (!source) throw new Error('Source not found');
  const jobId = db.insert('scanner_jobs', jobPayload(input, source));
  const job = db.get('SELECT * FROM scanner_jobs WHERE id = @jobId', { jobId });
  try {
    if (!source.safe_to_run_boolean) {
      const message = manualMessage(source);
      db.run('UPDATE scanner_jobs SET status = @status, error_message = @message, last_log = @message, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'manual/import/API-required', message });
      return { jobId, status: 'manual/import/API-required', message, source };
    }
    const connector = connectors[source.name] || connectors[source.source_name];
    if (!connector) throw new Error('No connector configured for this source. Configure an allowed API/open connector or use manual import.');
    const result = await connector.search(job, source, keywordList(job));
    if (result && result.blocked) {
      db.run('UPDATE scanner_jobs SET status = @status, error_message = @message, last_log = @message, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'access restricted/manual import required', message: result.message });
      return { jobId, status: 'access restricted/manual import required', message: result.message };
    }
    let count = 0;
    const inserted = [];
    for (const record of result) {
      const id = db.insertRawResult({ ...record, source_category: record.source_category || source.source_category, source_type: record.source_type || source.source_type, visibility: record.visibility || 'admin only' });
      reviewQueue.enqueue('raw_result', id, `scanner import / ${record.source_name || source.name}`, 'normal', 'new result', 'admin only');
      inserted.push(id);
      count += 1;
    }
    let importStatus = null;
    if (['send to Record Room AI','both'].includes(job.result_handling)) importStatus = await recordRoomClient.sendResults(inserted.map(id => db.get('SELECT * FROM raw_results WHERE id = @id', { id })));
    db.run('UPDATE scanner_jobs SET status = @status, results_count = @count, last_log = @log, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'complete', count, log: importStatus ? JSON.stringify(importStatus) : `Inserted ${count} raw results.` });
    return { jobId, status: 'complete', results_count: count, raw_result_ids: inserted, recordRoomImport: importStatus };
  } catch (error) {
    db.run('UPDATE scanner_jobs SET status = @status, error_message = @message, last_log = @message, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'error', message: error.message });
    throw error;
  }
}
function listJobs() { return db.all('SELECT sj.*, s.name AS source_name FROM scanner_jobs sj LEFT JOIN sources s ON s.id = sj.source_id ORDER BY sj.created_at DESC LIMIT 200'); }
async function runMockScannerJob() {
  const source = db.get("SELECT * FROM sources WHERE source_id = 'mock-connector' OR name = 'Mock Connector' LIMIT 1");
  return runScannerJob({ source_id: source.id, keyword_group: 'Judicial Recusal / Disqualification', custom_keywords: 'docket_entry_title smoke test', max_results: 1, created_by: 'test scanner job' });
}
module.exports = { runScannerJob, listJobs, keywordList, enforceDateFloor, runMockScannerJob };
