const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_ROOT, KEYWORD_GROUPS } = require('../config');

const DB_PATH = path.join(DATA_ROOT, 'database.sqlite');
let db;
function initDatabase() {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
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
  const result = run(`INSERT INTO ${table} (${columns}) VALUES (${values})`, data);
  return result.lastInsertRowid;
}
function seedKeywordGroups() {
  const count = getDb().prepare('SELECT COUNT(*) AS count FROM keyword_groups').get().count;
  if (count) return;
  for (const [name, keywords] of Object.entries(KEYWORD_GROUPS)) insert('keyword_groups', { name, keywords: JSON.stringify(keywords), notes: 'Seeded saved scanner keyword group.' });
}
function seedSources() {
  const count = getDb().prepare('SELECT COUNT(*) AS count FROM sources').get().count;
  if (count) return;
  const sources = [
    ['CourtListener / RECAP', null, 'United States', 'public legal database', 'API', 'https://www.courtlistener.com/api/rest/v4/', 1, 0, 0, 1, 'Use API and public endpoints only.', 'Respect CourtListener API terms and rate limits.', '60/min', 'Public legal database / CourtListener / RECAP; review required.'],
    ['Trellis Law', null, 'Commercial platform', 'commercial legal research platform', 'Manual Upload / Licensed Export / API if configured', 'https://trellis.law/', 0, 1, 1, 0, 'No automated scraping unless API/license-compatible export is configured.', 'Manual/import only by default.', 'manual only', 'Research lead; verify against official court source when possible.'],
    ['Westlaw', null, 'Commercial platform', 'commercial legal research platform', 'Manual Upload / Licensed Export', null, 0, 1, 1, 0, 'No automated scraping.', 'Manual/import only.', 'manual only', 'Commercial platform lead unless verified.'],
    ['Lexis', null, 'Commercial platform', 'commercial legal research platform', 'Manual Upload / Licensed Export', null, 0, 1, 1, 0, 'No automated scraping.', 'Manual/import only.', 'manual only', 'Commercial platform lead unless verified.'],
    ['UniCourt', null, 'Commercial platform', 'commercial legal research platform', 'Manual Upload / API if configured', null, 0, 1, 1, 0, 'No automated scraping.', 'Manual/import only unless approved API is configured.', 'manual only', 'Commercial platform lead unless verified.'],
    ['Docket Alarm', null, 'Commercial platform', 'commercial legal research platform', 'Manual Upload / API if configured', null, 0, 1, 1, 0, 'No automated scraping.', 'Manual/import only unless approved API is configured.', 'manual only', 'Commercial platform lead unless verified.'],
    ['PACER / RECAP', null, 'Federal', 'RECAP/PACER record', 'RECAP API / Manual PACER import', 'https://pacer.uscourts.gov/', 0, 1, 1, 0, 'Do not bypass login/paywall; use RECAP or manual lawful exports.', 'Manual PACER documents remain private pending review.', 'manual only', 'Official/RECAP source when supported and reviewed.'],
    ['Georgia Appellate Opinions', 'Georgia', 'State appellate', 'appellate opinion', 'Configurable official connector placeholder', null, 0, 0, 0, 0, 'Configure official endpoint before scanning.', 'Placeholder only.', 'configured later', 'Official state appellate source placeholder.'],
    ['Florida Appellate Opinions', 'Florida', 'State appellate', 'appellate opinion', 'Configurable official connector placeholder', null, 0, 0, 0, 0, 'Configure official endpoint before scanning.', 'Placeholder only.', 'configured later', 'Official state appellate source placeholder.'],
    ['California Appellate Opinions', 'California', 'State appellate', 'appellate opinion', 'Configurable official connector placeholder', null, 0, 0, 0, 0, 'Configure official endpoint before scanning.', 'Placeholder only.', 'configured later', 'Official state appellate source placeholder.'],
    ['Ohio Appellate Opinions', 'Ohio', 'State appellate', 'appellate opinion', 'Configurable official connector placeholder', null, 0, 0, 0, 0, 'Configure official endpoint before scanning.', 'Placeholder only.', 'configured later', 'Official state appellate source placeholder.'],
    ['South Carolina Appellate Opinions', 'South Carolina', 'State appellate', 'appellate opinion', 'Configurable official connector placeholder', null, 0, 0, 0, 0, 'Configure official endpoint before scanning.', 'Placeholder only.', 'configured later', 'Official state appellate source placeholder.'],
    ['Texas Appellate Opinions', 'Texas', 'State appellate', 'appellate opinion', 'Configurable official connector placeholder', null, 0, 0, 0, 0, 'Configure official endpoint before scanning.', 'Placeholder only.', 'configured later', 'Official state appellate source placeholder.']
  ];
  for (const s of sources) insert('sources', { name:s[0], state:s[1], jurisdiction:s[2], source_type:s[3], access_method:s[4], base_url:s[5], api_available:s[6], login_required:s[7], paid_access:s[8], scraping_allowed:s[9], robots_notes:s[10], terms_notes:s[11], rate_limit:s[12], notes:s[13], active:1 });
}
module.exports = { DB_PATH, initDatabase, getDb, run, all, get, insert };
