const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');
const db = require('./db/database');
const scannerService = require('./services/scannerService');
const reviewQueue = require('./services/reviewQueueService');
const extractionService = require('./services/extractionService');
const manualImport = require('./services/manualImportService');
const dedupe = require('./services/dedupeService');
const searchIndex = require('./services/searchIndexService');
const profileService = require('./services/profileService');
const claimService = require('./services/claimService');
const aiSummary = require('./services/aiSummaryService');
const redaction = require('./services/redactionService');
const config = require('./config');

const UPLOAD_DIR = path.join(config.DATA_ROOT, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
db.initDatabase();
function send(res, status, body, headers = {}) { const isString = typeof body === 'string'; res.writeHead(status, { 'Content-Type': isString ? 'text/html; charset=utf-8' : 'application/json', 'X-Admin-Auth-Placeholder': 'Configure real authentication before production.', ...headers }); res.end(isString ? body : JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let data=''; req.on('data', c => { data += c; if (data.length > 30 * 1024 * 1024) reject(new Error('Request too large')); }); req.on('end', () => { if (!data) return resolve({}); try { resolve(JSON.parse(data)); } catch { resolve(Object.fromEntries(new URLSearchParams(data))); } }); req.on('error', reject); }); }
function page(title, mount, description) { return `<!doctype html><html><head><title>${title}</title><style>body{font-family:system-ui;margin:2rem;max-width:1200px}input,select,textarea{display:block;margin:.35rem 0;padding:.45rem;min-width:280px}label{display:block;font-weight:600;margin:.4rem 0}button{padding:.55rem .9rem;margin:.25rem}table{border-collapse:collapse;width:100%;margin-top:1rem}td,th{border:1px solid #ddd;padding:.4rem;vertical-align:top}.warn{background:#fff4d6;padding:1rem;border-left:4px solid #c97}</style></head><body><nav><a href="/admin/scanner">Admin Scanner</a> | <a href="/admin/raw-results">Raw Results</a> | <a href="/admin/research-leads">Research Leads</a> | <a href="/admin/review-queue">Review Queue</a> | <a href="/admin/documents">Documents</a> | <a href="/admin/profiles">Profiles</a> | <a href="/upload">Public Upload</a> | <a href="/search">Public Search</a></nav><h1>${title}</h1><p>${description}</p><div class="warn">Safety: records enter a review queue first. Public search excludes pending, private, sealed, confidential, rejected, and needs-redaction records.</div><div id="app" data-mount="${mount}"></div><script src="/src/pages/${mount}.jsx"></script></body></html>`; }
function queryObj(url) { return Object.fromEntries(url.searchParams.entries()); }
async function createDocumentFromJsonUpload(data, uploadMethod, leadId) {
  if (!data.file_base64) return null;
  manualImport.ensureNoPre1990(data.filing_date);
  const allowed = ['.pdf','.docx','.txt','.jpg','.jpeg','.png','.csv'];
  const original = data.file_name || 'upload.bin';
  const ext = path.extname(original).toLowerCase();
  if (!allowed.includes(ext)) throw new Error('Unsupported file type. Allowed: PDF, DOCX, TXT, JPG, PNG, CSV.');
  const buffer = Buffer.from(String(data.file_base64).split(',').pop(), 'base64');
  if (buffer.length > 25 * 1024 * 1024) throw new Error('File limit is 25 MB.');
  const stored = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, stored);
  fs.writeFileSync(filePath, buffer);
  const source = db.get('SELECT * FROM sources WHERE lower(name) = lower(@name)', { name: data.source_name || 'Other' }) || {};
  const docId = db.insert('documents', { source_id: source.id, file_name: stored, original_file_name: original, file_path: filePath, file_type: data.file_type || 'application/octet-stream', file_size: buffer.length, document_hash: dedupe.documentHash(buffer), document_title: data.document_title || original, document_type: data.document_type, source_type: data.source_type || source.source_type || 'user-submitted document', source_name: data.source_name || 'Public submission', source_url: data.source_url, case_name: data.case_name, case_number: data.case_number, court: data.court, county: data.county, state: data.state, filing_date: data.filing_date, event_date: data.event_date, upload_method: uploadMethod, uploader_name: data.uploader_name, uploader_email: data.uploader_email, review_status: data.review_status || 'needs manual verification', visibility: 'pending', redaction_status: 'needs review', extraction_status: 'pending' });
  reviewQueue.enqueue('document', docId, leadId ? `Document uploaded with research lead ${leadId}.` : 'Uploaded document requires review, redaction screening, and approval.', 'normal', 'needs manual verification');
  await extractionService.extractDocument(docId);
  return docId;
}
async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/') return send(res, 302, '', { Location: '/admin/scanner' });
    if (url.pathname.startsWith('/src/')) { const file = path.join(__dirname, '..', url.pathname); if (!file.startsWith(path.join(__dirname, '..', 'src')) || !fs.existsSync(file)) return send(res, 404, 'Not found'); res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' }); return res.end(fs.readFileSync(file)); }
    const pages = { '/admin/scanner':['Admin Scanner','AdminScanner','Run admin-initiated API/configured scanner jobs.'], '/admin/raw-results':['Raw Results','RawResults','Review scanner results before public use.'], '/admin/research-leads':['Research Leads','ResearchLeads','Manual/import workflow for Trellis, Westlaw, Lexis, UniCourt, Docket Alarm, PACER, official sources, news, and other leads.'], '/admin/review-queue':['Review Queue','ReviewQueue','All scanned/imported records wait here before publication.'], '/admin/documents':['Document Review','DocumentReview','Review uploaded files, extraction, visibility, and redaction.'], '/admin/profiles':['Profile Management','ProfileManager','Manage profiles and source-bound summaries.'], '/upload':['Public Upload Portal','UploadPortal','Public submissions are private/pending by default.'], '/search':['Public Search','PublicSearch','Search approved public records only.'] };
    if (pages[url.pathname]) return send(res, 200, page(...pages[url.pathname]));
    if (/^\/profile\/\d+/.test(url.pathname)) return send(res, 200, page('Public Profile','PublicProfile','Display approved public profile information only.'));
    if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, config);
    if (req.method === 'GET' && url.pathname === '/api/sources') return send(res, 200, db.all('SELECT * FROM sources WHERE active = 1 ORDER BY name'));
    if (req.method === 'GET' && url.pathname === '/api/keyword-groups') return send(res, 200, db.all('SELECT * FROM keyword_groups ORDER BY name'));
    if (req.method === 'POST' && url.pathname === '/api/admin/scanner-jobs') return send(res, 200, await scannerService.runScannerJob({ ...(await readBody(req)), created_by: 'admin' }));
    if (req.method === 'GET' && url.pathname === '/api/admin/scanner-jobs') return send(res, 200, scannerService.listJobs());
    if (req.method === 'GET' && url.pathname === '/api/admin/raw-results') return send(res, 200, db.all('SELECT * FROM raw_results ORDER BY created_at DESC LIMIT 500'));
    let m = url.pathname.match(/^\/api\/admin\/raw-results\/(\d+)\/status$/); if (req.method === 'PATCH' && m) { const body = await readBody(req); db.run('UPDATE raw_results SET review_status = @status, notes = COALESCE(@notes, notes) WHERE id = @id', { id:m[1], status:body.review_status, notes:body.notes }); return send(res, 200, { ok:true }); }
    if (req.method === 'GET' && url.pathname === '/api/admin/review-queue') return send(res, 200, reviewQueue.list(queryObj(url)));
    m = url.pathname.match(/^\/api\/admin\/review-queue\/(\d+)\/status$/); if (req.method === 'PATCH' && m) { const body = await readBody(req); reviewQueue.updateStatus(m[1], body.review_status, body.notes); return send(res, 200, { ok:true }); }
    if (req.method === 'POST' && url.pathname === '/api/admin/research-leads') { const body = await readBody(req); const leadId = manualImport.createResearchLead(body); const documentId = await createDocumentFromJsonUpload(body, 'research lead manual upload', leadId); return send(res, 200, { leadId, documentId }); }
    if (req.method === 'GET' && url.pathname === '/api/admin/research-leads') return send(res, 200, db.all('SELECT * FROM research_leads ORDER BY created_at DESC LIMIT 500'));
    m = url.pathname.match(/^\/api\/admin\/research-leads\/(\d+)\/convert\/raw-result$/); if (req.method === 'POST' && m) return send(res, 200, { rawResultId: manualImport.leadToRawResult(m[1]) });
    if (req.method === 'POST' && url.pathname === '/api/admin/profiles') return send(res, 200, { profileId: profileService.createProfile(await readBody(req)) });
    if (req.method === 'GET' && url.pathname === '/api/admin/profiles') return send(res, 200, profileService.listProfiles(url.searchParams.get('q') || ''));
    if (req.method === 'POST' && url.pathname === '/api/admin/claims') return send(res, 200, { claimId: claimService.createClaim(await readBody(req)) });
    m = url.pathname.match(/^\/api\/admin\/profiles\/(\d+)\/summary$/); if (req.method === 'GET' && m) return send(res, 200, aiSummary.generateSourceBoundSummary(m[1], false));
    if (req.method === 'GET' && url.pathname === '/api/admin/documents') return send(res, 200, db.all('SELECT * FROM documents ORDER BY created_at DESC LIMIT 500'));
    m = url.pathname.match(/^\/api\/admin\/documents\/(\d+)$/); if (req.method === 'PATCH' && m) { const body=await readBody(req); db.run('UPDATE documents SET review_status = COALESCE(@review_status, review_status), visibility = COALESCE(@visibility, visibility), redaction_status = COALESCE(@redaction_status, redaction_status), profile_id = COALESCE(@profile_id, profile_id), updated_at = CURRENT_TIMESTAMP WHERE id = @id', { id:m[1], review_status:body.review_status, visibility:body.visibility, redaction_status:body.redaction_status, profile_id:body.profile_id }); const doc=db.get('SELECT * FROM documents WHERE id = @id',{id:m[1]}); searchIndex.setPublic('document', m[1], redaction.publicEligibleDocument(doc)); return send(res, 200, { ok:true, publicEligible:redaction.publicEligibleDocument(doc) }); }
    if (req.method === 'POST' && url.pathname === '/api/upload') { const body = await readBody(req); const required=['warning_sealed','warning_no_publication','warning_review','warning_good_faith','warning_labels']; if (!required.every(k => body[k] === true || body[k] === 'true' || body[k] === 'on')) throw new Error('Public submission requires all warning checkboxes.'); const documentId = await createDocumentFromJsonUpload(body, 'public submission', null); return send(res, 200, { documentId, status:'pending/private review queue' }); }
    if (req.method === 'GET' && url.pathname === '/api/search') { const results=searchIndex.publicSearch(queryObj(url)); return send(res, 200, { message: results.length ? undefined : 'No approved public records are currently available for this search.', results }); }
    m = url.pathname.match(/^\/api\/profile\/(\d+)$/); if (req.method === 'GET' && m) return send(res, 200, aiSummary.generateSourceBoundSummary(m[1], true));
    return send(res, 404, { error:'Not found' });
  } catch (error) { return send(res, 400, { error: error.message }); }
}
function start(port = process.env.PORT || 3000) { const server = http.createServer(handler); return server.listen(port, () => console.log(`The Record Room AI running at http://localhost:${port}`)); }
if (require.main === module) start();
module.exports = { start, handler };
