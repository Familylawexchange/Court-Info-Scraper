const db = require('../db/database');
const BLOCKED_PUBLIC_STATUSES = ['pending','private','rejected','needs redaction','do not publish','admin only'];
function buildText(parts) { return parts.filter(Boolean).join('\n').slice(0, 1000000); }
function indexItem(itemType, itemId, text, isPublic = false) {
  return db.insert('search_index', { item_type: itemType, item_id: itemId, searchable_text: text, public_searchable: isPublic ? 1 : 0, admin_searchable: 1 });
}
function setPublic(itemType, itemId, isPublic) {
  db.run('UPDATE search_index SET public_searchable = @public, updated_at = CURRENT_TIMESTAMP WHERE item_type = @itemType AND item_id = @itemId', { public: isPublic ? 1 : 0, itemType, itemId });
}
function publicSearch(filters = {}) {
  const q = `%${String(filters.q || '').toLowerCase()}%`;
  const rows = db.all(`
    SELECT si.*, d.document_title, d.source_name, d.source_type, d.source_url, d.case_name, d.court, d.county, d.state, d.review_status, d.visibility, d.redaction_status
    FROM search_index si
    JOIN documents d ON si.item_type = 'document' AND si.item_id = d.id
    WHERE si.public_searchable = 1
      AND d.review_status = 'approved public'
      AND d.visibility = 'public approved'
      AND d.redaction_status NOT IN ('needs redaction', 'confidential/blocked', 'sealed/do not publish')
      AND lower(si.searchable_text) LIKE @q
      AND (@state IS NULL OR d.state = @state)
      AND (@county IS NULL OR d.county = @county)
      AND (@court IS NULL OR d.court = @court)
      AND (@sourceType IS NULL OR d.source_type = @sourceType)
    ORDER BY d.updated_at DESC LIMIT 100`, { q, state: filters.state || null, county: filters.county || null, court: filters.court || null, sourceType: filters.source_type || null });
  return rows.filter(r => !BLOCKED_PUBLIC_STATUSES.includes(r.visibility));
}
module.exports = { buildText, indexItem, setPublic, publicSearch };
