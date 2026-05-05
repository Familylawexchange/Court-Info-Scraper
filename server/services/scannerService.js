const db = require('../db/database');
const reviewQueue = require('./reviewQueueService');
const { KEYWORD_GROUPS } = require('../config');
const courtlistener = require('../connectors/courtlistener');
const connectors = {
  'CourtListener / RECAP': courtlistener,
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
async function runScannerJob(input) {
  input.date_start = enforceDateFloor(input.date_start);
  const source = db.get('SELECT * FROM sources WHERE id = @source_id', { source_id: input.source_id });
  if (!source) throw new Error('Source not found');
  if (!source.api_available && !/placeholder|configurable/i.test(source.access_method || '')) throw new Error('This source is manual/import only unless API or license-compatible export is configured.');
  const jobId = db.insert('scanner_jobs', { ...input, status: 'running', custom_keywords: input.custom_keywords || '', max_results: Number(input.max_results || 25) });
  const job = db.get('SELECT * FROM scanner_jobs WHERE id = @jobId', { jobId });
  try {
    const connector = connectors[source.name];
    if (!connector) throw new Error('No connector configured for this source.');
    const result = await connector.search(job, source, keywordList(job));
    if (result && result.blocked) {
      db.run('UPDATE scanner_jobs SET status = @status, error_message = @message, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'access restricted/manual import required', message: result.message });
      return { jobId, status: 'access restricted/manual import required', message: result.message };
    }
    let count = 0;
    for (const record of result) {
      const id = db.insert('raw_results', record);
      reviewQueue.enqueue('raw_result', id, 'Scanner/API result requires admin review before use or publication.', 'normal', 'new result');
      count += 1;
    }
    db.run('UPDATE scanner_jobs SET status = @status, results_count = @count, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'complete', count });
    return { jobId, status: 'complete', results_count: count };
  } catch (error) {
    db.run('UPDATE scanner_jobs SET status = @status, error_message = @message, last_run_at = CURRENT_TIMESTAMP WHERE id = @jobId', { jobId, status: 'error', message: error.message });
    throw error;
  }
}
function listJobs() { return db.all('SELECT sj.*, s.name AS source_name FROM scanner_jobs sj LEFT JOIN sources s ON s.id = sj.source_id ORDER BY sj.created_at DESC LIMIT 200'); }
module.exports = { runScannerJob, listJobs, keywordList, enforceDateFloor };
