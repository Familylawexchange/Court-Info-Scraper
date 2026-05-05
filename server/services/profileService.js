const db = require('../db/database');
const { normalize } = require('./dedupeService');
function createProfile(data) {
  return db.insert('profiles', { name: data.name, normalized_name: normalize(data.name), role: data.role, court_or_office: data.court_or_office, firm_or_agency: data.firm_or_agency, county: data.county, state: data.state, bar_number: data.bar_number, known_cases: data.known_cases, profile_status: data.profile_status || 'new profile', visibility: data.visibility || 'pending', source_summary: data.source_summary, admin_notes: data.admin_notes, public_notes: data.public_notes });
}
function listProfiles(q = '') { return db.all('SELECT * FROM profiles WHERE @q = "" OR normalized_name LIKE @like ORDER BY name LIMIT 200', { q, like: `%${normalize(q)}%` }); }
module.exports = { createProfile, listProfiles };
