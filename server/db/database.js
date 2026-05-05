const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_ROOT, KEYWORD_GROUPS, SCANNER_SOURCES } = require('../config');

const DB_PATH = path.join(DATA_ROOT, 'database.sqlite');
let db;

const RAW_RESULT_COLUMNS = {
  source_name: 'TEXT',
  source_type: 'TEXT',
  source_category: 'TEXT',
  source_label: 'TEXT',
  reliability_tags: 'TEXT',
  state: 'TEXT',
  county: 'TEXT',
  court: 'TEXT',
  jurisdiction: 'TEXT',
  case_name: 'TEXT',
  case_number: 'TEXT',
  case_type: 'TEXT',
  role: 'TEXT',
  keyword_group: 'TEXT',
  docket_entry_title: 'TEXT',
  docket_entry_text: 'TEXT',
  filing_date: 'TEXT',
  event_date: 'TEXT',
  document_title: 'TEXT',
  document_type: 'TEXT',
  document_url: 'TEXT',
  source_url: 'TEXT',
  source_record_id: 'TEXT',
  matched_keywords: 'TEXT',
  parties_public: 'TEXT',
  attorneys_public: 'TEXT',
  judge_public: 'TEXT',
  gal_public: 'TEXT',
  prosecutor_public: 'TEXT',
  evaluator_public: 'TEXT',
  confidence_score: 'REAL DEFAULT 0',
  duplicate_key: 'TEXT',
  review_status: "TEXT DEFAULT 'new result'",
  visibility: "TEXT DEFAULT 'admin only'",
  notes: 'TEXT'
};

const SOURCE_COLUMNS = {
  source_id: 'TEXT',
  source_name: 'TEXT',
  source_category: 'TEXT',
  county: 'TEXT',
  court: 'TEXT',
  access_type: 'TEXT',
  automation_status: 'TEXT',
  captcha_likely: 'INTEGER DEFAULT 0',
  safe_to_run_boolean: 'INTEGER DEFAULT 0'
};

const REVIEW_QUEUE_COLUMNS = { visibility: "TEXT DEFAULT 'admin only'" };
const SCANNER_JOB_COLUMNS = {
  source_category: 'TEXT',
  result_handling: 'TEXT',
  include_official_only: 'INTEGER DEFAULT 0',
  include_manual_sources: 'INTEGER DEFAULT 0',
  include_commercial_leads: 'INTEGER DEFAULT 0',
  exclude_login_captcha: 'INTEGER DEFAULT 1',
  last_log: 'TEXT'
};

function tableColumns(table) {
  return getDb().prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
}
function addMissingColumns(table, wanted) {
  const existing = new Set(tableColumns(table));
  const added = [];
  for (const [column, definition] of Object.entries(wanted)) {
    if (!existing.has(column)) {
      getDb().exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      added.push(column);
    }
  }
  if (added.length) console.log(`[db:migrate] Added columns to ${table}: ${added.join(', ')}`);
}
function runStartupMigrations() {
  addMissingColumns('raw_results', RAW_RESULT_COLUMNS);
  addMissingColumns('sources', SOURCE_COLUMNS);
  addMissingColumns('review_queue', REVIEW_QUEUE_COLUMNS);
  addMissingColumns('scanner_jobs', SCANNER_JOB_COLUMNS);
}
function initDatabase() {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  runStartupMigrations();
  seedKeywordGroups();
  seedSources();
  return db;
}
function getDb() { return db || initDatabase(); }
function run(sql, params = {}) { return getDb().prepare(sql).run(params); }
function all(sql, params = {}) { return getDb().prepare(sql).all(params); }
function get(sql, params = {}) { return getDb().prepare(sql).get(params); }
function insert(table, data) {
  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  const columns = keys.join(', ');
  const values = keys.map(k => `@${k}`).join(', ');
  const params = Object.fromEntries(keys.map(k => [k, data[k]]));
  const result = run(`INSERT INTO ${table} (${columns}) VALUES (${values})`, params);
  return result.lastInsertRowid;
}
function normalizeRawResult(data) {
  const mapped = { ...data };
  if (mapped.title && !mapped.document_title) mapped.document_title = mapped.title;
  if (mapped.title && !mapped.docket_entry_title) mapped.docket_entry_title = mapped.title;
  if (mapped.document_title && !mapped.docket_entry_title) mapped.docket_entry_title = mapped.document_title;
  if (mapped.docket_entry_title && !mapped.document_title) mapped.document_title = mapped.docket_entry_title;
  if (!mapped.review_status) mapped.review_status = 'new result';
  if (!mapped.visibility) mapped.visibility = 'admin only';
  return mapped;
}
function insertRawResult(data) {
  const normalized = normalizeRawResult(data || {});
  const columns = tableColumns('raw_results');
  const columnSet = new Set(columns);
  const keys = Object.keys(normalized).filter(k => columnSet.has(k) && normalized[k] !== undefined);
  const missingColumns = Object.keys(RAW_RESULT_COLUMNS).filter(k => !columnSet.has(k));
  const ignoredFields = Object.keys(normalized).filter(k => !columnSet.has(k));
  console.log('[raw_results:insert] table columns found:', columns.join(', '));
  console.log('[raw_results:insert] insert fields being used:', keys.join(', '));
  console.log('[raw_results:insert] missing columns:', missingColumns.join(', ') || 'none');
  if (ignoredFields.length) console.log('[raw_results:insert] ignored extra payload fields:', ignoredFields.join(', '));
  try {
    return insert('raw_results', Object.fromEntries(keys.map(k => [k, normalized[k]])));
  } catch (error) {
    console.error('[raw_results:insert] exact SQL error:', error.message);
    throw error;
  }
}
function seedKeywordGroups() {
  for (const [name, keywords] of Object.entries(KEYWORD_GROUPS)) {
    const existing = get('SELECT id FROM keyword_groups WHERE name = @name', { name });
    if (!existing) insert('keyword_groups', { name, keywords: JSON.stringify(keywords), notes: 'Seeded saved scanner keyword group.' });
  }
}
function seedSources() {
  for (const s of SCANNER_SOURCES) {
    const existing = get('SELECT id FROM sources WHERE source_id = @source_id OR name = @source_name', { source_id: s.source_id, source_name: s.source_name });
    const row = {
      source_id: s.source_id,
      name: s.source_name,
      source_name: s.source_name,
      state: s.state,
      county: s.county,
      court: s.court,
      jurisdiction: s.state || s.court || s.source_category,
      source_type: s.source_type || s.source_category,
      source_category: s.source_category,
      access_method: s.access_type,
      access_type: s.access_type,
      automation_status: s.automation_status,
      base_url: s.base_url,
      api_available: s.access_type === 'API' ? 1 : 0,
      login_required: s.login_required ? 1 : 0,
      paid_access: s.paid_access ? 1 : 0,
      captcha_likely: s.captcha_likely ? 1 : 0,
      scraping_allowed: s.safe_to_run_boolean ? 1 : 0,
      safe_to_run_boolean: s.safe_to_run_boolean ? 1 : 0,
      robots_notes: s.robots_notes,
      terms_notes: s.terms_notes,
      rate_limit: s.rate_limit,
      notes: s.notes,
      active: 1
    };
    if (!existing) insert('sources', row);
  }
}
module.exports = { DB_PATH, initDatabase, getDb, run, all, get, insert, insertRawResult, tableColumns, runStartupMigrations, RAW_RESULT_COLUMNS };
